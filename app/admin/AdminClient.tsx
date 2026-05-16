"use client";

import { useState, useEffect, useCallback } from "react";

interface Operator {
  id: string;
  name: string;
  email: string;
  fleet_size: number | null;
  active: boolean;
  created_at: string;
  delivery_count?: number;
}

interface NewOperator {
  name: string;
  email: string;
  fleet_size: string;
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function copyToClipboard(text: string, setCopied: (v: string) => void, key: string) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  });
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://relinkuk.vercel.app";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "relink_admin_2024";

export default function AdminClient() {

  // ── Auth gate ───────────────────────────────────────────────────────────────
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  function checkPin() {
    if (pin === ADMIN_SECRET) {
      setAuthed(true);
      sessionStorage.setItem("relink_admin", "1");
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 1500);
    }
  }

  useEffect(() => {
    if (sessionStorage.getItem("relink_admin") === "1") setAuthed(true);
  }, []);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState("");
  const [selected, setSelected] = useState<Operator | null>(null);
  const [form, setForm] = useState<NewOperator>({ name: "", email: "", fleet_size: "" });
  const [formError, setFormError] = useState("");
  const [newOperator, setNewOperator] = useState<Operator | null>(null);

  const loadOperators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operators");
      const data = await res.json();
      setOperators(data.operators || []);
    } catch {
      setOperators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadOperators();
  }, [authed, loadOperators]);

  async function createOperator() {
    if (!form.name || !form.email) {
      setFormError("Name and email are required.");
      return;
    }
    setCreating(true);
    setFormError("");
    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          fleet_size: form.fleet_size ? parseInt(form.fleet_size) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setNewOperator(data.operator);
      setForm({ name: "", email: "", fleet_size: "" });
      setShowForm(false);
      await loadOperators();
    } catch (err) {
      setFormError(String(err));
    } finally {
      setCreating(false);
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: "100vh",
      background: "#FAFAF8",
      fontFamily: "'DM Sans', sans-serif",
    },
    nav: {
      background: "#fff",
      borderBottom: "1px solid #EBEBЕ6",
      padding: "0 24px",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky" as const,
      top: 0,
      zIndex: 40,
    },
    inner: {
      maxWidth: 1000,
      margin: "0 auto",
      padding: "32px 24px",
    },
    card: {
      background: "#fff",
      border: "1px solid #EBEBЕ6",
      borderRadius: 14,
      padding: "20px 24px",
    },
    input: {
      width: "100%",
      border: "1px solid #ddd",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 14,
      fontFamily: "'DM Sans', sans-serif",
      outline: "none",
      boxSizing: "border-box" as const,
      color: "#0f0f0e",
      background: "#fff",
    },
    label: {
      fontSize: 12,
      fontWeight: 500,
      color: "#888",
      display: "block",
      marginBottom: 5,
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
    },
    btn: {
      background: "#1D9E75",
      color: "#fff",
      border: "none",
      padding: "10px 20px",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
    },
    btnGhost: {
      background: "transparent",
      color: "#555",
      border: "1px solid #ddd",
      padding: "10px 20px",
      borderRadius: 8,
      fontSize: 14,
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
    },
    copyBtn: {
      background: "transparent",
      border: "none",
      color: "#1D9E75",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      padding: "2px 6px",
    },
    pill: (active: boolean) => ({
      fontSize: 11,
      fontWeight: 500,
      padding: "3px 9px",
      borderRadius: 20,
      background: active ? "#ECFDF5" : "#F3F4F6",
      color: active ? "#059669" : "#9CA3AF",
    }),
  };

  // ── Pin screen ──────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f0f0e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: "center", width: 300 }}>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.03em",
            fontFamily: "'Syne', sans-serif",
            marginBottom: 24,
          }}>
            relink admin
          </div>
          <input
            type="password"
            placeholder="Admin password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === "Enter" && checkPin()}
            style={{
              width: "100%",
              background: pinError ? "rgba(220,38,38,0.1)" : "#1a1a1a",
              border: pinError ? "1px solid #DC2626" : "1px solid #2a2a2a",
              borderRadius: 10,
              padding: "13px 14px",
              fontSize: 15,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 12,
              textAlign: "center",
              letterSpacing: "0.1em",
            }}
          />
          <button
            onClick={checkPin}
            style={{ ...s.btn, width: "100%", padding: "13px" }}
          >
            Enter
          </button>
          {pinError && (
            <div style={{ color: "#FCA5A5", fontSize: 13, marginTop: 10 }}>
              Incorrect password
            </div>
          )}
        </div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500&display=swap');`}</style>
      </div>
    );
  }

  // ── Main admin ──────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: "#0f0f0e", fontFamily: "'Syne', sans-serif" }}>
              relink
            </span>
          </a>
          <span style={{ color: "#ddd" }}>/</span>
          <span style={{ fontSize: 14, color: "#555" }}>Admin</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/dashboard">
            <button style={s.btnGhost}>Dashboard</button>
          </a>
          <button style={s.btn} onClick={() => setShowForm(true)}>
            + Add operator
          </button>
        </div>
      </nav>

      <div style={s.inner}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total operators", value: operators.length },
            { label: "Active", value: operators.filter(o => o.active).length },
            { label: "Total fleet size", value: operators.reduce((a, o) => a + (o.fleet_size || 0), 0) },
          ].map(s => (
            <div key={s.label} style={{
              background: "#fff",
              border: "1px solid #EBEBЕ6",
              borderRadius: 12,
              padding: "16px 20px",
            }}>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#0f0f0e", letterSpacing: "-0.02em", fontFamily: "'Syne', sans-serif" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* New operator success banner */}
        {newOperator && (
          <div style={{
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#065F46", marginBottom: 10 }}>
              ✅ Operator created — share these details with {newOperator.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Driver form URL", value: `${APP_URL}/driver?op=${newOperator.id}` },
                { label: "Webhook URL", value: `${APP_URL}/api/webhook/delivery` },
                { label: "Operator ID", value: newOperator.id },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#666", minWidth: 120 }}>{row.label}:</span>
                  <code style={{ fontSize: 12, color: "#065F46", background: "rgba(255,255,255,0.6)", padding: "2px 8px", borderRadius: 4, flex: 1, wordBreak: "break-all" as const }}>
                    {row.value}
                  </code>
                  <button
                    style={s.copyBtn}
                    onClick={() => copyToClipboard(row.value, setCopied, row.label)}
                  >
                    {copied === row.label ? "✓" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setNewOperator(null)}
              style={{ ...s.btnGhost, fontSize: 12, padding: "6px 12px", marginTop: 12 }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create operator form */}
        {showForm && (
          <div style={{ ...s.card, marginBottom: 20, border: "1.5px solid #1D9E75" }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#0f0f0e", marginBottom: 20 }}>
              Add new operator
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={s.label}>Company name *</label>
                <input
                  style={s.input}
                  placeholder="e.g. TechLondon Couriers"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={s.label}>Email *</label>
                <input
                  style={s.input}
                  type="email"
                  placeholder="ops@courier.co.uk"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label style={s.label}>Fleet size</label>
                <input
                  style={s.input}
                  type="number"
                  placeholder="e.g. 25"
                  value={form.fleet_size}
                  onChange={e => setForm({ ...form, fleet_size: e.target.value })}
                />
              </div>
            </div>
            {formError && (
              <div style={{ fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{formError}</div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={s.btn}
                onClick={createOperator}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create operator"}
              </button>
              <button
                style={s.btnGhost}
                onClick={() => { setShowForm(false); setFormError(""); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Operators table */}
        <div style={s.card}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: "#0f0f0e" }}>
            Operators ({operators.length})
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#aaa", fontSize: 14 }}>
              Loading...
            </div>
          ) : operators.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🚐</div>
              <div style={{ fontSize: 15, color: "#888", marginBottom: 16 }}>No operators yet</div>
              <button style={s.btn} onClick={() => setShowForm(true)}>
                Add your first operator
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
                  {["Company", "Email", "Fleet", "Status", "Driver form", "Added"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500, color: "#aaa", fontSize: 12 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operators.map((op, i) => (
                  <tr
                    key={op.id}
                    onClick={() => setSelected(selected?.id === op.id ? null : op)}
                    style={{
                      borderBottom: i < operators.length - 1 ? "1px solid #F9FAFB" : "none",
                      cursor: "pointer",
                      background: selected?.id === op.id ? "#F0FDF9" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px", fontWeight: 500, color: "#0f0f0e" }}>
                      {op.name}
                    </td>
                    <td style={{ padding: "12px", color: "#777" }}>{op.email}</td>
                    <td style={{ padding: "12px", color: "#777" }}>
                      {op.fleet_size ? `${op.fleet_size} vans` : "—"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={s.pill(op.active)}>
                        {op.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        style={s.copyBtn}
                        onClick={e => {
                          e.stopPropagation();
                          copyToClipboard(`${APP_URL}/driver?op=${op.id}`, setCopied, op.id);
                        }}
                      >
                        {copied === op.id ? "✓ Copied" : "Copy link"}
                      </button>
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>{timeAgo(op.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Operator detail panel */}
        {selected && (
          <div style={{ ...s.card, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#0f0f0e" }}>
                {selected.name} — details
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", color: "#aaa", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Operator ID", value: selected.id },
                { label: "Driver form URL", value: `${APP_URL}/driver?op=${selected.id}` },
                { label: "Manual webhook URL", value: `${APP_URL}/api/webhook/delivery` },
                { label: "Webhook secret", value: process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "relink_secret_2024" },
                { label: "Onfleet webhook URL", value: `${APP_URL}/api/integrations/onfleet?op=${selected.id}` },
                { label: "Circuit webhook URL", value: `${APP_URL}/api/integrations/circuit?op=${selected.id}` },
              ].map(row => (
                <div key={row.label} style={{
                  background: "#FAFAF8",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <span style={{ fontSize: 12, color: "#888", minWidth: 130 }}>{row.label}</span>
                  <code style={{ fontSize: 12, color: "#333", flex: 1, wordBreak: "break-all" as const }}>
                    {row.value}
                  </code>
                  <button
                    style={s.copyBtn}
                    onClick={() => copyToClipboard(row.value, setCopied, row.label + selected.id)}
                  >
                    {copied === row.label + selected.id ? "✓" : "Copy"}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: "12px 14px", background: "#EFF6FF", borderRadius: 8, fontSize: 13, color: "#1D4ED8" }}>
              💡 Send the driver form URL to the fleet manager. They share it with their drivers via WhatsApp group. Done.
            </div>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500&display=swap');
        input:focus { border-color: #1D9E75 !important; outline: none; }
      `}</style>
    </div>
  );
}
