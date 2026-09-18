import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, CreditCard, PiggyBank, BarChart3, Wallet,
  Bell, Plus, TrendingUp, Tag, Target, AlertTriangle, ChevronDown,
  Sun, Moon, LogOut, Edit2, Trash2, X, Check, Search, Menu,
  Lightbulb, User, Settings, Eye, EyeOff, ChevronRight,
} from "lucide-react";
import { loginUser, registerUser } from "../services/auth";
import { addExpense, deleteExpense, getExpenses, updateExpense } from "../services/expenseService";
import { createBudget, getBudget } from "../services/budgetService";
import { getDashboardAnalytics } from "../services/analyticsService";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "login" | "register" | "dashboard" | "expenses" | "budget" | "reports";
interface Expense { _id: string; date: string; title: string; category: string; amount: number; }
interface Budget  { month: string; amount: number; }
interface UserProfile { name: string; email: string; }

function getInitials(name?: string): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CATEGORIES = ["Food & Dining","Transport","Housing","Healthcare","Entertainment","Shopping","Utilities","Education","Other"];

const CAT_COLOR: Record<string,string> = {
  "Food & Dining":"#2563EB","Transport":"#16A34A","Housing":"#9333EA",
  "Healthcare":"#0891B2","Entertainment":"#EA580C","Shopping":"#F59E0B",
  "Utilities":"#6B7280","Education":"#EC4899","Other":"#8B5CF6",
};

const MONTHLY = [
  { month:"Feb", amount:9800  },
  { month:"Mar", amount:11500 },
  { month:"Apr", amount:8700  },
  { month:"May", amount:13200 },
  { month:"Jun", amount:10900 },
  { month:"Jul", amount:15000 },
];

const BUDGET_HISTORY = [
  { month:"May 2024", budget:18000, spent:13200 },
  { month:"Jun 2024", budget:18000, spent:10900 },
];

const CURRENCY_MAP: Record<string,{symbol:string;locale:string}> = {
  "INR (₹)": { symbol:"₹", locale:"en-IN" },
  "USD ($)":  { symbol:"$", locale:"en-US" },
  "EUR (€)":  { symbol:"€", locale:"de-DE" },
  "GBP (£)":  { symbol:"£", locale:"en-GB" },
};
function makeFmt(currency: string) {
  const { symbol, locale } = CURRENCY_MAP[currency] ?? CURRENCY_MAP["INR (₹)"];
  return (n: number) => symbol + Math.round(n).toLocaleString(locale);
}
function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return responseMessage || fallback;
}
const fmtDate = (s: string) => new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
const currentPeriod = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    label: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  };
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  light: {
    bg:       "#F4F6F9", card:  "#ffffff", sidebar: "#ffffff",
    border:   "#E5E7EB", text:  "#111827", sub:     "#6B7280",
    input:    "#F9FAFB", inputB:"#E5E7EB", row:     "#F9FAFB",
    navHover: "#F3F4F6", overlay:"rgba(0,0,0,0.4)",
  },
  dark: {
    bg:       "#0F172A", card:  "#1E293B", sidebar: "#1E293B",
    border:   "#334155", text:  "#F1F5F9", sub:     "#94A3B8",
    input:    "#0F172A", inputB:"#334155", row:     "#273348",
    navHover: "#273348", overlay:"rgba(0,0,0,0.7)",
  },
};

// ─── Inline style helpers ─────────────────────────────────────────────────────
function card(dk: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return { background: T[dk?"dark":"light"].card, border: `1px solid ${T[dk?"dark":"light"].border}`, borderRadius: 16, ...extra };
}
function inputStyle(dk: boolean): React.CSSProperties {
  return {
    background: T[dk?"dark":"light"].input, border: `1px solid ${T[dk?"dark":"light"].inputB}`,
    color: T[dk?"dark":"light"].text, borderRadius: 10, padding: "10px 14px",
    fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" as const,
  };
}
function btn(color: string, text = "#fff", extra?: React.CSSProperties): React.CSSProperties {
  return { background: color, color: text, border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", display:"inline-flex", alignItems:"center", gap:6, ...extra };
}
function ghostBtn(dk: boolean): React.CSSProperties {
  return { background:"transparent", border:`1px solid ${T[dk?"dark":"light"].border}`, color: T[dk?"dark":"light"].text, borderRadius:10, padding:"8px 14px", fontSize:13, fontWeight:500, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 };
}

// ─── CSS Bar chart ────────────────────────────────────────────────────────────
function BarChart({ data, dk }: { data:{month:string;amount:number}[]; dk:boolean }) {
  const peak = Math.max(...data.map(d => d.amount));
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:180, paddingTop:8 }}>
      {data.map((d,i) => {
        const h = Math.round((d.amount / peak) * 140);
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:10, color: T[dk?"dark":"light"].sub }}>
              {d.amount>=1000 ? `₹${(d.amount/1000).toFixed(0)}k` : `₹${d.amount}`}
            </span>
            <div style={{ width:"100%", display:"flex", alignItems:"flex-end", height:140 }}>
              <div style={{ width:"100%", height:h, borderRadius:"6px 6px 0 0", background: isLast ? "#2563EB" : (dk?"#1E3A5F":"#BFDBFE") }} />
            </div>
            <span style={{ fontSize:11, color: T[dk?"dark":"light"].sub }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────
function DonutChart({ data, dk }: { data:{name:string;value:number;color:string}[]; dk:boolean }) {
  const total = data.reduce((s,d) => s+d.value, 0);
  const size = 130; const r = 48; const cx = 65; const cy = 65;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map(d => {
    const frac = d.value / total;
    const dash = frac * circ;
    const rot = offset * 360 - 90;
    offset += frac;
    return { ...d, dash, gap: circ - dash, rot };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={dk?"#334155":"#F3F4F6"} strokeWidth={20} />
      {slices.map((s,i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={20}
          strokeDasharray={`${s.dash} ${s.gap}`}
          transform={`rotate(${s.rot} ${cx} ${cy})`} />
      ))}
      <text x={cx} y={cy-5} textAnchor="middle" fontSize={9} fill={T[dk?"dark":"light"].sub}>Total</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize={11} fontWeight="700" fill={T[dk?"dark":"light"].text}>
        {total>=1000 ? `₹${(total/1000).toFixed(0)}k` : `₹${total}`}
      </text>
    </svg>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height:10, background:"#E5E7EB", borderRadius:99, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:color, borderRadius:99, transition:"width .6s ease" }} />
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ dk, title, onClose, children }: { dk:boolean; title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div style={{ position:"fixed", inset:0, background:T[dk?"dark":"light"].overlay, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ ...card(dk), width:"100%", maxWidth:440, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:`1px solid ${T[dk?"dark":"light"].border}` }}>
          <span style={{ fontWeight:700, fontSize:16, color:T[dk?"dark":"light"].text }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T[dk?"dark":"light"].sub, padding:4 }}><X size={18}/></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ dk, message, onConfirm, onCancel }: { dk:boolean; message:string; onConfirm:()=>void; onCancel:()=>void }) {
  return (
    <div style={{ position:"fixed", inset:0, background:T[dk?"dark":"light"].overlay, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ ...card(dk), width:"100%", maxWidth:380, padding:28, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", gap:14, marginBottom:20 }}>
          <div style={{ width:40, height:40, borderRadius:99, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Trash2 size={18} color="#DC2626"/>
          </div>
          <div>
            <p style={{ fontWeight:700, color:T[dk?"dark":"light"].text, marginBottom:4 }}>Confirm Delete</p>
            <p style={{ fontSize:13, color:T[dk?"dark":"light"].sub }}>{message}</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ ...ghostBtn(dk), flex:1, justifyContent:"center" }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...btn("#DC2626"), flex:1, justifyContent:"center" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg:string; type:"success"|"error" }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:200, background: type==="success"?"#16A34A":"#DC2626",
      color:"#fff", borderRadius:12, padding:"12px 20px", fontSize:14, fontWeight:600,
      display:"flex", alignItems:"center", gap:8, boxShadow:"0 8px 30px rgba(0,0,0,0.2)" }}>
      {type==="success" ? <Check size={16}/> : <X size={16}/>}
      {msg}
    </div>
  );
}

