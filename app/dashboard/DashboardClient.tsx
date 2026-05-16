"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type DeliveryStatus = "pending"|"out_for_delivery"|"attempted"|"recovery_sent"|"resolved"|"unresolved"|"failed";
type ResolutionType = "retry_today"|"safe_place"|"pickup_point"|"door_code"|"concierge"|"call_me"|"im_home"|"delay"|"neighbour"|"no_response";

interface Delivery {
  id: string;
  operator_id: string;
  merchant_name: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  status: DeliveryStatus;
  flow_type?: string;
  resolution?: ResolutionType;
  recovery_sent_at?: string;
  resolved_at?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<DeliveryStatus,{label:string;color:string;bg:string}> = {
  pending:          {label:"Pending",         color:"#6B7280",bg:"#F3F4F6"},
  out_for_delivery: {label:"Out for delivery",color:"#2563EB",bg:"#EFF6FF"},
  attempted:        {label:"Attempted",       color:"#D97706",bg:"#FFFBEB"},
  recovery_sent:    {label:"Awaiting reply",  color:"#7C3AED",bg:"#F5F3FF"},
  resolved:         {label:"Resolved",        color:"#059669",bg:"#ECFDF5"},
  unresolved:       {label:"Unresolved",      color:"#DC2626",bg:"#FEF2F2"},
  failed:           {label:"Failed",          color:"#DC2626",bg:"#FEF2F2"},
};

const RESOLUTION_LABELS: Record<ResolutionType,string> = {
  retry_today:"Retry today", safe_place:"Safe place", pickup_point:"Pickup point",
  door_code:"Door code", concierge:"Concierge", call_me:"Call me",
  im_home:"Was home", delay:"Delayed", neighbour:"Neighbour", no_response:"No response",
};

function timeAgo(iso:string){
  const s=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(s<60) return `${s}s ago`;
  if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function responseTime(sent?:string,resolved?:string){
  if(!sent||!resolved) return null;
  const s=Math.floor((new Date(resolved).getTime()-new Date(sent).getTime())/1000);
  return s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`;
}

interface Props { operatorId?: string; operatorName?: string; }

export default function DashboardClient({ operatorId: _opId = "", operatorName: _opName = "" }: Props){
  const [operatorId, setOperatorId]   = useState(_opId);
  const [operatorName, setOperatorName] = useState(_opName);
  const [authed, setAuthed]           = useState(false);
  const [deliveries, setDeliveries]   = useState<Delivery[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [filter, setFilter]           = useState<DeliveryStatus|"all">("all");
  const [selected, setSelected]       = useState<Delivery|null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [live, setLive]               = useState(true);
  const [newIds, setNewIds]           = useState<Set<string>>(new Set());
  const prevIds = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // Client-side auth check
  useEffect(()=>{
    fetch("/api/auth/check").then(r=>r.json()).then(d=>{
      if(d.ok){
        setOperatorId(d.operator.operator_id);
        setOperatorName(d.operator.operator_name);
        setAuthed(true);
      } else {
        window.location.href="/login";
      }
    }).catch(()=>{ window.location.href="/login"; });
  },[]);

  const load = useCallback(async (silent=false) => {
    if(!silent) setLoading(true);
    try {
      const res = await fetch(`/api/delivery?operator_id=${operatorId}&limit=200`);
      if(!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const rows: Delivery[] = data.deliveries || [];

      // Highlight new rows
      const incoming = new Set(rows.map(d=>d.id));
      const fresh = new Set([...incoming].filter(id=>!prevIds.current.has(id)));
      if(fresh.size>0 && prevIds.current.size>0){
        setNewIds(fresh);
        setTimeout(()=>setNewIds(new Set()),3000);
      }
      prevIds.current = incoming;
      setDeliveries(rows);
      setLastRefresh(new Date());
      setError("");
    } catch(e){
      setError("Could not load deliveries. Check Supabase connection.");
    } finally {
      setLoading(false);
    }
  },[]);

  // Initial load
  useEffect(()=>{ load(); },[load]);

  // Live polling every 8 seconds
  useEffect(()=>{
    if(live){
      intervalRef.current = setInterval(()=>load(true), 8000);
    } else {
      if(intervalRef.current) clearInterval(intervalRef.current);
    }
    return ()=>{ if(intervalRef.current) clearInterval(intervalRef.current); };
  },[live, load]);

  const filtered = filter==="all" ? deliveries : deliveries.filter(d=>d.status===filter);

  const stats = {
    total:        deliveries.length,
    resolved:     deliveries.filter(d=>d.status==="resolved").length,
    awaiting:     deliveries.filter(d=>d.status==="recovery_sent").length,
    unresolved:   deliveries.filter(d=>d.status==="unresolved").length,
    recoveryRate: deliveries.length
      ? Math.round(deliveries.filter(d=>d.status==="resolved").length/deliveries.length*100)
      : 0,
  };

  const avgResponse = (()=>{
    const times = deliveries
      .filter(d=>d.resolved_at&&d.recovery_sent_at)
      .map(d=>(new Date(d.resolved_at!).getTime()-new Date(d.recovery_sent_at!).getTime())/1000);
    if(!times.length) return null;
    const avg=Math.round(times.reduce((a,b)=>a+b,0)/times.length);
    return avg<60?`${avg}s`:`${Math.floor(avg/60)}m ${avg%60}s`;
  })();

  return (
    <div style={{minHeight:"100vh",background:"#FAFAF8",fontFamily:"'DM Sans',sans-serif"}}>

      {/* Nav */}
      <nav style={{background:"#fff",borderBottom:"1px solid #EBEBЕ6",padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:40}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <a href="/" style={{textDecoration:"none"}}>
            <span style={{fontSize:18,fontWeight:700,letterSpacing:"-0.03em",color:"#0f0f0e",fontFamily:"'Syne',sans-serif"}}>relink</span>
          </a>
          <span style={{color:"#ddd"}}>/</span>
          <span style={{fontSize:14,color:"#555"}}>Dashboard</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <a href="/upload" style={{textDecoration:"none"}}><button style={{fontSize:13,color:"#1D9E75",background:"none",border:"1px solid #d1fae5",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>↑ Upload CSV</button></a>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Live indicator */}
          <button
            onClick={()=>setLive(l=>!l)}
            style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"1px solid #eee",borderRadius:20,padding:"4px 12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,color:live?"#059669":"#aaa"}}
          >
            <span style={{width:7,height:7,borderRadius:"50%",background:live?"#1D9E75":"#ddd",display:"inline-block",boxShadow:live?"0 0 0 3px rgba(29,158,117,0.2)":"none"}}/>
            {live ? "Live" : "Paused"}
          </button>
          <span style={{fontSize:12,color:"#aaa"}}>Updated {timeAgo(lastRefresh.toISOString())}</span>
          <button onClick={()=>load()} style={{fontSize:13,color:"#1D9E75",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>↺</button>
          <span style={{fontSize:12,color:"#ddd"}}>|</span>
          <span style={{fontSize:13,color:"#555",fontWeight:500}}>{operatorName}</span>
          <button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});window.location.href="/login";}} style={{fontSize:12,color:"#aaa",background:"none",border:"1px solid #eee",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Sign out</button>
        </div>
      </nav>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px"}}>

        {/* Error banner */}
        {error && (
          <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:"12px 16px",fontSize:13,color:"#DC2626",marginBottom:20}}>
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:24}}>
          {[
            {label:"Total today",  value:stats.total},
            {label:"Resolved",     value:stats.resolved,     color:"#059669"},
            {label:"Awaiting",     value:stats.awaiting,     color:"#7C3AED"},
            {label:"Unresolved",   value:stats.unresolved,   color:"#DC2626"},
            {label:"Recovery rate",value:`${stats.recoveryRate}%`, color:"#1D9E75"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",border:"1px solid #EBEBЕ6",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:12,color:"#aaa",marginBottom:4}}>{s.label}</div>
              <div style={{fontSize:24,fontWeight:700,color:s.color||"#0f0f0e",letterSpacing:"-0.02em",fontFamily:"'Syne',sans-serif"}}>
                {loading?"—":s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Avg response */}
        {avgResponse && !loading && (
          <div style={{background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:10,padding:"10px 16px",fontSize:13,color:"#065F46",marginBottom:16}}>
            ⚡ Average customer response time: <strong>{avgResponse}</strong>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          {([
            {key:"all",      label:`All (${stats.total})`},
            {key:"recovery_sent", label:`Awaiting (${stats.awaiting})`},
            {key:"resolved", label:`Resolved (${stats.resolved})`},
            {key:"unresolved",label:`Unresolved (${stats.unresolved})`},
          ] as const).map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key as any)} style={{
              fontSize:13,padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
              border: filter===f.key?"1.5px solid #1D9E75":"1px solid #ddd",
              background:filter===f.key?"#1D9E75":"#fff",
              color:filter===f.key?"#fff":"#555",
              fontWeight:filter===f.key?500:400,
            }}>{f.label}</button>
          ))}
        </div>

        {/* Table */}
        <div style={{background:"#fff",border:"1px solid #EBEBЕ6",borderRadius:14,overflow:"hidden"}}>
          {loading ? (
            <div style={{padding:48,textAlign:"center"}}>
              <div style={{width:32,height:32,border:"2px solid #1D9E75",borderTopColor:"transparent",borderRadius:"50%",margin:"0 auto 12px",animation:"spin 0.7s linear infinite"}}/>
              <div style={{fontSize:13,color:"#aaa"}}>Loading deliveries...</div>
            </div>
          ) : filtered.length===0 ? (
            <div style={{padding:48,textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:12}}>📭</div>
              <div style={{fontSize:14,color:"#aaa"}}>
                {deliveries.length===0
                  ? "No deliveries yet. Fire a test delivery from the driver form."
                  : "No deliveries in this category."}
              </div>
            </div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{borderBottom:"1px solid #EBEBЕ6",background:"#FAFAF8"}}>
                  {["Customer","Merchant","Address","Status","Resolution","Response","Time"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:500,color:"#aaa",fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d,i)=>{
                  const sc = STATUS_CONFIG[d.status];
                  const rt = responseTime(d.recovery_sent_at,d.resolved_at);
                  const isNew = newIds.has(d.id);
                  return (
                    <tr
                      key={d.id}
                      onClick={()=>setSelected(selected?.id===d.id?null:d)}
                      style={{
                        borderBottom:i<filtered.length-1?"1px solid #F9FAFB":"none",
                        cursor:"pointer",
                        background: isNew?"#F0FDF9" : selected?.id===d.id?"#F0FDF9":"transparent",
                        transition:"background 0.3s",
                      }}
                      onMouseOver={e=>{if(selected?.id!==d.id&&!isNew) e.currentTarget.style.background="#FAFAF8";}}
                      onMouseOut={e=>{if(selected?.id!==d.id&&!isNew) e.currentTarget.style.background="transparent";}}
                    >
                      <td style={{padding:"11px 14px",fontWeight:500,color:"#0f0f0e"}}>
                        {isNew && <span style={{fontSize:9,background:"#1D9E75",color:"#fff",borderRadius:8,padding:"1px 5px",marginRight:6,verticalAlign:"middle"}}>NEW</span>}
                        {d.customer_name}
                      </td>
                      <td style={{padding:"11px 14px",color:"#555"}}>{d.merchant_name}</td>
                      <td style={{padding:"11px 14px",color:"#777",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.address}</td>
                      <td style={{padding:"11px 14px"}}>
                        <span style={{fontSize:11,fontWeight:500,color:sc.color,background:sc.bg,padding:"3px 9px",borderRadius:20}}>{sc.label}</span>
                      </td>
                      <td style={{padding:"11px 14px",color:"#555"}}>{d.resolution?RESOLUTION_LABELS[d.resolution]:"—"}</td>
                      <td style={{padding:"11px 14px",color:rt?"#059669":"#aaa",fontWeight:rt?500:400}}>{rt||"—"}</td>
                      <td style={{padding:"11px 14px",color:"#aaa"}}>{timeAgo(d.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{marginTop:12,background:"#fff",border:"1px solid #EBEBЕ6",borderRadius:14,padding:"18px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:500,color:"#0f0f0e"}}>{selected.customer_name} — {selected.address}</div>
              <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:"#aaa",fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[
                {label:"Merchant",      value:selected.merchant_name},
                {label:"Phone",         value:selected.customer_phone},
                {label:"Status",        value:STATUS_CONFIG[selected.status].label},
                {label:"Resolution",    value:selected.resolution?RESOLUTION_LABELS[selected.resolution]:"Pending"},
                {label:"Recovery sent", value:selected.recovery_sent_at?timeAgo(selected.recovery_sent_at):"—"},
                {label:"Resolved",      value:selected.resolved_at?timeAgo(selected.resolved_at):"—"},
                {label:"Response time", value:responseTime(selected.recovery_sent_at,selected.resolved_at)||"—"},
                {label:"Created",       value:timeAgo(selected.created_at)},
              ].map(f=>(
                <div key={f.label} style={{background:"#FAFAF8",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>{f.label}</div>
                  <div style={{fontSize:13,fontWeight:500,color:"#0f0f0e"}}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
