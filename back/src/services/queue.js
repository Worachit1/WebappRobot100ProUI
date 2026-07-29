const { getConfig, getHistory, saveHistory } = require("./store");
const {
  cancelTask,
  getTaskOrderStatus,
  sendTaskOrder,
  sendTaskOrderTuskrobot,
} = require("./rcs");

const TASK_STATUS_MAP = {
  1: "NOT_SENT",
  3: "CANCELLED",
  4: "SENDING",
  5: "FAILED",
  6: "RUNNING",
  7: "EXECUTION_FAILED",
  8: "COMPLETED",
  9: "ISSUED",
  10: "WAIT_CONFIRMATION",
};

const ACTIVE_STATUSES = new Set([
  "QUEUED",
  "DELAYING",
  "SENDING",
  "RUNNING",
  "ISSUED",
  "WAIT_CONFIRMATION",
]);
const RUNNING_STATUSES = new Set(["SENDING", "RUNNING", "ISSUED", "WAIT_CONFIRMATION"]);
const MAX_CONSECUTIVE_POLL_FAILURES = 30;

const queues = new Map();

function getQueueState(robotId) {
  if (!queues.has(robotId)) {
    queues.set(robotId, {
      processing: false,
      currentOrderId: null,
      delayTimer: null,
      pollTimer: null,
    });
  }

  return queues.get(robotId);
}

function clearQueueTimers(queue) {
  if (queue.delayTimer) {
    clearTimeout(queue.delayTimer);
    queue.delayTimer = null;
  }

  if (queue.pollTimer) {
    clearInterval(queue.pollTimer);
    queue.pollTimer = null;
  }
}

function findRobot(config, robotId) {
  return (config.robots || []).find((robot) => String(robot.id) === String(robotId));
}

function findRcsBaseUrl(config, robot) {
  const rcs = (config.rcs || []).find((item) => item.id === robot?.rcsId);
  return rcs?.baseUrl || "";
}

function getModelProcessCode(robot, orderType) {
  return robot?.modelProcessCode?.[orderType];
}

function buildPayload(config, order, robot, startSpot, endSpot) {
  const orderType = order.modelProcessType || order.type || order.orderType;
  const modelProcessCode =
    order.modelProcessCode || getModelProcessCode(robot, orderType);

  if (!modelProcessCode) {
    throw new Error(
      `Missing modelProcessCode for robot ${robot.id}, orderType ${orderType}`,
    );
  }

  return {
    modelProcessCode,
    fromSystem: config.fromSystem,
    orderId: order.orderId,
    taskOrderDetail: [
      {
        taskPath: `${startSpot.rcsPosition},${endSpot.rcsPosition}`,
        deviceNum: robot.deviceNum,
      },
    ],
  };
}

function buildTuskrobotPayload(config, order, robot, startSpot, endSpot, payload) {
  const tuskrobotPayload = {
    taskId: order.orderId,
    targets: [startSpot.rcsPosition, endSpot.rcsPosition],
    deviceId: robot.deviceNum,
    fromSystem: config.fromSystem,
  };

  const configId = order.configId || payload.modelProcessCode;
  if (configId) {
    tuskrobotPayload.configId = configId;
  }

  return tuskrobotPayload;
}

async function updateHistory(orderId, updates) {
  const history = await getHistory();
  const index = history.findIndex((item) => item.orderId === orderId);

  if (index >= 0) {
    history[index] = {
      ...history[index],
      ...updates,
    };

    await saveHistory(history);
  }

  return history[index] || null;
}

async function appendHistory(entry) {
  const history = await getHistory();
  const exists = history.some((item) => item.orderId === entry.orderId);

  if (exists) return;

  history.unshift(entry);
  await saveHistory(history);
}

