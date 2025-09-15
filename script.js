// Utilities
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

// Local storage helpers
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

// Theme
const THEME_KEY = "tfs_theme_vars";
const MODE_KEY = "tfs_theme_mode";

const defaultLight = {
  bg: "#fbfcff",
  text: "#0b1220",
  muted: "#54607a",
  card: "#ffffff",
  accent: "#2f6bff",
  btnBg: "#2f6bff",
  btnText: "#ffffff",
  btnRadius: 12,
  font: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Segoe UI Variable', 'Noto Sans', 'Liberation Sans', sans-serif",
  fontSize: 16
};
const defaultDark = {
  bg: "#0b0f15",
  text: "#e8eef9",
  muted: "#90A0B7",
  card: "#121826",
  accent: "#6aa0ff",
  btnBg: "#6aa0ff",
  btnText: "#0c1117",
  btnRadius: 12,
  font: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Segoe UI Variable', 'Noto Sans', 'Liberation Sans', sans-serif",
  fontSize: 16
};

function setMode(mode) {
  document.body.setAttribute("data-theme", mode);
  store.set(MODE_KEY, mode);
  // Update segmented control
  $("#btnLight").classList.toggle("active", mode === "light");
  $("#btnDark").classList.toggle("active", mode === "dark");
  $("#btnLight").setAttribute("aria-selected", mode === "light");
  $("#btnDark").setAttribute("aria-selected", mode === "dark");
  // If no custom vars saved, set inputs to defaults for the mode
  const vars = store.get(THEME_KEY, null);
  if (!vars) {
    const d = mode === "light" ? defaultLight : defaultDark;
    applyThemeVars(d);
    reflectThemeInputs(d);
  } else {
    applyThemeVars(vars);
    reflectThemeInputs(vars);
  }
}

function applyThemeVars(v) {
  const root = document.documentElement.style;
  if (v.bg) root.setProperty("--bg", v.bg);
  if (v.text) root.setProperty("--text", v.text);
  if (v.muted) root.setProperty("--muted", v.muted);
  if (v.card) root.setProperty("--card", v.card);
  if (v.accent) root.setProperty("--accent", v.accent);
  if (v.btnBg) root.setProperty("--btn-bg", v.btnBg);
  if (v.btnText) root.setProperty("--btn-text", v.btnText);
  if (typeof v.btnRadius === "number") root.setProperty("--btn-radius", v.btnRadius + "px");
  if (v.font) root.setProperty("--font-base", v.font);
  if (typeof v.fontSize === "number") root.setProperty("--font-size", v.fontSize + "px");
  ensureButtonContrast();
}

function readThemeInputs() {
  return {
    accent: $("#varAccent").value,
    bg: $("#varBg").value,
    card: $("#varCard").value,
    text: $("#varText").value,
    muted: $("#varMuted").value,
    btnBg: $("#varBtnBg").value,
    btnText: $("#varBtnText").value,
    btnRadius: parseInt($("#varBtnRadius").value, 10),
    font: $("#varFont").value,
    fontSize: parseInt($("#varFontSize").value, 10)
  };
}

