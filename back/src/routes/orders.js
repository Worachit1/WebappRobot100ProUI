// order.js
const express = require("express");
const { getConfig, getHistory } = require("../services/store");
const {
  cancelQueuedOrder,
  cancelRunningOrder,
  dispatchOrderImmediate,
  getQueueSnapshot,
} = require("../services/queue");

const router = express.Router();

function findRobot(config, robotId) {
  if (robotId) {
    return (config.robots || []).find(
      (robot) => String(robot.id) === String(robotId),
    );
  }

  return (config.robots || [])[0] || null;
}

function findRcsBaseUrl(config, robot) {
  const rcs = (config.rcs || []).find((item) => item.id === robot?.rcsId);
  return rcs?.baseUrl || "";
}

function getSpots(config) {
  return (config.spots || []).flatMap((group) =>
    Object.values(group).flatMap((items) => items || []),
  );
}

function findSpotById(config, spotId) {
  return getSpots(config).find((spot) => String(spot.id) === String(spotId));
}

router.post("/", async (req, res) => {
  try {
    const { robotId, pickupId, dropId, modelProcessType, modelProcessCode, delaySeconds } =
      req.body || {};

    if (!robotId) {
      return res.status(400).json({ error: "Missing robotId" });
    }

    if (!pickupId) {
      return res.status(400).json({ error: "Missing pickupId" });
    }

    if (!dropId) {
      return res.status(400).json({ error: "Missing dropId" });
    }

    if (String(pickupId) === String(dropId)) {
      return res.status(400).json({
        error: "Pickup and Drop cannot be the same",
      });
    }

    const config = await getConfig();

    const robot = findRobot(config, robotId);
    if (!robot) {
      return res.status(404).json({ error: "Robot not found" });
    }

    const pickup = findSpotById(config, pickupId);
    if (!pickup) {
      return res.status(404).json({ error: "Pickup not found" });
    }

    const drop = findSpotById(config, dropId);
    if (!drop) {
      return res.status(404).json({ error: "Drop not found" });
    }

    if (!pickup.rcsPosition || !drop.rcsPosition) {
      return res.status(400).json({
        error: "Pickup or Drop rcsPosition is missing",
      });
    }

    const orderId = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

    const baseOrder = {
      orderId,
      robotId: robot.id,
      robotName: robot.name,
      modelProcessType,
      modelProcessCode,
      delaySeconds: Math.max(Number(delaySeconds) || 0, 0),
      pickup: {
        id: pickup.id,
        name: pickup.name,
        rcsPosition: pickup.rcsPosition,
      },
      drop: {
        id: drop.id,
        name: drop.name,
        rcsPosition: drop.rcsPosition,
      },
      createdAt: new Date().toISOString(),
    };

    const rcsBaseUrl = findRcsBaseUrl(config, robot);
    const taskPath = `${pickup.rcsPosition},${drop.rcsPosition}`;

    console.log(
      `[Orders] dispatch robot=${robot.id} orderId=${orderId} taskPath=${taskPath} deviceNum=${robot.deviceNum} rcsBaseUrl=${rcsBaseUrl || "(empty)"}`,
    );

    const result = await dispatchOrderImmediate(baseOrder, {
      robot,
      startSpot: pickup,
      endSpot: drop,
      rcsBaseUrl,
    });

    return res.json({
      ok: true,
      orderId,
      status: result.status || "QUEUED",
      data: {
        ...baseOrder,
        status: result.status || "QUEUED",
      },
      queue: await getQueueSnapshot(robot.id),
    });
  } catch (err) {
    console.error("[Orders] create error:", err);

    return res.status(500).json({
      error: err.message || "Create order failed",
    });
  }
});

router.post("/tuskrobot", async (req, res) => {
  try {
    const { robotId, pickupId, dropId, modelProcessType, modelProcessCode, delaySeconds } =
      req.body || {};

    if (!robotId) {
      return res.status(400).json({ error: "Missing robotId" });
    }

    if (!pickupId) {
      return res.status(400).json({ error: "Missing pickupId" });
    }

    if (!dropId) {
      return res.status(400).json({ error: "Missing dropId" });
    }

    if (String(pickupId) === String(dropId)) {
      return res.status(400).json({
        error: "Pickup and Drop cannot be the same",
      });
    }

    const config = await getConfig();

    const robot = findRobot(config, robotId);
    if (!robot) {
      return res.status(404).json({ error: "Robot not found" });
    }

    const pickup = findSpotById(config, pickupId);
    if (!pickup) {
      return res.status(404).json({ error: "Pickup not found" });
    }

    const drop = findSpotById(config, dropId);
    if (!drop) {
      return res.status(404).json({ error: "Drop not found" });
    }

    if (!pickup.rcsPosition || !drop.rcsPosition) {
      return res.status(400).json({
        error: "Pickup or Drop rcsPosition is missing",
      });
    }

    const orderId = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

    const baseOrder = {
      orderId,
      robotId: robot.id,
      robotName: robot.name,
      modelProcessType,
      modelProcessCode,
      delaySeconds: Math.max(Number(delaySeconds) || 0, 0),
      pickup: {
        id: pickup.id,
        name: pickup.name,
        rcsPosition: pickup.rcsPosition,
      },
      drop: {
        id: drop.id,
        name: drop.name,
        rcsPosition: drop.rcsPosition,
      },
      createdAt: new Date().toISOString(),
    };

    const rcsBaseUrl = findRcsBaseUrl(config, robot);
    const taskPath = `${pickup.rcsPosition},${drop.rcsPosition}`;

    console.log(
      `[Orders] dispatch robot=${robot.id} orderId=${orderId} taskPath=${taskPath} deviceNum=${robot.deviceNum} rcsBaseUrl=${rcsBaseUrl || "(empty)"}`,
    );

    const result = await dispatchOrderImmediate(baseOrder, {
      robot,
      startSpot: pickup,
      endSpot: drop,
      rcsBaseUrl,
      useTuskrobotApi: true,
    });

    return res.json({
      ok: true,
      orderId,
      status: result.status || "QUEUED",
      data: {
        ...baseOrder,
        status: result.status || "QUEUED",
      },
      queue: await getQueueSnapshot(robot.id),
    });
  } catch (err) {
    console.error("[Orders] create error:", err);

    return res.status(500).json({
      error: err.message || "Create order failed",
    });
  }
});

