const { getConfig, getHistory } = require("./store");
const { dispatchOrderImmediate } = require("./queue");
const { getStockStatus } = require("./rcs");

const DEFAULT_AUTO_JOBS = [
  {
    id: "auto-c040-r1-r2",
    enabled: true,
    areaId: "24",
    robotId: "c040",
    modelProcessType: "delivery",
    modelProcessCode: "CmoveShelf",
    pickupName: "R1",
    dropName: "R2",
  },
];

const POLL_MS = 5000;

const REQUIRED_JOB_FIELDS = [
  "areaId",
  "robotId",
  "modelProcessType",
  "modelProcessCode",
  "pickupName",
  "dropName",
];

/*
Example config.json:
"autoStockPickupJobs": [
  {
    "id": "auto-c040-r1-r2",
    "enabled": true,
    "areaId": "24",
    "robotId": "c040",
    "modelProcessType": "delivery",
    "modelProcessCode": "CmoveShelf",
    "pickupName": "R1",
    "dropName": "R2"
  }
]
*/

const ACTIVE_STATUSES = new Set([
  "QUEUED",
  "DELAYING",
  "SENDING",
  "RUNNING",
  "ISSUED",
  "WAIT_CONFIRMATION",
]);

let timer = null;
let processing = false;
const conditionLatches = new Map();

function getJobId(job) {
  return (
    job.id ||
    `${job.areaId}:${job.robotId}:${job.modelProcessCode}:${job.pickupName}->${job.dropName}`
  );
}

function getAutoJobs(config) {
  const jobs = Array.isArray(config.autoStockPickupJobs)
    ? config.autoStockPickupJobs
    : DEFAULT_AUTO_JOBS;

  return jobs
    .filter((job) => job && job.enabled !== false)
    .map((job) => ({
      ...job,
      id: getJobId(job),
    }))
    .filter((job) =>
      REQUIRED_JOB_FIELDS.every((field) => String(job[field] || "").trim()),
    );
}

function getRcsConfig(config, areaId) {
  return (
    (config.rcs || []).find((item) =>
      (item.areaIds || []).some((id) => String(id) === String(areaId)),
    ) ||
    (config.rcs || [])[0] ||
    null
  );
}

function getSpots(config) {
  return (config.spots || []).flatMap((group) =>
    Object.values(group).flatMap((items) => items || []),
  );
}

function findSpotByName(config, name) {
  return getSpots(config).find(
    (spot) =>
      String(spot.name || "").trim().toLowerCase() ===
        String(name).trim().toLowerCase() ||
      String(spot.rcsPosition || "").trim().toLowerCase() ===
        String(name).trim().toLowerCase(),
  );
}

function findStock(stockList, pointName) {
  const target = String(pointName || "").trim().toLowerCase();
  return stockList.find((stock) => {
    const location = String(
      stock.qrContent ||
        stock.locationCode ||
        stock.locationName ||
        stock.stockName ||
        stock.stockCode ||
        stock.nodeName ||
        stock.pointName ||
        stock.name ||
        "",
    )
      .trim()
      .toLowerCase();
    return location === target;
  });
}

function hasActiveAutoOrder(history, job) {
  return history.some(
    (item) =>
      item.autoStockPickup === true &&
      (item.autoStockPickupJobId
        ? String(item.autoStockPickupJobId) === String(job.id)
        : true) &&
      String(item.robotId) === String(job.robotId) &&
      String(item.pickup?.name || item.pickup?.rcsPosition || "") ===
        String(job.pickupName) &&
      String(item.drop?.name || item.drop?.rcsPosition || "") ===
        String(job.dropName) &&
      ACTIVE_STATUSES.has(item.status),
  );
}

async function pollAutoStockPickup() {
  if (processing) return;

  processing = true;
  try {
    const config = await getConfig();
    const jobs = getAutoJobs(config);
    if (jobs.length === 0) return;

    const history = await getHistory();
    const stockByArea = new Map();

    for (const job of jobs) {
      const jobId = getJobId(job);
      const rcs = getRcsConfig(config, job.areaId);
      const robot = (config.robots || []).find(
        (item) => String(item.id) === String(job.robotId),
      );
      const pickup = findSpotByName(config, job.pickupName);
      const drop = findSpotByName(config, job.dropName);

      if (!rcs?.baseUrl || !robot || !pickup || !drop) {
        conditionLatches.set(jobId, false);
        continue;
      }

      if (!stockByArea.has(String(job.areaId))) {
        const stockRes = await getStockStatus(rcs.baseUrl, {
          areaId: String(job.areaId),
          pageSize: "1000",
          pageNo: "1",
        });
        stockByArea.set(
          String(job.areaId),
          Array.isArray(stockRes?.data?.stockList)
            ? stockRes.data.stockList
            : [],
        );
      }

      const stockList = stockByArea.get(String(job.areaId)) || [];
      const pickupStock = findStock(stockList, job.pickupName);
      const dropStock = findStock(stockList, job.dropName);
      const pickupFull = Number(pickupStock?.stockStatus) === 2;
      const dropEmpty = Number(dropStock?.stockStatus) === 0;
      const conditionReady = pickupFull && dropEmpty;

      if (!conditionReady) {
        conditionLatches.set(jobId, false);
        continue;
      }

      if (conditionLatches.get(jobId)) continue;

      if (hasActiveAutoOrder(history, job)) {
        conditionLatches.set(jobId, true);
        continue;
      }

      const orderId = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
      const baseOrder = {
        orderId,
        robotId: robot.id,
        robotName: robot.name,
        modelProcessType: job.modelProcessType,
        modelProcessCode: job.modelProcessCode,
        delaySeconds: 0,
        autoStockPickup: true,
        autoStockPickupJobId: job.id,
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

      console.log(
        `[AutoStockPickup] create order job=${job.id} robot=${robot.id} orderId=${orderId} pickup=${pickup.rcsPosition} drop=${drop.rcsPosition}`,
      );

      await dispatchOrderImmediate(baseOrder, {
        robot,
        startSpot: pickup,
        endSpot: drop,
        rcsBaseUrl: rcs.baseUrl,
      });

      conditionLatches.set(jobId, true);
    }
  } catch (err) {
    console.error("[AutoStockPickup] poll error:", err.message);
  } finally {
    processing = false;
  }
}

function startAutoStockPickup() {
  if (timer) return;
  console.log("[AutoStockPickup] monitor started");
  timer = setInterval(pollAutoStockPickup, POLL_MS);
  pollAutoStockPickup().catch((err) => {
    console.error("[AutoStockPickup] initial poll error:", err.message);
  });
}

module.exports = {
  startAutoStockPickup,
};
