const express = require("express");
const { getConfig, getHistory } = require("../services/store");
const { getDeviceStatusFromAllAreas } = require("../services/rcs");
const { processRobotQueue } = require("../services/queue");

const router = express.Router();

// IRAYPLE API 4.1.2.1: 0 Offline, 1 Idle, 2 Fault, 3 Initializing, 4 On mission, 5 Charging, 7 Upgrading
const AGV_STATUS_MAP = {
  0: "OFFLINE",
  1: "FREE",
  2: "ALARM",
  3: "INITIALIZING",
  4: "RUNNING",
  5: "CHARGING",
  7: "UPGRADING"
};

const ACTIVE_ORDER_STATUSES = new Set([
  "QUEUED",
  "DELAYING",
  "SENDING",
  "RUNNING",
  "ISSUED",
  "WAIT_CONFIRMATION",
]);

router.get("/:robotId", async (req, res) => {
  const { robotId } = req.params;
  const config = await getConfig();
  const robot = (config.robots || []).find((item) => item.id === robotId);
  if (!robot) {
    return res.status(404).json({ error: "Robot not found" });
  }

  processRobotQueue(robotId).catch((err) => {
    console.error("[Status] queue resume error:", err);
  });
  const rcs = (config.rcs || []).find((item) => item.id === robot.rcsId);
  if (!rcs) {
    return res.status(404).json({ error: "RCS not found" });
  }

  let deviceStatus = null;
  const areaIds = rcs.areaIds && rcs.areaIds.length ? rcs.areaIds : [0, 1, 2];
  try {
    const deviceKeys = [robot.deviceNum, robot.name, robot.id];
    const deviceRes = await getDeviceStatusFromAllAreas(rcs.baseUrl, deviceKeys, areaIds);
    if (deviceRes.code === 1000 && deviceRes.data) {
      const device = deviceRes.data;
      deviceStatus = {
        deviceNum: device.deviceCode || device.deviceName,
        agvStatus: AGV_STATUS_MAP[device.deviceStatus] || device.state || "UNKNOWN",
        battery: device.battery != null ? Number(device.battery) : null,
        charging: device.deviceStatus === 5 || (device.state && device.state.includes("Charging")),
        areaId: deviceRes.areaId,
        devicePosition: device.devicePosition || null,
        state: device.state || null
      };
    } else if (deviceRes.code !== 1000) {
      deviceStatus = { error: deviceRes.desc || "Device not found in any area" };
    }
  } catch (err) {
    const url = `${rcs.baseUrl}/ics/out/device/list/deviceInfo`;
    const statusCode = err.response?.status;
    let message = err.message;
    if (statusCode === 404) {
      message = `RCS ไม่มี path นี้ (404). ตรวจสอบ baseUrl และ path API: ${url}`;
    } else if (statusCode) {
      message = `${err.message} (HTTP ${statusCode})`;
    }
    deviceStatus = { error: message, url };
  }

  const history = await getHistory();
  const latest = history.find((item) => item.robotId === robotId) || null;
  const now = Date.now();
  const tasks = history
    .filter(
      (item) =>
        String(item.robotId) === String(robotId) &&
        ACTIVE_ORDER_STATUSES.has(item.status),
    )
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .map((item) => {
      const remainingDelayMs =
        item.status === "DELAYING" && item.delayUntil
          ? Math.max(new Date(item.delayUntil).getTime() - now, 0)
          : 0;

      return {
        orderId: item.orderId,
        robotId: item.robotId,
        robotName: item.robotName,
        pickup: item.pickup,
        drop: item.drop,
        status: item.status,
        statusWork:
          item.status === "RUNNING" ||
          item.status === "SENDING" ||
          item.status === "ISSUED" ||
          item.status === "WAIT_CONFIRMATION"
            ? "delivering"
            : item.status === "DELAYING"
              ? "delay"
              : "queue",
        delaySeconds: Number(item.delaySeconds) || 0,
        delayStartedAt: item.delayStartedAt || null,
        delayUntil: item.delayUntil || null,
        remainingDelayMs,
        canCancel: item.status === "QUEUED" || item.status === "DELAYING",
        canCancelRunning:
          item.status === "RUNNING" ||
          item.status === "SENDING" ||
          item.status === "ISSUED" ||
          item.status === "WAIT_CONFIRMATION",
        canContinue: item.status === "WAIT_CONFIRMATION",
        createdAt: item.createdAt,
        startedAt: item.startedAt,
        sentAt: item.sentAt,
      };
    });

  res.json({
    robot: {
      id: robot.id,
      name: robot.name,
      deviceNum: robot.deviceNum
    },
    deviceStatus,
    latestOrder: latest,
    tasks,
  });
});

module.exports = router;
