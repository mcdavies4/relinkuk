"use client";

import { useState, useEffect, useRef } from "react";

type Flow = "failed" | "access" | "pre";
type Stage = "idle" | "typing" | "buttons" | "replied" | "confirming" | "done";

interface Message {
  id: string;
  type: "inbound" | "outbound" | "status";
  text: string;
  delay: number;
}

const FLOWS: Record<Flow, {
  label: string;
  icon: string;
  scenario: string;
  scenarioDetail: string;
  messages: Message[];
  buttons: string[];
  confirmText: string;
  dashboardUpdate: string;
}> = {
  failed: {
    label: "Failed delivery",
    icon: "📦",
    scenario: "Driver marked 'no answer' at 2:47pm",
    scenarioDetail: "Your system fires the webhook. Relink takes over.",
    messages: [
      {
        id: "m1",
        type: "inbound",
        text: "Hi Sarah 👋\n\nWe tried to deliver your *Bloom & Wild* order at 14 Canary Wharf Rd, E14 today at 2:47pm but couldn't reach you.\n\nHow would you like to proceed?",
        delay: 800,
      },
    ],
    buttons: ["🔄  Retry today (4–6pm)", "🏠  Leave in safe place", "📍  Nearest pickup point", "💬  Message driver"],
    confirmText: "Got it ✓\n\nYour Bloom & Wild parcel will be redelivered between 4–6pm today. Your driver has been notified.",
    dashboardUpdate: "Recovery: redelivery booked 4–6pm · cost saved ~£12",
  },
  access: {
    label: "Access issue",
    icon: "🚪",
    scenario: "Driver outside Harrington House, EC1",
    scenarioDetail: "Can't get in. 90 seconds before they leave.",
    messages: [
      {
        id: "a1",
        type: "inbound",
        text: "Hi James ⚠️\n\nYour driver is outside *Harrington House, EC1* right now but can't access the building.\n\nCan you help them in?",
        delay: 800,
      },
    ],
    buttons: ["🔑  Share door code", "👤  Concierge is on duty", "📞  Call me now", "📍  Pin my location"],
    confirmText: "Thanks — your door code has been sent directly to the driver. They're attempting delivery now.",
    dashboardUpdate: "Access resolved · driver proceeding · ETA 2 mins",
  },
  pre: {
    label: "Pre-delivery",
    icon: "⏱",
    scenario: "30 mins before estimated arrival",
    scenarioDetail: "Prevent the failure before it happens.",
    messages: [
      {
        id: "p1",
        type: "inbound",
        text: "Hi Marcus 📦\n\nYour *Fortnum & Mason* order is about 30 minutes away (est. 3:15–3:30pm).\n\nAre you home?",
        delay: 800,
      },
    ],
    buttons: ["✅  Yes, I'll be home", "⏰  Delay by 1–2 hours", "🏘  Leave with neighbour", "🗒  Add access note"],
    confirmText: "Perfect — your driver is on the way. We'll send a final ping when they're 5 minutes out.",
    dashboardUpdate: "Customer confirmed home · first-attempt success expected",
  },
};

function parseText(text: string) {
  return text.split(/\*(.*?)\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ fontWeight: 600 }}>{part}</strong>
      : part.split("\n").map((line, j, arr) => (
          <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
        ))
  );
}