// recall
router.post("/recall", async (req, res) => {
  try {
    const { robotId, bufferId, machineId } = req.body || {};

    if (!bufferId) {
      return res.status(400).json({ error: "Missing bufferId" });
    }

    if (!machineId) {
      return res.status(400).json({ error: "Missing machineId" });
    }

    const config = await getConfig();

    const robot = findRobot(config, robotId);
    if (!robot) {
      return res.status(404).json({ error: "Robot not found" });
    }

    const pickup = findBufferById(config, bufferId);
    if (!pickup) {
      return res.status(404).json({ error: "Buffer not found" });
    }

    const drop = findMachineById(config, machineId);
    if (!drop) {
      return res.status(404).json({ error: "Machine not found" });
    }

    if (!pickup.rcsPosition || !drop.rcsPosition) {
      return res.status(400).json({
        error: "Pickup or drop rcsPosition is missing",
      });
    }

    const orderId = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

    const baseOrder = {
      orderId,
      robotId: robot.id,
      robotName: robot.name,
      pickup: {
        id: drop.id,
        name: drop.name,
        rcsPosition: drop.rcsPosition,
      },
      drop: {
        id: pickup.id,
        name: pickup.name,
        rcsPosition: pickup.rcsPosition,
      },
      type: "RECALL",
      createdAt: new Date().toISOString(),
    };

    const rcsBaseUrl = findRcsBaseUrl(config, robot);
    const taskPath = `${drop.rcsPosition},${pickup.rcsPosition}`;

    console.log(
      `[Orders Recall] dispatch robot=${robot.id} orderId=${orderId} taskPath=${taskPath} deviceNum=${robot.deviceNum} rcsBaseUrl=${rcsBaseUrl || "(empty)"}`,
    );

    const result = await dispatchOrderImmediate(baseOrder, {
      robot,
      startSpot: drop,
      endSpot: pickup,
      rcsBaseUrl,
    });

    updateBufferStatus(config, pickup.id, {
      robotId: robot.id,
      orderId,
    });

    await saveConfig(config);

    return res.json({
      ok: true,
      orderId,
      status: result.status || "QUEUED",
      data: {
        ...baseOrder,
        status: result.status || "QUEUED",
      },
      queue: await getQueueSnapshot(robot.id),
    });
  } catch (err) {
    console.error("[Orders Recall] create error:", err);

    return res.status(500).json({
      error: err.message || "Create recall order failed",
    });
  }
});

router.get("/history", async (req, res) => {
  const { status, q, fields } = req.query;

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 10, 1);

  let history = await getHistory();

  if (status && status !== "ALL") {
    history = history.filter((item) => item.status === status);
  }

  const searchFields = fields
    ? String(fields)
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean)
    : ["orderId", "robotName", "pickup", "drop"];

  if (q && searchFields.length > 0) {
    const query = String(q).trim().toLowerCase();

    history = history.filter((item) => {
      return searchFields.some((field) => {
        if (field === "orderId") {
          return String(item.orderId || "")
            .toLowerCase()
            .includes(query);
        }

        if (field === "robotName") {
          return String(item.robotName || "")
            .toLowerCase()
            .includes(query);
        }

        if (field === "pickup") {
          return String(item.pickup?.name || "")
            .toLowerCase()
            .includes(query);
        }

        if (field === "drop") {
          return String(item.drop?.name || "")
            .toLowerCase()
            .includes(query);
        }

        return false;
      });
    });
  }

  history = [...history].sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const totalItems = history.length;
  const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * limit;
  const endIndex = startIndex + limit;

  const items = history.slice(startIndex, endIndex);

  res.json({
    items,
    pagination: {
      page: safePage,
      limit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  });
});

router.post("/:orderId/cancel", async (req, res) => {
  try {
    const result = await cancelQueuedOrder(req.params.orderId);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || "Cancel order failed",
      ...(err.payload || {}),
    });
  }
});

router.post("/:orderId/cancel-running", async (req, res) => {
  try {
    const { releaseOnly = false } = req.body || {};
    const result = await cancelRunningOrder(req.params.orderId, releaseOnly);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || "Cancel running failed",
      ...(err.payload || {}),
    });
  }
});

module.exports = router;