function reflectThemeInputs(v) {
  $("#varAccent").value = v.accent;
  $("#varBg").value = v.bg;
  $("#varCard").value = v.card;
  $("#varText").value = v.text;
  $("#varMuted").value = v.muted;
  $("#varBtnBg").value = v.btnBg;
  $("#varBtnText").value = v.btnText;
  $("#varBtnRadius").value = v.btnRadius;
  $("#varFont").value = v.font;
  $("#varFontSize").value = v.fontSize;
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function relativeLuminance({r,g,b}) {
  // sRGB to linear
  const srgb = [r,g,b].map(v => v/255).map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
}
function ensureButtonContrast() {
  // If contrast between btn-bg and btn-text is too low, auto-pick black/white text
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--btn-bg").trim();
  const txt = getComputedStyle(document.documentElement).getPropertyValue("--btn-text").trim();
  let bgRGB = hexToRgb(bg.startsWith("#") ? bg : "#6aa0ff");
  let txtRGB = hexToRgb(txt.startsWith("#") ? txt : "#000000");
  const L1 = Math.max(relativeLuminance(bgRGB), relativeLuminance(txtRGB));
  const L2 = Math.min(relativeLuminance(bgRGB), relativeLuminance(txtRGB));
  const contrast = (L1 + 0.05) / (L2 + 0.05);
  if (contrast < 4.0) {
    // Choose black or white depending on bg luminance
    const bgLum = relativeLuminance(bgRGB);
    const suggested = bgLum > 0.4 ? "#0b0f15" : "#ffffff";
    document.documentElement.style.setProperty("--btn-text", suggested);
  }
}

$("#btnLight").addEventListener("click", () => setMode("light"));
$("#btnDark").addEventListener("click", () => setMode("dark"));

// Live theme binding
["varAccent","varBg","varCard","varText","varMuted","varBtnBg","varBtnText","varBtnRadius","varFont","varFontSize"]
  .forEach(id => {
    const el = $("#"+id);
    el.addEventListener("input", () => {
      const v = readThemeInputs();
      applyThemeVars(v);
    });
  });

$("#btnSaveTheme").addEventListener("click", () => {
  store.set(THEME_KEY, readThemeInputs());
  ensureButtonContrast();
  flashStatus("Theme saved");
});
$("#btnResetTheme").addEventListener("click", () => {
  const mode = store.get(MODE_KEY, "dark");
  const d = mode === "light" ? defaultLight : defaultDark;
  applyThemeVars(d);
  reflectThemeInputs(d);
  store.set(THEME_KEY, d);
  flashStatus("Theme reset");
});

// Export/Import settings (theme + clocks + pomodoro + quotes)
$("#btnExport").addEventListener("click", () => {
  const payload = {
    mode: store.get(MODE_KEY, "dark"),
    theme: store.get(THEME_KEY, null),
    clocks: store.get("tfs_clock_settings", null),
    pomodoro: store.get("tfs_pomodoro_settings", null),
    quotes: store.get("tfs_user_quotes", [])
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "time-focus-studio-settings.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

$("#btnImport").addEventListener("click", async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (data.mode) store.set(MODE_KEY, data.mode);
      if (data.theme) store.set(THEME_KEY, data.theme);
      if (data.clocks) store.set("tfs_clock_settings", data.clocks);
      if (data.pomodoro) store.set("tfs_pomodoro_settings", data.pomodoro);
      if (Array.isArray(data.quotes)) store.set("tfs_user_quotes", data.quotes);
      // Apply everything:
      setMode(store.get(MODE_KEY, "dark"));
      loadClockSettings();
      loadPomodoroSettings();
      renderUserQuotes();
      flashStatus("Settings imported");
    } catch {
      flashStatus("Import failed (invalid file)");
    }
  };
  input.click();
});

function flashStatus(text) {
  const pill = document.createElement("div");
  pill.textContent = text;
  pill.style.position = "fixed";
  pill.style.bottom = "18px";
  pill.style.left = "50%";
  pill.style.transform = "translateX(-50%)";
  pill.style.padding = "10px 14px";
  pill.style.border = "1px solid var(--border)";
  pill.style.background = "var(--card)";
  pill.style.color = "var(--text)";
  pill.style.borderRadius = "999px";
  pill.style.boxShadow = "var(--shadow)";
  pill.style.zIndex = 1000;
  document.body.appendChild(pill);
  setTimeout(() => pill.remove(), 1800);
}

// Initial theme mode
setMode(store.get(MODE_KEY, "dark"));

// Clock logic
const CLOCK_KEY = "tfs_clock_settings";
const clockDefaults = {
  tzSource: "local",
  tzOffset: 0,
  digitalFormat: "24",
  digitalSeconds: true,
  digitalBlink: true,
  digitalShowDate: true,
  analogSeconds: true,
  analogSmooth: true,
  analogNumbers: true,
  analogFace: "#0e1524",
  analogTicks: "#90A0B7",
  analogHour: "#e8eef9",
  analogMinute: "#6aa0ff",
  analogSecond: "#ff6b6b"
};
let clockSettings = loadClockSettings();

function loadClockSettings() {
  const saved = store.get(CLOCK_KEY, {});
  const merged = {...clockDefaults, ...saved};
  reflectClockInputs(merged);
  return merged;
}
function saveClockSettings() {
  store.set(CLOCK_KEY, clockSettings);
}
function reflectClockInputs(v) {
  $("#clockTzSource").value = v.tzSource;
  $("#clockTzOffset").value = v.tzOffset;
  $("#digitalFormat").value = v.digitalFormat;
  $("#digitalSeconds").value = String(v.digitalSeconds);
  $("#digitalBlink").value = String(v.digitalBlink);
  $("#digitalShowDate").value = String(v.digitalShowDate);
  $("#analogSeconds").value = String(v.analogSeconds);
  $("#analogSmooth").value = String(v.analogSmooth);
  $("#analogNumbers").value = String(v.analogNumbers);
  $("#analogFace").value = v.analogFace;
  $("#analogTicks").value = v.analogTicks;
  $("#analogHour").value = v.analogHour;
  $("#analogMinute").value = v.analogMinute;
  $("#analogSecond").value = v.analogSecond;
}
// Bind inputs
[
  "clockTzSource","clockTzOffset","digitalFormat","digitalSeconds","digitalBlink","digitalShowDate",
  "analogSeconds","analogSmooth","analogNumbers","analogFace","analogTicks","analogHour","analogMinute","analogSecond"
].forEach(id => {
  $("#"+id).addEventListener("input", () => {
    const v = clockSettings;
    v.tzSource = $("#clockTzSource").value;
    v.tzOffset = parseFloat($("#clockTzOffset").value);
    v.digitalFormat = $("#digitalFormat").value;
    v.digitalSeconds = $("#digitalSeconds").value === "true";
    v.digitalBlink = $("#digitalBlink").value === "true";
    v.digitalShowDate = $("#digitalShowDate").value === "true";
    v.analogSeconds = $("#analogSeconds").value === "true";
    v.analogSmooth = $("#analogSmooth").value === "true";
    v.analogNumbers = $("#analogNumbers").value === "true";
    v.analogFace = $("#analogFace").value;
    v.analogTicks = $("#analogTicks").value;
    v.analogHour = $("#analogHour").value;
    v.analogMinute = $("#analogMinute").value;
    v.analogSecond = $("#analogSecond").value;
    saveClockSettings();
  });
});

function getNowWithOffset() {
  const now = new Date();
  if (clockSettings.tzSource === "local") return now;
  const localOffsetMin = now.getTimezoneOffset();
  const desiredOffsetMin = clockSettings.tzOffset * 60;
  const diff = (desiredOffsetMin + localOffsetMin) * 60000;
  return new Date(now.getTime() + diff);
}

// Digital clock updater
let blinkOn = true;
function formatDigital(d) {
  let H = d.getHours(), M = d.getMinutes(), S = d.getSeconds();
  let period = "";
  if (clockSettings.digitalFormat === "12") {
    period = H >= 12 ? " PM" : " AM";
    H = H % 12; if (H === 0) H = 12;
  }
  const pad = n => String(n).padStart(2, "0");
  const colon = clockSettings.digitalBlink ? (blinkOn ? ":" : " ") : ":";
  const time = clockSettings.digitalSeconds ? `${pad(H)}${colon}${pad(M)}${colon}${pad(S)}${period}` : `${pad(H)}${colon}${pad(M)}${period}`;
  return time;
}
function formatDateLine(d) {
  const opts = { weekday: "long", month: "short", day: "numeric" };
  return d.toLocaleDateString(undefined, opts);
}
function tickDigital() {
  const now = getNowWithOffset();
  blinkOn = !blinkOn;
  $("#digitalTime").textContent = formatDigital(now);
  $("#digitalDate").textContent = clockSettings.digitalShowDate ? formatDateLine(now) : "";
}
setInterval(tickDigital, 500);
tickDigital();

// Analog clock
const analogCanvas = $("#analog");
const ctx = analogCanvas.getContext("2d");

function resizeAnalog() {
  const rect = analogCanvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  analogCanvas.width = Math.floor(rect.width * dpr);
  analogCanvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resizeAnalog).observe(analogCanvas);
resizeAnalog();

function drawAnalog() {
  const rect = analogCanvas.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const r = Math.min(w, h) / 2 - 8;
  const cx = w / 2, cy = h / 2;

  // Face
  ctx.save();
  // Face background
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = clockSettings.analogFace;
  ctx.fill();
  // Bezel
  ctx.lineWidth = 2;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#2a2a2a";
  ctx.stroke();

  // Ticks
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2) * (i / 60);
    const outer = r - 6;
    const inner = i % 5 === 0 ? outer - 10 : outer - 6;
    ctx.beginPath();
    ctx.lineWidth = i % 5 === 0 ? 3 : 1.5;
    ctx.strokeStyle = clockSettings.analogTicks;
    const sx = cx + Math.cos(angle) * inner;
    const sy = cy + Math.sin(angle) * inner;
    const ex = cx + Math.cos(angle) * outer;
    const ey = cy + Math.sin(angle) * outer;
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // Numbers
  if (clockSettings.analogNumbers) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
    ctx.font = "600 16px " + getComputedStyle(document.documentElement).getPropertyValue("--font-base").trim();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let n = 1; n <= 12; n++) {
      const angle = (Math.PI * 2) * (n / 12) - Math.PI/2;
      const nr = r - 28;
      const nx = cx + Math.cos(angle) * nr;
      const ny = cy + Math.sin(angle) * nr;
      ctx.fillText(String(n), nx, ny);
    }
  }

  // Time
  const now = getNowWithOffset();
  const ms = now.getMilliseconds();
  const secBase = now.getSeconds() + (clockSettings.analogSmooth ? ms/1000 : 0);
  const minBase = now.getMinutes() + secBase/60;
  const hourBase = (now.getHours() % 12) + minBase/60;

  const hourAngle = (Math.PI * 2) * (hourBase / 12) - Math.PI/2;
  const minAngle = (Math.PI * 2) * (minBase / 60) - Math.PI/2;
  const secAngle = (Math.PI * 2) * (secBase / 60) - Math.PI/2;

  // Hour hand
  ctx.lineCap = "round";
  ctx.strokeStyle = clockSettings.analogHour;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourAngle) * (r * 0.52), cy + Math.sin(hourAngle) * (r * 0.52));
  ctx.stroke();

  // Minute hand
  ctx.strokeStyle = clockSettings.analogMinute;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minAngle) * (r * 0.72), cy + Math.sin(minAngle) * (r * 0.72));
  ctx.stroke();

  // Second hand
  if (clockSettings.analogSeconds) {
    ctx.strokeStyle = clockSettings.analogSecond;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(secAngle) * (r * 0.80), cy + Math.sin(secAngle) * (r * 0.80));
    ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - Math.cos(secAngle) * (r * 0.18), cy - Math.sin(secAngle) * (r * 0.18));
    ctx.stroke();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  ctx.fill();

  ctx.restore();
  requestAnimationFrame(drawAnalog);
}
requestAnimationFrame(drawAnalog);

