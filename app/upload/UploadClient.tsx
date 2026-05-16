"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props { operatorName: string; }

type UploadState = "idle" | "parsing" | "uploading" | "done" | "error";

interface UploadResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

const TEMPLATE_CSV = `customer_name,customer_phone,merchant_name,address,delivery_window
Sarah Chen,07911123456,Bloom and Wild,14 Canary Wharf Rd E14,3:00-4:00pm
James Okafor,07922345678,Fortnum and Mason,Harrington House EC1,2:00-3:00pm
Priya Sharma,07933456789,Treatwell,Flat 7 44 Old St EC1,4:00-5:00pm`;

export default function UploadClient({ operatorName }: Props) {
  const [state, setState]       = useState<UploadState>("idle");
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState<string[][]>([]);
  const [result, setResult]     = useState<UploadResult | null>(null);
  const [error, setError]       = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function parsePreview(text: string) {
    const lines = text.trim().split("\n").slice(0, 6); // header + 5 rows
    return lines.map(l => l.split(",").map(v => v.trim().replace(/^["']|["']$/g, "")));
  }

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv") && f.type !== "text/csv") {
      setError("Please upload a CSV file.");
      return;
    }
    setFile(f);
    setError("");
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setPreview(parsePreview(text));
    };
    reader.readAsText(f);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function handleUpload() {
    if (!file) return;
    setState("uploading");
    try {
      const fd = new FormData();
      fd.append("csv", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResult(data);
      setState("done");
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setState("error");
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relink-manifest-template.csv";
    a.click();
  }

  function reset() {
    setState("idle");
    setFile(null);
    setPreview([]);
    setResult(null);
    setError("");
  }

  // ── Styles ──────────────────────────────────────────────────────────────
  const page: React.CSSProperties = { minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans',sans-serif" };
  const nav: React.CSSProperties  = { background: "#fff", borderBottom: "1px solid #EBEBЕ6", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 };
  const inner: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "40px 24px" };
  const card: React.CSSProperties  = { background: "#fff", border: "1px solid #EBEBЕ6", borderRadius: 14, padding: "24px" };
  const btn = (bg = "#1D9E75", color = "#fff"): React.CSSProperties => ({
    background: bg, color, border: bg === "transparent" ? "1px solid #ddd" : "none",
    padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500,
    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
  });

  return (
    <div style={page}>
      <nav style={nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", color: "#0f0f0e", fontFamily: "'Syne',sans-serif" }}>relink</span>
          </a>
          <span style={{ color: "#ddd" }}>/</span>
          <a href="/dashboard" style={{ textDecoration: "none", fontSize: 14, color: "#888" }}>Dashboard</a>
          <span style={{ color: "#ddd" }}>/</span>
          <span style={{ fontSize: 14, color: "#555" }}>Upload manifest</span>
        </div>
        <span style={{ fontSize: 13, color: "#555" }}>{operatorName}</span>
      </nav>

      <div style={inner}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f0f0e", letterSpacing: "-0.02em", marginBottom: 8, fontFamily: "'Syne',sans-serif" }}>
            Upload delivery manifest
          </h1>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6 }}>
            Upload your morning delivery CSV. Customers get a WhatsApp pre-delivery notification automatically — before your drivers even leave the depot.
          </p>
        </div>

        {/* Done state */}
        {state === "done" && result && (
          <div style={{ ...card, marginBottom: 20, border: "1.5px solid #1D9E75" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#0f0f0e", marginBottom: 16, fontFamily: "'Syne',sans-serif" }}>
              {result.sent} of {result.total} messages sent
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total rows", value: result.total },
                { label: "Sent ✓",    value: result.sent,   color: "#059669" },
                { label: "Failed",    value: result.failed, color: result.failed > 0 ? "#DC2626" : "#059669" },
              ].map(s => (
                <div key={s.label} style={{ background: "#FAFAF8", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color || "#0f0f0e", fontFamily: "'Syne',sans-serif" }}>{s.value}</div>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#DC2626", marginBottom: 6 }}>Errors:</div>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#DC2626" }}>{e}</div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/dashboard"><button style={btn()}>View dashboard →</button></a>
              <button style={btn("transparent", "#555")} onClick={reset}>Upload another</button>
            </div>
          </div>
        )}

        {state !== "done" && (
          <>
            {/* Template download */}
            <div style={{ ...card, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0f0f0e", marginBottom: 3 }}>📄 CSV template</div>
                <div style={{ fontSize: 13, color: "#888" }}>Required columns: customer_name, customer_phone, merchant_name, address, delivery_window</div>
              </div>
              <button style={btn("transparent", "#1D9E75")} onClick={downloadTemplate}>
                Download template
              </button>
            </div>

            {/* Drop zone */}
            <div
              style={{ ...card, marginBottom: 16 }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {!file ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? "#1D9E75" : "#ddd"}`,
                    borderRadius: 10,
                    padding: "40px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragging ? "#F0FDF9" : "transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#333", marginBottom: 6 }}>
                    Drop your CSV here or click to browse
                  </div>
                  <div style={{ fontSize: 13, color: "#aaa" }}>
                    Supports .csv files up to 10MB (~5,000 deliveries)
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 20 }}>📄</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#0f0f0e" }}>{file.name}</div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button onClick={reset} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 18 }}>✕</button>
                  </div>

                  {/* Preview table */}
                  {preview.length > 0 && (
                    <div style={{ overflowX: "auto", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Preview ({preview.length - 1} of {preview.length - 1} rows shown)
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: "#FAFAF8" }}>
                            {preview[0]?.map((h, i) => (
                              <th key={i} style={{ padding: "7px 10px", textAlign: "left", color: "#888", fontWeight: 500, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.slice(1).map((row, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #F9FAFB" }}>
                              {row.map((cell, j) => (
                                <td key={j} style={{ padding: "7px 10px", color: "#555", whiteSpace: "nowrap" }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626", marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* Upload button */}
            {file && state !== "uploading" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...btn(), fontSize: 15, padding: "12px 28px" }} onClick={handleUpload}>
                  Send {preview.length > 1 ? preview.length - 1 : ""} WhatsApp messages →
                </button>
                <button style={btn("transparent", "#555")} onClick={reset}>Cancel</button>
              </div>
            )}

            {state === "uploading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "#F0FDF9", border: "1px solid #A7F3D0", borderRadius: 10 }}>
                <div style={{ width: 20, height: 20, border: "2px solid #1D9E75", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                <div style={{ fontSize: 14, color: "#065F46" }}>Sending WhatsApp messages... This may take a moment for large manifests.</div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
