"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngredientData {
  id:        string;
  name:      string;
  category:  string;
  allergens: string[];
  organic:   boolean;
  vegan:     boolean;
  halal:     boolean | null;
  kosher:    boolean | null;
  notes?:    string;
}

interface SupplierData {
  id:           string;      // agent id like SUP001
  supabase_id?: string;      // Supabase UUID after first write
  name:         string;
  country?:     string;
  contact?:     string;
  certifications: string[];
  risk_rating:  "low" | "medium" | "high";
  notes?:       string;
}

interface LinkData {
  ingredient_id:   string;
  supplier_id:     string;
  coa_required?:   boolean;
  lead_time_days?: number | null;
}

type ActionData = IngredientData | SupplierData | LinkData | Record<string, unknown>;

interface ChatMessage {
  role:    "user" | "assistant";
  text:    string;
  action?: string;
  data?:   ActionData | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ScorePillProps { label: string; color: string; bg: string; }
function ScorePill({ label, color, bg }: ScorePillProps) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      color, background: bg, textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function AllergenTag({ name }: { name: string }) {
  return (
    <span style={{
      padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700,
      color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A",
    }}>{name}</span>
  );
}

interface IngredientCardProps {
  ing:       IngredientData;
  suppliers: SupplierData[];
  links:     LinkData[];
}
function IngredientCard({ ing, suppliers, links }: IngredientCardProps) {
  const myLinks     = links.filter(l => l.ingredient_id === ing.id);
  const mySuppliers = myLinks.map(l => suppliers.find(s => s.id === l.supplier_id)).filter((s): s is SupplierData => Boolean(s));
  return (
    <div style={{ background: "white", borderRadius: 12, padding: "12px 14px", border: "1px solid #E2E8F0", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🌿</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", marginBottom: 3 }}>{ing.name}</div>
          <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "capitalize", marginBottom: 6 }}>{ing.category} · {ing.id}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
            {ing.allergens && ing.allergens.length > 0
              ? ing.allergens.map(a => <AllergenTag key={a} name={a} />)
              : <ScorePill label="No allergens" color="#16A34A" bg="#F0FDF4" />}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {ing.organic && <ScorePill label="Organic" color="#16A34A" bg="#F0FDF4" />}
            {ing.vegan   && <ScorePill label="Vegan"   color="#7C3AED" bg="#F5F3FF" />}
            {ing.halal   && <ScorePill label="Halal"   color="#0369A1" bg="#F0F9FF" />}
            {ing.kosher  && <ScorePill label="Kosher"  color="#0369A1" bg="#F0F9FF" />}
          </div>
        </div>
      </div>
      {mySuppliers.length > 0 && (
        <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
          {mySuppliers.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B" }}>
              <span>🏭</span>
              <span style={{ fontWeight: 600, color: "#475569" }}>{s.name}</span>
              <span>·</span>
              <span>{s.country}</span>
              {s.risk_rating && (
                <ScorePill
                  label={s.risk_rating + " risk"}
                  color={s.risk_rating === "low" ? "#16A34A" : s.risk_rating === "medium" ? "#D97706" : "#DC2626"}
                  bg={s.risk_rating === "low" ? "#F0FDF4" : s.risk_rating === "medium" ? "#FFFBEB" : "#FEF2F2"}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {ing.notes && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>{ing.notes}</div>
      )}
    </div>
  );
}

interface SupplierCardProps {
  sup:         SupplierData;
  ingredients: IngredientData[];
  links:       LinkData[];
}
function SupplierCard({ sup, ingredients, links }: SupplierCardProps) {
  const myLinks = links.filter(l => l.supplier_id === sup.id);
  const myIngs  = myLinks.map(l => ingredients.find(i => i.id === l.ingredient_id)).filter((i): i is IngredientData => Boolean(i));
  return (
    <div style={{ background: "white", borderRadius: 12, padding: "12px 14px", border: "1px solid #E2E8F0", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏭</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", marginBottom: 2 }}>{sup.name}</div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>{sup.country} · {sup.id}</div>
          {sup.certifications && sup.certifications.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {sup.certifications.map(c => (
                <ScorePill key={c} label={c} color="#2563EB" bg="#EFF6FF" />
              ))}
            </div>
          )}
          {myIngs.length > 0 && (
            <div style={{ fontSize: 11, color: "#64748B" }}>
              Supplies: {myIngs.map(i => i.name).join(", ")}
            </div>
          )}
          {sup.contact && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{sup.contact}</div>}
          {sup.notes && <div style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic", marginTop: 4 }}>{sup.notes}</div>}
          {sup.supabase_id && (
            <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 4 }}>✓ Saved to database</div>
          )}
        </div>
        <ScorePill
          label={(sup.risk_rating || "medium") + " risk"}
          color={sup.risk_rating === "low" ? "#16A34A" : sup.risk_rating === "high" ? "#DC2626" : "#D97706"}
          bg={sup.risk_rating === "low" ? "#F0FDF4" : sup.risk_rating === "high" ? "#FEF2F2" : "#FFFBEB"}
        />
      </div>
    </div>
  );
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED = [
  "I make a vegan hot sauce",
  "Add chilli peppers from Spain",
  "My vinegar supplier is Continental Vinegars in Germany",
  "Celery salt — is that an allergen?",
  "Link the celery salt to my UK supplier",
  "Show me the full database",
  "Add mustard seeds, organic certified",
  "My supplier has BRC and ISO 22000",
];

// ─── Storage helpers (localStorage) ─────────────────────────────────────────

const LS_DB   = "ingredient_db_v1";
const LS_CHAT = "ingredient_chat_v1";

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded — silently ignore */ }
}
function lsDel(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function IngredientAgentClient() {
  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [ingredients,    setIngredients]    = useState<IngredientData[]>([]);
  const [suppliers,      setSuppliers]      = useState<SupplierData[]>([]);
  const [links,          setLinks]          = useState<LinkData[]>([]);
  const [activeTab,      setActiveTab]      = useState("chat");
  const [showSuggestions,setShowSuggestions]= useState(true);
  const [storageLoaded,  setStorageLoaded]  = useState(false);
  const [orgId,          setOrgId]          = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch org_id on mount for Supabase writes ────────────────────────────
  useEffect(() => {
    const db = createClient();
    db.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      db.from("profiles").select("organisation_id").eq("id", user.id).single()
        .then(({ data }) => { if (data) setOrgId((data as { organisation_id: string }).organisation_id); });
    });
  }, []);

  // ── Load from localStorage on mount ─────────────────────────────────────
  useEffect(() => {
    const db = lsGet(LS_DB);
    if (db) {
      try {
        const saved = JSON.parse(db);
        if (saved.ingredients) setIngredients(saved.ingredients);
        if (saved.suppliers)   setSuppliers(saved.suppliers);
        if (saved.links)       setLinks(saved.links);
      } catch {}
    }
    const chat = lsGet(LS_CHAT);
    if (chat) {
      try {
        const saved = JSON.parse(chat);
        if (saved.messages && saved.messages.length > 0) {
          setMessages(saved.messages);
          setShowSuggestions(false);
        }
      } catch {}
    }
    setStorageLoaded(true);
  }, []);

  // ── Persist to localStorage whenever data changes ────────────────────────
  useEffect(() => {
    if (!storageLoaded) return;
    lsSet(LS_DB, JSON.stringify({ ingredients, suppliers, links }));
  }, [ingredients, suppliers, links, storageLoaded]);

  useEffect(() => {
    if (!storageLoaded || messages.length === 0) return;
    lsSet(LS_CHAT, JSON.stringify({ messages: messages.slice(-40) }));
  }, [messages, storageLoaded]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Auto-greet on first load ─────────────────────────────────────────────
  useEffect(() => {
    if (storageLoaded && messages.length === 0) handleFirstGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageLoaded]);

  // ── Supabase supplier writes ─────────────────────────────────────────────
  async function writeSupplierToSupabase(sup: SupplierData): Promise<string | null> {
    if (!orgId) return null;
    try {
      const db = createClient();
      const { data, error } = await (db as any)
        .from("suppliers")
        .insert({
          organisation_id: orgId,
          name:            sup.name,
          country:         sup.country ?? null,
          contact_email:   sup.contact ?? null,
          certifications:  sup.certifications ?? [],
          risk_rating:     sup.risk_rating ?? "medium",
          notes:           sup.notes ?? null,
          approved:        false,
        })
        .select("id")
        .single();
      if (error || !data) return null;
      return (data as { id: string }).id;
    } catch { return null; }
  }

  async function updateSupplierInSupabase(supabaseId: string, fields: Partial<SupplierData>) {
    if (!orgId || !supabaseId) return;
    try {
      const db = createClient();
      const patch: Record<string, unknown> = {};
      if (fields.name)           patch.name           = fields.name;
      if (fields.country)        patch.country        = fields.country;
      if (fields.contact)        patch.contact_email  = fields.contact;
      if (fields.certifications) patch.certifications = fields.certifications;
      if (fields.risk_rating)    patch.risk_rating    = fields.risk_rating;
      if (fields.notes)          patch.notes          = fields.notes;
      await (db as any).from("suppliers").update(patch).eq("id", supabaseId);
    } catch {}
  }

  // ── Process API response ─────────────────────────────────────────────────
  async function processResponse(rawText: string) {
    let json: { message: string; action: string; data: ActionData | null };
    try {
      const clean = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      json = JSON.parse(clean);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: rawText, action: "none" }]);
      return;
    }

    const newMsg: ChatMessage = { role: "assistant", text: json.message, action: json.action, data: json.data };

    if (json.action === "add_ingredient" && json.data) {
      const ing = json.data as IngredientData;
      setIngredients(prev => {
        const exists = prev.find(i => i.id === ing.id);
        if (exists) return prev.map(i => i.id === ing.id ? { ...i, ...ing } : i);
        return [...prev, ing];
      });

    } else if (json.action === "add_supplier" && json.data) {
      const sup = json.data as SupplierData;
      // Write to Supabase first, attach supabase_id
      const supabaseId = await writeSupplierToSupabase(sup);
      const enriched   = supabaseId ? { ...sup, supabase_id: supabaseId } : sup;
      setSuppliers(prev => {
        const exists = prev.find(s => s.id === enriched.id);
        if (exists) return prev.map(s => s.id === enriched.id ? { ...s, ...enriched } : s);
        return [...prev, enriched];
      });
      newMsg.data = enriched;

    } else if (json.action === "link_supplier" && json.data) {
      const link = json.data as LinkData;
      setLinks(prev => {
        const exists = prev.find(l => l.ingredient_id === link.ingredient_id && l.supplier_id === link.supplier_id);
        if (exists) return prev;
        return [...prev, link];
      });

    } else if (json.action === "update_ingredient" && json.data) {
      const upd = json.data as IngredientData;
      setIngredients(prev => prev.map(i => i.id === upd.id ? { ...i, ...upd } : i));

    } else if (json.action === "update_supplier" && json.data) {
      const upd = json.data as SupplierData;
      setSuppliers(prev => prev.map(s => {
        if (s.id !== upd.id) return s;
        const updated = { ...s, ...upd };
        if (updated.supabase_id) updateSupplierInSupabase(updated.supabase_id, upd);
        return updated;
      }));

    } else if (json.action === "show_database") {
      setActiveTab("ingredients");
    }

    setMessages(prev => [...prev, newMsg]);
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setShowSuggestions(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage    = { role: "user", text: content };
    const updatedMessages         = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    const context = `Current database state:
Ingredients (${ingredients.length}): ${ingredients.map(i => `${i.name} (${i.id})`).join(", ") || "none"}
Suppliers (${suppliers.length}): ${suppliers.map(s => `${s.name} (${s.id})`).join(", ") || "none"}
Links: ${links.map(l => `${l.ingredient_id}->${l.supplier_id}`).join(", ") || "none"}`;

    const apiMessages = updatedMessages.map(m => ({
      role:    m.role === "assistant" ? "assistant" : "user",
      content: m.role === "user"
        ? m.text
        : JSON.stringify({ message: m.text, action: m.action ?? "none", data: m.data ?? null }),
    }));
    // Inject context into last user message
    apiMessages[apiMessages.length - 1].content = content + "\n\n[CONTEXT: " + context + "]";

    try {
      const res     = await fetch("/api/agent/ingredient", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: apiMessages }),
      });
      const data    = await res.json();
      const rawText = data.content?.[0]?.text ?? "{}";
      await processResponse(rawText);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Please try again.", action: "none" }]);
    }
    setLoading(false);
  }

  async function handleFirstGreeting() {
    setLoading(true);
    try {
      const res     = await fetch("/api/agent/ingredient", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: [{ role: "user", content: "Hello, I want to start building my ingredient database." }] }),
      });
      const data    = await res.json();
      const rawText = data.content?.[0]?.text ?? "";
      await processResponse(rawText);
    } catch {
      setMessages([{ role: "assistant", text: "Hello! I'm your ingredient database assistant. Tell me what product you're building the database for and we'll get started.", action: "none" }]);
    }
    setLoading(false);
  }

  async function clearAll() {
    if (!window.confirm("Clear all chat and local ingredient data? Suppliers already saved to the database will remain there.")) return;
    setIngredients([]); setSuppliers([]); setLinks([]); setMessages([]); setShowSuggestions(true);
    lsDel(LS_DB); lsDel(LS_CHAT);
    setTimeout(() => handleFirstGreeting(), 100);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ ingredients, suppliers, links, exported_at: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "ingredient_database.json"; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const allergensCount = ingredients.filter(i => i.allergens && i.allergens.length > 0).length;
  const organicCount   = ingredients.filter(i => i.organic).length;
  const linkedCount    = new Set(links.map(l => l.ingredient_id)).size;

  const tabs = [
    { id: "chat",        label: "Agent",                                                            icon: "🤖" },
    { id: "ingredients", label: `Ingredients${ingredients.length ? ` (${ingredients.length})` : ""}`, icon: "🌿" },
    { id: "suppliers",   label: `Suppliers${suppliers.length ? ` (${suppliers.length})` : ""}`,       icon: "🏭" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily:     "'DM Sans', system-ui, sans-serif",
      background:     "#F8FAFC",
      // Fill exactly the viewport area that AppShell exposes (44px AgentBar + 60px BottomNav = 104px)
      height:         "calc(100vh - 104px)",
      display:        "flex",
      flexDirection:  "column",
      overflow:       "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@700;800&display=swap');
        .ia-chip { background: white; border: 1px solid #E2E8F0; color: #475569; padding: 6px 12px; border-radius: 20px; font-family: inherit; font-size: 12px; cursor: pointer; transition: all 0.12s; }
        .ia-chip:hover { border-color: #2563EB; color: #2563EB; background: #EFF6FF; }
        .ia-send { border: none; cursor: pointer; transition: all 0.1s; }
        .ia-send:hover:not(:disabled) { transform: scale(0.95); }
        .ia-send:disabled { opacity: 0.35; cursor: not-allowed; }
        .ia-tab { border: none; cursor: pointer; background: transparent; font-family: inherit; transition: all 0.15s; }
        .ia-msg { animation: ia-rise 0.2s ease; }
        @keyframes ia-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .ia-dot { animation: ia-pulse 1.2s ease-in-out infinite; }
        @keyframes ia-pulse { 0%,100%{opacity:.2}50%{opacity:1} }
        .ia-action { border: none; cursor: pointer; font-family: inherit; transition: all 0.12s; }
        .ia-action:hover { opacity: 0.85; }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #16A34A, #22C55E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🌿</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 15, color: "#1E293B" }}>Ingredient & Supplier Database</div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>AI-powered · EU compliance · Suppliers saved to database</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="ia-action" onClick={exportData} style={{ padding: "6px 10px", borderRadius: 8, background: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 600 }}>Export JSON</button>
            <button className="ia-action" onClick={clearAll}   style={{ padding: "6px 10px", borderRadius: 8, background: "#FEF2F2", color: "#DC2626", fontSize: 11, fontWeight: 600 }}>Clear</button>
          </div>
        </div>

        {/* Stats bar */}
        {(ingredients.length > 0 || suppliers.length > 0) && (
          <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
            {[
              { val: ingredients.length, label: "Ingredients", color: "#16A34A" },
              { val: suppliers.length,   label: "Suppliers",   color: "#2563EB" },
              { val: allergensCount,     label: "Allergens",   color: "#D97706" },
              { val: organicCount,       label: "Organic",     color: "#7C3AED" },
              { val: linkedCount,        label: "Linked",      color: "#0369A1" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 18, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} className="ia-tab" onClick={() => setActiveTab(t.id)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: activeTab === t.id ? "#2563EB" : "#64748B", background: activeTab === t.id ? "#EFF6FF" : "transparent" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat tab ──────────────────────────────────────────────────── */}
      {activeTab === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {messages.map((m, i) => (
              <div key={i} className="ia-msg" style={{ marginBottom: 14, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" ? (
                  <div style={{ maxWidth: "88%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: "linear-gradient(135deg, #16A34A, #22C55E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🌿</div>
                      <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>DATABASE AGENT</span>
                      {m.action && m.action !== "none" && (
                        <span style={{ fontSize: 10, background: "#F0FDF4", color: "#16A34A", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>
                          {m.action === "add_ingredient"  ? "✓ Ingredient added"  :
                           m.action === "add_supplier"    ? "✓ Supplier saved"    :
                           m.action === "link_supplier"   ? "✓ Linked"            :
                           m.action === "update_ingredient" ? "✓ Ingredient updated" :
                           m.action === "update_supplier" ? "✓ Supplier updated"  :
                           m.action === "show_database"   ? "📊 Showing database" : ""}
                        </span>
                      )}
                    </div>
                    <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "3px 12px 12px 12px", padding: "10px 13px", fontSize: 13, lineHeight: 1.65, color: "#475569" }}>
                      {m.text}
                    </div>
                    {m.action === "add_ingredient" && m.data && (
                      <div style={{ marginTop: 6, background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "8px 10px", fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: "#16A34A", marginBottom: 4 }}>🌿 {(m.data as IngredientData).name}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          <span style={{ color: "#64748B" }}>{(m.data as IngredientData).category}</span>
                          {(m.data as IngredientData).allergens?.map(a => <AllergenTag key={a} name={a} />)}
                          {(m.data as IngredientData).organic && <ScorePill label="Organic" color="#16A34A" bg="#DCFCE7" />}
                          {(m.data as IngredientData).vegan   && <ScorePill label="Vegan"   color="#7C3AED" bg="#F5F3FF" />}
                        </div>
                      </div>
                    )}
                    {m.action === "add_supplier" && m.data && (
                      <div style={{ marginTop: 6, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 10px", fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: "#2563EB", marginBottom: 4 }}>🏭 {(m.data as SupplierData).name}</div>
                        <div style={{ color: "#64748B" }}>{(m.data as SupplierData).country} · {(m.data as SupplierData).certifications?.join(", ")}</div>
                        {(m.data as SupplierData).supabase_id && (
                          <div style={{ fontSize: 10, color: "#16A34A", marginTop: 4 }}>✓ Saved to Suppliers database</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: "#1E293B", borderRadius: "12px 3px 12px 12px", padding: "10px 13px", fontSize: 13, color: "#E2E8F0", lineHeight: 1.6, maxWidth: "78%" }}>
                    {m.text}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="ia-msg" style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: "linear-gradient(135deg, #16A34A, #22C55E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🌿</div>
                </div>
                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "3px 12px 12px 12px", padding: "12px 14px", display: "inline-flex", gap: 5 }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} className="ia-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A", animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            )}

            {showSuggestions && messages.length === 0 && !loading && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "#CBD5E1", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>Try saying</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SUGGESTED.map(s => <button key={s} className="ia-chip" onClick={() => send(s)}>{s}</button>)}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: "12px 14px 16px", borderTop: "1px solid #E2E8F0", background: "white", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "8px 10px 8px 14px" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 100) + "px";
                }}
                placeholder="Tell me about your ingredients and suppliers…"
                rows={1}
                style={{ flex: 1, background: "transparent", border: "none", color: "#1E293B", fontSize: 13, lineHeight: 1.5, maxHeight: 100, overflowY: "auto", outline: "none", resize: "none", fontFamily: "inherit" }}
              />
              {/* Send button — 44×44 tap target */}
              <button
                className="ia-send"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  width:           44,
                  height:          44,
                  borderRadius:    10,
                  background:      input.trim() && !loading ? "linear-gradient(135deg, #16A34A, #22C55E)" : "#E2E8F0",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  color:           "white",
                  fontSize:        16,
                  flexShrink:      0,
                }}>↑</button>
            </div>
            <div style={{ fontSize: 10, color: "#CBD5E1", textAlign: "center", marginTop: 6 }}>Enter to send · Suppliers auto-save to database</div>
          </div>
        </>
      )}

      {/* ── Ingredients tab ───────────────────────────────────────────── */}
      {activeTab === "ingredients" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {ingredients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#94A3B8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, color: "#475569", marginBottom: 6 }}>No ingredients yet</div>
              <div style={{ fontSize: 13 }}>Go to the Agent tab and start telling it about your recipe ingredients.</div>
              <button onClick={() => setActiveTab("chat")} style={{ marginTop: 14, padding: "10px 20px", borderRadius: 10, background: "#16A34A", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Start with the agent →</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {ingredients.filter(i => i.allergens?.length > 0).length > 0 && (
                  <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#92400E", fontWeight: 600 }}>
                    ⚠️ {ingredients.filter(i => i.allergens?.length > 0).length} ingredient{ingredients.filter(i => i.allergens?.length > 0).length !== 1 ? "s" : ""} contain allergens
                  </div>
                )}
                {ingredients.filter(i => !links.some(l => l.ingredient_id === i.id)).length > 0 && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#DC2626", fontWeight: 600 }}>
                    🔴 {ingredients.filter(i => !links.some(l => l.ingredient_id === i.id)).length} without supplier
                  </div>
                )}
              </div>
              {ingredients.map(ing => (
                <IngredientCard key={ing.id} ing={ing} suppliers={suppliers} links={links} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Suppliers tab ─────────────────────────────────────────────── */}
      {activeTab === "suppliers" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {suppliers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#94A3B8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16, color: "#475569", marginBottom: 6 }}>No suppliers yet</div>
              <div style={{ fontSize: 13 }}>Go to the Agent tab and tell it about your ingredient suppliers.</div>
              <button onClick={() => setActiveTab("chat")} style={{ marginTop: 14, padding: "10px 20px", borderRadius: 10, background: "#2563EB", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Start with the agent →</button>
            </div>
          ) : (
            suppliers.map(sup => (
              <SupplierCard key={sup.id} sup={sup} ingredients={ingredients} links={links} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