// Pomodoro
const POMO_KEY = "tfs_pomodoro_settings";
const pomoDefaults = {
  work: 25*60,
  short: 5*60,
  long: 15*60,
  rounds: 4,
  auto: true,
  sound: true,
  volume: 0.5
};
let pomoSettings = {...pomoDefaults, ...store.get(POMO_KEY, {})};
function loadPomodoroSettings() {
  pomoSettings = {...pomoDefaults, ...store.get(POMO_KEY, {})};
  $("#pWork").value = Math.round(pomoSettings.work/60);
  $("#pShort").value = Math.round(pomoSettings.short/60);
  $("#pLong").value = Math.round(pomoSettings.long/60);
  $("#pRounds").value = pomoSettings.rounds;
  $("#pAuto").value = String(pomoSettings.auto);
  $("#pSound").value = String(pomoSettings.sound);
  $("#pVolume").value = String(pomoSettings.volume);
  return pomoSettings;
}
loadPomodoroSettings();

// Pomodoro state
let pomoMode = "work"; // "work" | "short" | "long"
let pomoRound = 1;
let pomoTotal = pomoSettings.work;
let pomoRemaining = pomoTotal;
let pomoTimer = null;
let pomoRunning = false;
let lastTick = null;

function setPomoMode(mode) {
  pomoMode = mode;
  pomoTotal = mode === "work" ? pomoSettings.work : (mode === "short" ? pomoSettings.short : pomoSettings.long);
  pomoRemaining = pomoTotal;
  updatePomoUI();
}

