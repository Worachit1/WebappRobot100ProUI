const express = require("express");
const { getConfig } = require("../services/store");

const router = express.Router();

router.get("/get/spots", async (req, res) => {
  const { robotId } = req.query;

  if (!robotId) {
    return res.status(400).json({
      ok: false,
      message: "robotId is required",
    });
  }

  const config = await getConfig();

  const picks = (config.spots || []).flatMap((group) => {
    return group[robotId] || [];
  });

  return res.json({
    ok: true,
    data: picks,
  });
});

module.exports = router;