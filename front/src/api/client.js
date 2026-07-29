// ใช้ host เดียวกับหน้าที่เปิดอยู่ — เปิดจาก 192.168.1.10 จะยิง API ไป 192.168.1.10:4000 (ไม่ติด localhost)
const getApiBase = () => {
  if (typeof window === "undefined") return import.meta.env.VITE_API_BASE_URL;
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (
    envUrl &&
    envUrl.includes("localhost") &&
    window.location.hostname !== "localhost"
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
  }
  if (envUrl) return envUrl;
  return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};
const API_BASE = getApiBase();

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || "Request failed";
    throw new Error(message);
  }
  return data;
}

export function login(username, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function fetchConfig() {
  return apiRequest("/config");
}

export function updateConfig(config) {
  return apiRequest("/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export async function scanPickupLocation(barcode) {
  return apiRequest("/orders/scan-pickup-location", {
    method: "POST",
    body: JSON.stringify({ barcode }),
  });
}

export async function scanBarcode(barcodeText) {
  return apiRequest("/orders/scan-barcode", {
    method: "POST",
    body: JSON.stringify({
      barcode_text: barcodeText,
    }),
  });
}

export function fetchMachine(params = {}) {
  return apiRequest("/robots/get/machines")
}

export async function fetchSport(robotId) {
  return apiRequest(`/locations/get/spots?robotId=${encodeURIComponent(robotId)}`);
}

export async function createOrder(payload) {
  return apiRequest("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOrderTuskrobot(payload) {
  return apiRequest("/orders/tuskrobot", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMachineDropOptions() {
  return apiRequest("/orders/machine-drop/options");
}

export async function createOrderRecall(payload) {
  return apiRequest("/orders/recall", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------ของเก่า ----------------------------
export function fetchHistory(params = {}) {
  const search = new URLSearchParams(params);
  const suffix = search.toString() ? `?${search}` : "";
  return apiRequest(`/orders/history${suffix}`);
}

export function cancelOrder(orderId) {
  return apiRequest(`/orders/${orderId}/cancel`, { method: "POST" });
}

export function cancelRunningOrder(orderId, releaseOnly = false) {
  return apiRequest(`/orders/${orderId}/cancel-running`, {
    method: "POST",
    body: JSON.stringify({ releaseOnly }),
  });
}

export function fetchRobotStatus(robotId) {
  return apiRequest(`/status/${robotId}`);
}

/** Origin ของ backend (ไม่มี /api) — สำหรับ POST /door/... และ GET /door/... */
function backendOrigin() {
  let b = API_BASE.replace(/\/$/, "");
  if (b.endsWith("/api")) return b.slice(0, -4);
  return b;
}

/** RCS-style body ตาม manual 3.2.3: status 1=ขอเปิด, 2=ขอปิด */
const rcsDoorPayload = (doorCode, status) =>
  JSON.stringify({
    deviceNum: "test",
    doorCode,
    payLoad: "0",
    qrName: "test",
    orderId: 0,
    deviceCode: "TEST",
    status,
  });

export function clearAllTestOutputs() {
  return apiRequest("/test/clear-all-outputs", {
    method: "POST",
    body: "{}",
  });
}