function updatePomoUI() {
  $("#pomoMode").textContent = ({
    work: "Work",
    short: "Short Break",
    long: "Long Break"
  })[pomoMode];
  $("#pomoRound").textContent = `Round ${pomoRound}`;
  $("#pomoTime").textContent = formatSeconds(pomoRemaining);
  $("#pomoStatus").textContent = pomoRunning ? "Running" : "Paused";
  const progress = 1 - (pomoRemaining / pomoTotal);
  $("#pomoRing").style.setProperty("--p", (progress * 100).toFixed(2));
}

function formatSeconds(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s/60), sec = s % 60;
  return String(m).padStart(2,"0") + ":" + String(sec).padStart(2,"0");
}

function startPomo() {
  if (pomoRunning) return;
  pomoRunning = true;
  lastTick = performance.now();
  $("#pomoStatus").textContent = "Running";
  pomoTimer = requestAnimationFrame(stepPomo);
}

function pausePomo() {
  if (!pomoRunning) return;
  pomoRunning = false;
  $("#pomoStatus").textContent = "Paused";
  if (pomoTimer) cancelAnimationFrame(pomoTimer);
}

function resetPomo() {
  const wasWork = pomoMode === "work";
  setPomoMode(pomoMode);
  if (wasWork) pomoRound = Math.max(1, pomoRound);
  updatePomoUI();
}