// ─── Expense Form ─────────────────────────────────────────────────────────────
function ExpenseForm({ dk, initial, onSave, onClose }: {
  dk:boolean; initial?:Expense; onSave:(e:Omit<Expense,"_id">)=>void; onClose:()=>void;
}) {
  const [title, setTitle]       = useState(initial?.title ?? "");
  const [amount, setAmount]     = useState(initial?.amount?.toString() ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [date, setDate]         = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [err, setErr]           = useState<Record<string,string>>({});

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string,string> = {};
    if (!title.trim()) e.title = "Title required";
    if (!amount || isNaN(+amount) || +amount <= 0) e.amount = "Valid amount required";
    if (!date) e.date = "Date required";
    setErr(e);
    if (Object.keys(e).length) return;
    onSave({ title: title.trim(), amount: +amount, category, date });
  }

  const field = (lbl:string, node:React.ReactNode, errKey:string) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:T[dk?"dark":"light"].sub, marginBottom:6 }}>{lbl}</label>
      {node}
      {err[errKey] && <p style={{ color:"#DC2626", fontSize:12, marginTop:4 }}>{err[errKey]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit}>
      {field("Title",
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Grocery Shopping" style={inputStyle(dk)} />,
        "title"
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {field("Amount (₹)",
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={inputStyle(dk)} />,
          "amount"
        )}
        {field("Date",
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle(dk)} />,
          "date"
        )}
      </div>
      {field("Category",
        <select value={category} onChange={e=>setCategory(e.target.value)} style={inputStyle(dk)}>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>,
        ""
      )}
      <div style={{ display:"flex", gap:10, marginTop:8 }}>
        <button type="button" onClick={onClose} style={{ ...ghostBtn(dk), flex:1, justifyContent:"center" }}>Cancel</button>
        <button type="submit" style={{ ...btn("#2563EB"), flex:1, justifyContent:"center" }}>
          {initial ? "Save Changes" : "Add Expense"}
        </button>
      </div>
    </form>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"dashboard" as Page, label:"Dashboard", icon:<LayoutDashboard size={18}/> },
  { id:"expenses"  as Page, label:"Expenses",  icon:<CreditCard size={18}/> },
  { id:"budget"    as Page, label:"Budget",    icon:<PiggyBank size={18}/> },
  { id:"reports"   as Page, label:"Reports",   icon:<BarChart3 size={18}/> },
];

