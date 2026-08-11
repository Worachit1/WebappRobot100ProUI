const express = require("express");
const { getConfig, saveConfig } = require("../services/store");
const { enableForbiddenZone } = require("../services/rcs");

const router = express.Router();

router.get("/", async (req, res) => {
  const config = await getConfig();
  res.json(config);
});

router.put("/", async (req, res) => {
  const nextConfig = req.body || {};
  await saveConfig(nextConfig);
  res.json({ ok: true });
});

router.post("/forbidden-zones/toggle", async (req, res) => {
  try {
    const { matterArea, enabled } = req.body || {};
    const name = String(matterArea || "").trim();

    if (!name) {
      return res.status(400).json({ error: "matterArea is required" });
    }

    const config = await getConfig();
    const rcs = (config.rcs || [])[0];
    if (!rcs?.baseUrl) {
      return res.status(404).json({ error: "RCS baseUrl not found" });
    }

    const rcsResponse = await enableForbiddenZone(rcs.baseUrl, name, Boolean(enabled));
    if (Number(rcsResponse?.code) !== 1000) {
      return res.status(502).json({
        error: rcsResponse?.desc || "enableForbiddenZone failed",
        rcsResponse,
      });
    }

    const zones = Array.isArray(config.forbiddenZones)
      ? [...config.forbiddenZones]
      : [];
    const existingIndex = zones.findIndex(
      (zone) => String(zone.name || "").trim().toLowerCase() === name.toLowerCase(),
    );
    const nextZone = {
      ...(existingIndex >= 0 ? zones[existingIndex] : {}),
      id:
        existingIndex >= 0
          ? zones[existingIndex].id
          : `fz-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      enabled: Boolean(enabled),
      lastUpdatedAt: new Date().toISOString(),
      lastRcsResponse: rcsResponse,
    };

    if (existingIndex >= 0) {
      zones[existingIndex] = nextZone;
    } else {
      zones.push(nextZone);
    }

    await saveConfig({
      ...config,
      forbiddenZones: zones,
    });

    res.json({
      ok: true,
      matterArea: name,
      enabled: Boolean(enabled),
      indBind: enabled ? 1 : 0,
      rcsResponse,
      zone: nextZone,
    });
  } catch (err) {
    res.status(500).json({
      error: err.response?.data?.desc || err.message || "Toggle forbidden zone failed",
      rcsResponse: err.response?.data,
    });
  }
});

module.exports = router;