function skipPomo() {
  completeSession();
}

function stepPomo(ts) {
  const dt = (ts - lastTick) / 1000;
  lastTick = ts;
  if (pomoRunning) {
    pomoRemaining -= dt;
    if (pomoRemaining <= 0) {
      pomoRemaining = 0;
      updatePomoUI();
      completeSession();
      return;
    }
    updatePomoUI();
    pomoTimer = requestAnimationFrame(stepPomo);
  }
}

function completeSession() {
  pausePomo();
  signalEnd();
  // Advance cycle
  if (pomoMode === "work") {
    if (pomoRound % pomoSettings.rounds === 0) {
      setPomoMode("long");
    } else {
      setPomoMode("short");
    }
  } else {
    // from break to next work
    pomoRound += 1;
    setPomoMode("work");
  }
  updatePomoUI();
  if (pomoSettings.auto) {
    setTimeout(startPomo, 400);
  }
}

function signalEnd() {
  // Sound via Web Audio API
  if (pomoSettings.sound) {
    beepPattern(pomoSettings.volume);
  }
  // Desktop notification
  if (Notification && Notification.permission === "granted") {
    const title = pomoMode === "work" ? "Break time!" : "Back to work!";
    const body = pomoMode === "work"
      ? "Great job. Take a breather."
      : "Let’s focus for the next session.";
    try {
      new Notification(title, { body });
    } catch {}
  }
}

function beepPattern(vol=0.5) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const play = (t, freq, dur) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.value = vol;
    o.start(ctx.currentTime + t);
    o.stop(ctx.currentTime + t + dur);
  };
  play(0.00, 880, 0.12);
  play(0.17, 660, 0.10);
  play(0.30, 990, 0.14);
  setTimeout(() => ctx.close(), 1200);
}

