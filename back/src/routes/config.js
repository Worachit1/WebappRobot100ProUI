const express = require("express");
const fs = require("fs/promises");
const path = require("path");
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

router.post("/logo-upload", async (req, res) => {
  try {
    const { fileName, mimeType, dataUrl } = req.body || {};
    const match = String(dataUrl || "").match(/^data:(.+);base64,(.+)$/);
    const type = String(mimeType || match?.[1] || "").toLowerCase();

    if (!match || !type.startsWith("image/")) {
      return res.status(400).json({ error: "Valid image dataUrl is required" });
    }

    const extFromType = {
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/svg+xml": ".svg",
    }[type];

    if (!extFromType) {
      return res.status(400).json({ error: "Unsupported image type" });
    }

    const safeBaseName =
      String(fileName || "logo")
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "logo";

    const assetDir = path.join(__dirname, "../../../front/public/assets");
    await fs.mkdir(assetDir, { recursive: true });

    const nextFileName = `${safeBaseName}-${Date.now()}${extFromType}`;
    const filePath = path.join(assetDir, nextFileName);
    await fs.writeFile(filePath, Buffer.from(match[2], "base64"));

    res.json({
      ok: true,
      path: `/assets/${nextFileName}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Upload logo failed" });
  }
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
