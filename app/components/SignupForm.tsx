"use client";

import { useState } from "react";

export default function SignupForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", fleet: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  function update(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function submit() {
    if (!form.name || !form.email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div
        className="text-center py-8"
        style={{ animation: "fadeUp 0.5s ease forwards" }}
      >
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
          style={{ background: "var(--green-50)" }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 11l5 5L18 6" stroke="var(--green-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3
          className="font-display text-xl mb-2"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          You're on the list
        </h3>
        <p style={{ color: "#666", fontSize: 15 }}>
          We'll be in touch within 24 hours to get you set up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          className="field"
          placeholder="Your name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
        <input
          className="field"
          type="email"
          placeholder="Work email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          className="field"
          placeholder="Company / fleet name"
          value={form.company}
          onChange={(e) => update("company", e.target.value)}
        />
        <input
          className="field"
          placeholder="Fleet size (vans)"
          value={form.fleet}
          onChange={(e) => update("fleet", e.target.value)}
        />
      </div>
      <button
        onClick={submit}
        disabled={status === "loading" || !form.name || !form.email}
        className="w-full py-3 rounded-lg text-white font-medium transition-all"
        style={{
          background: "var(--green-400)",
          fontFamily: "var(--font-body)",
          fontSize: 15,
          opacity: status === "loading" || !form.name || !form.email ? 0.6 : 1,
          cursor: status === "loading" || !form.name || !form.email ? "not-allowed" : "pointer",
          border: "none",
        }}
      >
        {status === "loading" ? "Submitting…" : "Request a pilot spot →"}
      </button>
      {status === "error" && (
        <p className="text-center text-sm" style={{ color: "#c0392b" }}>
          Something went wrong. Email us directly: hello@relink.co.uk
        </p>
      )}
      <p className="text-center text-xs" style={{ color: "#aaa" }}>
        10 pilot spots · London-based operators only · Free for 60 days
      </p>
    </div>
  );
}
