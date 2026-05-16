"use client";

import { useState } from "react";

type Flow = "failed" | "access" | "pre";

const flows: Record<Flow, { label: string; tagline: string; initial: string; buttons: string[]; reply: string; confirm: string }> = {
  failed: {
    label: "Failed delivery",
    tagline: "Triggered when driver marks 'no answer'",
    initial: `Hi Sarah 👋 We tried to deliver your **Bloom & Wild** order at 14 Canary Wharf Rd, E14 today at 2:47pm but couldn't reach you.\n\nHow would you like to proceed?`,
    buttons: ["Retry today (4–6pm)", "Leave in safe place", "Nearest pickup point"],
    reply: "Retry today (4–6pm)",
    confirm: "Got it ✓ Your Bloom & Wild parcel will be redelivered between 4–6pm today. Your driver has been notified.",
  },
  access: {
    label: "Access issue",
    tagline: "Triggered live — driver outside building",
    initial: `Hi James, your driver is outside **Harrington House, EC1** right now but can't access the building.\n\nCan you help them in?`,
    buttons: ["Share door code", "Concierge is on duty", "Call me now"],
    reply: "Share door code",
    confirm: "Thanks — your door code has been sent to the driver. They'll attempt delivery again now.",
  },
  pre: {
    label: "Pre-delivery",
    tagline: "Sent 30 mins before estimated arrival",
    initial: `Hi Marcus 📦 Your **Fortnum & Mason** order is about 30 minutes away (est. 3:15–3:30pm).\n\nAre you home?`,
    buttons: ["Yes, I'll be home", "Delay by 1–2 hours", "Leave with neighbour", "Add access instructions"],
    reply: "Yes, I'll be home",
    confirm: "Perfect — your driver is on the way. We'll send a final alert when they're 5 minutes out.",
  },
};

function renderBold(text: string) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

export default function WaDemo() {
  const [active, setActive] = useState<Flow>("failed");
  const [chosen, setChosen] = useState<string | null>(null);
  const flow = flows[active];

  function switchFlow(f: Flow) {
    setActive(f);
    setChosen(null);
  }

  function pickButton(btn: string) {
    if (chosen) return;
    setChosen(btn);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(Object.keys(flows) as Flow[]).map((f) => (
          <button
            key={f}
            onClick={() => switchFlow(f)}
            className="text-sm px-4 py-1.5 rounded-full border transition-all"
            style={{
              border: active === f ? "1.5px solid var(--green-400)" : "1px solid #ddd",
              background: active === f ? "var(--green-400)" : "transparent",
              color: active === f ? "#fff" : "#555",
              fontFamily: "var(--font-body)",
              cursor: "pointer",
            }}
          >
            {flows[f].label}
          </button>
        ))}
      </div>

      {/* Phone */}
      <div className="wa-phone">
        <div className="wa-header">
          <div className="wa-avatar">RL</div>
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>Relink Delivery</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>{flow.tagline}</div>
          </div>
        </div>
        <div className="wa-body">
          {/* Inbound message */}
          <div className="wa-bubble msg-slide" key={active + "-initial"}>
            {flow.initial.split("\n\n").map((para, i) => (
              <p key={i} style={{ marginBottom: i < flow.initial.split("\n\n").length - 1 ? 8 : 0 }}>
                {renderBold(para)}
              </p>
            ))}
            <div className="wa-time">just now ✓✓</div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {flow.buttons.map((btn) => (
              <button
                key={btn}
                className={`wa-action-btn${chosen === btn ? " chosen" : ""}`}
                disabled={!!chosen && chosen !== btn}
                onClick={() => pickButton(btn)}
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Customer reply */}
          {chosen && (
            <div className="wa-bubble out msg-slide">
              {chosen}
              <div className="wa-time">just now ✓✓</div>
            </div>
          )}

          {/* Confirmation */}
          {chosen && (
            <div className="wa-bubble msg-slide" style={{ animationDelay: "0.25s", opacity: 0 }}>
              {flow.confirm}
              <div className="wa-time">just now ✓✓</div>
            </div>
          )}
        </div>
      </div>

      {chosen && (
        <p
          className="text-center mt-3 text-sm"
          style={{ color: "var(--green-600)", fontWeight: 500 }}
        >
          ✓ Operator dashboard updated · Driver notified
        </p>
      )}
    </div>
  );
}
