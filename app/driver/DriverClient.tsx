"use client";

import { useState, useEffect, useRef } from "react";

type EventType = "failed" | "access_issue" | "out_for_delivery";
type Screen = "form" | "sending" | "success" | "uploading" | "photo_sent" | "error";

function formatPhone(val: string): string {
  let v = val.replace(/\D/g, "");
  if (v.startsWith("44")) v = v.slice(2);
  if (v.startsWith("0")) v = v.slice(1);
  if (v.length <= 4) return v;
  if (v.length <= 7) return `${v.slice(0,4)} ${v.slice(4)}`;
  return `${v.slice(0,4)} ${v.slice(4,7)} ${v.slice(7,10)}`;
}

function toE164(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("44")) return `+${digits}`;
  return `+44${digits}`;
}

const WEBHOOK_SECRET = process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "relink_secret_2024";

export default function DriverClient() {
  const [screen, setScreen]             = useState<Screen>("form");
  const [event, setEvent]               = useState<EventType>("failed");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress]           = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [driverPhone, setDriverPhone]   = useState("");
  const [deliveryId, setDeliveryId]     = useState("");
  const [error, setError]               = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const phoneRef   = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const operatorId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("op") || "default"
    : "default";

  useEffect(() => {
    try {
      const saved = localStorage.getItem("relink_driver");
      if (saved) {
        const { phone, merchant } = JSON.parse(saved);
        if (phone) setDriverPhone(phone);
        if (merchant) setMerchantName(merchant);
      }
    } catch {}
    setTimeout(() => phoneRef.current?.focus(), 100);
  }, []);

  async function handleSubmit() {
    const phone = toE164(customerPhone);
    if (phone.length < 10)    { setError("Enter a valid customer phone number."); return; }
    if (!address.trim())      { setError("Enter the delivery address."); return; }
    if (!merchantName.trim()) { setError("Enter the merchant name."); return; }

    try {
      localStorage.setItem("relink_driver", JSON.stringify({
        phone: driverPhone, merchant: merchantName,
      }));
    } catch {}

    setScreen("sending");
    setError("");

    try {
      const body: Record<string, string> = {
        operator_id:    operatorId,
        event,
        merchant_name:  merchantName.trim(),
        customer_name:  "Customer",
        customer_phone: phone,
        address:        address.trim(),
      };
      const dPhone = toE164(driverPhone);
      if (dPhone.length >= 10) body.driver_phone = dPhone;

      const res = await fetch("/api/webhook/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${WEBHOOK_SECRET}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
      setDeliveryId(data.delivery_id);
      setScreen("success");
    } catch (err) {
      setError(String(err));
      setScreen("error");
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadPhoto() {
    if (!photoFile || !deliveryId) return;
    setScreen("uploading");
    try {
      const fd = new FormData();
      fd.append("delivery_id", deliveryId);
      fd.append("photo", photoFile);
      const res = await fetch("/api/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");
      setScreen("photo_sent");
    } catch (err) {
      setError(String(err));
      setScreen("error");
    }
  }

  function reset() {
    setScreen("form");
    setCustomerPhone("");
    setAddress("");
    setError("");
    setDeliveryId("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setTimeout(() => phoneRef.current?.focus(), 100);
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = {
    minHeight: "100dvh", background: "#0f0f0e",
    fontFamily: "'DM Sans',sans-serif",
    display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 40,
  };
  const inner: React.CSSProperties = { width: "100%", maxWidth: 420, padding: "0 20px" };
  const inp: React.CSSProperties = {
    width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: 12, padding: "16px 14px", fontSize: 17, color: "#fff",
    fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "#555", display: "block",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em",
  };
  const bigBtn = (bg = "#1D9E75"): React.CSSProperties => ({
    width: "100%", background: bg, color: "#fff", border: "none",
    borderRadius: 14, padding: "17px", fontSize: 17, fontWeight: 700,
    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
  });

  function NavBar() {
    return (
      <div style={{ width: "100%", maxWidth: 420, padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif" }}>relink</span>
        <span style={{ fontSize: 11, color: "#1D9E75", fontWeight: 600, background: "rgba(29,158,117,0.12)", padding: "4px 10px", borderRadius: 12 }}>Driver</span>
      </div>
    );
  }

  // ── Photo sent ────────────────────────────────────────────────────────────
  if (screen === "photo_sent") return (
    <div style={wrap}>
      <NavBar />
      <div style={{ ...inner, textAlign: "center", paddingTop: 48 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📸</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>Photo sent</h2>
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 28 }}>
          Customer received the photo of their parcel on WhatsApp.
        </p>
        <button onClick={reset} style={bigBtn()}>Next delivery →</button>
      </div>
      <Fonts />
    </div>
  );

  // ── Uploading ─────────────────────────────────────────────────────────────
  if (screen === "uploading") return (
    <div style={{ ...wrap, justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #1D9E75", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.7s linear infinite" }} />
        <div style={{ color: "#666", fontSize: 14 }}>Sending photo to customer...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400&display=swap');`}</style>
    </div>
  );

  // ── Success ───────────────────────────────────────────────────────────────
  if (screen === "success") return (
    <div style={wrap}>
      <NavBar />
      <div style={{ ...inner, paddingTop: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif", marginBottom: 6 }}>Customer notified</h2>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
            {event === "failed" && "WhatsApp sent. Wait up to 2 mins for their reply."}
            {event === "access_issue" && "WhatsApp sent. They'll share access info shortly."}
            {event === "out_for_delivery" && "WhatsApp sent. They know you're on the way."}
          </p>
        </div>

        {/* Safe place photo upload — shown for all events */}
        <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, padding: "18px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", marginBottom: 4 }}>
            📸 Left in safe place? Send proof
          </div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 14, lineHeight: 1.5 }}>
            Take a photo of where you left it — customer gets it instantly on WhatsApp.
          </div>

          {/* Photo preview */}
          {photoPreview && (
            <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", border: "1px solid #2a2a2a" }}>
              <img src={photoPreview} alt="Safe place" style={{ width: "100%", display: "block", maxHeight: 200, objectFit: "cover" }} />
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />

          {!photoFile ? (
            <button
              onClick={() => fileRef.current?.click()}
              style={{ width: "100%", background: "#0f0f0e", border: "1.5px dashed #333", borderRadius: 10, padding: "14px", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
            >
              📷 Take photo or choose from gallery
            </button>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); fileRef.current?.click(); }}
                style={{ background: "#0f0f0e", border: "1px solid #333", borderRadius: 10, padding: "12px", fontSize: 13, color: "#888", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
              >
                Retake
              </button>
              <button
                onClick={uploadPhoto}
                style={{ background: "#1D9E75", border: "none", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
              >
                Send to customer
              </button>
            </div>
          )}
        </div>

        <button onClick={reset} style={{ ...bigBtn("#111"), border: "1px solid #2a2a2a", color: "#888" }}>
          Skip — next delivery →
        </button>
      </div>
      <Fonts />
    </div>
  );

  // ── Sending ───────────────────────────────────────────────────────────────
  if (screen === "sending") return (
    <div style={{ ...wrap, justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #1D9E75", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.7s linear infinite" }} />
        <div style={{ color: "#666", fontSize: 14 }}>Sending WhatsApp...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400&display=swap');`}</style>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (screen === "error") return (
    <div style={wrap}>
      <NavBar />
      <div style={{ ...inner, textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>{error}</p>
        <button onClick={() => setScreen("form")} style={bigBtn()}>Try again</button>
      </div>
      <Fonts />
    </div>
  );

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div style={wrap}>
      <NavBar />
      <div style={inner}>

        {/* What happened */}
        <div style={{ marginBottom: 20, paddingTop: 8 }}>
          <label style={lbl}>What happened?</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {([
              { value: "failed",           icon: "📦", label: "No answer" },
              { value: "access_issue",     icon: "🚪", label: "Can't get in" },
              { value: "out_for_delivery", icon: "🚐", label: "On my way" },
            ] as const).map(opt => (
              <button key={opt.value} onClick={() => setEvent(opt.value)} style={{
                background: event===opt.value ? "rgba(29,158,117,0.15)" : "#1a1a1a",
                border: event===opt.value ? "2px solid #1D9E75" : "1px solid #2a2a2a",
                borderRadius: 12, padding: "14px 8px", cursor: "pointer",
                textAlign: "center", fontFamily: "'DM Sans',sans-serif", transition: "all 0.1s",
              }}>
                <div style={{ fontSize: 24, marginBottom: 5 }}>{opt.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: event===opt.value?"#1D9E75":"#888", lineHeight: 1.3 }}>{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Customer phone */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Customer phone *</label>
          <input
            ref={phoneRef}
            type="tel" inputMode="numeric"
            placeholder="7911 123 456"
            value={customerPhone}
            onChange={e => setCustomerPhone(formatPhone(e.target.value))}
            onKeyDown={e => e.key==="Enter" && document.getElementById("addr")?.focus()}
            style={{ ...inp, fontSize: 22, letterSpacing: "0.04em" }}
          />
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>No need for 07 or +44</div>
        </div>

        {/* Address */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Address *</label>
          <input
            id="addr" type="text"
            placeholder="e.g. 14 Canary Wharf Rd E14"
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key==="Enter" && document.getElementById("merchant")?.focus()}
            style={inp}
          />
        </div>

        {/* Merchant */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Merchant / sender *</label>
          <input
            id="merchant" type="text"
            placeholder="e.g. Bloom and Wild"
            value={merchantName}
            onChange={e => setMerchantName(e.target.value)}
            style={inp}
          />
          {merchantName && <div style={{ fontSize: 11, color: "#1D9E75", marginTop: 4 }}>✓ Saved from last delivery</div>}
        </div>

        {/* Driver phone */}
        <details style={{ marginBottom: 20 }}>
          <summary style={{ fontSize: 13, color: "#555", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span>+</span> Add your number for instant updates
          </summary>
          <input
            type="tel" inputMode="numeric"
            placeholder="Your WhatsApp: 7911 123 456"
            value={driverPhone}
            onChange={e => setDriverPhone(formatPhone(e.target.value))}
            style={{ ...inp, marginTop: 8 }}
          />
        </details>

        {error && (
          <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#FCA5A5", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} style={bigBtn()}>
          Notify customer →
        </button>
        <p style={{ fontSize: 12, color: "#333", textAlign: "center", marginTop: 10 }}>WhatsApp sent in under 60 seconds</p>
      </div>

      <style>{`
        input::placeholder{color:#333}
        input:focus{border-color:#1D9E75!important}
        details>summary::-webkit-details-marker{display:none}
        *{-webkit-tap-highlight-color:transparent}
      `}</style>
      <Fonts />
    </div>
  );
}

function Fonts() {
  return <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>;
}
