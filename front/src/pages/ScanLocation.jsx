import { useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import Swal from "sweetalert2";
import ScreenLayout from "../components/ScreenLayout.jsx";
import { scanBarcode, scanPickupLocation, createOrder } from "../api/client.js";
import { useNavigate } from "react-router-dom";

function ScanLocation() {
  const navigate = useNavigate();

  const productInputRef = useRef(null);
  const locationInputRef = useRef(null);

  const [productBarcode, setProductBarcode] = useState("");
  const [locationBarcode, setLocationBarcode] = useState("");

  const [scannedProduct, setScannedProduct] = useState(null);
  const [scannedLocation, setScannedLocation] = useState(null);

  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [result, setResult] = useState(null);

  const toast = (icon, title) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
    });
  };

  useEffect(() => {
    productInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scannedProduct && !scannedLocation) {
      setTimeout(() => locationInputRef.current?.focus(), 100);
    }
  }, [scannedProduct, scannedLocation]);

  const resetAll = () => {
    setProductBarcode("");
    setLocationBarcode("");
    setScannedProduct(null);
    setScannedLocation(null);
    setResult(null);
    setTimeout(() => productInputRef.current?.focus(), 100);
  };

  const resetLocation = () => {
    setLocationBarcode("");
    setScannedLocation(null);
    setResult(null);
    setTimeout(() => locationInputRef.current?.focus(), 100);
  };

  const handleScanProduct = async () => {
    const barcode = productBarcode.trim();
    if (!barcode || loading) return;

    try {
      setLoading(true);
      setResult(null);
      setScannedProduct(null);
      setScannedLocation(null);
      setLocationBarcode("");

      const res = await scanBarcode(barcode);

      if (!res?.ok || !res?.product) {
        toast("error", "ERROR: สแกนสินค้าไม่สำเร็จ");
        return;
      }

      setScannedProduct(res.product);
      toast("success", "สแกนสินค้า สำเร็จ กรุณาสแกน Location");
    } catch (err) {
      toast("error", err?.message || "ERROR: สแกนสินค้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleScanLocation = async () => {
    const barcode = locationBarcode.trim();
    if (!barcode || loading || !scannedProduct) return;

    try {
      setLoading(true);
      setResult(null);

      const res = await scanPickupLocation(barcode);

      if (!res?.ok || !res?.location) {
        toast("error", "ไม่พบ Pickup Location");
        return;
      }

      setScannedLocation(res.location);
      toast("success", "สแกน Location สำเร็จ");
    } catch (err) {
      toast("error", err?.message || "ERROR: สแกน Location ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!scannedProduct || !scannedLocation || confirmLoading) return;

    const confirmResult = await Swal.fire({
      title: "Create Order ?",
      html: `
        <div style="text-align:left">
          <p><b>Product Barcode:</b> ${scannedProduct.barcode_text}</p>
          <p><b>Pickup:</b> ${scannedLocation.name}</p>
          <p><b>RCS:</b> ${scannedLocation.rcsPosition}</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmResult.isConfirmed) return;

    try {
      setConfirmLoading(true);

      const res = await createOrder({
        productBarcode: scannedProduct.barcode_text,
        pickupLocationBarcode: scannedLocation.barcode_text,
      });

      setResult(res);

      if (res.status === "WAITING_BUFFER") {
        await Swal.fire({
          icon: "warning",
          title: "Waiting Buffer",
          text: "Buffer เต็มทั้งหมด ระบบจะรอจนกว่าจะมี Buffer ว่าง",
        });
      } else {
        await Swal.fire({
          icon: "success",
          title: "Order Created",
          html: `
            <div style="text-align:left">
              <p><b>Order ID:</b> ${res.orderId}</p>
              <p><b>Status:</b> ${res.status}</p>
            </div>
          `,
        });
      }
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "ERROR",
        text: err?.message || "Create Order Failed",
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <ScreenLayout title="Scan Location" onBack={() => navigate("/")}>
      <Box
        sx={{
          maxWidth: 720,
          mx: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ p: 2, border: "1px solid #ddd", borderRadius: 2, background: "#fff" }}>
          <Typography fontWeight={700} mb={1}>
            1. Scan Product
          </Typography>

          <input
            ref={productInputRef}
            value={productBarcode}
            disabled={!!scannedProduct || loading}
            onChange={(e) => setProductBarcode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScanProduct()}
            placeholder="Scan product barcode"
            style={{
              width: "100%",
              height: 44,
              fontSize: 18,
              padding: "0 12px",
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          />

          <Box mt={1} display="flex" gap={1}>
            <Button
              variant="contained"
              onClick={handleScanProduct}
              disabled={!productBarcode.trim() || !!scannedProduct || loading}
            >
              Scan Product
            </Button>

            <Button variant="outlined" onClick={resetAll}>
              Clear
            </Button>
          </Box>
        </Box>

        {scannedProduct && (
          <Box sx={{ p: 2, border: "1px solid #ddd", borderRadius: 2, background: "#fff" }}>
            <Typography fontWeight={700} mb={1}>
              2. Scan Pickup Location
            </Typography>

            <input
              ref={locationInputRef}
              value={locationBarcode}
              disabled={!!scannedLocation || loading}
              onChange={(e) => setLocationBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScanLocation()}
              placeholder="Scan pickup location barcode"
              style={{
                width: "100%",
                height: 44,
                fontSize: 18,
                padding: "0 12px",
                border: "1px solid #ccc",
                borderRadius: 8,
              }}
            />

            <Box mt={1} display="flex" gap={1}>
              <Button
                variant="contained"
                onClick={handleScanLocation}
                disabled={!locationBarcode.trim() || !!scannedLocation || loading}
              >
                Scan Location
              </Button>

              <Button variant="outlined" onClick={resetLocation}>
                Clear Location
              </Button>
            </Box>
          </Box>
        )}

        {loading && (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={18} />
            <Typography>กำลังตรวจสอบ...</Typography>
          </Box>
        )}

        {scannedProduct && scannedLocation && (
          <Box sx={{ p: 2, border: "1px solid #ddd", borderRadius: 2, background: "#fff" }}>
            <Typography fontWeight={700} mb={1}>
              Scanned Data
            </Typography>

            <Typography>
              <b>Product ID:</b> {scannedProduct.id}
            </Typography>
            <Typography>
              <b>Product Barcode:</b> {scannedProduct.barcode_text}
            </Typography>
            <Typography>
              <b>Pickup Position:</b> {scannedLocation.name}
            </Typography>
            <Typography>
              <b>Pickup Barcode:</b> {scannedLocation.barcode_text}
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={handleConfirm}
          disabled={!scannedProduct || !scannedLocation || confirmLoading}
        >
          {confirmLoading ? "Confirming..." : "Confirm"}
        </Button>

        {result && (
          <Box sx={{ p: 2, border: "1px solid #ddd", borderRadius: 2, background: "#fff" }}>
            <Typography fontWeight={700}>Order Result</Typography>
            <Typography>
              <b>Order ID:</b> {result.orderId}
            </Typography>
            <Typography>
              <b>Status:</b> {result.status}
            </Typography>
          </Box>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default ScanLocation;