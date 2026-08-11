const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const { getConfig, getHistory } = require("../services/store");
const {
  getDeviceListByArea,
  getStockStatus,
  getTopologyList,
} = require("../services/rcs");

const router = express.Router();

const ACTIVE_ORDER_STATUSES = new Set([
  "QUEUED",
  "DELAYING",
  "SENDING",
  "RUNNING",
  "ISSUED",
  "WAIT_CONFIRMATION",
]);

function rowToObject(keys, row) {
  return Object.fromEntries(keys.map((key, index) => [key, row[index]]));
}

function normalizePointName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getStockLocationCode(stock) {
  return String(
    stock?.qrContent ||
      stock?.locationCode ||
      stock?.locationName ||
      stock?.stockName ||
      stock?.stockCode ||
      stock?.nodeName ||
      stock?.pointName ||
      stock?.storageNum ||
      stock?.code ||
      stock?.name ||
      "",
  ).trim();
}

function getStockLookupKeys(stock) {
  const raw = getStockLocationCode(stock);
  const withoutFloor = raw.split("_")[0];
  const withoutDashFloor = raw.replace(/[-_]?F\d+$/i, "");
  const prefixMatch = raw.match(/^([a-z]+\d+(?:-\d+)?)(?:[-_].*)?$/i);
  return [raw, withoutFloor, withoutDashFloor, prefixMatch?.[1]]
    .map(normalizePointName)
    .filter(Boolean);
}

function findStocksForNode(node, stockList) {
  const nodeKeys = [node.name, node.content].map(normalizePointName).filter(Boolean);
  return stockList.filter((stock) => {
    const stockKeys = getStockLookupKeys(stock);
    return stockKeys.some((stockKey) =>
      nodeKeys.some(
        (nodeKey) =>
          stockKey === nodeKey ||
          stockKey.startsWith(`${nodeKey}-`) ||
          stockKey.startsWith(`${nodeKey}_`),
      ),
    );
  });
}

function normalizeMap(rawMap, stockList) {
  const nodeKeys = rawMap?.nodeKeys || [];
  const lineKeys = rawMap?.lineKeys || [];
  const nodes = (rawMap?.nodeArr || []).map((row) => {
    const node = rowToObject(nodeKeys, row);
    const stocks = findStocksForNode(node, stockList);
    const normalizedStocks = stocks.map((stock) => ({
      areaId: stock.areaId,
      inTask: Number(stock.inTask),
      qrContent: getStockLocationCode(stock),
      stockStatus: Number(stock.stockStatus),
      direction: stock.direction ?? stock.locationDirection ?? 0,
      raw: stock,
    }));

    return {
      id: String(node.content || node.name || `${node.x},${node.y}`),
      x: Number(node.x),
      y: Number(node.y),
      type: node.type,
      content: node.content,
      name: node.name,
      stock: normalizedStocks[0] || null,
      stocks: normalizedStocks,
    };
  });

  const lines = (rawMap?.lineArr || []).map((row, index) => {
    const line = rowToObject(lineKeys, row);
    return {
      id: `${line.from || index}-${line.to || index}`,
      from: line.from,
      to: line.to,
      path: Array.isArray(line.path) ? line.path : [],
    };
  });

  const xs = nodes.map((node) => node.x).filter(Number.isFinite);
  const ys = nodes.map((node) => node.y).filter(Number.isFinite);

  return {
    nodes,
    lines,
    bounds: {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    },
  };
}

async function readLocalMap(areaId) {
  const filePath = path.join(__dirname, `../../..`, `map-${areaId}.json`);
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text);
}

async function fetchMapFromRcs(rcsBaseUrl, areaId) {
  const topology = await getTopologyList(rcsBaseUrl, areaId);
  const mapJsonUrl = topology?.data?.mapJsonUrl;
  if (!mapJsonUrl) {
    throw new Error("topologyList did not return mapJsonUrl");
  }

  const res = await axios.get(mapJsonUrl, { timeout: 15000 });
  return res.data;
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

router.get("/", async (req, res) => {
  const areaId = req.query.areaId || "24";
  const useLocalMap = req.query.useLocalMap === "1";
  const config = await getConfig();
  const history = await getHistory();
  const rcs = getRcsConfig(config, areaId);

  if (!rcs?.baseUrl) {
    return res.status(404).json({ error: "RCS baseUrl not found" });
  }

  let rawMap = null;
  let mapSource = "rcs";
  let mapError = null;
  try {
    rawMap = useLocalMap
      ? await readLocalMap(areaId)
      : await fetchMapFromRcs(rcs.baseUrl, areaId);
    mapSource = useLocalMap ? "local" : "rcs";
  } catch (err) {
    mapError = err.message;
    try {
      rawMap = await fetchMapFromRcs(rcs.baseUrl, areaId);
      mapSource = "rcs";
    } catch {
      rawMap = await readLocalMap(areaId);
      mapSource = "local";
    }
  }

  let stockResponse = null;
  let stockList = [];
  let stockError = null;
  try {
    stockResponse = await getStockStatus(rcs.baseUrl, {
      areaId: String(areaId),
      pageSize: "1000",
      pageNo: "1",
    });
    stockList = Array.isArray(stockResponse?.data?.stockList)
      ? stockResponse.data.stockList
      : [];
  } catch (err) {
    stockError = err.response?.data?.desc || err.message;
  }

  let devices = [];
  let deviceError = null;
  try {
    const deviceRes = await getDeviceListByArea(rcs.baseUrl, areaId);
    devices = Array.isArray(deviceRes?.data) ? deviceRes.data : [];
  } catch (err) {
    deviceError = err.response?.data?.desc || err.message;
  }

  const activeTasks = history
    .filter((item) => ACTIVE_ORDER_STATUSES.has(item.status))
    .map((item) => ({
      orderId: item.orderId,
      robotId: item.robotId,
      robotName: item.robotName,
      pickup: item.pickup,
      drop: item.drop,
      status: item.status,
    }));

  const normalized = normalizeMap(rawMap, stockList);

  res.json({
    ok: true,
    areaId: String(areaId),
    mapSource,
    mapError,
    map: normalized,
    stock: {
      code: stockResponse?.code || null,
      desc: stockResponse?.desc || stockError || null,
      totalNum: Number(stockResponse?.data?.totalNum) || stockList.length,
      stockList,
    },
    devices,
    deviceError,
    activeTasks,
  });
});

module.exports = router;