export default function DemoClient() {
  const [activeFlow, setActiveFlow] = useState<Flow>("failed");
  const [stage, setStage] = useState<Stage>("idle");
  const [chosenBtn, setChosenBtn] = useState<string | null>(null);
  const [showDash, setShowDash] = useState(false);
  const [typingDots, setTypingDots] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const flow = FLOWS[activeFlow];

  useEffect(() => {
    reset();
    const t = setTimeout(() => setStage("typing"), 600);
    return () => clearTimeout(t);
  }, [activeFlow]);

  useEffect(() => {
    if (stage === "typing") {
      const t = setTimeout(() => setStage("buttons"), 1400);
      return () => clearTimeout(t);
    }
    if (stage === "confirming") {
      const t = setTimeout(() => {
        setStage("done");
        setShowDash(true);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [stage]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (stage === "typing" || stage === "confirming") {
      interval = setInterval(() => setTypingDots(d => (d + 1) % 4), 380);
    }
    return () => clearInterval(interval);
  }, [stage, activeFlow]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [stage, chosenBtn, showDash]);

  function reset() {
    setStage("idle");
    setChosenBtn(null);
    setShowDash(false);
  }

  function switchFlow(f: Flow) {
    if (f === activeFlow) return;
    setActiveFlow(f);
  }

  function pickBtn(btn: string) {
    if (chosenBtn || stage !== "buttons") return;
    setChosenBtn(btn);
    setStage("confirming");
  }

  function restart() {
    reset();
    setTimeout(() => setStage("typing"), 400);
  }

  const dots = ".".repeat(typingDots) + "\u00a0".repeat(3 - typingDots);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0f0f0e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'DM Sans', sans-serif",
      padding: "0 0 40px",
    }}>

      {/* Top bar */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px 0",
      }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", fontFamily: "'Syne', sans-serif" }}>
            relink
          </span>
        </a>
        <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>
          interactive demo
        </span>
      </div>

      {/* Hero text */}
      <div style={{ width: "100%", maxWidth: 420, padding: "28px 20px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>
          Failed delivery?<br />
          <span style={{ color: "#1D9E75" }}>Resolved on WhatsApp.</span>
        </p>
        <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
          Tap a scenario below, then interact as the customer.
        </p>
      </div>

      {/* Flow selector */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        padding: "0 20px 20px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8,
      }}>
        {(Object.entries(FLOWS) as [Flow, typeof FLOWS[Flow]][]).map(([key, f]) => (
          <button
            key={key}
            onClick={() => switchFlow(key)}
            style={{
              padding: "10px 8px",
              borderRadius: 12,
              border: activeFlow === key ? "1.5px solid #1D9E75" : "1px solid #2a2a2a",
              background: activeFlow === key ? "rgba(29,158,117,0.12)" : "#1a1a1a",
              color: activeFlow === key ? "#1D9E75" : "#888",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              textAlign: "center",
              lineHeight: 1.4,
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
            {f.label}
          </button>
        ))}
      </div>

      {/* Scenario context */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        padding: "0 20px 16px",
      }}>
        <div style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#1D9E75",
            flexShrink: 0,
            boxShadow: "0 0 0 3px rgba(29,158,117,0.2)",
          }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#ddd" }}>{flow.scenario}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{flow.scenarioDetail}</div>
          </div>
        </div>
      </div>

      {/* WhatsApp phone frame */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        padding: "0 20px",
        flex: 1,
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid #333",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>

          {/* WA header */}
          <div style={{
            background: "#075E54",
            padding: "14px 16px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#1D9E75",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}>RL</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 500 }}>Relink Delivery</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>
                {stage === "typing" || stage === "confirming" ? `typing${dots}` : "online"}
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 20 }}>⋮</div>
          </div>

          {/* Chat body */}
          <div
            ref={bodyRef}
            style={{
              background: "#ECE5DD",
              padding: "16px 12px 12px",
              minHeight: 320,
              maxHeight: 420,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Date stamp */}
            <div style={{
              textAlign: "center",
              fontSize: 11,
              color: "#888",
              background: "rgba(255,255,255,0.6)",
              borderRadius: 8,
              padding: "3px 10px",
              alignSelf: "center",
            }}>TODAY</div>

            {/* Typing indicator */}
            {stage === "typing" && (
              <div style={{
                background: "#fff",
                borderRadius: "12px 12px 12px 2px",
                padding: "10px 14px",
                alignSelf: "flex-start",
                maxWidth: "80%",
                animation: "fadeSlide 0.25s ease forwards",
              }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center", height: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#aaa",
                      animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Main inbound message */}
            {(stage === "buttons" || stage === "replied" || stage === "confirming" || stage === "done") && (
              <div style={{
                background: "#fff",
                borderRadius: "12px 12px 12px 2px",
                padding: "11px 13px",
                alignSelf: "flex-start",
                maxWidth: "85%",
                fontSize: 14,
                lineHeight: 1.55,
                color: "#111",
                border: "0.5px solid rgba(0,0,0,0.06)",
                animation: "fadeSlide 0.3s ease forwards",
              }}>
                {parseText(flow.messages[0].text)}
                <div style={{ fontSize: 11, color: "#999", textAlign: "right", marginTop: 5 }}>2:51 ✓✓</div>
              </div>
            )}

            {/* Action buttons */}
            {(stage === "buttons" || stage === "confirming" || stage === "done") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, animation: "fadeSlide 0.3s ease forwards" }}>
                {flow.buttons.map((btn) => (
                  <button
                    key={btn}
                    onClick={() => pickBtn(btn)}
                    disabled={!!chosenBtn}
                    style={{
                      background: chosenBtn === btn ? "rgba(29,158,117,0.08)" : "#fff",
                      border: chosenBtn === btn ? "1.5px solid #1D9E75" : "0.5px solid #ddd",
                      borderRadius: 10,
                      padding: "10px 13px",
                      fontSize: 13,
                      color: chosenBtn === btn ? "#085041" : "#075E54",
                      fontWeight: 500,
                      cursor: chosenBtn ? "default" : "pointer",
                      textAlign: "center",
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: (chosenBtn && chosenBtn !== btn) ? 0.35 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            )}

            {/* Customer reply bubble */}
            {chosenBtn && (
              <div style={{
                background: "#DCF8C6",
                borderRadius: "12px 12px 2px 12px",
                padding: "11px 13px",
                alignSelf: "flex-end",
                maxWidth: "80%",
                fontSize: 14,
                color: "#111",
                animation: "fadeSlide 0.25s ease forwards",
              }}>
                {chosenBtn.replace(/^[^\s]+\s+/, "")}
                <div style={{ fontSize: 11, color: "#6a9e75", textAlign: "right", marginTop: 5 }}>2:52 ✓✓</div>
              </div>
            )}

            {/* Typing again */}
            {stage === "confirming" && (
              <div style={{
                background: "#fff",
                borderRadius: "12px 12px 12px 2px",
                padding: "10px 14px",
                alignSelf: "flex-start",
                animation: "fadeSlide 0.25s ease forwards",
              }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center", height: 16 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#aaa",
                      animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Confirm message */}
            {stage === "done" && (
              <div style={{
                background: "#fff",
                borderRadius: "12px 12px 12px 2px",
                padding: "11px 13px",
                alignSelf: "flex-start",
                maxWidth: "85%",
                fontSize: 14,
                lineHeight: 1.55,
                color: "#111",
                border: "0.5px solid rgba(0,0,0,0.06)",
                animation: "fadeSlide 0.3s ease forwards",
              }}>
                {parseText(flow.confirmText)}
                <div style={{ fontSize: 11, color: "#999", textAlign: "right", marginTop: 5 }}>2:52 ✓✓</div>
              </div>
            )}
          </div>

          {/* WA input bar */}
          <div style={{
            background: "#F0F0F0",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <div style={{
              flex: 1,
              background: "#fff",
              borderRadius: 20,
              padding: "8px 14px",
              fontSize: 14,
              color: "#aaa",
            }}>Message</div>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#075E54",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}>🎤</div>
          </div>
        </div>
      </div>

      {/* Operator dashboard update */}
      {showDash && (
        <div style={{
          width: "100%",
          maxWidth: 420,
          padding: "16px 20px 0",
          animation: "fadeSlide 0.4s ease forwards",
        }}>
          <div style={{
            background: "#0a1f17",
            border: "1px solid rgba(29,158,117,0.3)",
            borderRadius: 14,
            padding: "16px",
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#1D9E75",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}>
              ↗ Operator dashboard updated
            </div>
            <div style={{ fontSize: 13, color: "#9fe1cb", lineHeight: 1.5 }}>
              {flow.dashboardUpdate}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 14,
            }}>
              {[
                { label: "Response time", value: "48 sec" },
                { label: "Resolution", value: "✓ Resolved" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "rgba(29,158,117,0.08)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1D9E75" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Restart / CTA */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        padding: "20px 20px 0",
        display: "flex",
        gap: 10,
      }}>
        {stage === "done" && (
          <button
            onClick={restart}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "1px solid #2a2a2a",
              background: "#1a1a1a",
              color: "#aaa",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ↺ Restart
          </button>
        )}
        <a href="/#signup" style={{ flex: 2, textDecoration: "none" }}>
          <button style={{
            width: "100%",
            padding: "12px",
            borderRadius: 12,
            border: "none",
            background: "#1D9E75",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Get early access →
          </button>
        </a>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
