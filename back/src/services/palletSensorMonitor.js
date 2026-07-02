//palletSensorMonitor.js
const axios = require("axios");
const { getConfig } = require("./store");
const { dispatchOrderImmediate } = require("./queue");

const IO_READ_URL = "http://192.168.1.99/1234/2/";
const IO_WRITE_URL = "http://192.168.1.99/1234/6/";

const READ_COMMAND = "s=----";
const IO_TIMEOUT_MS = 1000;

// sw-board-sw2
// const DEFAULT_SW_BOARD_ID = "sw-board-sw2";
const HOLD_MS = 5000;
const POLL_MS = 1000;

const ROBOT_ID = "d150d";
const PICKUP_ID = "s-pallet1";
const DROP_ID = "s-b4-1";
const MODEL_PROCESS_TYPE = "delivery";
const fs = require("fs");
const path = require("path");

let lastSw2 = null;
let onStartedAt = null;
let lastPrintedSecond = 0;
let alreadySent = false;

const SENSOR_STATUS_LOG = path.join(__dirname, "../logs/sensor-status.log");

function appendSensorStatusLog(sensorId, status) {
  const timestamp = new Date().toISOString();

  fs.appendFile(
    SENSOR_STATUS_LOG,
    `[${timestamp}] ${sensorId} ${status}\n`,
    (err) => {
      if (err) {
        console.error(
          "[PalletSensor] write sensor-status.log error:",
          err.message,
        );
      }
    },
  );
}

// กรณีใช้ sw เดียว ให้ใช้ sw-board ตัวเดียวใน config.json
function getSwBoardConfig(config) {
  return (config["sw-board"] || [])[0] || {};
}
// function getSwBoardConfig(config) {
//   const list = config["sw-board"] || [];
//   return list.find((item) => item.id === DEFAULT_SW_BOARD_ID) || list[0] || {};
// }

async function setOutputChannel(channel, isOn) {
  const d = `${isOn ? 1 : 0}${channel}`;

  await axios.get(`${IO_WRITE_URL}?d=${d}&`, {
    timeout: IO_TIMEOUT_MS,
  });
}

async function readRawBits() {
  const { data } = await axios.get(`${IO_READ_URL}?${READ_COMMAND}`, {
    timeout: IO_TIMEOUT_MS,
  });

  return data.toString().trim().replace(/\s/g, "").slice(0, 8);
}

function getSpots(config) {
  return (config.spots || []).flatMap((group) =>
    Object.values(group).flatMap((items) => items || []),
  );
}

function findSpotById(config, spotId) {
  return getSpots(config).find((spot) => String(spot.id) === String(spotId));
}

function findRobot(config, robotId) {
  return (config.robots || []).find(
    (robot) => String(robot.id) === String(robotId),
  );
}

function findRcsBaseUrl(config, robot) {
  const rcs = (config.rcs || []).find((item) => item.id === robot?.rcsId);
  return rcs?.baseUrl || "";
}

async function callRcsOrder() {
  const config = await getConfig();

  const robot = findRobot(config, ROBOT_ID);
  if (!robot) throw new Error(`Robot not found: ${ROBOT_ID}`);

  const pickup = findSpotById(config, PICKUP_ID);
  if (!pickup) throw new Error(`Pickup not found: ${PICKUP_ID}`);

  const drop = findSpotById(config, DROP_ID);
  if (!drop) throw new Error(`Drop not found: ${DROP_ID}`);

  const orderId = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

  const baseOrder = {
    orderId,
    robotId: robot.id,
    robotName: robot.name,
    modelProcessType: MODEL_PROCESS_TYPE,
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

  console.log(
    `[PalletSensor] dispatch robot=${robot.id} orderId=${orderId} taskPath=${pickup.rcsPosition},${drop.rcsPosition}`,
  );

  return dispatchOrderImmediate(baseOrder, {
    robot,
    startSpot: pickup,
    endSpot: drop,
    rcsBaseUrl,
  });
}

async function pollSensor() {
  try {
    const config = await getConfig();
    const swBoard = getSwBoardConfig(config);

    const sensorId = swBoard.id ;
    const sensorIndex = Number(swBoard.inputIndex);

    const bits = await readRawBits();
    const sensorOn = bits[sensorIndex] === "1";
    const now = Date.now();

    if (sensorOn !== lastSw2) {
      lastSw2 = sensorOn;

      await setOutputChannel(2, sensorOn);

      if (sensorOn) {
        onStartedAt = now;
        lastPrintedSecond = 0;
        alreadySent = false;

        console.log(`${sensorId} ON -> CH2 ON`);
        appendSensorStatusLog(sensorId, "ON");
      } else {
        onStartedAt = null;
        lastPrintedSecond = 0;
        alreadySent = false;

        console.log(`${sensorId} OFF -> CH2 OFF`);
        appendSensorStatusLog(sensorId, "OFF");
      }
    }

    if (sensorOn && onStartedAt) {
      const elapsedMs = now - onStartedAt;
      const elapsedSecond = Math.floor(elapsedMs / 1000);

      if (elapsedSecond > 0 && elapsedSecond !== lastPrintedSecond) {
        lastPrintedSecond = elapsedSecond;
        console.log(`${sensorId} ON -> CH2 ON --- ${elapsedSecond}s`);
      }

      if (elapsedMs >= HOLD_MS && !alreadySent) {
        alreadySent = true;

        console.log(`${sensorId} ON ครบ ${HOLD_MS / 1000}s -> Send RCS order`);
        const result = await callRcsOrder();

        console.log(
          "[PalletSensor] RCS result:",
          result.ok ? "SUCCESS" : "FAILED",
        );
      }
    }
  } catch (err) {
    console.error("[PalletSensor] error:", err.message);
  }
}

function startPalletSensorMonitor() {
  console.log("[PalletSensor] monitor started");
  setInterval(pollSensor, POLL_MS);
}

module.exports = {
  startPalletSensorMonitor,
};
