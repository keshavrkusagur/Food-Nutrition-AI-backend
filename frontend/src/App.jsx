import { useState, useRef, useCallback } from "react";

// ── Utility ──────────────────────────────────────────────────────────────────
const cx = (...args) => args.filter(Boolean).join(" ");

// ── API config ────────────────────────────────────────────────────────────────
const API_BASE = "http://127.0.0.1:8000";

async function analyzeFood(imageFile, mode) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);

  const raw = await res.json();

  if (raw.error) throw new Error(raw.error);

  // Map health string → badge status
  const statusMap = {
    "Healthy ✅":   "Good",
    "Moderate ⚖️": "Moderate",
    "Unhealthy ❌": "Poor",
    "Unknown ⚠️":  "Moderate",
    "Unknown":      "Moderate",
  };

  // Nutrition may be "Not found in database ⚠️" string if lookup failed
  const nutrition = typeof raw.nutrition === "object" && raw.nutrition !== null
    ? raw.nutrition
    : {};

  const CONFIDENCE_THRESHOLD = 0.75;

const normalizedFood = (raw.food || "")
  .toLowerCase()
  .replace(/[^a-z\s]/g, "")
  .trim();

// Basic sanity check (avoid garbage predictions)
const isMeaningful = normalizedFood.length > 2;

const isValidFood =
  typeof raw.confidence === "number" &&
  raw.confidence >= CONFIDENCE_THRESHOLD;

if (!isValidFood) {
  return {
    name: "Food Not Detected",
    confidence: raw.confidence * 100,
    status: "Unknown",

    calories: 0,
    fat: 0,
    sugar: 0,
    protein: 0,
    sodium: 0,

    fullNutrition: null,
    rawHealth: "unknown"
  };
}

return {
  name: raw.food,
  confidence: raw.confidence * 100,
  status: statusMap[raw.health] ?? "Moderate",

  calories: Math.round(nutrition["Data.Kilocalories"] ?? 0),
  fat: Math.round(nutrition["Data.Fat.Total Lipid"] ?? 0),
  sugar: Math.round(nutrition["Data.Sugar Total"] ?? 0),
  protein: Math.round(nutrition["Data.Protein"] ?? 0),
  sodium: Math.round(nutrition["Data.Major Minerals.Sodium"] ?? 0),

  fullNutrition: nutrition,
  rawHealth: raw.health
};}


// ── Sub-components ────────────────────────────────────────────────────────────

function GlowButton({ children, onClick, disabled, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx("glow-btn", className)}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {children}
    </button>
  );
}

function ModeToggle({ mode, setMode }) {
  return (
    <div className="mode-toggle">
      {["Quick Scan", "Deep Scan"].map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={cx("mode-btn", mode === m && "active")}
        >
          <span className="mode-icon">{m === "Quick Scan" ? "⚡" : "🔬"}</span>
          {m}
        </button>
      ))}
    </div>
  );
}

function DropZone({ onFile, preview }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handle = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    onFile(url, file);   
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files[0]);
  }, []);

  return (
    <div
      className={cx("dropzone", dragging && "dragging")}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => handle(e.target.files[0])} />
      {preview ? (
        <div className="preview-wrap">
          <img src={preview} alt="Uploaded food" className="preview-img" />
          <div className="preview-badge">✓ Ready</div>
        </div>
      ) : (
        <>
          <div className="drop-icon">📤</div>
          <p className="drop-title">Drop image here</p>
          <p className="drop-sub">or click to browse</p>
        </>
      )}
    </div>
  );
}

