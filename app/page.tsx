import WaDemo from "./components/WaDemo";
import SignupForm from "./components/SignupForm";

export default function Home() {
  return (
    <main>
      {/* NAV */}
      <nav style={{ borderBottom:"1px solid #e8e8e4", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#FAFAF8", position:"sticky", top:0, zIndex:50 }}>
        <span className="font-display" style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.01em" }}>relink</span>
        <a href="#signup" style={{ fontSize:13, fontWeight:500, background:"var(--green-400)", color:"#fff", padding:"7px 16px", borderRadius:6, textDecoration:"none" }}>Join pilot</a>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth:760, margin:"0 auto", padding:"80px 24px 64px", textAlign:"center" }}>
        <div className="animate-fade-up animate-delay-1" style={{ display:"inline-flex", alignItems:"center", gap:8, background:"var(--green-50)", color:"var(--green-800)", fontSize:12, fontWeight:500, padding:"5px 14px", borderRadius:20, marginBottom:24 }}>
          <span className="pulse-dot" style={{ width:7, height:7, borderRadius:"50%", background:"var(--green-400)", display:"inline-block" }} />
          Private pilot · London · 10 spots
        </div>
        <h1 className="font-display animate-fade-up animate-delay-2" style={{ fontSize:"clamp(36px, 6vw, 56px)", fontWeight:800, lineHeight:1.08, letterSpacing:"-0.03em", marginBottom:20 }}>
          Failed deliveries,<br /><span style={{ color:"var(--green-400)" }}>resolved on WhatsApp</span>
        </h1>
        <p className="animate-fade-up animate-delay-3" style={{ fontSize:18, color:"#555", lineHeight:1.65, maxWidth:480, margin:"0 auto 32px" }}>
          When your driver can&apos;t get in, your customer gets a WhatsApp in under 60 seconds — and resolves it in 3 taps. Before the driver leaves the street.
        </p>
        <div className="animate-fade-up animate-delay-4" style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <a href="#signup" style={{ background:"var(--green-400)", color:"#fff", padding:"13px 28px", borderRadius:8, fontSize:15, fontWeight:500, textDecoration:"none" }}>Get early access →</a>
          <a href="#how" style={{ background:"transparent", color:"#333", border:"1px solid #ddd", padding:"13px 28px", borderRadius:8, fontSize:15, textDecoration:"none" }}>See how it works</a>
        </div>
      </section>

      {/* STATS */}
      <div style={{ borderTop:"1px solid #e8e8e4", borderBottom:"1px solid #e8e8e4" }}>
        <div style={{ maxWidth:760, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            { n:"1 in 8", l:"UK deliveries fail" },
            { n:"£10–14", l:"cost per redelivery" },
            { n:"60s", l:"to WhatsApp customer" },
            { n:"~30%", l:"same-day recovery" },
          ].map((s, i) => (
            <div key={i} style={{ padding:"20px 16px", textAlign:"center", borderRight: i<3 ? "1px solid #e8e8e4" : "none" }}>
              <div className="font-display" style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.02em" }}>{s.n}</div>
              <div style={{ fontSize:12, color:"#888", marginTop:3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how" style={{ maxWidth:760, margin:"0 auto", padding:"80px 24px" }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"var(--green-400)", textTransform:"uppercase", marginBottom:10 }}>How it works</div>
          <h2 className="font-display" style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em", marginBottom:10 }}>From failed attempt to resolved — inside WhatsApp</h2>
          <p style={{ fontSize:16, color:"#666", lineHeight:1.65, maxWidth:500 }}>No app downloads. No portal logins. The customer resolves the delivery in the app they already have open.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
            {[
              { n:"01", title:"Driver marks failed", desc:"Via their existing app or our lightweight status form. Takes 3 seconds." },
              { n:"02", title:"Customer gets a WhatsApp", desc:"Personalised message with one-tap resolution options. Under 60 seconds." },
              { n:"03", title:"Customer resolves it", desc:"Retry window, safe place, access code, neighbour — whatever works." },
              { n:"04", title:"Driver gets re-routed", desc:"Instruction goes straight to driver. Operator sees everything in the dashboard." },
            ].map(step => (
              <div key={step.n} style={{ display:"flex", gap:16 }}>
                <div className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:"var(--green-400)", minWidth:24, paddingTop:2 }}>{step.n}</div>
                <div>
                  <div style={{ fontWeight:500, fontSize:15, marginBottom:4 }}>{step.title}</div>
                  <div style={{ fontSize:14, color:"#777", lineHeight:1.6 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <WaDemo />
        </div>
      </section>

      <div style={{ height:1, background:"#e8e8e4" }} />

      {/* THE PROBLEM */}
      <section style={{ maxWidth:760, margin:"0 auto", padding:"80px 24px" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"var(--green-400)", textTransform:"uppercase", marginBottom:10 }}>The problem</div>
        <h2 className="font-display" style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em", marginBottom:10 }}>Today&apos;s failed delivery is a broken loop</h2>
        <p style={{ fontSize:16, color:"#666", lineHeight:1.65, marginBottom:40, maxWidth:520 }}>Customers get a card through the door. Operators pay to redeliver. Merchants lose the customer. Nobody wins.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { type:"bad", title:"Today", text:"Driver leaves, drops a card. Customer calls a 03 number. Waits on hold. Rebooks for 3 days later." },
            { type:"good", title:"With Relink", text:"Driver marks failed. Customer gets a WhatsApp in 60 seconds. Resolves in 3 taps. Driver rerouted." },
            { type:"bad", title:"Today", text:"Apartment access fails. Driver has no real-time way to reach the customer. Parcel goes back to depot." },
            { type:"good", title:"With Relink", text:"Driver is outside the building. Customer shares door code or concierge info. Delivery happens." },
            { type:"bad", title:"Today", text:"Merchant can't see what's happening. Customer asks for a refund. CSAT tanks. Relationship gone." },
            { type:"good", title:"With Relink", text:"Merchant sees live recovery rate, cost saved, and unresolved cases. Brand stays intact." },
          ].map((card, i) => (
            <div key={i} style={{ background:"#fff", border:"1px solid #e8e8e4", borderLeft: card.type==="bad" ? "3px solid #E24B4A" : "3px solid var(--green-400)", borderRadius:"0 8px 8px 0", padding:"16px 18px" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color: card.type==="bad" ? "#A32D2D" : "var(--green-800)", marginBottom:6 }}>{card.title}</div>
              <p style={{ fontSize:13, color:"#666", lineHeight:1.55, margin:0 }}>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height:1, background:"#e8e8e4" }} />

      {/* WHO IT'S FOR */}
      <section style={{ maxWidth:760, margin:"0 auto", padding:"80px 24px" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"var(--green-400)", textTransform:"uppercase", marginBottom:10 }}>Who it&apos;s for</div>
        <h2 className="font-display" style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em", marginBottom:40 }}>Built for operators losing money on failed deliveries</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          {[
            { icon:"🚐", title:"Independent courier fleets", desc:"10–100 vans. B2C residential. London and major cities. Running on tight margins where every redelivery hurts." },
            { icon:"⚡", title:"Same-day operators", desc:"Pharmacy, grocery, restaurant delivery. High failure rates in apartment buildings. Seconds matter." },
            { icon:"🛍️", title:"Premium ecommerce", desc:"Flowers, furniture, fragile, luxury. A failed delivery isn't just a logistics cost — it destroys the occasion." },
          ].map(card => (
            <div key={card.title} style={{ background:"#fff", border:"1px solid #e8e8e4", borderRadius:12, padding:"24px 20px" }}>
              <div style={{ fontSize:28, marginBottom:12 }}>{card.icon}</div>
              <div style={{ fontWeight:500, fontSize:15, marginBottom:8 }}>{card.title}</div>
              <p style={{ fontSize:13, color:"#777", lineHeight:1.6, margin:0 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height:1, background:"#e8e8e4" }} />

      {/* PRICING */}
      <section style={{ maxWidth:760, margin:"0 auto", padding:"80px 24px" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"var(--green-400)", textTransform:"uppercase", marginBottom:10 }}>Pricing</div>
        <h2 className="font-display" style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em", marginBottom:10 }}>Simple. Pay for what you use.</h2>
        <p style={{ fontSize:16, color:"#666", lineHeight:1.65, marginBottom:40 }}>No setup fees. No long-term contracts. Cancel any time.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {[
            { name:"Starter", price:"£149", note:"Up to 1,000 deliveries/mo", featured:false, features:["Failed delivery recovery","Operator dashboard","SMS fallback","Email support"] },
            { name:"Growth", price:"£399", note:"Up to 5,000 deliveries/mo", featured:true, features:["Everything in Starter","Pre-delivery prevention","Driver messaging","Circuit / Onfleet sync"] },
            { name:"Pro", price:"£899", note:"Unlimited · white-label", featured:false, features:["Everything in Growth","Your brand on WhatsApp","API access","Dedicated onboarding"] },
          ].map(plan => (
            <div key={plan.name} style={{ background:"#fff", border: plan.featured ? "2px solid var(--green-400)" : "1px solid #e8e8e4", borderRadius:12, padding:"24px 20px", position:"relative" }}>
              {plan.featured && (
                <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:"var(--green-400)", color:"#fff", fontSize:11, fontWeight:600, padding:"3px 12px", borderRadius:10, whiteSpace:"nowrap" }}>Most popular</div>
              )}
              <div style={{ fontSize:13, color:"#888", marginBottom:8 }}>{plan.name}</div>
              <div style={{ marginBottom:6 }}>
                <span className="font-display" style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em" }}>{plan.price}</span>
                <span style={{ fontSize:14, color:"#888" }}>/mo</span>
              </div>
              <div style={{ fontSize:12, color:"#aaa", marginBottom:18 }}>{plan.note}</div>
              <div style={{ borderTop:"1px solid #f0f0ec", paddingTop:16 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#555", padding:"5px 0" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="var(--green-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize:13, color:"#aaa", textAlign:"center", marginTop:16 }}>All plans include a 60-day free pilot for operators joining now.</p>
      </section>

      <div style={{ height:1, background:"#e8e8e4" }} />

      {/* SIGNUP */}
      <section id="signup" style={{ background:"#fff", padding:"80px 24px" }}>
        <div style={{ maxWidth:520, margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"var(--green-400)", textTransform:"uppercase", marginBottom:10 }}>Private pilot · London</div>
          <h2 className="font-display" style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em", marginBottom:12 }}>Get early access</h2>
          <p style={{ fontSize:16, color:"#666", lineHeight:1.65, marginBottom:32 }}>We&apos;re onboarding 10 London courier operators. Free for 60 days — we handle the setup, you keep the data.</p>
          <SignupForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid #e8e8e4", padding:"24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <span className="font-display" style={{ fontSize:15, fontWeight:700 }}>relink</span>
          <span style={{ fontSize:13, color:"#aaa", marginLeft:12 }}>WhatsApp-first delivery recovery</span>
        </div>
        <div style={{ display:"flex", gap:20, fontSize:13, color:"#aaa" }}>
          <span>London, UK</span>
          <span>Built by The 36th Company</span>
        </div>
      </footer>
    </main>
  );
}
