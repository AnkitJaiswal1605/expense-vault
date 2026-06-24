import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const CATEGORIES = [
  { value: "food", label: "Food", icon: "🍽", color: "#E8A838" },
  { value: "travel", label: "Travel", icon: "✈", color: "#5B8DEF" },
  { value: "bills", label: "Bills", icon: "📄", color: "#EF5B5B" },
  { value: "other", label: "Other", icon: "📦", color: "#8B5CF6" },
];

const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

function formatCurrency(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Auth Screen ─────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (signUpErr) throw signUpErr;
        if (data.user) {
          onLogin(data.user);
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
        if (data.user) {
          onLogin(data.user);
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>◈</div>
          <h1 style={styles.logoText}>ExpenseVault</h1>
          <p style={styles.logoSub}>Track every rupee with precision</p>
        </div>

        <div style={styles.tabRow}>
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                ...styles.tab,
                ...(mode === m ? styles.tabActive : {}),
              }}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {mode === "signup" && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              placeholder="Ankit Jaiswal"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────
function Dashboard({ user, onLogout }) {
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "food",
    date: new Date().toISOString().split("T")[0],
  });
  const [formError, setFormError] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  const loadExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (!error && data) setExpenses(data);
    setLoaded(true);
  }, [user.id]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleAdd = async () => {
    setFormError("");
    if (!formData.name.trim()) { setFormError("Enter expense name."); return; }
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        name: formData.name.trim(),
        amount: Number(formData.amount),
        category: formData.category,
        date: formData.date,
      })
      .select()
      .single();

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    setExpenses((prev) => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setFormData({ name: "", amount: "", category: "food", date: new Date().toISOString().split("T")[0] });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    setTimeout(() => {
      if (!error) setExpenses((prev) => prev.filter((e) => e.id !== id));
      setDeletingId(null);
    }, 300);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const filtered = filterCat === "all" ? expenses : expenses.filter((e) => e.category === filterCat);
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const catTotals = CATEGORIES.map((c) => ({
    ...c,
    total: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0),
  }));

  if (!loaded) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerLogo}>◈</span>
          <span style={styles.headerTitle}>ExpenseVault</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userName}>{displayName}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      <div style={styles.content}>
        {/* Summary Cards */}
        <div style={styles.summaryRow}>
          <div style={{ ...styles.summaryCard, ...styles.totalCard }}>
            <p style={styles.summaryLabel}>Total Spent</p>
            <p style={styles.summaryValue}>{formatCurrency(totalAll)}</p>
            <p style={styles.summaryMeta}>{expenses.length} transaction{expenses.length !== 1 ? "s" : ""}</p>
          </div>
          {catTotals.map((c) => (
            <div key={c.value} style={styles.summaryCard}>
              <p style={styles.summaryLabel}>
                <span style={{ marginRight: 6 }}>{c.icon}</span>
                {c.label}
              </p>
              <p style={{ ...styles.summaryValue, color: c.color, fontSize: 20 }}>
                {formatCurrency(c.total)}
              </p>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div style={styles.actionBar}>
          <div style={styles.filterRow}>
            {[{ value: "all", label: "All" }, ...CATEGORIES].map((c) => (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                style={{
                  ...styles.filterChip,
                  ...(filterCat === c.value ? styles.filterChipActive : {}),
                }}
              >
                {c.icon ? `${c.icon} ` : ""}{c.label}
              </button>
            ))}
          </div>
          <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ Add Expense"}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>New Expense</h3>
            <div style={styles.formGrid}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Name</label>
                <input
                  style={styles.input}
                  placeholder="Uber ride, groceries..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Amount (₹)</label>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Category</label>
                <select
                  style={styles.input}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            {formError && <p style={styles.error}>{formError}</p>}
            <button style={styles.primaryBtn} onClick={handleAdd} disabled={saving}>
              {saving ? "Saving..." : "Save Expense"}
            </button>
          </div>
        )}

        {/* Expense List */}
        {filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>◇</div>
            <p style={styles.emptyText}>
              {expenses.length === 0
                ? "No expenses yet. Tap \"+ Add Expense\" to start tracking."
                : "No expenses in this category."}
            </p>
          </div>
        ) : (
          <div style={styles.listArea}>
            <div style={styles.listHeader}>
              <span style={styles.listCount}>
                {filtered.length} expense{filtered.length !== 1 ? "s" : ""}
                {filterCat !== "all" ? ` in ${categoryMap[filterCat]?.label}` : ""}
              </span>
              <span style={styles.listTotal}>{formatCurrency(totalFiltered)}</span>
            </div>
            <div style={styles.list}>
              {filtered.map((exp) => {
                const cat = categoryMap[exp.category] || categoryMap.other;
                const isDeleting = deletingId === exp.id;
                return (
                  <div
                    key={exp.id}
                    style={{
                      ...styles.expenseRow,
                      opacity: isDeleting ? 0 : 1,
                      transform: isDeleting ? "translateX(40px)" : "translateX(0)",
                      transition: "opacity 0.3s, transform 0.3s",
                    }}
                  >
                    <div
                      style={{
                        ...styles.catDot,
                        background: cat.color,
                        boxShadow: `0 0 10px ${cat.color}44`,
                      }}
                    >
                      {cat.icon}
                    </div>
                    <div style={styles.expenseInfo}>
                      <p style={styles.expenseName}>{exp.name}</p>
                      <p style={styles.expenseMeta}>
                        {cat.label} · {formatDate(exp.date)}
                      </p>
                    </div>
                    <div style={styles.expenseRight}>
                      <p style={styles.expenseAmount}>{formatCurrency(Number(exp.amount))}</p>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDelete(exp.id)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App Root ────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setChecking(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = () => setUser(null);

  if (checking) {
    return <div style={styles.loadingWrap}><div style={styles.spinner} /></div>;
  }

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <AuthScreen onLogin={setUser} />
  );
}

// ─── Styles ──────────────────────────────────────────────────
const gold = "#C9A84C";
const goldDim = "#A68A3A";
const bg0 = "#08080E";
const bg1 = "#0F0F1A";
const bg2 = "#161625";
const bg3 = "#1E1E32";
const border = "#252540";
const textPrimary = "#EAEAF0";
const textSecondary = "#8888A4";
const textMuted = "#5C5C78";
const danger = "#EF4444";

const styles = {
  authContainer: {
    minHeight: "100vh",
    background: `linear-gradient(160deg, ${bg0} 0%, #0C0C18 50%, #100E1A 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  authCard: {
    width: "100%",
    maxWidth: 400,
    background: bg1,
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: "36px 32px",
  },
  logoArea: { textAlign: "center", marginBottom: 28 },
  logoIcon: {
    fontSize: 36,
    color: gold,
    marginBottom: 8,
    display: "block",
    filter: "drop-shadow(0 0 12px #C9A84C44)",
  },
  logoText: {
    fontSize: 26,
    fontWeight: 700,
    color: textPrimary,
    margin: 0,
    letterSpacing: "-0.5px",
  },
  logoSub: {
    fontSize: 13,
    color: textSecondary,
    marginTop: 4,
    letterSpacing: "0.4px",
  },
  tabRow: {
    display: "flex",
    background: bg0,
    borderRadius: 10,
    padding: 3,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: "10px 0",
    background: "transparent",
    border: "none",
    color: textSecondary,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: 8,
    transition: "all 0.2s",
  },
  tabActive: { background: bg3, color: textPrimary },
  fieldGroup: { marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: textSecondary,
    marginBottom: 6,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    background: bg0,
    border: `1px solid ${border}`,
    borderRadius: 10,
    color: textPrimary,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  error: {
    color: danger,
    fontSize: 13,
    margin: "8px 0 0",
    padding: "8px 12px",
    background: "#EF444412",
    borderRadius: 8,
  },
  primaryBtn: {
    width: "100%",
    padding: "13px 0",
    marginTop: 12,
    background: `linear-gradient(135deg, ${gold}, ${goldDim})`,
    border: "none",
    borderRadius: 10,
    color: "#0A0A10",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.3px",
    transition: "filter 0.2s",
  },
  dashboard: {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${bg0} 0%, #0C0C18 100%)`,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: `1px solid ${border}`,
    background: `${bg1}CC`,
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerLogo: { fontSize: 22, color: gold },
  headerTitle: { fontSize: 18, fontWeight: 700, color: textPrimary, letterSpacing: "-0.3px" },
  headerRight: { display: "flex", alignItems: "center", gap: 14 },
  userName: { fontSize: 13, color: textSecondary, fontWeight: 500 },
  logoutBtn: {
    background: bg3,
    border: `1px solid ${border}`,
    borderRadius: 8,
    color: textSecondary,
    fontSize: 12,
    fontWeight: 600,
    padding: "7px 14px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  content: { maxWidth: 800, margin: "0 auto", padding: "24px 20px 60px" },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    background: bg2,
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: "18px 20px",
  },
  totalCard: {
    borderColor: `${gold}33`,
    background: `linear-gradient(135deg, ${bg2}, #1A1828)`,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    margin: 0,
  },
  summaryValue: { fontSize: 24, fontWeight: 700, color: textPrimary, margin: "6px 0 0" },
  summaryMeta: { fontSize: 12, color: textMuted, margin: "4px 0 0" },
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  filterRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  filterChip: {
    padding: "7px 14px",
    borderRadius: 20,
    border: `1px solid ${border}`,
    background: "transparent",
    color: textSecondary,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  filterChipActive: { background: `${gold}22`, borderColor: gold, color: gold },
  addBtn: {
    padding: "9px 20px",
    borderRadius: 10,
    border: "none",
    background: `linear-gradient(135deg, ${gold}, ${goldDim})`,
    color: "#0A0A10",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "filter 0.2s",
    whiteSpace: "nowrap",
  },
  formCard: {
    background: bg2,
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
  },
  formTitle: { fontSize: 16, fontWeight: 700, color: textPrimary, margin: "0 0 18px" },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  listArea: {},
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listCount: { fontSize: 13, color: textMuted, fontWeight: 500 },
  listTotal: { fontSize: 14, color: gold, fontWeight: 700 },
  list: { display: "flex", flexDirection: "column", gap: 6 },
  expenseRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    background: bg2,
    border: `1px solid ${border}`,
    borderRadius: 12,
  },
  catDot: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  expenseInfo: { flex: 1, minWidth: 0 },
  expenseName: {
    fontSize: 14,
    fontWeight: 600,
    color: textPrimary,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  expenseMeta: { fontSize: 12, color: textMuted, margin: "3px 0 0" },
  expenseRight: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  expenseAmount: { fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0, whiteSpace: "nowrap" },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid transparent",
    background: "transparent",
    color: textMuted,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  emptyState: { textAlign: "center", padding: "60px 20px" },
  emptyIcon: { fontSize: 48, color: textMuted, marginBottom: 16, opacity: 0.4 },
  emptyText: { fontSize: 14, color: textMuted, maxWidth: 280, margin: "0 auto", lineHeight: 1.6 },
  loadingWrap: {
    minHeight: "100vh",
    background: bg0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 32,
    height: 32,
    border: `3px solid ${border}`,
    borderTopColor: gold,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

if (typeof document !== "undefined" && !document.getElementById("ev-keyframes")) {
  const styleEl = document.createElement("style");
  styleEl.id = "ev-keyframes";
  styleEl.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    input:focus, select:focus { border-color: ${gold} !important; }
    button:hover { filter: brightness(1.1); }
    select option { background: ${bg0}; color: ${textPrimary}; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${border}; border-radius: 3px; }
  `;
  document.head.appendChild(styleEl);
}