// Bind Pomodoro controls
$("#pomoStart").addEventListener("click", startPomo);
$("#pomoPause").addEventListener("click", pausePomo);
$("#pomoReset").addEventListener("click", resetPomo);
$("#pomoSkip").addEventListener("click", skipPomo);
// Keyboard: Space toggles start/pause
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    if (pomoRunning) pausePomo(); else startPomo();
  }
});
// Settings
$("#pWork").addEventListener("input", () => {
  pomoSettings.work = clamp(parseInt($("#pWork").value, 10)*60, 60, 60*180);
  store.set(POMO_KEY, pomoSettings); if (pomoMode==="work") resetPomo();
});
$("#pShort").addEventListener("input", () => {
  pomoSettings.short = clamp(parseInt($("#pShort").value, 10)*60, 60, 60*60);
  store.set(POMO_KEY, pomoSettings); if (pomoMode==="short") resetPomo();
});
$("#pLong").addEventListener("input", () => {
  pomoSettings.long = clamp(parseInt($("#pLong").value, 10)*60, 60, 60*120);
  store.set(POMO_KEY, pomoSettings); if (pomoMode==="long") resetPomo();
});
$("#pRounds").addEventListener("input", () => {
  pomoSettings.rounds = clamp(parseInt($("#pRounds").value, 10), 1, 12);
  store.set(POMO_KEY, pomoSettings);
});
$("#pAuto").addEventListener("input", () => {
  pomoSettings.auto = $("#pAuto").value === "true";
  store.set(POMO_KEY, pomoSettings);
});
$("#pSound").addEventListener("input", () => {
  pomoSettings.sound = $("#pSound").value === "true";
  store.set(POMO_KEY, pomoSettings);
});
$("#pVolume").addEventListener("input", () => {
  pomoSettings.volume = parseFloat($("#pVolume").value);
  store.set(POMO_KEY, pomoSettings);
});
$("#pNotify").addEventListener("click", async () => {
  try {
    if (!("Notification" in window)) {
      flashStatus("Notifications not supported");
      return;
    }
    const perm = await Notification.requestPermission();
    flashStatus(perm === "granted" ? "Notifications enabled" : "Notifications blocked");
  } catch {
    flashStatus("Notification request failed");
  }
});
updatePomoUI();

// Motivational Texts (procedural, unlimited variations)
const QUOTES_KEY = "tfs_user_quotes";
const baseQuotes = [
  "Your story is what you have, what you will always have. It is something to own.",
  "Small steps done daily become great distances over time.",
  "Progress is progress, even when it’s not perfect.",
  "Discipline beats motivation when motivation hides.",
  "Start where you are. Use what you have. Do what you can.",
  "You don’t have to be extreme—just consistent.",
  "Your future is built by choices, not chances.",
  "The obstacle is the way.",
  "Tiny improvements compound into remarkable results.",
  "Your pace is valid. Keep going."
];
// Procedural components to generate unlimited combinations
const fragments = {
  openers: [
    "Your story", "Your potential", "Your journey", "Your effort", "Your growth",
    "This moment", "Today", "Right now", "The next step", "The choice you make"
  ],
  verbs: [
    "defines", "shapes", "sets", "builds", "unlocks", "guides", "elevates", "anchors"
  ],
  nouns: [
    "your future", "your path", "your momentum", "your results", "your craft",
    "your confidence", "your skill", "your resilience"
  ],
  prompts: [
    "own it", "lean in", "keep going", "trust the process", "show up",
    "start small", "begin again", "focus on what matters", "embrace the effort",
    "take the next step"
  ],
  closers: [
    "One hour at a time.", "One step at a time.", "Make it count.",
    "You’ve got this.", "Be proudly consistent.", "Progress over perfection.",
    "Let the work speak.", "Little by little becomes a lot."
  ],
  bridges: [
    "and", "because", "so", "therefore", "which means"
  ],
  adjectives: [
    "quiet", "steady", "deliberate", "courageous", "curious", "bold",
    "relentless", "patient", "hopeful", "purposeful"
  ],
  values: [
    "clarity", "focus", "effort", "consistency", "attention",
    "kindness", "discipline", "curiosity"
  ]
};

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
function seededPick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function generateQuote(seed) {
  const rng = mulberry32(seed);
  // 30% chance to use a curated base quote
  if (rng() < 0.30) {
    return seededPick(rng, baseQuotes);
  }
  // 15% chance to use user quotes if any
  const u = store.get(QUOTES_KEY, []);
  if (u.length && rng() < 0.15) {
    return seededPick(rng, u);
  }
  // Template-driven generation
  const A = seededPick(rng, fragments.openers);
  const B = seededPick(rng, fragments.verbs);
  const C = seededPick(rng, fragments.nouns);
  const D = seededPick(rng, fragments.bridges);
  const E = seededPick(rng, fragments.adjectives);
  const F = seededPick(rng, fragments.values);
  const P = seededPick(rng, fragments.prompts);
  const Z = seededPick(rng, fragments.closers);

  const templates = [
    `${A} ${B} ${C}—${P}. ${Z}`,
    `${A} is ${E} work. Choose ${F}, ${P}. ${Z}`,
    `${A} ${D} ${C}. Stay ${E} and ${P}. ${Z}`,
    `${A} ${B} ${C}. ${Z}`,
    `${A}. ${P}. ${Z}`,
    `${A} is yours—${P}. ${Z}`
  ];
  return seededPick(rng, templates);
}
function currentHourSeed() {
  const now = new Date();
  // Seed stable for the local hour
  return now.getFullYear()*1e6 + (now.getMonth()+1)*1e4 + now.getDate()*1e2 + now.getHours();
}
function updateQuoteByHour(force=false) {
  const hourSeed = currentHourSeed();
  const last = updateQuoteByHour._lastSeed;
  if (force || last !== hourSeed) {
    const q = generateQuote(hourSeed);
    $("#quoteText").textContent = q;
    updateQuoteByHour._lastSeed = hourSeed;
  }
}
updateQuoteByHour(true);
// Check every minute to roll over at top of hour
setInterval(() => updateQuoteByHour(false), 60*1000);

