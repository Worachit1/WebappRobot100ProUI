const { getConfig, getHistory, saveHistory } = require("./store");
const { sendTaskOrder, sendTaskOrderTuskrobot } = require("./rcs");

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
}

async function appendHistory(entry) {
  const history = await getHistory();

  const exists = history.some((item) => item.orderId === entry.orderId);
  if (exists) return;

  history.unshift(entry);
  await saveHistory(history);
}

function getModelProcessCode(robot, orderType) {
  return robot?.modelProcessCode?.[orderType];
}

async function dispatchOrderImmediate(order, context) {
  const { robot, startSpot, endSpot, rcsBaseUrl, useTuskrobotApi } = context;

  const config = await getConfig();
  const now = new Date().toISOString();

  const orderType = order.modelProcessType || order.type || order.orderType;

  const modelProcessCode =
    order.modelProcessCode || getModelProcessCode(robot, orderType);

  if (!modelProcessCode) {
    throw new Error(
      `Missing modelProcessCode for robot ${robot.id}, orderType ${orderType}`,
    );
  }

  const payload = {
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

  const tuskrobotPayload = {
    taskId: order.orderId,
    targets: [startSpot.rcsPosition, endSpot.rcsPosition],
    deviceId : robot.deviceNum,
    fromSystem: config.fromSystem,
  };

  const configId = order.configId || modelProcessCode;
  if (configId) {
    tuskrobotPayload.configId = configId;
  }

  await appendHistory({
    orderId: order.orderId,
    robotId: order.robotId,
    robotName: order.robotName,
    pickup: order.pickup,
    drop: order.drop,
    status: "SENDING",
    createdAt: order.createdAt || now,
    startedAt: now,
    rcsPayload: payload,
  });

  if (!config.sendEnabled) {
    await updateHistory(order.orderId, {
      status: "SUCCESS",
      finishedAt: new Date().toISOString(),
      note: "Send disabled (simulation - no RCS call)",
      rcsPayload: payload,
    });

    return {
      ok: true,
      simulated: true,
      rcsPayload: payload,
    };
  }

  try {
    const sendResult = useTuskrobotApi
      ? await sendTaskOrderTuskrobot(rcsBaseUrl, tuskrobotPayload)
      : await sendTaskOrder(rcsBaseUrl, payload);
    const ok = sendResult && Number(sendResult.code) === 1000;

    if (!ok) {
      const error =
        sendResult?.desc || sendResult?.message || "RCS addTask code !== 1000";

      console.error(
        "[RCS] addTask rejected:",
        JSON.stringify(sendResult, null, 2),
      );

      await updateHistory(order.orderId, {
        status: "FAILED",
        finishedAt: new Date().toISOString(),
        rcsPayload: payload,
        rcsResponse: sendResult,
        error,
      });

      return {
        ok: false,
        rcsPayload: payload,
        rcsResponse: sendResult,
        error,
      };
    }

    await updateHistory(order.orderId, {
      status: "SUCCESS",
      finishedAt: new Date().toISOString(),
      rcsPayload: payload,
      rcsResponse: sendResult,
    });

    return {
      ok: true,
      rcsPayload: payload,
      rcsResponse: sendResult,
    };
  } catch (err) {
    const errorPayload = err.response?.data || err.message;
    const error = err.response?.data?.desc || err.message || "RCS send failed";

    console.error("[RCS] SEND ERROR:", JSON.stringify(errorPayload, null, 2));

    await updateHistory(order.orderId, {
      status: "FAILED",
      finishedAt: new Date().toISOString(),
      rcsPayload: payload,
      rcsResponse: err.response?.data,
      error,
    });

    return {
      ok: false,
      rcsPayload: payload,
      rcsResponse: err.response?.data,
      error,
    };
  }
}

function getQueueSnapshot() {
  return {
    pending: 0,
    processing: false,
    currentOrderId: null,
    mode: "immediate",
  };
}

module.exports = {
  dispatchOrderImmediate,
  getQueueSnapshot,
};