function NutriBar({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="nutri-bar-row">
      <span className="nutri-label">{label}</span>
      <div className="nutri-track">
        <div className="nutri-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="nutri-value">{value}{label === "Calories" ? "" : "g"}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { Good: ["#22d3a5", "#0f3d2e"], Moderate: ["#f59e0b", "#3d2c0a"], Poor: ["#ef4444", "#3d0f0f"] };
  const [border, bg] = map[status] || map.Moderate;
  return (
    <span className="status-badge" style={{ borderColor: border, color: border, background: bg }}>
      {status === "Good" ? "✦ " : status === "Moderate" ? "◈ " : "⚠ "}{status}
    </span>
  );
}

function ScanRing({ state }) {
  return (
    <div className={cx("scan-ring-outer", state === "loading" && "spinning")}>
      <div className="scan-ring-mid">
        <div className="scan-ring-inner">
          {state === "idle" && (
            <div className="scan-idle-content">
              <div className="scan-icon">🍽️</div>
              <p className="scan-title">READY TO SCAN</p>
              <p className="scan-sub">Upload food image to begin analysis</p>
            </div>
          )}
          {state === "loading" && (
            <div className="scan-loading-content">
              <div className="scan-pulse-icon">⬡</div>
              <p className="scan-title glow-text">Analyzing...</p>
              <p className="scan-sub">Running neural inference</p>
            </div>
          )}
        </div>
      </div>
      {state === "loading" && (
        <>
          <div className="orbit orbit-1" />
          <div className="orbit orbit-2" />
        </>
      )}
    </div>
  );
}

function ResultCard({ result, preview, mode }) {
  return (
    <div className="result-card glass">
      {/* HEADER (COMMON) */}
      <div className="result-header">
        {preview && (
          <img src={preview} alt={result.name} className="result-thumb" />
        )}

        <div className="result-title-block">
          <h2 className="result-name">{result.name}</h2>

          <div className="result-meta">
            <StatusBadge status={result.status} />
            <span className="confidence">
              <span className="conf-dot" />
              {result.confidence.toFixed(1)}% confidence
            </span>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* ⚡ QUICK SCAN */}
      {mode === "Quick Scan" && (
        <>
          <div className="nutri-grid">
            {[
              { label: "Calories", value: result.calories, max: 800, color: "#818cf8" },
              { label: "Protein",  value: result.protein,  max: 60,  color: "#22d3a5" },
              { label: "Fat",      value: result.fat,      max: 60,  color: "#f59e0b" },
              { label: "Sugar",    value: result.sugar,    max: 80,  color: "#ef4444" },
              { label: "Sodium",   value: result.sodium,   max: 2000, color: "#38bdf8" },
            ].map((n) => (
              <NutriBar key={n.label} {...n} />
            ))}
          </div>

          <div className="stat-row">
            {[
              { label: "Calories", val: `${result.calories} kcal`, icon: "🔥" },
              { label: "Fat",      val: `${result.fat}g`,          icon: "💧" },
              { label: "Sugar",    val: `${result.sugar}g`,        icon: "🍬" },
              { label: "Protein",  val: `${result.protein}g`,      icon: "💪" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <span className="stat-icon">{s.icon}</span>
                <span className="stat-val">{s.val}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 🔬 DEEP SCAN */}
      {mode === "Deep Scan" && (
        <div className="deep-section">
          <h3 className="deep-title">Full Nutrition Breakdown</h3>

          <div className="deep-grid">
            {Object.entries(result.fullNutrition || {}).map(([key, value]) => (
              <div key={key} className="deep-item">
                <span className="deep-key">
                  {key.replace("Data.", "")}
                </span>
                <span className="deep-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function NutriLens() {
  const [mode, setMode] = useState("Quick Scan");
  const [state, setState] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null); 
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);           

  const handleAnalyze = async () => {
    if (state === "loading") return;
    if (!imageFile) return;            
    setState("loading");
    setResult(null);
    setError(null);
    try {
      const res = await analyzeFood(imageFile, mode);
      setResult(res);
      setState("result");
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setPreview(null);
    setImageFile(null);
    setError(null);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="logo-block">
            <div className="logo-icon">⬡</div>
            <div>
              <span className="logo-text">NutriLens</span>
              <span className="logo-tag">AI · v2.4</span>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">INPUT SOURCE</p>
            <DropZone
  onFile={(url, file) => { setPreview(url); setImageFile(file); }}
  preview={preview}
/>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">SCAN MODE</p>
            <ModeToggle mode={mode} setMode={setMode} />
          </div>

          <div className="sidebar-section">
            <GlowButton onClick={handleAnalyze} disabled={state === "loading" || !imageFile}>
  {state === "loading" ? "⬡ Processing..." : "⬡ Analyze Food"}
</GlowButton>
{error && (
  <p style={{ color: "#ef4444", fontSize: "11px", marginTop: "8px",
               fontFamily: "monospace", textAlign: "center" }}>
    ⚠ {error}
  </p>
)}
            {state !== "idle" && (
              <button className="reset-btn" onClick={handleReset}>↺ Reset</button>
            )}
          </div>

          <div className="sidebar-footer">
            <div className="status-dot-row">
              <span className="dot-green" /> Model Online
            </div>
            <div className="status-dot-row">
              <span className="dot-blue" /> {mode} Active
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          <header className="topbar">
            <div>
              <p className="topbar-title">Food Analysis Studio</p>
              <p className="topbar-sub">AI-powered nutritional intelligence</p>
            </div>
            <div className="topbar-chips">
              <span className="chip">🟢 All Systems Nominal</span>
              <span className="chip">Model: NutriNet-7B</span>
            </div>
          </header>

          <div className="content">
            {(state === "idle" || state === "loading") && (
              <div className="center-panel">
                <ScanRing state={state} />
              </div>
            )}

            {state === "result" && result && (
              <div className="result-panel">
                <ResultCard result={result} preview={preview} mode={mode} />
                <div className="disclaimer">
                  ⚠ NutriLens estimates are AI-generated. Consult a nutritionist for clinical guidance.
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.app {
  display: flex;
  height: 100vh;
  min-height: 600px;
  background: #020817;
  font-family: 'Syne', sans-serif;
  color: #e2e8f0;
  overflow: hidden;
  position: relative;
}

/* ambient glow bg */
.app::before {
  content: '';
  position: fixed; inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 15% 50%, rgba(34,211,165,0.07) 0%, transparent 70%),
    radial-gradient(ellipse 50% 60% at 85% 30%, rgba(129,140,248,0.08) 0%, transparent 70%);
  pointer-events: none;
}

/* ── Sidebar ── */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  background: rgba(15,23,42,0.85);
  border-right: 1px solid rgba(34,211,165,0.12);
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  backdrop-filter: blur(20px);
  position: relative;
  z-index: 2;
}

.logo-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 22px 18px;
  border-bottom: 1px solid rgba(34,211,165,0.1);
}
.logo-icon {
  font-size: 28px;
  color: #22d3a5;
  line-height: 1;
  filter: drop-shadow(0 0 8px rgba(34,211,165,0.7));
  animation: iconPulse 3s ease-in-out infinite;
}
@keyframes iconPulse {
  0%,100% { filter: drop-shadow(0 0 8px rgba(34,211,165,0.6)); }
  50%      { filter: drop-shadow(0 0 18px rgba(34,211,165,1)); }
}
.logo-text {
  display: block;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: linear-gradient(90deg, #22d3a5, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.logo-tag {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #475569;
  letter-spacing: 0.1em;
  margin-top: 1px;
}

.sidebar-section { padding: 18px 18px 0; }
.sidebar-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.18em;
  color: #475569;
  margin-bottom: 10px;
}

/* ── Drop zone ── */
.dropzone {
  border: 1.5px dashed rgba(34,211,165,0.3);
  border-radius: 12px;
  padding: 18px 12px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background: rgba(34,211,165,0.03);
  min-height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.dropzone:hover, .dropzone.dragging {
  border-color: #22d3a5;
  background: rgba(34,211,165,0.07);
}
.drop-icon { font-size: 24px; }
.drop-title { font-size: 12px; font-weight: 600; color: #94a3b8; }
.drop-sub { font-size: 10px; color: #475569; }

.preview-wrap { position: relative; width: 100%; }
.preview-img {
  width: 100%; height: 90px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}
.preview-badge {
  position: absolute; bottom: 6px; right: 6px;
  background: rgba(34,211,165,0.9);
  color: #020817;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
}

/* ── Mode toggle ── */
.mode-toggle { display: flex; flex-direction: column; gap: 8px; }
.mode-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  color: #64748b;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}
.mode-btn:hover { border-color: rgba(34,211,165,0.3); color: #94a3b8; }
.mode-btn.active {
  border-color: rgba(34,211,165,0.5);
  background: rgba(34,211,165,0.08);
  color: #22d3a5;
  box-shadow: 0 0 0 1px rgba(34,211,165,0.2) inset;
}
.mode-icon { font-size: 15px; }

/* ── Glow button ── */
.glow-btn {
  width: 100%;
  padding: 13px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #22d3a5 0%, #818cf8 100%);
  color: #020817;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.25s;
  box-shadow: 0 0 24px rgba(34,211,165,0.4), 0 0 48px rgba(34,211,165,0.15);
  animation: btnGlow 2.5s ease-in-out infinite;
}
@keyframes btnGlow {
  0%,100% { box-shadow: 0 0 20px rgba(34,211,165,0.4), 0 0 40px rgba(34,211,165,0.1); }
  50%      { box-shadow: 0 0 32px rgba(34,211,165,0.7), 0 0 64px rgba(34,211,165,0.25); }
}
.glow-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.glow-btn:active:not(:disabled) { transform: translateY(0); }

.reset-btn {
  width: 100%;
  margin-top: 8px;
  padding: 9px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: #64748b;
  font-family: 'Syne', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.reset-btn:hover { border-color: rgba(239,68,68,0.4); color: #ef4444; }

.sidebar-footer {
  margin-top: auto;
  padding: 16px 18px;
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.status-dot-row {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #475569;
}
.dot-green {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #22d3a5;
  box-shadow: 0 0 6px #22d3a5;
  animation: blink 2s ease-in-out infinite;
}
.dot-blue {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #818cf8;
  box-shadow: 0 0 6px #818cf8;
}
@keyframes blink {
  0%,100% { opacity: 1; } 50% { opacity: 0.4; }
}

/* ── Main area ── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(2,8,23,0.6);
  backdrop-filter: blur(10px);
}
.topbar-title { font-size: 17px; font-weight: 700; color: #f1f5f9; }
.topbar-sub { font-size: 11px; color: #475569; font-family: 'Space Mono', monospace; margin-top: 2px; }
.topbar-chips { display: flex; gap: 10px; }
.chip {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  font-size: 11px;
  color: #64748b;
  font-family: 'Space Mono', monospace;
  white-space: nowrap;
}

.content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* ── Scan ring ── */
.center-panel { display: flex; align-items: center; justify-content: center; width: 100%; }

.scan-ring-outer {
  position: relative;
  width: 340px; height: 340px;
  border-radius: 50%;
  border: 2px solid rgba(34,211,165,0.25);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 60px rgba(34,211,165,0.1), inset 0 0 60px rgba(34,211,165,0.04);
}
.scan-ring-outer.spinning { animation: spinRing 4s linear infinite; }
@keyframes spinRing {
  from { border-color: rgba(34,211,165,0.25) rgba(129,140,248,0.35) rgba(34,211,165,0.05) rgba(129,140,248,0.15); }
  to   { border-color: rgba(129,140,248,0.15) rgba(34,211,165,0.05) rgba(129,140,248,0.35) rgba(34,211,165,0.25); }
}

.scan-ring-mid {
  width: 260px; height: 260px;
  border-radius: 50%;
  border: 1.5px solid rgba(129,140,248,0.2);
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle, rgba(34,211,165,0.04) 0%, transparent 70%);
}
.scan-ring-inner {
  width: 180px; height: 180px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  background: rgba(15,23,42,0.8);
  text-align: center;
}

.scan-idle-content, .scan-loading-content {
  display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px;
}
.scan-icon { font-size: 36px; }
.scan-pulse-icon {
  font-size: 36px;
  color: #22d3a5;
  animation: hexPulse 1s ease-in-out infinite alternate;
}
@keyframes hexPulse {
  from { transform: scale(0.9); opacity: 0.6; }
  to   { transform: scale(1.1); opacity: 1; }
}
.scan-title {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: #94a3b8;
  font-weight: 700;
}
.scan-title.glow-text { color: #22d3a5; text-shadow: 0 0 10px rgba(34,211,165,0.8); }
.scan-sub { font-size: 9px; color: #475569; text-align: center; line-height: 1.5; }

.orbit {
  position: absolute; border-radius: 50%;
  border-top-color: transparent; border-bottom-color: transparent;
  animation: orbitSpin 2s linear infinite;
}
.orbit-1 {
  width: 300px; height: 300px;
  border: 1.5px dashed rgba(34,211,165,0.3);
  animation-duration: 3s;
}
.orbit-2 {
  width: 360px; height: 360px;
  border: 1px dashed rgba(129,140,248,0.2);
  animation-duration: 5s;
  animation-direction: reverse;
}
@keyframes orbitSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Result ── */
.result-panel {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.result-card {
  background: rgba(15,23,42,0.8);
  border: 1px solid rgba(34,211,165,0.2);
  border-radius: 20px;
  padding: 26px;
  backdrop-filter: blur(20px);
  box-shadow: 0 0 40px rgba(34,211,165,0.07), 0 24px 48px rgba(0,0,0,0.4);
  animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}

.result-header {
  display: flex; align-items: flex-start; gap: 18px; margin-bottom: 20px;
}
.result-thumb {
  width: 90px; height: 90px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid rgba(34,211,165,0.25);
  flex-shrink: 0;
}
.result-title-block { flex: 1; }
.result-name {
  font-size: 28px;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.1;
  margin-bottom: 10px;
}
.result-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Space Mono', monospace;
  letter-spacing: 0.06em;
}
.confidence {
  display: flex; align-items: center; gap: 6px;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #64748b;
}
.conf-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #818cf8;
  box-shadow: 0 0 5px #818cf8;
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(34,211,165,0.2), rgba(129,140,248,0.15), transparent);
  margin: 18px 0;
}

/* Nutri bars */
.nutri-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px; }
.nutri-bar-row { display: flex; align-items: center; gap: 10px; }
.nutri-label {
  width: 60px; flex-shrink: 0;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.nutri-track {
  flex: 1;
  height: 5px;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  overflow: hidden;
}
.nutri-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 1s cubic-bezier(0.16,1,0.3,1);
  animation: barLoad 1.2s cubic-bezier(0.16,1,0.3,1) both;
}
@keyframes barLoad {
  from { width: 0 !important; }
}
.nutri-value {
  width: 46px; flex-shrink: 0; text-align: right;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 700;
}

/* Stat row */
.stat-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.stat-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  text-align: center;
}
.stat-icon { font-size: 18px; }
.stat-val {
  font-family: 'Space Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
}
.stat-label { font-size: 10px; color: #475569; letter-spacing: 0.06em; }

.disclaimer {
  text-align: center;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #334155;
  padding: 8px;
}

/* ── Responsive ── */
@media (max-width: 720px) {
  .app { flex-direction: column; height: auto; min-height: 100vh; }
  .sidebar { width: 100%; border-right: none; border-bottom: 1px solid rgba(34,211,165,0.12); }
  .sidebar-footer { flex-direction: row; gap: 16px; }
  .scan-ring-outer { width: 260px; height: 260px; }
  .scan-ring-mid  { width: 200px; height: 200px; }
  .scan-ring-inner { width: 140px; height: 140px; }
  .orbit-1 { width: 230px; height: 230px; }
  .orbit-2 { width: 280px; height: 280px; }
  .topbar-chips { display: none; }
}
`;
