const express = require("express");
const { getConfig } = require("../services/store");

const router = express.Router();

//get Robot
router.get("/get", async (req, res) => {
  const config = await getConfig();

  res.json({
    ok: true,
    data: config.robots || [],
  });
});

//get Carts
router.get("/get/carts", async (req, res) => {
  const config = await getConfig();

  res.json({
    ok: true,
    data: config.carts || [],
  });
});

//get Machines
router.get("/get/machines", async (req, res) => {
  const config = await getConfig();

  const machines = (config.pickupLocactions || []).flatMap(
    (group) => group.machines || []
  );

  res.json({
    ok: true,
    data: machines,
  });
});


module.exports = router;