function Sidebar({ dk, page, setPage, onLogout, open, setOpen, user }: {
  dk:boolean; page:Page; setPage:(p:Page)=>void; onLogout:()=>void; open:boolean; setOpen:(v:boolean)=>void;
  user: UserProfile;
}) {
  const s = T[dk?"dark":"light"];
  const initials = getInitials(user.name);
  const content = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:s.sidebar, borderRight:`1px solid ${s.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 20px", height:64, borderBottom:`1px solid ${s.border}` }}>
        <div style={{ width:34, height:34, borderRadius:10, background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Wallet size={16} color="#fff"/>
        </div>
        <span style={{ fontWeight:800, fontSize:13, color:s.text, lineHeight:1.3 }}>Expense<br/>Tracker</span>
      </div>
      <nav style={{ flex:1, padding:"16px 10px", overflowY:"auto" }}>
        <p style={{ fontSize:10, fontWeight:700, color:s.sub, textTransform:"uppercase", letterSpacing:2, padding:"0 8px", marginBottom:10 }}>Main Menu</p>
        {NAV_ITEMS.map(n => {
          const active = page === n.id;
          return (
            <button key={n.id} onClick={() => { setPage(n.id); setOpen(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                borderRadius:12, border:"none", marginBottom:2, cursor:"pointer", fontSize:14, fontWeight:600,
                background: active?"#2563EB":"transparent", color: active?"#fff":s.sub,
                transition:"all .15s" }}>
              {n.icon}{n.label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"12px 14px", borderTop:`1px solid ${s.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, padding:"6px 8px", borderRadius:10, background:s.row }}>
          <div style={{ width:32, height:32, borderRadius:99, background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:800, flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <p style={{ fontSize:13, fontWeight:700, color:s.text, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</p>
            <p style={{ fontSize:11, color:s.sub, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</p>
          </div>
        </div>
        <button onClick={onLogout}
          style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
            borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
            background:"transparent", color:"#DC2626" }}>
          <LogOut size={16}/> Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div style={{ width:224, flexShrink:0, height:"100vh", position:"sticky", top:0 }} className="hidden-mobile">
        {content}
      </div>
      {/* Mobile overlay */}
      {open && (
        <div style={{ position:"fixed", inset:0, zIndex:50 }}>
          <div style={{ position:"absolute", inset:0, background:s.overlay }} onClick={()=>setOpen(false)}/>
          <div style={{ position:"absolute", top:0, left:0, width:224, height:"100%", zIndex:51 }}>{content}</div>
        </div>
      )}
    </>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ dk, user, onSave, onClose }: {
  dk:boolean; user:UserProfile; onSave:(u:UserProfile)=>void; onClose:()=>void;
}) {
  const s = T[dk?"dark":"light"];
  const [name,  setName]  = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);

  function save() {
    if (!name.trim()) return;
    const updated: UserProfile = { name: name.trim(), email: email.trim() || user.email };
    onSave(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  }

  const initials = getInitials(name || user.name);

  return (
    <Modal dk={dk} title="My Profile" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:24 }}>
        <div style={{ width:64, height:64, borderRadius:99, background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:22, fontWeight:800, marginBottom:12 }}>
          {initials}
        </div>
        <p style={{ fontWeight:700, color:s.text, fontSize:16, margin:"0 0 2px" }}>{name || "Your Name"}</p>
        <p style={{ fontSize:13, color:s.sub, margin:0 }}>{email || "your@email.com"}</p>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", fontSize:13, fontWeight:600, color:s.sub, marginBottom:6 }}>Full Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter full name" style={inputStyle(dk)}/>
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={{ display:"block", fontSize:13, fontWeight:600, color:s.sub, marginBottom:6 }}>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter email" style={inputStyle(dk)}/>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onClose} style={{ ...ghostBtn(dk), flex:1, justifyContent:"center" }}>Cancel</button>
        <button onClick={save} style={{ ...btn(saved?"#16A34A":"#2563EB"), flex:1, justifyContent:"center" }}>
          {saved ? <><Check size={14}/>Saved!</> : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ dk, setDk, currency, setCurrency, onClose }: {
  dk:boolean; setDk:(v:boolean)=>void;
  currency:string; setCurrency:(v:string)=>void;
  onClose:()=>void;
}) {
  const s = T[dk?"dark":"light"];
  const [notifOn,   setNotifOn]   = useState(true);
  const [alertPct,  setAlertPct]  = useState("75");
  const [saved,     setSaved]     = useState(false);
  function save() { setSaved(true); setTimeout(()=>{ setSaved(false); onClose(); }, 1200); }

  const row = (label:string, desc:string, control:React.ReactNode) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom:`1px solid ${s.border}` }}>
      <div>
        <p style={{ fontSize:14, fontWeight:600, color:s.text, marginBottom:2 }}>{label}</p>
        <p style={{ fontSize:12, color:s.sub }}>{desc}</p>
      </div>
      {control}
    </div>
  );

  const toggle = (on:boolean, onToggle:()=>void) => (
    <div onClick={onToggle} style={{ width:42, height:24, borderRadius:99, background:on?"#2563EB":"#D1D5DB", cursor:"pointer", position:"relative", transition:"background .2s", flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:99, background:"#fff", position:"absolute", top:3, left: on?21:3, transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.2)" }}/>
    </div>
  );

  return (
    <Modal dk={dk} title="Settings" onClose={onClose}>
      {row("Dark Mode", "Switch between light and dark theme", toggle(dk, ()=>setDk(!dk)))}
      {row("Currency", "Display currency for amounts",
        <select value={currency} onChange={e=>setCurrency(e.target.value)}
          style={{ ...inputStyle(dk), width:120, padding:"6px 10px" }}>
          <option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option>
        </select>
      )}
      {row("Budget Alerts", "Notify when budget threshold is reached", toggle(notifOn, ()=>setNotifOn(v=>!v)))}
      {row("Alert Threshold", "Percentage at which to show warning",
        <select value={alertPct} onChange={e=>setAlertPct(e.target.value)}
          style={{ ...inputStyle(dk), width:90, padding:"6px 10px" }}>
          <option value="50">50%</option><option value="75">75%</option><option value="90">90%</option>
        </select>
      )}
      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <button onClick={onClose} style={{ ...ghostBtn(dk), flex:1, justifyContent:"center" }}>Cancel</button>
        <button onClick={save} style={{ ...btn(saved?"#16A34A":"#2563EB"), flex:1, justifyContent:"center" }}>
          {saved ? <><Check size={14}/>Saved!</> : "Save Settings"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ dk, setDk, page, onMenuToggle, onLogout, currency, setCurrency, user, onUpdateUser, addToast }: {
  dk:boolean; setDk:(v:boolean)=>void; page:Page;
  onMenuToggle:()=>void; onLogout:()=>void;
  currency:string; setCurrency:(v:string)=>void;
  user: UserProfile; onUpdateUser:(u:UserProfile)=>void;
  addToast:(m:string, t:"success"|"error")=>void;
}) {
  const s = T[dk?"dark":"light"];
  const [showNotif,    setShowNotif]    = useState(false);
  const [showUser,     setShowUser]     = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const titles: Record<Page,string> = { login:"",register:"",dashboard:"Dashboard",expenses:"Expenses",budget:"Budget",reports:"Reports" };

  const notifs = [
    { text:"Budget at 92.5% — slow down spending", color:"#EA580C" },
    { text:"July report is ready to view", color:"#2563EB" },
    { text:"New expense logged: ₹1,850", color:"#16A34A" },
  ];

  function closeAll() { setShowNotif(false); setShowUser(false); }

  const initials = getInitials(user.name);
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <>
    {/* Click-outside backdrop for dropdowns */}
    {(showNotif || showUser) && (
      <div onClick={closeAll} style={{ position:"fixed", inset:0, zIndex:29 }}/>
    )}
    <header style={{ height:64, background:s.card, borderBottom:`1px solid ${s.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", position:"sticky", top:0, zIndex:30, flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onMenuToggle} style={{ background:"none", border:"none", cursor:"pointer", color:s.sub, padding:4, display:"none" }} className="show-mobile">
          <Menu size={22}/>
        </button>
        <h1 style={{ fontWeight:800, fontSize:18, color:s.text, margin:0 }}>{titles[page]}</h1>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {/* Dark mode toggle */}
        <button onClick={()=>setDk(!dk)}
          style={{ width:38, height:38, borderRadius:10, border:`1px solid ${s.border}`, background:s.card, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:s.sub }}>
          {dk ? <Sun size={17}/> : <Moon size={17}/>}
        </button>
        {/* Bell */}
        <div style={{ position:"relative", zIndex:31 }}>
          <button onClick={()=>{ setShowNotif(v=>!v); setShowUser(false); }}
            style={{ width:38, height:38, borderRadius:10, border:`1px solid ${s.border}`, background:s.card, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:s.sub, position:"relative" }}>
            <Bell size={17}/>
            <span style={{ position:"absolute", top:8, right:8, width:7, height:7, background:"#2563EB", borderRadius:99 }}/>
          </button>
          {showNotif && (
            <div style={{ position:"absolute", top:46, right:0, width:280, ...card(dk), boxShadow:"0 12px 40px rgba(0,0,0,0.2)", zIndex:99 }}>
              <p style={{ fontWeight:700, fontSize:13, color:s.text, padding:"14px 16px 10px", borderBottom:`1px solid ${s.border}` }}>Notifications</p>
              {notifs.map((n,i)=>(
                <div key={i} style={{ padding:"12px 16px", borderBottom: i<notifs.length-1?`1px solid ${s.border}`:"none", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span style={{ width:8, height:8, borderRadius:99, background:n.color, flexShrink:0, marginTop:4 }}/>
                  <span style={{ fontSize:13, color:s.sub }}>{n.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* User */}
        <div style={{ position:"relative", zIndex:31 }}>
          <button onClick={()=>{ setShowUser(v=>!v); setShowNotif(false); }}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", borderRadius:10, border:`1px solid ${s.border}`, background:s.card, cursor:"pointer" }}>
            <div style={{ width:30, height:30, borderRadius:99, background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:800 }}>
              {initials}
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:s.text }}>{firstName}</span>
            <ChevronDown size={13} color={s.sub}/>
          </button>
          {showUser && (
            <div style={{ position:"absolute", top:48, right:0, width:200, ...card(dk), boxShadow:"0 12px 40px rgba(0,0,0,0.2)", zIndex:99, padding:6 }}>
              {/* User info header */}
              <div style={{ padding:"10px 12px 12px", borderBottom:`1px solid ${s.border}`, marginBottom:4 }}>
                <p style={{ fontSize:13, fontWeight:700, color:s.text, margin:"0 0 2px" }}>{user.name}</p>
                <p style={{ fontSize:11, color:s.sub, margin:0, wordBreak:"break-all" }}>{user.email}</p>
              </div>
              <button onClick={()=>{ setShowUser(false); setShowProfile(true); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 12px", border:"none", background:"none", cursor:"pointer", borderRadius:8, color:s.text, fontSize:13, fontWeight:500 }}>
                <User size={14}/> Profile
              </button>
              <button onClick={()=>{ setShowUser(false); setShowSettings(true); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 12px", border:"none", background:"none", cursor:"pointer", borderRadius:8, color:s.text, fontSize:13, fontWeight:500 }}>
                <Settings size={14}/> Settings
              </button>
              <div style={{ borderTop:`1px solid ${s.border}`, marginTop:4, paddingTop:4 }}>
                <button onClick={()=>{ setShowUser(false); onLogout(); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 12px", border:"none", background:"none", cursor:"pointer", borderRadius:8, color:"#DC2626", fontSize:13, fontWeight:500 }}>
                  <LogOut size={14}/> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    {showProfile  && (
      <ProfileModal
        dk={dk}
        user={user}
        onSave={(u) => {
          onUpdateUser(u);
          addToast("Profile updated successfully!", "success");
        }}
        onClose={()=>setShowProfile(false)}
      />
    )}
    {showSettings && <SettingsModal dk={dk} setDk={setDk} currency={currency} setCurrency={setCurrency} onClose={()=>setShowSettings(false)}/>}
    </>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage({ dk, expenses, budget, setBudget, setPage, addToast, fmt, onAddExpense, user }: {
  dk:boolean; expenses:Expense[]; budget:Budget; setBudget:(b:Budget)=>void;
  setPage:(p:Page)=>void; addToast:(m:string,t:"success"|"error")=>void;
  fmt:(n:number)=>string; onAddExpense:(data:Omit<Expense,"_id">)=>Promise<void>;
  user: UserProfile;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const s = T[dk?"dark":"light"];
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await getDashboardAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to load dashboard analytics:", error);
        addToast(getApiErrorMessage(error, "Failed to load dashboard data"), "error");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return <div style={{ padding:24, color:s.sub }}>Loading...</div>;
  }

  const spent = analytics?.totalSpent ?? 0;
  const monthlyBudget = analytics?.monthlyBudget ?? 0;
  const remaining = analytics?.remaining ?? 0;
  const pct = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0;
  const budgetExceeded = analytics?.remaining < 0;
  const alertColor = budgetExceeded || pct>=100 ? "#DC2626" : pct>=75 ? "#EA580C" : "#16A34A";
  const topCat = analytics?.topCategory ?? "No expenses";
  const catData: { name:string; value:number; color:string }[] = (analytics?.categoryBreakdown ?? []).map((item: { category:string; amount:number }) => ({
    name: item.category,
    value: item.amount,
    color: CAT_COLOR[item.category] ?? "#888",
  }));
  const recent: Expense[] = analytics?.recentExpenses ?? [];

  async function handleAdd(data: Omit<Expense,"_id">) {
    try {
      await onAddExpense(data);
      setShowAdd(false);
      addToast("Expense added!","success");
    } catch (error) {
      console.error("Failed to add expense:", error);
      addToast(getApiErrorMessage(error, "Could not add expense"), "error");
    }
  }

  const summaryCards = [
    { label:"Total Spent",    value:fmt(analytics?.totalSpent ?? 0),        sub:"This month",    icon:<TrendingUp size={18}/>, color:"#2563EB" },
    { label:"Monthly Budget", value:fmt(analytics?.monthlyBudget ?? 0),sub:budget.month,    icon:<Target size={18}/>,     color:"#16A34A" },
    { label:"Remaining",      value:fmt(Math.max(remaining,0)), sub: remaining<0?"Overspent!":"Left to spend", icon:<Wallet size={18}/>, color: remaining<0?"#DC2626":"#16A34A" },
    { label:"Top Category",   value:topCat,               sub:fmt(catData.find((c: { name:string; value:number })=>c.name===topCat)?.value ?? 0)+" spent", icon:<Tag size={18}/>, color:"#EA580C" },
  ];

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div style={{ padding:24, maxWidth:1200, margin:"0 auto" }}>
      {/* Welcome banner */}
      <div style={{ marginBottom:22, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:s.text, margin:"0 0 4px" }}>
            Welcome back, {firstName}! 👋
          </h2>
          <p style={{ fontSize:13, color:s.sub, margin:0 }}>
            Here is a snapshot of your spending and budget for {budget.month}.
          </p>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{ ...btn("#2563EB"), padding:"10px 16px" }}>
          <Plus size={16}/> Add Expense
        </button>
      </div>

      {/* Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:20 }}>
        {summaryCards.map(c=>(
          <div key={c.label} style={{ ...card(dk), padding:20 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:c.color+"18", display:"flex", alignItems:"center", justifyContent:"center", color:c.color, marginBottom:14 }}>{c.icon}</div>
            <p style={{ fontSize:12, color:s.sub, marginBottom:4 }}>{c.label}</p>
            <p style={{ fontSize:22, fontWeight:800, color:s.text, marginBottom:2 }}>{c.value}</p>
            <p style={{ fontSize:11, color:s.sub }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Budget Alert */}
      {analytics && (analytics.remaining < 0 || pct>=75) && (
        <div style={{ background: budgetExceeded?"#FEF2F2":"#FFF7ED", border:`1px solid ${budgetExceeded?"#FECACA":"#FED7AA"}`, borderRadius:14, padding:16, marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
            <AlertTriangle size={18} color={alertColor} style={{flexShrink:0,marginTop:2}}/>
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:700, fontSize:14, color:budgetExceeded?"#991B1B":"#92400E", marginBottom:3 }}>
                {analytics.remaining < 0 ? "Budget Exceeded!" : "Approaching Budget Limit"}
              </p>
              <p style={{ fontSize:12, color:budgetExceeded?"#B91C1C":"#B45309" }}>
                {analytics.remaining < 0 ? `Overspent by ${fmt(Math.abs(remaining))} this month.` : `${pct.toFixed(1)}% used — only ${fmt(remaining)} remaining.`}
              </p>
            </div>
            <span style={{ fontWeight:800, fontSize:18, color:alertColor }}>{pct.toFixed(0)}%</span>
          </div>
          <ProgressBar pct={pct} color={alertColor}/>
        </div>
      )}

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:20 }}>
        <div style={{ ...card(dk), padding:24 }}>
          <p style={{ fontWeight:700, color:s.text, marginBottom:2 }}>Monthly Spending</p>
          <p style={{ fontSize:12, color:s.sub, marginBottom:8 }}>Last 6 months</p>
          <BarChart data={MONTHLY} dk={dk}/>
        </div>
        <div style={{ ...card(dk), padding:24 }}>
          <p style={{ fontWeight:700, color:s.text, marginBottom:2 }}>By Category</p>
          <p style={{ fontSize:12, color:s.sub, marginBottom:12 }}>{budget.month}</p>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
            <DonutChart data={catData} dk={dk}/>
          </div>
          {catData.slice(0,4).map((c: { name:string; value:number; color:string })=>(
            <div key={c.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:99, background:c.color, flexShrink:0 }}/>
                <span style={{ fontSize:12, color:s.sub, maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:s.text }}>{fmt(c.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Expenses */}
      <div style={{ ...card(dk), padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <p style={{ fontWeight:700, color:s.text, marginBottom:2 }}>Recent Expenses</p>
            <p style={{ fontSize:12, color:s.sub }}>Latest transactions</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowAdd(true)} style={btn("#2563EB")}><Plus size={15}/>Add Expense</button>
            <button onClick={()=>setPage("expenses")} style={ghostBtn(dk)}>View All <ChevronRight size={13}/></button>
          </div>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${s.border}` }}>
              {["Date","Title","Category","Amount"].map(h=>(
                <th key={h} style={{ textAlign:"left", paddingBottom:12, fontSize:11, fontWeight:700, color:s.sub, textTransform:"uppercase", letterSpacing:1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((e: Expense)=>(
              <tr key={e._id} style={{ borderBottom:`1px solid ${s.border}` }}>
                <td style={{ padding:"12px 0", fontSize:13, color:s.sub, whiteSpace:"nowrap" }}>{fmtDate(e.date)}</td>
                <td style={{ padding:"12px 8px", fontSize:13, fontWeight:600, color:s.text }}>{e.title}</td>
                <td style={{ padding:"12px 8px" }}>
                  <span style={{ background:(CAT_COLOR[e.category]??"#888")+"18", color:CAT_COLOR[e.category]??"#888",
                    borderRadius:99, padding:"4px 10px", fontSize:11, fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                    <span style={{ width:6, height:6, borderRadius:99, background:CAT_COLOR[e.category]??"#888" }}/>
                    {e.category}
                  </span>
                </td>
                <td style={{ padding:"12px 0", fontSize:14, fontWeight:800, color:s.text, textAlign:"right" }}>{fmt(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal dk={dk} title="Add Expense" onClose={()=>setShowAdd(false)}>
          <ExpenseForm dk={dk} onSave={handleAdd} onClose={()=>setShowAdd(false)}/>
        </Modal>
      )}
    </div>
  );
}

// ─── Expenses Page ────────────────────────────────────────────────────────────
function ExpensesPage({ dk, expenses, setExpenses, addToast, fmt }: {
  dk:boolean; expenses:Expense[]; setExpenses:React.Dispatch<React.SetStateAction<Expense[]>>;
  addToast:(m:string,t:"success"|"error")=>void; fmt:(n:number)=>string;
}) {
  const [search,  setSearch]  = useState("");
  const [catF,    setCatF]    = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Expense|null>(null);
  const [deleting,setDeleting]= useState<Expense|null>(null);
  const s = T[dk?"dark":"light"];

  const filtered = useMemo(()=>expenses.filter(e=>{
    const ms = search.toLowerCase();
    return (e.title.toLowerCase().includes(ms) || e.category.toLowerCase().includes(ms))
      && (catF==="All" || e.category===catF);
  }),[expenses,search,catF]);

  async function handleAdd(data: Omit<Expense,"_id">) {
    try {
      const response = await addExpense(data);
      setExpenses(es=>[{ ...(response.expense ?? response) },...es]);
      setShowAdd(false); addToast("Expense added!","success");
    } catch (error) {
      console.error("Failed to add expense:", error);
      addToast(getApiErrorMessage(error, "Could not add expense"), "error");
    }
  }
  async function handleEdit(data: Omit<Expense,"_id">) {
    try {
      const response = await updateExpense(editing!._id, data);
      setExpenses(es=>es.map(e=>e._id===editing!._id ? (response.expense ?? response) : e));
      setEditing(null); addToast("Expense updated!","success");
    } catch (error) {
      console.error("Failed to update expense:", error);
      addToast(getApiErrorMessage(error, "Could not update expense"), "error");
    }
  }
  async function handleDelete() {
    try {
      await deleteExpense(deleting!._id);
      setExpenses(es=>es.filter(e=>e._id!==deleting!._id));
      setDeleting(null); addToast("Expense deleted","success");
    } catch (error) {
      console.error("Failed to delete expense:", error);
      addToast(getApiErrorMessage(error, "Could not delete expense"), "error");
    }
  }

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      {/* Toolbar */}
      <div style={{ ...card(dk), padding:16, marginBottom:16, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:180 }}>
          <Search size={15} color={s.sub} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search expenses…"
            style={{ ...inputStyle(dk), paddingLeft:36 }}/>
        </div>
        <select value={catF} onChange={e=>setCatF(e.target.value)} style={{ ...inputStyle(dk), width:"auto" }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <button onClick={()=>setShowAdd(true)} style={btn("#2563EB")}><Plus size={15}/>Add Expense</button>
      </div>

      {/* Table */}
      <div style={{ ...card(dk), padding:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <p style={{ fontSize:13, color:s.sub }}>{filtered.length} expense{filtered.length!==1?"s":""}</p>
          <p style={{ fontSize:13, fontWeight:700, color:s.text }}>Total: {fmt(filtered.reduce((s,e)=>s+e.amount,0))}</p>
        </div>
        {filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:"40px 0" }}>
            <CreditCard size={32} color={s.sub} style={{ margin:"0 auto 12px" }}/>
            <p style={{ fontWeight:600, color:s.text }}>No expenses found</p>
            <p style={{ fontSize:13, color:s.sub }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${s.border}` }}>
                {["Date","Title","Category","Amount","Actions"].map(h=>(
                  <th key={h} style={{ textAlign: h==="Amount"||h==="Actions"?"right":"left", paddingBottom:10, fontSize:11, fontWeight:700, color:s.sub, textTransform:"uppercase", letterSpacing:1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e=>(
                <tr key={e._id} style={{ borderBottom:`1px solid ${s.border}` }}>
                  <td style={{ padding:"12px 0", fontSize:13, color:s.sub, whiteSpace:"nowrap" }}>{fmtDate(e.date)}</td>
                  <td style={{ padding:"12px 8px", fontSize:13, fontWeight:600, color:s.text }}>{e.title}</td>
                  <td style={{ padding:"12px 8px" }}>
                    <span style={{ background:(CAT_COLOR[e.category]??"#888")+"18", color:CAT_COLOR[e.category]??"#888",
                      borderRadius:99, padding:"4px 10px", fontSize:11, fontWeight:600, display:"inline-flex", alignItems:"center", gap:4 }}>
                      <span style={{ width:6, height:6, borderRadius:99, background:CAT_COLOR[e.category]??"#888" }}/>
                      {e.category}
                    </span>
                  </td>
                  <td style={{ padding:"12px 0", fontSize:14, fontWeight:800, color:s.text, textAlign:"right" }}>{fmt(e.amount)}</td>
                  <td style={{ padding:"12px 0", textAlign:"right" }}>
                    <button onClick={()=>setEditing(e)} style={{ background:"none", border:"none", cursor:"pointer", color:"#2563EB", marginRight:6, padding:4 }}><Edit2 size={15}/></button>
                    <button onClick={()=>setDeleting(e)} style={{ background:"none", border:"none", cursor:"pointer", color:"#DC2626", padding:4 }}><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <Modal dk={dk} title="Add Expense" onClose={()=>setShowAdd(false)}>
        <ExpenseForm dk={dk} onSave={handleAdd} onClose={()=>setShowAdd(false)}/>
      </Modal>}
      {editing && <Modal dk={dk} title="Edit Expense" onClose={()=>setEditing(null)}>
        <ExpenseForm dk={dk} initial={editing} onSave={handleEdit} onClose={()=>setEditing(null)}/>
      </Modal>}
      {deleting && <ConfirmDialog dk={dk} message={`Delete "${deleting.title}" (${fmt(deleting.amount)})? This cannot be undone.`}
        onConfirm={handleDelete} onCancel={()=>setDeleting(null)}/>}
    </div>
  );
}

// ─── Budget Page ──────────────────────────────────────────────────────────────
function BudgetPage({ dk, expenses, budget, addToast, fmt, onSaveBudget }: {
  dk:boolean; expenses:Expense[]; budget:Budget;
  addToast:(m:string,t:"success"|"error")=>void; fmt:(n:number)=>string;
  onSaveBudget:(amount:number)=>Promise<void>;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [val,      setVal]      = useState(budget.amount.toString());
  const [err,      setErr]      = useState("");
  const s = T[dk?"dark":"light"];
  const period = currentPeriod();
  const spent     = expenses.filter(e=>e.date.startsWith(`${period.year}-${String(period.month).padStart(2,"0")}`)).reduce((s,e)=>s+e.amount,0);
  const remaining = budget.amount - spent;
  const pct       = budget.amount>0 ? (spent/budget.amount)*100 : 0;
  const statusColor = pct>=100?"#DC2626":pct>=75?"#EA580C":"#16A34A";
  const r=52; const circ=2*Math.PI*r; const dash=circ*(pct/100); const size=140;

  async function saveEdit() {
    if (!val || isNaN(+val) || +val<=0) { setErr("Enter a valid amount"); return; }
    try {
      await onSaveBudget(+val);
      setShowEdit(false); addToast("Budget updated!","success");
    } catch (error) {
      console.error("Failed to save budget:", error);
      addToast("Could not save budget", "error");
    }
  }

  return (
    <div style={{ padding:24, maxWidth:900, margin:"0 auto" }}>
      {/* Main card */}
      <div style={{ ...card(dk), padding:28, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <p style={{ fontWeight:800, fontSize:18, color:s.text }}>{budget.month} Budget</p>
            <p style={{ fontSize:12, color:s.sub, marginTop:2 }}>Current month overview</p>
          </div>
          <button onClick={()=>{ setShowEdit(true); setVal(budget.amount.toString()); }} style={btn("#EFF4FF","#2563EB")}>
            <Edit2 size={14}/>Edit Budget
          </button>
        </div>
        <div style={{ display:"flex", gap:32, flexWrap:"wrap", alignItems:"center" }}>
          {/* Circular progress */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={dk?"#334155":"#F3F4F6"} strokeWidth={16}/>
              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={statusColor} strokeWidth={16}
                strokeDasharray={`${Math.min(dash,circ)} ${circ}`} strokeDashoffset={circ*0.25}
                strokeLinecap="round" style={{ transition:"stroke-dasharray .6s ease" }}/>
              <text x={size/2} y={size/2-6} textAnchor="middle" fontSize={18} fontWeight="800" fill={statusColor}>{pct.toFixed(0)}%</text>
              <text x={size/2} y={size/2+12} textAnchor="middle" fontSize={10} fill={s.sub}>used</text>
            </svg>
          </div>
          {/* Stats */}
          <div style={{ flex:1, minWidth:200 }}>
            {[
              { label:"Monthly Budget", value:fmt(budget.amount), color:s.text },
              { label:"Total Spent",    value:fmt(spent),          color:"#2563EB" },
              { label:"Remaining",      value: remaining>=0 ? fmt(remaining) : "-"+fmt(Math.abs(remaining)), color: remaining<0?"#DC2626":"#16A34A" },
            ].map(r=>(
              <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${s.border}` }}>
                <span style={{ fontSize:13, color:s.sub }}>{r.label}</span>
                <span style={{ fontSize:14, fontWeight:700, color:r.color }}>{r.value}</span>
              </div>
            ))}
            <div style={{ marginTop:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:s.sub, marginBottom:6 }}>
                <span>Budget usage</span><span>{pct.toFixed(1)}%</span>
              </div>
              <ProgressBar pct={pct} color={statusColor}/>
            </div>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div style={{ background: pct>=100?"#FEF2F2":pct>=75?"#FFF7ED":"#F0FDF4",
        border:`1px solid ${pct>=100?"#FECACA":pct>=75?"#FED7AA":"#BBF7D0"}`,
        borderRadius:14, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
        {pct>=75 ? <AlertTriangle size={16} color={statusColor}/> : <Check size={16} color="#16A34A"/>}
        <span style={{ fontSize:13, fontWeight:600, color:pct>=100?"#991B1B":pct>=75?"#92400E":"#166534" }}>
          {pct>=100 ? `Budget exceeded by ${fmt(spent-budget.amount)}.`
           : pct>=75 ? `Warning: ${pct.toFixed(0)}% of budget used.`
           : `On track! ${fmt(remaining)} remaining for July.`}
        </span>
      </div>

      {/* History */}
      <div style={{ ...card(dk), padding:24 }}>
        <p style={{ fontWeight:700, color:s.text, marginBottom:16 }}>Budget History</p>
        {BUDGET_HISTORY.map((h,i)=>{
          const p2 = h.budget>0?(h.spent/h.budget)*100:0;
          const c2 = p2>=100?"#DC2626":p2>=75?"#EA580C":"#16A34A";
          return (
            <div key={i} style={{ background:dk?"#273348":"#F9FAFB", borderRadius:12, padding:16, marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:s.text }}>{h.month}</span>
                <span style={{ fontSize:13, fontWeight:700, color:c2 }}>{p2.toFixed(0)}%</span>
              </div>
              <ProgressBar pct={p2} color={c2}/>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:s.sub, marginTop:6 }}>
                <span>Spent: {fmt(h.spent)}</span><span>Budget: {fmt(h.budget)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showEdit && (
        <Modal dk={dk} title="Edit Budget" onClose={()=>setShowEdit(false)}>
          <p style={{ fontSize:13, color:s.sub, marginBottom:16 }}>Set your monthly budget for {budget.month}.</p>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:s.sub, marginBottom:6 }}>Budget Amount (₹)</label>
          <input type="number" value={val} onChange={e=>setVal(e.target.value)} placeholder="e.g. 20000"
            style={{ ...inputStyle(dk), marginBottom:err?4:16 }}/>
          {err && <p style={{ color:"#DC2626", fontSize:12, marginBottom:12 }}>{err}</p>}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setShowEdit(false)} style={{ ...ghostBtn(dk), flex:1, justifyContent:"center" }}>Cancel</button>
            <button onClick={saveEdit} style={{ ...btn("#2563EB"), flex:1, justifyContent:"center" }}>Save Budget</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────
function ReportsPage({ dk, expenses, fmt }: { dk:boolean; expenses:Expense[]; fmt:(n:number)=>string }) {
  const [selMonth, setSelMonth] = useState("2024-07");
  const s = T[dk?"dark":"light"];
  const months = ["2024-07","2024-06","2024-05","2024-04"];
  const me = expenses.filter(e=>e.date.startsWith(selMonth));
  const total = me.reduce((s,e)=>s+e.amount,0);
  const days = new Date(+selMonth.slice(0,4), +selMonth.slice(5,7), 0).getDate();
  const avgDaily = total/days;
  const catData = (() => {
    const m: Record<string,number>={};
    me.forEach(e=>{ m[e.category]=(m[e.category]||0)+e.amount; });
    return Object.entries(m).map(([name,value])=>({ name, value, color: CAT_COLOR[name]??"#888" })).sort((a,b)=>b.value-a.value);
  })();
  const topCat = catData[0]?.name ?? "—";
  const largest = me.reduce((mx,e)=>e.amount>(mx?.amount??0)?e:mx, me[0] as Expense|undefined);

  const insights = [
    { text: catData[0] ? `Biggest spend: ${catData[0].name} at ${fmt(catData[0].value)}.` : "No expenses this month.", type:"info" as const },
    { text: avgDaily>500 ? `Daily avg ${fmt(Math.round(avgDaily))} is above the ${fmt(500)} target.` : `Great! Daily avg ${fmt(Math.round(avgDaily))} is within range.`, type: avgDaily>500?"warn":"good" as const },
    largest ? { text:`Largest single expense: "${largest.title}" at ${fmt(largest.amount)}.`, type:"info" as const } : null,
  ].filter(Boolean) as { text:string; type:"info"|"warn"|"good" }[];

  const kpis = [
    { label:"Total Spending", value:fmt(total), color:"#2563EB", bg:"#EFF6FF" },
    { label:"Avg Daily Spend", value:fmt(Math.round(avgDaily)), color:"#9333EA", bg:"#F5F3FF" },
    { label:"Top Category", value:topCat, color:"#EA580C", bg:"#FFF7ED" },
    { label:"Largest Expense", value:largest?fmt(largest.amount):"—", color:"#DC2626", bg:"#FEF2F2" },
  ];

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      {/* Filter */}
      <div style={{ ...card(dk), padding:16, marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:13, color:s.sub, fontWeight:600 }}>Month:</span>
        <select value={selMonth} onChange={e=>setSelMonth(e.target.value)} style={{ ...inputStyle(dk), width:"auto" }}>
          {months.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:16 }}>
        {kpis.map(k=>(
          <div key={k.label} style={{ ...card(dk), padding:20 }}>
            <div style={{ width:34, height:34, borderRadius:8, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", color:k.color, marginBottom:12 }}>
              <BarChart3 size={16}/>
            </div>
            <p style={{ fontSize:11, color:s.sub, marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>{k.label}</p>
            <p style={{ fontSize:18, fontWeight:800, color:s.text }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ ...card(dk), padding:24 }}>
          <p style={{ fontWeight:700, color:s.text, marginBottom:2 }}>Spending Trend</p>
          <p style={{ fontSize:12, color:s.sub, marginBottom:8 }}>Month-over-month</p>
          <BarChart data={MONTHLY} dk={dk}/>
        </div>
        <div style={{ ...card(dk), padding:24 }}>
          <p style={{ fontWeight:700, color:s.text, marginBottom:2 }}>Category Breakdown</p>
          <p style={{ fontSize:12, color:s.sub, marginBottom:12 }}>{selMonth}</p>
          {catData.length===0 ? (
            <p style={{ textAlign:"center", color:s.sub, padding:"32px 0" }}>No data for this month.</p>
          ) : catData.map(c=>{
            const p = total>0?(c.value/total)*100:0;
            return (
              <div key={c.name} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:99, background:c.color }}/>
                    <span style={{ color:s.sub }}>{c.name}</span>
                  </div>
                  <div style={{ display:"flex", gap:12 }}>
                    <span style={{ color:s.sub }}>{p.toFixed(0)}%</span>
                    <span style={{ fontWeight:700, color:s.text }}>{fmt(c.value)}</span>
                  </div>
                </div>
                <div style={{ height:6, background:dk?"#334155":"#F3F4F6", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${p}%`, background:c.color, borderRadius:99 }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div style={{ ...card(dk), padding:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
          <Lightbulb size={18} color="#F59E0B"/>
          <p style={{ fontWeight:700, color:s.text }}>Spending Insights</p>
        </div>
        {insights.map((ins,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px",
            background: ins.type==="warn"?"#FFF7ED":ins.type==="good"?"#F0FDF4":"#EFF6FF",
            border:`1px solid ${ins.type==="warn"?"#FED7AA":ins.type==="good"?"#BBF7D0":"#BFDBFE"}`,
            borderRadius:10, marginBottom:10 }}>
            <span style={{ flexShrink:0, marginTop:1 }}>
              {ins.type==="warn"?<AlertTriangle size={14} color="#EA580C"/>:ins.type==="good"?<Check size={14} color="#16A34A"/>:<Lightbulb size={14} color="#2563EB"/>}
            </span>
            <span style={{ fontSize:13, color:ins.type==="warn"?"#92400E":ins.type==="good"?"#166534":"#1E40AF" }}>{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Auth pages ───────────────────────────────────────────────────────────────
function AuthPage({ mode, setPage, onAuthSuccess }: {
  mode:"login"|"register";
  setPage:(p:Page)=>void;
  onAuthSuccess:(u:UserProfile)=>void;
}) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("demo@example.com");
  const [password, setPassword] = useState("password");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string,string>>({});
  const isLogin = mode==="login";

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string,string> = {};
    if (!isLogin && !name.trim()) e.name = "Name required";
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = "Valid email required";
    if (!password || password.length<6) e.password = "Min 6 characters";
    if (!isLogin && confirm!==password) e.confirm = "Passwords do not match";
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);

    try {
      if (isLogin) {
        // Call existing backend login API service (POST https://expense-tracker-backend-qgdw.onrender.com/api/auth/login)
        const data = await loginUser(email.trim(), password);

        // Save JWT token using the required key
        localStorage.setItem("token", data.token);

        // Save logged-in user information
        if (data.user) {
          localStorage.setItem("expense_tracker_user", JSON.stringify(data.user));
          onAuthSuccess(data.user);
        }

        setPage("dashboard");
      } else {
        // Registration API service call
        const data = await registerUser(name.trim(), email.trim(), password);

        if (data.token) {
          localStorage.setItem("token", data.token);
        }

        if (data.user) {
          localStorage.setItem("expense_tracker_user", JSON.stringify(data.user));
          onAuthSuccess(data.user);
        }

        setPage("dashboard");
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Authentication failed. Please check your credentials.";
      setErrors({ form: errorMsg });
    } finally {
      setLoading(false);
    }
  }

  const field = (id:string, lbl:string, node:React.ReactNode) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>{lbl}</label>
      {node}
      {errors[id] && <p style={{ color:"#DC2626", fontSize:12, marginTop:4 }}>{errors[id]}</p>}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#EFF6FF 0%,#F8FAFC 50%,#EDE9FE 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", boxShadow:"0 8px 24px rgba(37,99,235,.3)" }}>
            <Wallet size={24} color="#fff"/>
          </div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#111827", margin:"0 0 4px" }}>{isLogin?"Sign In":"Create Account"}</h1>
          <p style={{ fontSize:14, color:"#6B7280" }}>{isLogin?"Welcome back! Please sign in.":"Start tracking your expenses today."}</p>
        </div>
        <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 8px 40px rgba(0,0,0,.1)", border:"1px solid #E5E7EB", padding:28 }}>
          {errors.form && (
            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"10px 12px", marginBottom:16, color:"#DC2626", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
              <AlertTriangle size={15}/> {errors.form}
            </div>
          )}
          <form onSubmit={submit}>
            {!isLogin && field("name","Full Name",
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Alex Morgan" style={{ ...inputStyle(false), border:`1px solid ${errors.name?"#DC2626":"#E5E7EB"}` }}/>
            )}
            {field("email","Email",
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{ ...inputStyle(false), border:`1px solid ${errors.email?"#DC2626":"#E5E7EB"}` }}/>
            )}
            {field("password","Password",
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
                  style={{ ...inputStyle(false), border:`1px solid ${errors.password?"#DC2626":"#E5E7EB"}`, paddingRight:40 }}/>
                <button type="button" onClick={()=>setShowPw(v=>!v)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9CA3AF" }}>
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
            )}
            {!isLogin && field("confirm","Confirm Password",
              <input type={showPw?"text":"password"} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password"
                style={{ ...inputStyle(false), border:`1px solid ${errors.confirm?"#DC2626":"#E5E7EB"}` }}/>
            )}
            {isLogin && (
              <div style={{ textAlign:"right", marginBottom:16, marginTop:-8 }}>
                <button type="button" style={{ background:"none", border:"none", cursor:"pointer", color:"#2563EB", fontSize:13, fontWeight:600 }}>Forgot password?</button>
              </div>
            )}
            <button type="submit" disabled={loading} style={{ ...btn("#2563EB"), width:"100%", justifyContent:"center", padding:"12px", fontSize:15, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
          <p style={{ textAlign:"center", fontSize:13, color:"#6B7280", marginTop:20 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={()=>setPage(isLogin?"register":"login")}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#2563EB", fontWeight:700, fontSize:13 }}>
              {isLogin?"Sign up":"Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page,     setPage]     = useState<Page>("login");
  const [dk,       setDk]       = useState(false);
  const [currency, setCurrency] = useState("INR (₹)");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budget,   setBudget]   = useState<Budget>(() => ({ month:currentPeriod().label, amount:20000 }));
  const [mobileOpen,setMobile]  = useState(false);
  const [toast,    setToast]    = useState<{msg:string;type:"success"|"error"}|null>(null);

  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem("expense_tracker_user");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: "Alex Morgan", email: "alex@example.com" };
  });

  const handleUpdateUser = async (updated: UserProfile) => {
    setUser(updated);
    try {
      localStorage.setItem("expense_tracker_user", JSON.stringify(updated));
    } catch {}

    // Sync to backend if token exists
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch("http://localhost:5000/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(updated),
        });
      }
    } catch {
      // Ignore network errors when syncing to backend
    }
  };

  const handleAuthSuccess = (u: UserProfile) => {
    handleUpdateUser(u);
    addToast(`Welcome, ${u.name}!`, "success");
  };

  const fmt = useMemo(() => makeFmt(currency), [currency]);

  useEffect(() => {
    if (page === "login" || page === "register") return;

    const loadData = async () => {
      try {
        const data = await getExpenses();
        setExpenses(data);
      } catch (error) {
        console.error("Failed to load expenses:", error);
      }

      const period = currentPeriod();
      try {
        const data = await getBudget(period.month, period.year);
        setBudget({ month: period.label, amount: data.amount });
      } catch (error) {
        console.error("Failed to load budget:", error);
      }
    };

    loadData();
  }, [page]);

  async function handleAddExpense(expenseData: Omit<Expense,"_id">) {
    try {
      const data = await addExpense(expenseData);
      setExpenses(prev => [data.expense ?? data, ...prev]);
    } catch (error) {
      console.error("Failed to add expense:", error);
      throw error;
    }
  }

  async function handleSaveBudget(amount: number) {
    const period = currentPeriod();
    try {
      const data = await createBudget(period.month, period.year, amount);
      const savedBudget = data.budget ?? data;
      setBudget({ month: period.label, amount: savedBudget.amount });
    } catch (error) {
      console.error("Failed to save budget:", error);
      throw error;
    }
  }

  function addToast(msg:string, type:"success"|"error") {
    setToast({ msg, type });
    setTimeout(()=>setToast(null), 3000);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setPage("login");
    setMobile(false);
  }

  useEffect(() => {
    if (page !== "login" && page !== "register" && !localStorage.getItem("token")) {
      setPage("login");
      setMobile(false);
    }
  }, [page]);

  const s = T[dk?"dark":"light"];
  const authed = page!=="login" && page!=="register";

  if (!authed) {
    return (
      <>
        <style>{`*{box-sizing:border-box;margin:0;padding:0;font-family:Inter,system-ui,sans-serif}`}</style>
        <AuthPage mode={page as "login"|"register"} setPage={setPage} onAuthSuccess={handleAuthSuccess}/>
      </>
    );
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;font-family:Inter,system-ui,sans-serif}
        body{overflow:hidden}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}
        @media(max-width:768px){
          .hidden-mobile{display:none!important}
          .show-mobile{display:flex!important}
        }
        @media(min-width:769px){
          .show-mobile{display:none!important}
        }
      `}</style>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:s.bg }}>
        <Sidebar dk={dk} page={page} setPage={setPage} onLogout={handleLogout} open={mobileOpen} setOpen={setMobile} user={user}/>
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
          <Navbar dk={dk} setDk={setDk} page={page} onMenuToggle={()=>setMobile(v=>!v)} onLogout={handleLogout} currency={currency} setCurrency={setCurrency} user={user} onUpdateUser={handleUpdateUser} addToast={addToast}/>
          <div style={{ flex:1, overflowY:"auto" }}>
            {page==="dashboard" && <DashboardPage dk={dk} expenses={expenses} budget={budget} setBudget={setBudget} setPage={setPage} addToast={addToast} fmt={fmt} onAddExpense={handleAddExpense} user={user}/>}
            {page==="expenses"  && <ExpensesPage  dk={dk} expenses={expenses} setExpenses={setExpenses} addToast={addToast} fmt={fmt}/>}
            {page==="budget"    && <BudgetPage    dk={dk} expenses={expenses} budget={budget} addToast={addToast} fmt={fmt} onSaveBudget={handleSaveBudget}/>}
            {page==="reports"   && <ReportsPage   dk={dk} expenses={expenses} fmt={fmt}/>}
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </>
  );
}