function getActiveTasksFromHistory(history, robotId) {
  return history
    .filter(
      (item) =>
        String(item.robotId) === String(robotId) && ACTIVE_STATUSES.has(item.status),
    )
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function getNextQueuedTask(history, robotId) {
  return getActiveTasksFromHistory(history, robotId).find(
    (item) => item.status === "QUEUED",
  );
}

async function enqueueOrder(order, context) {
  const config = await getConfig();
  const { robot, startSpot, endSpot, useTuskrobotApi } = context;
  const rcsBaseUrl = context.rcsBaseUrl || findRcsBaseUrl(config, robot);
  const now = new Date().toISOString();
  const delaySeconds = Math.max(Number(order.delaySeconds) || 0, 0);
  const rcsPayload = buildPayload(config, order, robot, startSpot, endSpot);
  const tuskrobotPayload = buildTuskrobotPayload(
    config,
    order,
    robot,
    startSpot,
    endSpot,
    rcsPayload,
  );

  await appendHistory({
    orderId: order.orderId,
    robotId: order.robotId,
    robotName: order.robotName,
    modelProcessType: order.modelProcessType,
    modelProcessCode: rcsPayload.modelProcessCode,
    pickup: order.pickup,
    drop: order.drop,
    status: "QUEUED",
    createdAt: order.createdAt || now,
    delaySeconds,
    delayStartedAt: null,
    delayUntil: null,
    rcsBaseUrl,
    rcsPayload,
    tuskrobotPayload,
    useTuskrobotApi: Boolean(useTuskrobotApi),
  });

  processRobotQueue(order.robotId).catch((err) => {
    console.error("[Queue] process error:", err);
  });

  return {
    ok: true,
    orderId: order.orderId,
    status: "QUEUED",
    delaySeconds,
    queue: await getQueueSnapshot(order.robotId),
  };
}

async function dispatchOrderImmediate(order, context) {
  return enqueueOrder(order, context);
}

async function finishCurrentTask(robotId, orderId, updates = {}) {
  const queue = getQueueState(robotId);
  clearQueueTimers(queue);
  queue.processing = false;
  queue.currentOrderId = null;

  await updateHistory(orderId, {
    finishedAt: new Date().toISOString(),
    ...updates,
  });

  processRobotQueue(robotId).catch((err) => {
    console.error("[Queue] next task error:", err);
  });
}

async function startPolling(robotId, task, config) {
  const queue = getQueueState(robotId);
  const intervalMs = config.pollingIntervalMs || 2000;
  let consecutivePollFailures = 0;

  if (queue.pollTimer) {
    clearInterval(queue.pollTimer);
  }

  queue.pollTimer = setInterval(async () => {
    try {
      const res = await getTaskOrderStatus(task.rcsBaseUrl, task.orderId);

      if (Number(res.code) !== 1000) {
        consecutivePollFailures += 1;
        await updateHistory(task.orderId, { lastPollError: res.desc });
        if (consecutivePollFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          await finishCurrentTask(robotId, task.orderId, {
            status: "POLL_ABANDONED",
            note: `Stopped polling after ${MAX_CONSECUTIVE_POLL_FAILURES} errors`,
          });
        }
        return;
      }

      consecutivePollFailures = 0;
      const statusCode = Number(res.data?.status);
      const statusText = TASK_STATUS_MAP[statusCode] || "UNKNOWN";

      await updateHistory(task.orderId, {
        status: statusText,
        taskStatusCode: statusCode,
        taskOrderDetail: res.data?.taskOrderDetail || [],
        lastRcsStatusAt: new Date().toISOString(),
      });

      if (["COMPLETED", "EXECUTION_FAILED", "CANCELLED", "FAILED"].includes(statusText)) {
        await finishCurrentTask(robotId, task.orderId, {
          status: statusText,
          rcsStatusResponse: res,
        });
      }
    } catch (err) {
      consecutivePollFailures += 1;
      await updateHistory(task.orderId, { lastPollError: err.message });
      if (consecutivePollFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
        await finishCurrentTask(robotId, task.orderId, {
          status: "POLL_ABANDONED",
          note: `Stopped polling after ${MAX_CONSECUTIVE_POLL_FAILURES} network/API errors`,
        });
      }
    }
  }, intervalMs);
}

async function sendCurrentTask(robotId, task, config) {
  const queue = getQueueState(robotId);

  await updateHistory(task.orderId, {
    status: "SENDING",
    startedAt: new Date().toISOString(),
  });

  if (!config.sendEnabled) {
    await finishCurrentTask(robotId, task.orderId, {
      status: "COMPLETED",
      note: "Send disabled (simulation - no RCS call)",
    });
    return;
  }

  try {
    const sendResult = task.useTuskrobotApi
      ? await sendTaskOrderTuskrobot(task.rcsBaseUrl, task.tuskrobotPayload)
      : await sendTaskOrder(task.rcsBaseUrl, task.rcsPayload);
    const ok = sendResult && Number(sendResult.code) === 1000;

    if (!ok) {
      await finishCurrentTask(robotId, task.orderId, {
        status: "FAILED",
        rcsResponse: sendResult,
        error: sendResult?.desc || sendResult?.message || "RCS addTask code !== 1000",
      });
      return;
    }

    await updateHistory(task.orderId, {
      status: "RUNNING",
      rcsResponse: sendResult,
      sentAt: new Date().toISOString(),
    });

    queue.processing = true;
    queue.currentOrderId = task.orderId;

    if (task.useTuskrobotApi) {
      await finishCurrentTask(robotId, task.orderId, {
        status: "COMPLETED",
        note: "Tuskrobot task sent successfully",
      });
      return;
    }

    await startPolling(robotId, task, config);
  } catch (err) {
    await finishCurrentTask(robotId, task.orderId, {
      status: "FAILED",
      rcsResponse: err.response?.data,
      error: err.response?.data?.desc || err.message || "RCS send failed",
    });
  }
}

async function startTask(robotId, task, config) {
  const queue = getQueueState(robotId);
  queue.processing = true;
  queue.currentOrderId = task.orderId;

  const delaySeconds = Math.max(Number(task.delaySeconds) || 0, 0);
  if (delaySeconds > 0) {
    const now = Date.now();
    const existingDelayUntil = task.delayUntil ? new Date(task.delayUntil).getTime() : null;
    const delayUntil =
      existingDelayUntil && existingDelayUntil > now
        ? existingDelayUntil
        : now + delaySeconds * 1000;

    await updateHistory(task.orderId, {
      status: "DELAYING",
      delayStartedAt: task.delayStartedAt || new Date(now).toISOString(),
      delayUntil: new Date(delayUntil).toISOString(),
    });

    queue.delayTimer = setTimeout(async () => {
      const history = await getHistory();
      const latest = history.find((item) => item.orderId === task.orderId);
      if (!latest || latest.status !== "DELAYING") {
        queue.processing = false;
        queue.currentOrderId = null;
        processRobotQueue(robotId).catch(console.error);
        return;
      }
      await sendCurrentTask(robotId, latest, config);
    }, Math.max(delayUntil - now, 0));
    return;
  }

  await sendCurrentTask(robotId, task, config);
}

async function processRobotQueue(robotId) {
  const queue = getQueueState(robotId);
  if (queue.processing) return;

  const config = await getConfig();
  const history = await getHistory();

  const active = getActiveTasksFromHistory(history, robotId);
  const running = active.find((item) => RUNNING_STATUSES.has(item.status));
  if (running) {
    queue.processing = true;
    queue.currentOrderId = running.orderId;
    await startPolling(robotId, running, config);
    return;
  }

  const delaying = active.find((item) => item.status === "DELAYING");
  if (delaying) {
    await startTask(robotId, delaying, config);
    return;
  }

  const next = getNextQueuedTask(history, robotId);
  if (!next) return;

  await startTask(robotId, next, config);
}

async function cancelQueuedOrder(orderId) {
  const history = await getHistory();
  const task = history.find((item) => item.orderId === orderId);

  if (!task) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (!["QUEUED", "DELAYING"].includes(task.status)) {
    const err = new Error("Cannot cancel this order. It may already be sent to RCS.");
    err.statusCode = 409;
    throw err;
  }

  const queue = getQueueState(task.robotId);
  const wasCurrent = queue.currentOrderId === orderId;
  if (wasCurrent) {
    clearQueueTimers(queue);
    queue.processing = false;
    queue.currentOrderId = null;
  }

  await updateHistory(orderId, {
    status: "CANCELLED",
    finishedAt: new Date().toISOString(),
    note: "Cancelled before sending to RCS",
  });

  processRobotQueue(task.robotId).catch(console.error);

  return {
    ok: true,
    orderId,
    status: "CANCELLED",
    removedTask: task,
  };
}

async function cancelRunningOrder(orderId, releaseOnly = false) {
  const config = await getConfig();
  const history = await getHistory();
  const task = history.find((item) => item.orderId === orderId);

  if (!task) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (!RUNNING_STATUSES.has(task.status)) {
    const err = new Error("This task is not running in RCS");
    err.statusCode = 409;
    err.payload = { status: task.status };
    throw err;
  }

  const robot = findRobot(config, task.robotId);
  if (!robot) {
    const err = new Error("Robot not found");
    err.statusCode = 404;
    throw err;
  }

  const rcsBaseUrl = task.rcsBaseUrl || findRcsBaseUrl(config, robot);
  let rcsResponse = null;

  if (!releaseOnly && !task.useTuskrobotApi) {
    rcsResponse = await cancelTask(rcsBaseUrl, [
      {
        orderId,
        destPosition: task.drop?.rcsPosition || task.drop?.name || "",
      },
    ]);

    if (Number(rcsResponse?.code) !== 1000) {
      const err = new Error(rcsResponse?.desc || "RCS cancelTask failed");
      err.statusCode = 502;
      err.payload = { rcsResponse };
      throw err;
    }
  }

  await finishCurrentTask(task.robotId, orderId, {
    status: "CANCELLED",
    note: releaseOnly
      ? "Released in WebApp after cancelled in RCS"
      : "Cancelled running task in RCS",
    rcsResponse: rcsResponse || task.rcsResponse,
  });

  return {
    ok: true,
    orderId,
    status: "CANCELLED",
    releaseOnly,
    rcsResponse,
  };
}

async function getQueueSnapshot(robotId) {
  const queue = getQueueState(robotId);
  const history = await getHistory();
  const tasks = robotId ? getActiveTasksFromHistory(history, robotId) : [];

  return {
    pending: tasks.filter((item) => item.status === "QUEUED").length,
    processing: queue.processing,
    currentOrderId: queue.currentOrderId,
    mode: "queued",
  };
}

module.exports = {
  cancelQueuedOrder,
  cancelRunningOrder,
  dispatchOrderImmediate,
  enqueueOrder,
  getQueueSnapshot,
  processRobotQueue,
};
