const axios = require("axios");

const IO_READ_URL = "http://192.168.1.99/1234/2/";
const IO_WRITE_URL = "http://192.168.1.99/1234/6/";

const READ_COMMAND = "s=----";
const IO_TIMEOUT_MS = 1000;

let lastSw2 = null;

async function setOutputChannel(channel, isOn) {
  const d = `${isOn ? 1 : 0}${channel}`;

  await axios.get(`${IO_WRITE_URL}?d=${d}&`, {
    timeout: IO_TIMEOUT_MS,
  });
}

async function readRawBits() {
  const { data } = await axios.get(
    `${IO_READ_URL}?${READ_COMMAND}`,
    { timeout: IO_TIMEOUT_MS }
  );

  return data.toString().trim().slice(0, 8);
}

async function pollSensor() {
  try {
    const bits = await readRawBits();

    // SW2 = bit ตำแหน่งที่คุณใช้งาน
    const sw2 = bits[5] === "1"; // ปรับ index ตามการแมปจริง

    if (sw2 !== lastSw2) {
      lastSw2 = sw2;

      await setOutputChannel(2, sw2);

      console.log(
        `SW2 ${sw2 ? "ON" : "OFF"} -> CH2 ${sw2 ? "ON" : "OFF"}`
      );
    }
  } catch (err) {
    console.error(err.message);
  }
}

function startPolling() {
  setInterval(pollSensor, 200);
}

module.exports = {
  startPolling,
};