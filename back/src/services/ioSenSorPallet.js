// ioSenSorPallet.js
const axios = require("axios");

// NC-400 อ่าน Input อย่างเดียว
const IO_READ_URL = "http://ip/2/";
const READ_COMMAND = "s=----";
const IO_TIMEOUT_MS = 1000;

async function readRawBits() {
  const { data } = await axios.get(`${IO_READ_URL}?${READ_COMMAND}`, {
    timeout: IO_TIMEOUT_MS,
  });

  const raw = data
    .toString()
    .trim()
    .replace(/\r\n/g, "")
    .replace(/\s/g, "");

  return raw.slice(0, 8).padStart(8, "0");
}

function parseBits(bits) {
  const outputs = bits
    .slice(0, 4)
    .split("")
    .map((b) => b === "1");

  const inputs = bits
    .slice(4, 8)
    .split("")
    .map((b) => b === "1");

  return { outputs, inputs };
}

async function readPalletSensorStatus() {
  const bits = await readRawBits();
  const parsed = parseBits(bits);

  return {
    rawBits: bits,
    outputs: parsed.outputs,
    inputs: parsed.inputs,

    // ตั้งชื่อให้อ่านง่าย
    palletA: parsed.inputs[0],
    palletB: parsed.inputs[1],
    palletC: parsed.inputs[2],
  };
}

module.exports = {
  readPalletSensorStatus,
  readRawBits,
  parseBits,
  IO_READ_URL,
  READ_COMMAND,
};