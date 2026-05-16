"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginClient() {
  const [apiKey, setApiKey]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    fetch("/api/auth/check").then(r => r.json()).then(d => {
      if (d.ok) router.replace("/dashboard");
    }).catch(() => {});
  }, []);

  async function handleLogin() {
    if (!apiKey.trim()) { setError("Enter your API key."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f0e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.03em",
            fontFamily: "'Syne', sans-serif",
            marginBottom: 8,
          }}>
            relink
          </div>
          <div style={{ fontSize: 14, color: "#555" }}>
            Operator dashboard login
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: "28px 24px",
        }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#ddd", marginBottom: 6 }}>
            Enter your API key
          </div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 1.5 }}>
            Your API key was provided when your account was created.
            Contact support if you've lost it.
          </div>

          <input
            type="password"
            placeholder="relink_••••••••••••••••"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            autoFocus
            style={{
              width: "100%",
              background: "#0f0f0e",
              border: error ? "1px solid #DC2626" : "1px solid #333",
              borderRadius: 10,
              padding: "13px 14px",
              fontSize: 15,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 12,
              letterSpacing: "0.05em",
            }}
          />

          {error && (
            <div style={{
              fontSize: 13,
              color: "#FCA5A5",
              marginBottom: 12,
              padding: "8px 12px",
              background: "rgba(220,38,38,0.1)",
              borderRadius: 8,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#0a5c42" : "#1D9E75",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "13px",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#444" }}>
          Need access?{" "}
          <a href="/#signup" style={{ color: "#1D9E75", textDecoration: "none" }}>
            Get early access
          </a>
        </div>

      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
        input::placeholder { color: #444; }
        input:focus { border-color: #1D9E75 !important; }
      `}</style>
    </div>
  );
}