// Quotes UI
function renderUserQuotes() {
  const list = store.get(QUOTES_KEY, []);
  const wrap = $("#userQuotesWrap");
  if (!list.length) {
    wrap.innerHTML = "<em>No custom messages yet.</em>";
    return;
  }
  wrap.innerHTML = "";
  list.forEach((q, i) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "8px";
    row.style.padding = "6px 0";
    const span = document.createElement("span");
    span.style.color = "var(--text)";
    span.textContent = q;
    const del = document.createElement("button");
    del.className = "btn small secondary";
    del.textContent = "Remove";
    del.addEventListener("click", () => {
      const arr = store.get(QUOTES_KEY, []);
      arr.splice(i,1);
      store.set(QUOTES_KEY, arr);
      renderUserQuotes();
      flashStatus("Removed");
    });
    row.appendChild(span);
    row.appendChild(del);
    wrap.appendChild(row);
  });
}
renderUserQuotes();

$("#btnShuffle").addEventListener("click", () => {
  // Shuffle uses a random seed so user can explore
  const seed = Math.floor(Math.random()*1e9);
  $("#quoteText").textContent = generateQuote(seed);
});
$("#btnCopy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#quoteText").textContent.trim());
    flashStatus("Copied to clipboard");
  } catch {
    flashStatus("Copy failed");
  }
});
$("#btnAddQuote").addEventListener("click", () => {
  const details = $("#motivation details");
  details.open = true;
  $("#newQuote").focus();
});
$("#saveQuote").addEventListener("click", () => {
  const val = $("#newQuote").value.trim();
  if (!val) return;
  const arr = store.get(QUOTES_KEY, []);
  arr.push(val);
  store.set(QUOTES_KEY, arr);
  $("#newQuote").value = "";
  renderUserQuotes();
  flashStatus("Saved");
});
$("#clearQuotes").addEventListener("click", () => {
  if (confirm("Clear all your custom messages?")) {
    store.set(QUOTES_KEY, []);
    renderUserQuotes();
    flashStatus("Cleared");
  }
});

// Enhance accessibility: announce time every minute (optional)
// Commented out by default; uncomment for screen-reader periodic updates.
// setInterval(() => { $("#digitalTime").setAttribute("aria-live", "polite"); }, 60*1000);

// On load, ensure UI reflects storage
function initOnLoad() {
  // Theme already initialized
  // Clocks reflect settings continually via intervals/RAF

  // Ensure date visibility toggles the element spacing
  const dateEl = $("#digitalDate");
  const observer = new MutationObserver(() => {
    dateEl.style.display = clockSettings.digitalShowDate ? "block" : "none";
  });
  observer.observe(dateEl, { childList: true, characterData: true, subtree: true });

  // Ensure analog canvas starts drawing on first frame (already done)
}
initOnLoad();

// Resize ring size slightly on small screens
function adaptRingSize() {
  const ring = $("#pomoRing");
  const w = window.innerWidth;
  const size = w < 420 ? 200 : (w < 360 ? 180 : 220);
  ring.style.setProperty("--size", size + "px");
}
window.addEventListener("resize", adaptRingSize);
adaptRingSize();