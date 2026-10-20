/* =========================================================================
   RESOLUTA AGI — Resoluta Finance
   script.js — aplicação completa (roteamento, cálculos, CRUD, a11y, PWA)
   Identidade: bordo (#7a1f3d) + dourado (#c8a24a)
   ========================================================================= */
(function () {
  "use strict";

  /* =======================================================================
     1. HELPERS
     ======================================================================= */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var bcrypt = (window.dcodeIO && window.dcodeIO.bcrypt) || null;

  function toNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v === null || v === undefined) return 0;
    var s = String(v).trim();
    if (!s) return 0;
    s = s.replace(/\s/g, "").replace(/R\$/gi, "");
    if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function fmtBRL(v) {
    return toNum(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function fmtPct(v) {
    return toNum(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }
  function fmtNum(v, d) {
    d = d || 0;
    return toNum(v).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtShort(v) {
    var n = toNum(v);
    var a = Math.abs(n);
    if (a >= 1000000) return (n / 1000000).toFixed(1).replace(".", ",") + "M";
    if (a >= 1000) return (n / 1000).toFixed(0) + "k";
    return String(Math.round(n));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function monthKey(iso) {
    return String(iso || todayISO()).slice(0, 7);
  }
  var MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function monthLabel(key) {
    var parts = String(key).split("-");
    var m = parseInt(parts[1], 10);
    return (MONTHS[m - 1] || "?") + "/" + String(parts[0]).slice(2);
  }
  function dateBR(iso) {
    if (!iso) return "—";
    var p = String(iso).split("-");
    if (p.length < 3) return iso;
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  function escapeHtml(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms || 200);
    };
  }
  function daysUntil(iso) {
    if (!iso) return null;
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* =======================================================================
     2. ARMAZENAMENTO (localStorage)
     ======================================================================= */
  var LS = {
    get: function (k, fb) {
      try {
        var v = localStorage.getItem(k);
        return v === null ? fb : JSON.parse(v);
      } catch (e) { return fb; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    },
    del: function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    }
  };

  /* =======================================================================
     3. CHAVES
     ======================================================================= */
  var K = {
    users: "resoluta.users",
    session: "resoluta.session",
    settings: "resoluta.settings",
    cookies: "resoluta.cookies",
    attempts: "resoluta.attempts",
    data: function (ns) { return "resoluta.data." + ns; },
    progress: function (ns) { return "resoluta.progress." + ns; }
  };

  /* =======================================================================
     4. ESTADO
     ======================================================================= */
  var state = {
    route: "painel",
    data: null,
    ns: "convidado",
    settings: null,
    progress: null,
    user: null,
    lastCalc: null,
    quiz: null
  };

  var ROUTES = {
    painel: "Painel",
    calculadora: "Calculadora de markup",
    produtos: "Produtos e serviços",
    lancamentos: "Lançamentos",
    fluxo: "Fluxo de caixa",
    contas: "Contas a pagar/receber",
    indicadores: "Indicadores",
    diagnostico: "Diagnóstico",
    planejamento: "Planejamento e metas",
    cenarios: "Simulador de cenários",
    relatorios: "Relatórios",
    assistente: "Assistente",
    aprenda: "Aprenda",
    config: "Configurações"
  };

  /* =======================================================================
     5. DADOS
     ======================================================================= */
  function blankData() {
    return { products: [], transactions: [], accounts: [], goals: [], calcHistory: [] };
  }
  function currentNS() {
    var s = LS.get(K.session, null);
    return (s && s.email) ? String(s.email).toLowerCase() : "convidado";
  }
  function loadData() {
    state.ns = currentNS();
    var d = LS.get(K.data(state.ns), null);
    state.data = Object.assign(blankData(), d || {});
    state.progress = Object.assign({ modules: {}, quiz: {} }, LS.get(K.progress(state.ns), {}));
  }
  function saveData() { LS.set(K.data(state.ns), state.data); }
  function saveProgress() { LS.set(K.progress(state.ns), state.progress); }

  /* =======================================================================
     6. CONFIGURAÇÕES / ACESSIBILIDADE
     ======================================================================= */
  function defaultSettings() {
    return { theme: "light", contrast: "normal", font: "1", reading: false, motion: false };
  }
  function loadSettings() {
    state.settings = Object.assign(defaultSettings(), LS.get(K.settings, {}));
  }
  function saveSettings() { LS.set(K.settings, state.settings); }

  function applySettings() {
    var s = state.settings;
    var root = document.documentElement;
    root.setAttribute("data-theme", s.theme);
    root.setAttribute("data-contrast", s.contrast);
    root.setAttribute("data-fontscale", String(s.font));
    if (s.reading) root.setAttribute("data-reading", "on"); else root.removeAttribute("data-reading");
    if (s.motion) root.setAttribute("data-motion", "reduced"); else root.removeAttribute("data-motion");
    syncA11yButtons();
  }

  function syncA11yButtons() {
    var s = state.settings;
    $$('[data-a11y="theme"]').forEach(function (b) {
      var on = b.getAttribute("data-value") === s.theme;
      b.classList.toggle("active", on);
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$('[data-a11y="contrast"]').forEach(function (b) {
      var on = b.getAttribute("data-value") === s.contrast;
      b.classList.toggle("active", on);
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$('[data-a11y="font"]').forEach(function (b) {
      var on = b.getAttribute("data-value") === String(s.font);
      b.classList.toggle("active", on);
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$('[data-a11y="reading"]').forEach(function (b) {
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", s.reading ? "true" : "false");
      b.classList.toggle("active", !!s.reading);
    });
    $$('[data-a11y="motion"]').forEach(function (b) {
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", s.motion ? "true" : "false");
      b.classList.toggle("active", !!s.motion);
    });
  }

  function setSetting(key, value) {
    state.settings[key] = value;
    saveSettings();
    applySettings();
  }

  /* =======================================================================
     7. AUTENTICAÇÃO / SEGURANÇA
     ======================================================================= */
  var MAX_ATTEMPTS = 3;
  var LOCK_MS = 5 * 60 * 1000;

  function hashPassword(pw) {
    if (bcrypt) { try { return bcrypt.hashSync(pw, 10); } catch (e) {} }
    return "plain:" + pw;
  }
  function verifyPassword(pw, hash) {
    if (!hash) return false;
    if (String(hash).indexOf("plain:") === 0) return hash.slice(6) === pw;
    if (bcrypt) { try { return bcrypt.compareSync(pw, hash); } catch (e) { return false; } }
    return false;
  }
  function getUsers() { return LS.get(K.users, []); }
  function saveUsers(u) { LS.set(K.users, u); }
  function findUser(email) {
    email = String(email || "").trim().toLowerCase();
    return getUsers().filter(function (u) { return String(u.email).toLowerCase() === email; })[0] || null;
  }
  function passwordStrength(pw) {
    pw = pw || "";
    var score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 12 && score >= 3) score = 4;
    var map = [
      { label: "Muito fraca", color: "#b23a3a", pct: 8 },
      { label: "Fraca", color: "#b23a3a", pct: 30 },
      { label: "Média", color: "#b9802a", pct: 55 },
      { label: "Boa", color: "#1f8a5b", pct: 78 },
      { label: "Forte", color: "#1f8a5b", pct: 100 }
    ];
    var r = map[score];
    return { score: score, label: r.label, color: r.color, pct: r.pct };
  }
  function attemptsState(email) {
    var all = LS.get(K.attempts, {});
    return all[String(email || "").toLowerCase()] || { count: 0, lockedUntil: 0 };
  }
  function setAttempts(email, st) {
    var all = LS.get(K.attempts, {});
    all[String(email || "").toLowerCase()] = st;
    LS.set(K.attempts, all);
  }
  function registerUser(name, email, pw) {
    email = String(email || "").trim().toLowerCase();
    if (findUser(email)) return { ok: false, error: "Já existe uma conta com este e-mail." };
    var users = getUsers();
    users.push({ id: uid(), name: String(name).trim(), email: email, passHash: hashPassword(pw), createdAt: new Date().toISOString() });
    saveUsers(users);
    return { ok: true };
  }
  function loginUser(email, pw) {
    email = String(email || "").trim().toLowerCase();
    var st = attemptsState(email);
    if (st.lockedUntil && Date.now() < st.lockedUntil) {
      var mins = Math.ceil((st.lockedUntil - Date.now()) / 60000);
      return { ok: false, error: "Acesso bloqueado. Tente novamente em " + mins + " min." };
    }
    var user = findUser(email);
    if (!user || !verifyPassword(pw, user.passHash)) {
      var count = (st.count || 0) + 1;
      if (count >= MAX_ATTEMPTS) {
        setAttempts(email, { count: 0, lockedUntil: Date.now() + LOCK_MS });
        return { ok: false, error: "Muitas tentativas. Acesso bloqueado por 5 minutos." };
      }
      setAttempts(email, { count: count, lockedUntil: 0 });
      return { ok: false, error: "E-mail ou senha incorretos. Tentativa " + count + " de " + MAX_ATTEMPTS + "." };
    }
    setAttempts(email, { count: 0, lockedUntil: 0 });
    return { ok: true, user: { name: user.name, email: user.email } };
  }
  function startSession(user) {
    LS.set(K.session, { name: user.name, email: user.email, at: Date.now() });
    state.user = { name: user.name, email: user.email };
    loadData();
  }
  function logout() {
    LS.del(K.session);
    state.user = null;
    loadData();
    renderAll();
  }
  function restoreSession() {
    var s = LS.get(K.session, null);
    state.user = (s && s.email) ? { name: s.name, email: s.email } : null;
  }

  /* =======================================================================
     8. TOAST / MODAIS / CONFIRM
     ======================================================================= */
  function toast(title, msg, type) {
    var stack = $("#toastStack");
    if (!stack) return;
    var el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.innerHTML = "<strong>" + escapeHtml(title) + "</strong>" + (msg ? "<p>" + escapeHtml(msg) + "</p>" : "");
    stack.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "opacity .25s ease, transform .25s ease";
      setTimeout(function () { el.remove(); }, 260);
    }, 3800);
  }

  var lastFocus = null;
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    m.hidden = false;
    document.body.style.overflow = "hidden";
    var f = m.querySelector("input, button, select, textarea");
    if (f) setTimeout(function () { f.focus(); }, 40);
  }
  function closeModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  var confirmCb = null;
  function confirmDialog(title, text, cb) {
    var t = $("#confirmTitle"), x = $("#confirmText");
    if (t) t.textContent = title || "Confirmar";
    if (x) x.textContent = text || "Tem certeza?";
    confirmCb = cb;
    openModal("modalConfirm");
  }

  /* =======================================================================
     9. ROTEADOR (hash)
     ======================================================================= */
  function handleRoute() {
    var hash = location.hash || "#/";
    if (hash.indexOf("#/app") === 0) {
      var route = hash.split("/")[2] || "painel";
      showApp(ROUTES[route] ? route : "painel");
    } else if (hash.indexOf("#/privacidade") === 0) {
      showLegal("privacidade");
    } else if (hash.indexOf("#/cookies") === 0) {
      showLegal("cookies");
    } else if (hash.indexOf("#/termos") === 0) {
      showLegal("termos");
    } else if (hash === "#/" || hash === "#" || hash === "") {
      showLanding();
      window.scrollTo(0, 0);
    } else {
      showLanding(); // âncora interna (#solucoes etc.) — deixa o navegador rolar
    }
  }

  function showLanding() {
    var l = $("#view-landing"), a = $("#view-app"), g = $("#view-legal");
    if (l) l.hidden = false;
    if (a) a.hidden = true;
    if (g) g.hidden = true;
    document.body.classList.remove("in-app");
  }
  function showLegal(page) {
    var l = $("#view-landing"), a = $("#view-app"), g = $("#view-legal");
    if (l) l.hidden = true;
    if (a) a.hidden = true;
    if (g) g.hidden = false;
    $$(".legal-page").forEach(function (art) {
      art.hidden = art.getAttribute("data-legal") !== page;
    });
    document.body.classList.remove("in-app");
    window.scrollTo(0, 0);
  }
  function showApp(route) {
    var l = $("#view-landing"), a = $("#view-app"), g = $("#view-legal");
    if (l) l.hidden = true;
    if (g) g.hidden = true;
    if (a) a.hidden = false;
    document.body.classList.add("in-app");
    renderAll();
    setActiveView(route);
    closeSidebar();
  }
  function setActiveView(route) {
    state.route = route;
    $$(".app-view").forEach(function (v) {
      v.hidden = v.getAttribute("data-view") !== route;
    });
    $$(".side-link").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-route") === route);
    });
    var t = $("#appTitle");
    if (t) t.textContent = ROUTES[route] || "Painel";
  }
  function goRoute(route) {
    if (location.hash === "#/app/" + route) { showApp(route); }
    else location.hash = "#/app/" + route;
  }

  function renderAll() {
    renderDashboard();
    renderProducts();
    renderTransactions();
    renderFluxo();
    renderAccounts();
    renderDiagnostico();
    renderGoals();
    renderReports();
    renderAprenda();
    renderConfig();
    updateUserUI();
  }

  /* =======================================================================
     10. CÁLCULOS FINANCEIROS
     ======================================================================= */
  function totals(list) {
    var inc = 0, exp = 0;
    (list || []).forEach(function (t) {
      var a = toNum(t.amount);
      if (t.type === "entrada") inc += a; else exp += a;
    });
    return { inc: inc, exp: exp, saldo: inc - exp };
  }

  function calcMarkup(cost, varPct, fixedPct, profitPct) {
    cost = toNum(cost); varPct = toNum(varPct); fixedPct = toNum(fixedPct); profitPct = toNum(profitPct);
    var sum = varPct + fixedPct + profitPct;
    var divisor = 1 - sum / 100;
    if (divisor <= 0) {
      return { error: "A soma das despesas e da margem de lucro deve ser menor que 100%. Ajuste os percentuais." };
    }
    var multiplier = 1 / divisor;
    var price = cost / divisor;
    var profitValue = price * (profitPct / 100);
    var margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    return {
      cost: cost, varPct: varPct, fixedPct: fixedPct, profitPct: profitPct,
      sum: sum, divisor: divisor, multiplier: multiplier, price: price,
      profitValue: profitValue, margin: margin
    };
  }

  function byMonth(list) {
    var map = {};
    (list || []).forEach(function (t) {
      var k = monthKey(t.date);
      if (!map[k]) map[k] = { key: k, inc: 0, exp: 0 };
      if (t.type === "entrada") map[k].inc += toNum(t.amount); else map[k].exp += toNum(t.amount);
    });
    return Object.keys(map).sort().map(function (k) { return map[k]; });
  }
  function lastMonths(n) {
    var out = [], d = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0"));
    }
    return out;
  }
  function byCategory(list, type) {
    var map = {};
    (list || []).forEach(function (t) {
      if (type && t.type !== type) return;
      var c = t.category || "Sem categoria";
      map[c] = (map[c] || 0) + toNum(t.amount);
    });
    return Object.keys(map).map(function (k) { return { label: k, value: map[k] }; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  /* =======================================================================
     11. GRÁFICOS SVG
     ======================================================================= */
  var CHART_COLORS = ["#7a1f3d", "#c8a24a", "#a23a5c", "#1f8a5b", "#b9802a", "#5c1630", "#e0c479", "#b23a3a", "#7a6a63", "#4e1228"];

  function emptyChart(msg) {
    return '<p class="muted" style="padding:28px 12px;text-align:center">' + escapeHtml(msg) + "</p>";
  }

  function svgBarChart(labels, series) {
    var w = 640, h = 280, pad = { t: 18, r: 14, b: 40, l: 48 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var max = 0;
    series.forEach(function (s) { s.values.forEach(function (v) { if (v > max) max = v; }); });
    max = max || 1;
    var gw = iw / Math.max(1, labels.length);
    var barW = Math.max(6, Math.min(30, (gw - 14) / series.length));
    var grid = "", bars = "", xl = "";
    for (var i = 0; i <= 4; i++) {
      var y = pad.t + ih - (ih * i) / 4;
      grid += '<line x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (pad.l + iw) + '" y2="' + y.toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>';
      grid += '<text x="' + (pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + fmtShort((max * i) / 4) + "</text>";
    }
    labels.forEach(function (lab, i) {
      var cx = pad.l + gw * i + gw / 2;
      var totalW = barW * series.length + 6 * (series.length - 1);
      var startX = cx - totalW / 2;
      series.forEach(function (s, j) {
        var v = s.values[i] || 0;
        var bh = (v / max) * ih;
        var x = startX + j * (barW + 6);
        var yy = pad.t + ih - bh;
        bars += '<rect x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(0, bh).toFixed(1) + '" rx="4" fill="' + s.color + '"><title>' + escapeHtml(s.name) + " — " + escapeHtml(lab) + ": " + fmtBRL(v) + "</title></rect>";
      });
      xl += '<text x="' + cx.toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + escapeHtml(lab) + "</text>";
    });
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">' + grid + bars + xl + "</svg>";
  }

  function svgLineChart(labels, values, color) {
    var w = 640, h = 260, pad = { t: 18, r: 16, b: 40, l: 52 };
    var iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    var max = Math.max.apply(null, [1].concat(values));
    var min = Math.min.apply(null, [0].concat(values));
    var range = (max - min) || 1;
    var n = values.length;
    var stepX = n > 1 ? iw / (n - 1) : 0;
    var pts = values.map(function (v, i) {
      var x = pad.l + stepX * i;
      var y = pad.t + ih - ((v - min) / range) * ih;
      return [x, y];
    });
    var grid = "", xl = "";
    for (var i = 0; i <= 4; i++) {
      var y = pad.t + ih - (ih * i) / 4;
      var val = min + (range * i) / 4;
      grid += '<line x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (pad.l + iw) + '" y2="' + y.toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>';
      grid += '<text x="' + (pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + fmtShort(val) + "</text>";
    }
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var area = line + " L " + (pts.length ? pts[pts.length - 1][0].toFixed(1) : pad.l) + " " + (pad.t + ih).toFixed(1) +
      " L " + (pts.length ? pts[0][0].toFixed(1) : pad.l) + " " + (pad.t + ih).toFixed(1) + " Z";
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="' + color + '"><title>' + escapeHtml(labels[i]) + ": " + fmtBRL(values[i]) + "</title></circle>";
    }).join("");
    labels.forEach(function (lab, i) {
      xl += '<text x="' + (pad.l + stepX * i).toFixed(1) + '" y="' + (h - 14) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + escapeHtml(lab) + "</text>";
    });
    var gid = "areaGrad" + Math.random().toString(36).slice(2, 6);
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + color + '" stop-opacity="0.35"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0.03"/></linearGradient></defs>' +
      grid + '<path d="' + area + '" fill="url(#' + gid + ')"/><path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' + dots + xl + "</svg>";
  }

  function svgPieChart(items) {
    var total = items.reduce(function (s, i) { return s + i.value; }, 0);
    if (!total) return "";
    var w = 240, h = 240, cx = 120, cy = 120, r = 84, sw = 32;
    var circ = 2 * Math.PI * r;
    var off = 0, arcs = "";
    items.forEach(function (it, i) {
      var frac = it.value / total;
      var len = frac * circ;
      var color = it.color || CHART_COLORS[i % CHART_COLORS.length];
      arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + sw +
        '" stroke-dasharray="' + len.toFixed(2) + " " + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) +
        '" transform="rotate(-90 ' + cx + " " + cy + ')"><title>' + escapeHtml(it.label) + ": " + fmtBRL(it.value) + " (" + fmtPct(frac * 100) + ")</title></circle>";
      off += len;
    });
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">' + arcs +
      '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="12" fill="var(--muted)">Total</text>' +
      '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="16" font-weight="700" fill="var(--text)">' + fmtShort(total) + "</text></svg>";
  }

  function pieBlock(items) {
    var svg = svgPieChart(items);
    var legend = items.map(function (it, i) {
      var color = it.color || CHART_COLORS[i % CHART_COLORS.length];
      return '<span><i style="background:' + color + '"></i>' + escapeHtml(it.label) + " — " + fmtBRL(it.value) + "</span>";
    }).join("");
    return svg + '<div class="chart-legend">' + legend + "</div>";
  }

  /* =======================================================================
     12. DIAGNÓSTICO / FINDINGS
     ======================================================================= */
  function findingHtml(f) {
    return '<div class="finding ' + (f.level || "") + '"><span class="f-icon">' + f.icon + '</span><div><strong>' + escapeHtml(f.title) + "</strong><p>" + escapeHtml(f.text) + "</p></div></div>";
  }

  function buildFindings() {
    var d = state.data, out = [];
    var t = totals(d.transactions);

    if (!d.transactions.length && !d.accounts.length) {
      out.push({ icon: "📝", level: "", title: "Comece registrando seus números", text: "Cadastre lançamentos e contas para que os indicadores e alertas apareçam automaticamente." });
    }

    if (d.transactions.length) {
      if (t.saldo < 0) {
        out.push({ icon: "⚠️", level: "bad", title: "Saldo negativo", text: "Suas saídas superam as entradas em " + fmtBRL(Math.abs(t.saldo)) + ". Revise despesas e renegocie custos." });
      } else if (t.inc > 0 && (t.saldo / t.inc) < 0.1) {
        out.push({ icon: "⚠️", level: "warn", title: "Margem apertada", text: "Seu saldo representa menos de 10% da receita. Busque aumentar a margem ou reduzir custos fixos." });
      } else if (t.inc > 0) {
        out.push({ icon: "✅", level: "ok", title: "Resultado positivo", text: "Você está com saldo positivo de " + fmtBRL(t.saldo) + " (" + fmtPct((t.saldo / t.inc) * 100) + " da receita)." });
      }

      var cats = byCategory(d.transactions, "saida");
      if (cats.length && t.exp > 0 && (cats[0].value / t.exp) > 0.5) {
        out.push({ icon: "📊", level: "warn", title: "Concentração de despesas", text: 'A categoria "' + cats[0].label + '" representa ' + fmtPct((cats[0].value / t.exp) * 100) + " das despesas. Avalie diversificar ou reduzir." });
      }
    }

    var overdue = d.accounts.filter(function (a) { return !a.paid && a.type === "pagar" && daysUntil(a.due) < 0; });
    if (overdue.length) {
      var sum = overdue.reduce(function (s, a) { return s + toNum(a.amount); }, 0);
      out.push({ icon: "⏰", level: "bad", title: overdue.length + " conta(s) a pagar vencida(s)", text: "Total de " + fmtBRL(sum) + " em atraso. Regularize para evitar juros." });
    }
    var soon = d.accounts.filter(function (a) { var dd = daysUntil(a.due); return !a.paid && a.type === "pagar" && dd >= 0 && dd <= 7; });
    if (soon.length) {
      out.push({ icon: "📅", level: "warn", title: soon.length + " conta(s) a vencer em 7 dias", text: "Planeje o caixa para honrar os compromissos próximos." });
    }
    var rec = d.accounts.filter(function (a) { return !a.paid && a.type === "receber" && daysUntil(a.due) < 0; });
    if (rec.length) {
      var rsum = rec.reduce(function (s, a) { return s + toNum(a.amount); }, 0);
      out.push({ icon: "💸", level: "warn", title: rec.length + " recebimento(s) em atraso", text: "Há " + fmtBRL(rsum) + " a receber vencido. Faça a cobrança." });
    }

    if (d.goals.length) {
      d.goals.forEach(function (g) {
        var pct = g.target > 0 ? (toNum(g.saved) / toNum(g.target)) * 100 : 0;
        if (pct >= 100) out.push({ icon: "🎉", level: "ok", title: "Meta concluída: " + g.name, text: "Você atingiu o objetivo de " + fmtBRL(g.target) + "." });
      });
    }

    if (!out.length) out.push({ icon: "✅", level: "ok", title: "Tudo em ordem", text: "Seus indicadores não apontam alertas no momento. Continue acompanhando." });
    return out;
  }

  function healthScore() {
    var d = state.data;
    var t = totals(d.transactions);
    var score = 50, hasData = d.transactions.length > 0;
    if (!hasData) return { score: null, label: "Sem dados suficientes" };

    var margin = t.inc > 0 ? (t.saldo / t.inc) * 100 : 0;
    score += clamp(margin, -30, 30);

    var overdue = d.accounts.filter(function (a) { return !a.paid && a.type === "pagar" && daysUntil(a.due) < 0; }).length;
    score -= Math.min(20, overdue * 6);

    var pendPay = d.accounts.filter(function (a) { return !a.paid && a.type === "pagar"; }).reduce(function (s, a) { return s + toNum(a.amount); }, 0);
    if (t.inc > 0 && pendPay > t.inc) score -= 10;

    if (d.goals.length) {
      var done = d.goals.filter(function (g) { return toNum(g.saved) >= toNum(g.target) && toNum(g.target) > 0; }).length;
      score += Math.min(10, done * 5);
    }
    score = Math.round(clamp(score, 0, 100));

    var label = "Crítico";
    if (score >= 80) label = "Excelente";
    else if (score >= 60) label = "Bom";
    else if (score >= 40) label = "Atenção";
    return { score: score, label: label };
  }

  /* =======================================================================
     13. RENDERIZADORES
     ======================================================================= */
  function renderDashboard() {
    var d = state.data;
    var t = totals(d.transactions);
    var margin = t.inc > 0 ? (t.saldo / t.inc) * 100 : 0;

    var kg = $("#kpiGrid");
    if (kg) {
      var kpis = [
        { label: "Receita total", value: fmtBRL(t.inc), cls: "" },
        { label: "Despesas totais", value: fmtBRL(t.exp), cls: "neg" },
        { label: "Saldo", value: fmtBRL(t.saldo), cls: t.saldo >= 0 ? "pos" : "neg" },
        { label: "Margem", value: fmtPct(margin), cls: margin >= 0 ? "pos" : "neg" }
      ];
      kg.innerHTML = kpis.map(function (k) {
        return '<div class="kpi ' + k.cls + '"><span>' + k.label + "</span><strong>" + k.value + "</strong></div>";
      }).join("");
    }

    var months = lastMonths(6);
    var bm = {};
    byMonth(d.transactions).forEach(function (m) { bm[m.key] = m; });
    var labels = months.map(monthLabel);
    var incV = months.map(function (m) { return bm[m] ? bm[m].inc : 0; });
    var expV = months.map(function (m) { return bm[m] ? bm[m].exp : 0; });

    var barEl = $("#dashBarChart");
    if (barEl) {
      barEl.innerHTML = d.transactions.length
        ? svgBarChart(labels, [
            { name: "Entradas", color: "#1f8a5b", values: incV },
            { name: "Saídas", color: "#b23a3a", values: expV }
          ])
        : emptyChart("Cadastre lançamentos para ver o gráfico.");
    }
    var bd = $("#dashBarDesc");
    if (bd) bd.textContent = d.transactions.length
      ? "Comparativo de entradas e saídas nos últimos 6 meses. Entradas: " + fmtBRL(t.inc) + "; saídas: " + fmtBRL(t.exp) + "."
      : "";

    var cats = byCategory(d.transactions, "saida");
    var pieEl = $("#dashPieChart");
    if (pieEl) {
      pieEl.innerHTML = cats.length
        ? pieBlock(cats.map(function (c, i) { return { label: c.label, value: c.value, color: CHART_COLORS[i % CHART_COLORS.length] }; }))
        : emptyChart("Sem despesas registradas.");
    }
    var pd = $("#dashPieDesc");
    if (pd) pd.textContent = cats.length
      ? "As despesas estão distribuídas em " + cats.length + ' categoria(s). A maior é "' + cats[0].label + '" com ' + fmtBRL(cats[0].value) + "."
      : "";

    var all = byMonth(d.transactions);
    var acc = 0;
    var lineVals = all.map(function (m) { acc += (m.inc - m.exp); return acc; });
    var lineEl = $("#dashLineChart");
    if (lineEl) {
      lineEl.innerHTML = all.length
        ? svgLineChart(all.map(function (m) { return monthLabel(m.key); }), lineVals, "#7a1f3d")
        : emptyChart("Sem dados de saldo ainda.");
    }
    var ld = $("#dashLineDesc");
    if (ld) ld.textContent = all.length ? "Evolução do saldo acumulado. Saldo final: " + fmtBRL(acc) + "." : "";

    var fEl = $("#dashFindings");
    if (fEl) {
      var f = buildFindings();
      fEl.innerHTML = f.map(findingHtml).join("");
    }
  }

  function renderProducts() {
    var d = state.data;
    var q = ($("#prodSearch") && $("#prodSearch").value || "").toLowerCase().trim();
    var list = d.products.filter(function (p) {
      return !q || String(p.name).toLowerCase().indexOf(q) > -1;
    });
    var tb = $("#productsTable");
    var empty = $("#productsEmpty");
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = "";
      if (empty) { empty.hidden = false; empty.textContent = d.products.length ? "Nenhum produto corresponde à busca." : "Nenhum produto cadastrado ainda."; }
      return;
    }
    if (empty) empty.hidden = true;
    tb.innerHTML = list.map(function (p) {
      var cost = toNum(p.cost), price = toNum(p.price);
      var margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      var cls = margin >= 0 ? "pos-text" : "neg-text";
      return "<tr>" +
        "<td>" + escapeHtml(p.name) + "</td>" +
        "<td>" + (p.type === "servico" ? "Serviço" : "Produto") + "</td>" +
        "<td>" + fmtBRL(cost) + "</td>" +
        "<td>" + fmtBRL(price) + "</td>" +
        '<td class="' + cls + '">' + fmtPct(margin) + "</td>" +
        '<td><button class="icon-btn" data-product-edit="' + p.id + '" aria-label="Editar">✏️</button> ' +
        '<button class="icon-btn" data-product-del="' + p.id + '" aria-label="Excluir">🗑️</button></td>' +
        "</tr>";
    }).join("");
  }

  function renderTransactions() {
    var d = state.data;
    var q = ($("#txSearch") && $("#txSearch").value || "").toLowerCase().trim();
    var ft = ($("#txFilterType") && $("#txFilterType").value) || "all";
    var list = d.transactions.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    list = list.filter(function (t) {
      if (ft !== "all" && t.type !== ft) return false;
      if (!q) return true;
      return String(t.desc).toLowerCase().indexOf(q) > -1 || String(t.category || "").toLowerCase().indexOf(q) > -1;
    });
    var tb = $("#txTable");
    var empty = $("#txEmpty");
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = "";
      if (empty) { empty.hidden = false; empty.textContent = d.transactions.length ? "Nenhum lançamento corresponde ao filtro." : "Nenhum lançamento cadastrado ainda."; }
      return;
    }
    if (empty) empty.hidden = true;
    tb.innerHTML = list.map(function (t) {
      var isIn = t.type === "entrada";
      var cls = isIn ? "pos-text" : "neg-text";
      var sign = isIn ? "+" : "−";
      return "<tr>" +
        "<td>" + dateBR(t.date) + "</td>" +
        "<td>" + escapeHtml(t.desc) + "</td>" +
        "<td>" + escapeHtml(t.category || "—") + "</td>" +
        '<td class="' + cls + '">' + sign + " " + fmtBRL(t.amount) + "</td>" +
        '<td><button class="icon-btn" data-tx-edit="' + t.id + '" aria-label="Editar">✏️</button> ' +
        '<button class="icon-btn" data-tx-del="' + t.id + '" aria-label="Excluir">🗑️</button></td>' +
        "</tr>";
    }).join("");
  }

  function renderFluxo() {
    var d = state.data;
    var t = totals(d.transactions);
    var months = byMonth(d.transactions);
    var avg = months.length ? (t.saldo / months.length) : 0;

    var kg = $("#fluxoKpis");
    if (kg) {
      kg.innerHTML =
        '<div class="kpi pos"><span>Entradas</span><strong>' + fmtBRL(t.inc) + "</strong></div>" +
        '<div class="kpi neg"><span>Saídas</span><strong>' + fmtBRL(t.exp) + "</strong></div>" +
        '<div class="kpi ' + (t.saldo >= 0 ? "pos" : "neg") + '"><span>Saldo</span><strong>' + fmtBRL(t.saldo) + "</strong></div>" +
        '<div class="kpi ' + (avg >= 0 ? "pos" : "neg") + '"><span>Saldo médio/mês</span><strong>' + fmtBRL(avg) + "</strong></div>";
    }

    var chartEl = $("#fluxoChart");
    if (chartEl) {
      chartEl.innerHTML = months.length
        ? svgBarChart(months.map(function (m) { return monthLabel(m.key); }), [
            { name: "Entradas", color: "#1f8a5b", values: months.map(function (m) { return m.inc; }) },
            { name: "Saídas", color: "#b23a3a", values: months.map(function (m) { return m.exp; }) }
          ])
        : emptyChart("Sem lançamentos para montar o fluxo de caixa.");
    }
    var desc = $("#fluxoDesc");
    if (desc) desc.textContent = months.length
      ? "Fluxo mensal com " + months.length + " mês(es) registrado(s). Saldo acumulado: " + fmtBRL(t.saldo) + "."
      : "";

    var tb = $("#fluxoTable");
    if (tb) {
      if (!months.length) { tb.innerHTML = '<tr><td colspan="5" class="muted">Sem dados.</td></tr>'; }
      else {
        var acc = 0;
        tb.innerHTML = months.map(function (m) {
          var saldo = m.inc - m.exp; acc += saldo;
          return "<tr><td>" + monthLabel(m.key) + "</td><td>" + fmtBRL(m.inc) + "</td><td>" + fmtBRL(m.exp) +
            '</td><td class="' + (saldo >= 0 ? "pos-text" : "neg-text") + '">' + fmtBRL(saldo) +
            '</td><td class="' + (acc >= 0 ? "pos-text" : "neg-text") + '">' + fmtBRL(acc) + "</td></tr>";
        }).join("");
      }
    }
  }

  function renderAccounts() {
    var d = state.data;
    var tb = $("#accTable");
    var empty = $("#accEmpty");
    var sumEl = $("#accSummary");

    var pagar = d.accounts.filter(function (a) { return a.type === "pagar" && !a.paid; }).reduce(function (s, a) { return s + toNum(a.amount); }, 0);
    var receber = d.accounts.filter(function (a) { return a.type === "receber" && !a.paid; }).reduce(function (s, a) { return s + toNum(a.amount); }, 0);
    var vencidas = d.accounts.filter(function (a) { return !a.paid && daysUntil(a.due) < 0; }).reduce(function (s, a) { return s + toNum(a.amount); }, 0);

    if (sumEl) {
      sumEl.innerHTML =
        '<div class="kpi neg"><span>A pagar (pendente)</span><strong>' + fmtBRL(pagar) + "</strong></div>" +
        '<div class="kpi pos"><span>A receber (pendente)</span><strong>' + fmtBRL(receber) + "</strong></div>" +
        '<div class="kpi neg"><span>Vencidas</span><strong>' + fmtBRL(vencidas) + "</strong></div>";
    }

    if (!tb) return;
    var list = d.accounts.slice().sort(function (a, b) { return String(a.due).localeCompare(String(b.due)); });
    if (!list.length) {
      tb.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    tb.innerHTML = list.map(function (a) {
      var dd = daysUntil(a.due);
      var status = a.paid ? "Pago" : (dd < 0 ? "Vencido" : "Pendente");
      var statusCls = a.paid ? "badge" : (dd < 0 ? "badge" : "badge");
      var badgeStyle = a.paid ? "background:var(--success-bg);color:var(--success)" : (dd < 0 ? "background:var(--danger-bg);color:var(--danger)" : "background:var(--warning-bg);color:var(--warning)");
      return "<tr>" +
        "<td>" + dateBR(a.due) + "</td>" +
        "<td>" + escapeHtml(a.desc) + "</td>" +
        "<td>" + (a.type === "pagar" ? "A pagar" : "A receber") + "</td>" +
        '<td class="' + (a.type === "receber" ? "pos-text" : "neg-text") + '">' + fmtBRL(a.amount) + "</td>" +
        '<td><span class="' + statusCls + '" style="' + badgeStyle + '">' + status + "</span></td>" +
        '<td><button class="icon-btn" data-acc-paid="' + a.id + '" aria-label="Alternar pago">' + (a.paid ? "↩️" : "✔️") + "</button> " +
        '<button class="icon-btn" data-acc-edit="' + a.id + '" aria-label="Editar">✏️</button> ' +
        '<button class="icon-btn" data-acc-del="' + a.id + '" aria-label="Excluir">🗑️</button></td>' +
        "</tr>";
    }).join("");
  }

  function renderDiagnostico() {
    var hs = healthScore();
    var sc = $("#diagScore"), lb = $("#diagLabel"), fEl = $("#diagFindings");
    if (sc) sc.textContent = hs.score === null ? "—" : String(hs.score);
    if (lb) lb.textContent = hs.label;
    if (fEl) {
      var f = buildFindings();
      fEl.innerHTML = f.map(findingHtml).join("");
    }
  }

  function renderGoals() {
    var d = state.data;
    var list = $("#goalsList"), empty = $("#goalsEmpty");
    if (!list) return;
    if (!d.goals.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = d.goals.map(function (g) {
      var target = toNum(g.target), saved = toNum(g.saved);
      var pct = target > 0 ? clamp((saved / target) * 100, 0, 100) : 0;
      var dd = daysUntil(g.deadline);
      var prazo = g.deadline ? (dd < 0 ? "Prazo encerrado" : dd === 0 ? "Vence hoje" : dd + " dias restantes") : "Sem prazo";
      return '<div class="goal-item">' +
        '<div class="goal-top"><h4>' + escapeHtml(g.name) + '</h4><button class="icon-btn" data-goal-del="' + g.id + '" aria-label="Excluir">🗑️</button></div>' +
        '<div class="progress"><span style="width:' + pct.toFixed(1) + '%"></span></div>' +
        '<div class="goal-meta"><span>' + fmtBRL(saved) + " de " + fmtBRL(target) + "</span><span>" + fmtPct(pct) + "</span></div>" +
        '<div class="goal-meta"><span>' + escapeHtml(prazo) + "</span><span>" + (pct >= 100 ? "✅ Concluída" : "Em andamento") + "</span></div>" +
        "</div>";
    }).join("");
  }

  function renderReports() {
    var d = state.data;
    var t = totals(d.transactions);
    var kg = $("#reportKpis");
    if (kg) {
      var margin = t.inc > 0 ? (t.saldo / t.inc) * 100 : 0;
      kg.innerHTML =
        '<div class="kpi"><span>Lançamentos</span><strong>' + d.transactions.length + "</strong></div>" +
        '<div class="kpi pos"><span>Receita</span><strong>' + fmtBRL(t.inc) + "</strong></div>" +
        '<div class="kpi neg"><span>Despesas</span><strong>' + fmtBRL(t.exp) + "</strong></div>" +
        '<div class="kpi ' + (t.saldo >= 0 ? "pos" : "neg") + '"><span>Resultado</span><strong>' + fmtBRL(t.saldo) + "</strong></div>";
    }

    var catTb = $("#reportCatTable");
    if (catTb) {
      var cats = {};
      d.transactions.forEach(function (tx) {
        var c = tx.category || "Sem categoria";
        if (!cats[c]) cats[c] = { inc: 0, exp: 0 };
        if (tx.type === "entrada") cats[c].inc += toNum(tx.amount); else cats[c].exp += toNum(tx.amount);
      });
      var rows = Object.keys(cats).sort().map(function (c) {
        var v = cats[c], saldo = v.inc - v.exp;
        return "<tr><td>" + escapeHtml(c) + "</td><td>" + fmtBRL(v.inc) + "</td><td>" + fmtBRL(v.exp) +
          '</td><td class="' + (saldo >= 0 ? "pos-text" : "neg-text") + '">' + fmtBRL(saldo) + "</td></tr>";
      }).join("");
      catTb.innerHTML = rows || '<tr><td colspan="4" class="muted">Sem dados.</td></tr>';
    }

    var prodTb = $("#reportProdTable");
    if (prodTb) {
      var prods = d.products.slice().map(function (p) {
        var cost = toNum(p.cost), price = toNum(p.price);
        return { name: p.name, price: price, margin: price > 0 ? ((price - cost) / price) * 100 : 0 };
      }).sort(function (a, b) { return b.margin - a.margin; });
      prodTb.innerHTML = prods.length
        ? prods.map(function (p) {
            return "<tr><td>" + escapeHtml(p.name) + "</td><td>" + fmtBRL(p.price) +
              '</td><td class="' + (p.margin >= 0 ? "pos-text" : "neg-text") + '">' + fmtPct(p.margin) + "</td></tr>";
          }).join("")
        : '<tr><td colspan="3" class="muted">Sem produtos cadastrados.</td></tr>';
    }
  }

  /* ---- Aprenda: módulos + quiz ---- */
  var MODULES = [
    {
      id: "markup", icon: "🧮", title: "Precificação com markup",
      desc: "Aprenda a formar o preço de venda a partir de custos e margem desejada.",
      content: "O markup é um índice aplicado sobre o custo para chegar ao preço de venda. Divida o custo direto pelo divisor (1 − soma dos percentuais de despesas e lucro). O multiplicador é 1 ÷ divisor.",
      quiz: [
        { q: "Se o divisor do markup é 0,8, qual o multiplicador?", options: ["0,8", "1,25", "1,8", "0,2"], answer: 1 },
        { q: "O divisor é calculado como:", options: ["1 + despesas + lucro", "1 − (despesas + lucro)", "custo ÷ preço", "preço − custo"], answer: 1 }
      ]
    },
    {
      id: "fluxo", icon: "🌊", title: "Fluxo de caixa",
      desc: "Entenda entradas, saídas e saldo ao longo do tempo.",
      content: "Fluxo de caixa é o registro de todo dinheiro que entra e sai. Saldo = entradas − saídas. Acompanhar mensalmente ajuda a prever apertos e sobras.",
      quiz: [
        { q: "Saldo de caixa é:", options: ["Entradas + saídas", "Entradas − saídas", "Só entradas", "Só saídas"], answer: 1 }
      ]
    },
    {
      id: "giro", icon: "🔄", title: "Capital de giro",
      desc: "O fôlego financeiro do dia a dia do negócio.",
      content: "Capital de giro = ativos circulantes − passivos circulantes. É o recurso disponível para operar no curto prazo.",
      quiz: [
        { q: "Capital de giro é:", options: ["Ativos − passivos circulantes", "Lucro líquido", "Faturamento", "Impostos"], answer: 0 }
      ]
    },
    {
      id: "pe", icon: "⚖️", title: "Ponto de equilíbrio",
      desc: "Quanto você precisa vender para não ter prejuízo.",
      content: "Ponto de equilíbrio (R$) = custos fixos ÷ margem de contribuição percentual. Abaixo dele há prejuízo; acima, lucro.",
      quiz: [
        { q: "Ponto de equilíbrio em reais =", options: ["Custos fixos ÷ MC%", "Custos fixos × MC%", "Receita − custos", "Lucro ÷ vendas"], answer: 0 }
      ]
    },
    {
      id: "mc", icon: "📈", title: "Margem de contribuição",
      desc: "Quanto cada venda contribui para pagar os custos fixos.",
      content: "MC = preço de venda − custos variáveis. MC% = MC ÷ preço. Quanto maior, mais rápido o negócio cobre os custos fixos.",
      quiz: [
        { q: "Margem de contribuição é:", options: ["Preço − custo variável", "Preço − custo fixo", "Lucro ÷ receita", "Receita total"], answer: 0 }
      ]
    },
    {
      id: "ticket", icon: "🧾", title: "Ticket médio",
      desc: "O valor médio gasto por cliente.",
      content: "Ticket médio = faturamento ÷ número de vendas. Ajuda a entender o comportamento de compra e a criar estratégias de aumento.",
      quiz: [
        { q: "Ticket médio =", options: ["Faturamento ÷ vendas", "Vendas ÷ faturamento", "Lucro ÷ clientes", "Custos ÷ vendas"], answer: 0 }
      ]
    }
  ];

  function renderAprenda() {
    var list = $("#modulesList");
    if (!list) return;
    list.innerHTML = MODULES.map(function (m) {
      var done = state.progress.modules[m.id];
      return '<div class="module-card">' +
        '<span class="m-icon">' + m.icon + "</span>" +
        "<h4>" + escapeHtml(m.title) + (done ? " ✅" : "") + "</h4>" +
        "<p>" + escapeHtml(m.desc) + "</p>" +
        '<button class="btn btn-secondary btn-sm" data-module="' + m.id + '">' + (done ? "Revisar" : "Estudar") + "</button>" +
        "</div>";
    }).join("");
  }

  function openModule(id) {
    var m = MODULES.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    var card = $("#quizCard"), title = $("#quizTitle"), body = $("#quizBody");
    if (!card || !body) return;
    card.hidden = false;
    if (title) title.textContent = m.icon + " " + m.title;
    state.quiz = { module: m, index: 0, correct: 0, answered: false };
    renderQuizStep();
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderQuizStep() {
    var q = state.quiz;
    var body = $("#quizBody");
    if (!body || !q) return;
    var m = q.module;
    if (q.index >= m.quiz.length) {
      var pct = Math.round((q.correct / m.quiz.length) * 100);
      var ok = pct >= 60;
      state.progress.modules[m.id] = true;
      state.progress.quiz[m.id] = pct;
      saveProgress();
      renderAprenda();
      body.innerHTML =
        "<p><strong>" + escapeHtml(m.content) + "</strong></p>" +
        '<div class="mini-result">Resultado: <strong>' + q.correct + "/" + m.quiz.length + " (" + pct + "%)</strong> — " + (ok ? "Muito bem! 🎉" : "Continue estudando. 💪") + "</div>" +
        '<div class="btn-row"><button class="btn btn-ghost" data-quiz-close="1">Fechar</button><button class="btn btn-primary" data-module="' + m.id + '">Refazer</button></div>';
      return;
    }
    var item = m.quiz[q.index];
    q.answered = false;
    body.innerHTML =
      "<p>" + escapeHtml(m.content) + "</p>" +
      '<div class="quiz-q"><strong>' + (q.index + 1) + ". " + escapeHtml(item.q) + "</strong>" +
      item.options.map(function (opt, i) {
        return '<button class="quiz-opt" data-quiz-opt="' + i + '">' + escapeHtml(opt) + "</button>";
      }).join("") +
      "</div>";
  }

  function answerQuiz(i) {
    var q = state.quiz;
    if (!q || q.answered) return;
    q.answered = true;
    var item = q.module.quiz[q.index];
    var opts = $$("[data-quiz-opt]", $("#quizBody"));
    opts.forEach(function (b, idx) {
      if (idx === item.answer) b.classList.add("correct");
      else if (idx === i) b.classList.add("wrong");
      b.disabled = true;
    });
    if (i === item.answer) q.correct++;
    setTimeout(function () { q.index++; renderQuizStep(); }, 850);
  }

  function renderConfig() {
    var box = $("#accountBox");
    if (box) {
      if (state.user) {
        box.innerHTML =
          '<div class="setting-row"><div><strong>' + escapeHtml(state.user.name) + "</strong><small>" + escapeHtml(state.user.email) + "</small></div>" +
          '<button class="btn btn-ghost btn-sm" data-action="logout">Sair</button></div>';
      } else {
        box.innerHTML =
          '<p class="muted">Você está usando como <strong>convidado</strong>. Crie uma conta para separar seus dados por usuário.</p>' +
          '<div class="btn-row"><button class="btn btn-primary btn-sm" data-action="open-auth" data-auth-tab="register">Criar conta</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="open-auth" data-auth-tab="login">Entrar</button></div>';
      }
    }
    syncA11yButtons();
  }

  function updateUserUI() {
    var chip = $("#userChip");
    if (!chip) return;
    if (state.user) {
      var initials = String(state.user.name || "?").trim().charAt(0).toUpperCase();
      chip.innerHTML = '<span class="avatar">' + escapeHtml(initials) + "</span><span>" + escapeHtml(state.user.name) + "</span>";
    } else {
      chip.innerHTML = '<button class="btn btn-ghost btn-sm" data-action="open-auth" data-auth-tab="login">Entrar</button>';
    }
  }

  /* =======================================================================
     14. CRUD
     ======================================================================= */
  function saveProduct() {
    clearErrors($("#productForm"));
    var name = ($("#prodName").value || "").trim();
    var price = toNum($("#prodPrice").value);
    var ok = true;
    if (!name) { setError("prodName", "Informe o nome."); ok = false; }
    if (price <= 0) { setError("prodPrice", "Informe um preço válido."); ok = false; }
    if (!ok) return;
    var id = $("#prodId").value;
    var obj = {
      id: id || uid(),
      name: name,
      type: $("#prodType").value,
      cost: toNum($("#prodCost").value),
      price: price,
      updatedAt: new Date().toISOString()
    };
    if (id) {
      state.data.products = state.data.products.map(function (p) { return p.id === id ? obj : p; });
      toast("Produto atualizado", name, "success");
    } else {
      state.data.products.push(obj);
      toast("Produto salvo", name, "success");
    }
    saveData();
    resetProductForm();
    renderProducts();
    renderDashboard();
    renderReports();
  }
  function editProduct(id) {
    var p = state.data.products.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    $("#prodId").value = p.id;
    $("#prodName").value = p.name;
    $("#prodType").value = p.type || "produto";
    $("#prodCost").value = p.cost || "";
    $("#prodPrice").value = p.price || "";
    var t = $("#prodFormTitle"); if (t) t.textContent = "Editar produto/serviço";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetProductForm() {
    var f = $("#productForm"); if (f) f.reset();
    var i = $("#prodId"); if (i) i.value = "";
    var t = $("#prodFormTitle"); if (t) t.textContent = "Novo produto/serviço";
    clearErrors(f);
  }
  function delProduct(id) {
    var p = state.data.products.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    confirmDialog("Excluir produto", 'Excluir "' + p.name + '"? Esta ação não pode ser desfeita.', function () {
      state.data.products = state.data.products.filter(function (x) { return x.id !== id; });
      saveData();
      renderProducts(); renderDashboard(); renderReports();
      toast("Produto excluído", p.name, "warn");
    });
  }

  function saveTransaction() {
    clearErrors($("#txForm"));
    var desc = ($("#txDesc").value || "").trim();
    var amount = toNum($("#txAmount").value);
    var date = $("#txDate").value;
    var ok = true;
    if (!desc) { setError("txDesc", "Informe a descrição."); ok = false; }
    if (amount <= 0) { setError("txAmount", "Informe um valor válido."); ok = false; }
    if (!date) { ok = false; toast("Data obrigatória", "Informe a data do lançamento.", "error"); }
    if (!ok) return;
    var id = $("#txId").value;
    var obj = {
      id: id || uid(),
      type: $("#txType").value,
      desc: desc,
      category: ($("#txCategory").value || "").trim(),
      amount: amount,
      date: date
    };
    if (id) {
      state.data.transactions = state.data.transactions.map(function (t) { return t.id === id ? obj : t; });
      toast("Lançamento atualizado", desc, "success");
    } else {
      state.data.transactions.push(obj);
      toast("Lançamento salvo", desc, "success");
    }
    saveData();
    resetTxForm();
    renderTransactions(); renderDashboard(); renderFluxo(); renderDiagnostico(); renderReports();
  }
  function editTransaction(id) {
    var t = state.data.transactions.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    $("#txId").value = t.id;
    $("#txType").value = t.type;
    $("#txDesc").value = t.desc;
    $("#txCategory").value = t.category || "";
    $("#txAmount").value = t.amount;
    $("#txDate").value = t.date;
    var ft = $("#txFormTitle"); if (ft) ft.textContent = "Editar lançamento";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetTxForm() {
    var f = $("#txForm"); if (f) f.reset();
    var i = $("#txId"); if (i) i.value = "";
    var d = $("#txDate"); if (d) d.value = todayISO();
    var ft = $("#txFormTitle"); if (ft) ft.textContent = "Novo lançamento";
    clearErrors(f);
  }
  function delTransaction(id) {
    var t = state.data.transactions.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    confirmDialog("Excluir lançamento", 'Excluir "' + t.desc + '"?', function () {
      state.data.transactions = state.data.transactions.filter(function (x) { return x.id !== id; });
      saveData();
      renderTransactions(); renderDashboard(); renderFluxo(); renderDiagnostico(); renderReports();
      toast("Lançamento excluído", t.desc, "warn");
    });
  }

  function saveAccount() {
    clearErrors($("#accForm"));
    var desc = ($("#accDesc").value || "").trim();
    var amount = toNum($("#accAmount").value);
    var due = $("#accDue").value;
    var ok = true;
    if (!desc) { setError("accDesc", "Informe a descrição."); ok = false; }
    if (amount <= 0) { setError("accAmount", "Informe um valor válido."); ok = false; }
    if (!due) { ok = false; toast("Vencimento obrigatório", "Informe a data de vencimento.", "error"); }
    if (!ok) return;
    var id = $("#accId").value;
    var obj = {
      id: id || uid(),
      type: $("#accType").value,
      desc: desc,
      amount: amount,
      due: due,
      paid: id ? (state.data.accounts.filter(function (a) { return a.id === id; })[0] || {}).paid || false : false
    };
    if (id) {
      state.data.accounts = state.data.accounts.map(function (a) { return a.id === id ? obj : a; });
      toast("Conta atualizada", desc, "success");
    } else {
      state.data.accounts.push(obj);
      toast("Conta salva", desc, "success");
    }
    saveData();
    resetAccForm();
    renderAccounts(); renderDiagnostico(); renderDashboard();
  }
  function editAccount(id) {
    var a = state.data.accounts.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    $("#accId").value = a.id;
    $("#accType").value = a.type;
    $("#accDesc").value = a.desc;
    $("#accAmount").value = a.amount;
    $("#accDue").value = a.due;
    var t = $("#accFormTitle"); if (t) t.textContent = "Editar conta";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetAccForm() {
    var f = $("#accForm"); if (f) f.reset();
    var i = $("#accId"); if (i) i.value = "";
    var d = $("#accDue"); if (d) d.value = todayISO();
    var t = $("#accFormTitle"); if (t) t.textContent = "Nova conta";
    clearErrors(f);
  }
  function delAccount(id) {
    var a = state.data.accounts.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    confirmDialog("Excluir conta", 'Excluir "' + a.desc + '"?', function () {
      state.data.accounts = state.data.accounts.filter(function (x) { return x.id !== id; });
      saveData();
      renderAccounts(); renderDiagnostico(); renderDashboard();
      toast("Conta excluída", a.desc, "warn");
    });
  }
  function toggleAccountPaid(id) {
    state.data.accounts = state.data.accounts.map(function (a) {
      if (a.id === id) a.paid = !a.paid;
      return a;
    });
    saveData();
    renderAccounts(); renderDiagnostico(); renderDashboard();
  }

  function saveGoal() {
    clearErrors($("#goalForm"));
    var name = ($("#goalName").value || "").trim();
    var target = toNum($("#goalTarget").value);
    var ok = true;
    if (!name) { setError("goalName", "Informe o nome da meta."); ok = false; }
    if (target <= 0) { setError("goalTarget", "Informe um valor alvo válido."); ok = false; }
    if (!ok) return;
    state.data.goals.push({
      id: uid(),
      name: name,
      target: target,
      saved: toNum($("#goalSaved").value),
      deadline: $("#goalDeadline").value || ""
    });
    saveData();
    $("#goalForm").reset();
    renderGoals(); renderDiagnostico(); renderDashboard();
    toast("Meta adicionada", name, "success");
  }
  function delGoal(id) {
    var g = state.data.goals.filter(function (x) { return x.id === id; })[0];
    if (!g) return;
    confirmDialog("Excluir meta", 'Excluir "' + g.name + '"?', function () {
      state.data.goals = state.data.goals.filter(function (x) { return x.id !== id; });
      saveData();
      renderGoals(); renderDiagnostico(); renderDashboard();
      toast("Meta excluída", g.name, "warn");
    });
  }

  /* =======================================================================
     15. CALCULADORA DE MARKUP
     ======================================================================= */
  function runCalc() {
    clearErrors($("#markupForm"));
    var cost = toNum($("#mkCost").value);
    var v = toNum($("#mkVar").value);
    var f = toNum($("#mkFixed").value);
    var p = toNum($("#mkProfit").value);
    var ok = true;
    if (cost <= 0) { setError("mkCost", "Informe o custo direto."); ok = false; }
    if ($("#mkVar").value === "") { setError("mkVar", "Informe as despesas variáveis."); ok = false; }
    if ($("#mkFixed").value === "") { setError("mkFixed", "Informe as despesas fixas."); ok = false; }
    if ($("#mkProfit").value === "") { setError("mkProfit", "Informe a margem desejada."); ok = false; }
    if (!ok) return;

    var r = calcMarkup(cost, v, f, p);
    var panel = $("#mkResult");
    if (!panel) return;

    if (r.error) {
      panel.className = "result-empty";
      panel.innerHTML = '<div class="finding bad"><span class="f-icon">⚠️</span><div><strong>Não foi possível calcular</strong><p>' + escapeHtml(r.error) + "</p></div></div>";
      state.lastCalc = null;
      return;
    }

    state.lastCalc = r;
    panel.className = "";
    panel.innerHTML =
      '<div class="result-grid">' +
        '<div class="result-item result-highlight"><span>Preço de venda sugerido</span><strong>' + fmtBRL(r.price) + "</strong></div>" +
        '<div class="result-item"><span>Multiplicador de markup</span><strong>' + r.multiplier.toFixed(4).replace(".", ",") + "</strong></div>" +
        '<div class="result-item"><span>Lucro desejado (R$)</span><strong>' + fmtBRL(r.profitValue) + "</strong></div>" +
        '<div class="result-item"><span>Margem sobre o preço</span><strong>' + fmtPct(r.margin) + "</strong></div>" +
        '<div class="result-item"><span>Custo direto</span><strong>' + fmtBRL(r.cost) + "</strong></div>" +
        '<div class="result-item"><span>Soma dos percentuais</span><strong>' + fmtPct(r.sum) + "</strong></div>" +
      "</div>" +
      '<div class="btn-row" style="margin-top:14px"><button class="btn btn-primary btn-sm" data-action="save-calc">Salvar como produto</button></div>';

    var panelWrap = $("#mkResultPanel");
    if (panelWrap) panelWrap.classList.add("has-result");
  }

  function saveCalcToProducts() {
    if (!state.lastCalc) { toast("Nada para salvar", "Calcule um preço primeiro.", "warn"); return; }
    var r = state.lastCalc;
    state.data.products.push({
      id: uid(),
      name: "Produto (markup " + fmtPct(r.margin) + ")",
      type: "produto",
      cost: r.cost,
      price: r.price,
      updatedAt: new Date().toISOString()
    });
    saveData();
    renderProducts(); renderDashboard(); renderReports();
    toast("Produto salvo", "Preço de " + fmtBRL(r.price) + " adicionado ao catálogo.", "success");
    goRoute("produtos");
  }

  /* =======================================================================
     16. INDICADORES (calculadoras)
     ======================================================================= */
  function miniResult(el, html) { if (el) el.innerHTML = html; }
  function calcCW() {
    var a = toNum($("#cwAssets").value), l = toNum($("#cwLiab").value);
    var cw = a - l;
    miniResult($("#cwResult"), "Capital de giro: <strong>" + fmtBRL(cw) + "</strong> " + (cw >= 0 ? "✅" : "⚠️"));
  }
  function calcTM() {
    var rev = toNum($("#tmRevenue").value), n = toNum($("#tmCount").value);
    if (n <= 0) { miniResult($("#tmResult"), '<span class="neg-text">Informe o número de vendas.</span>'); return; }
    miniResult($("#tmResult"), "Ticket médio: <strong>" + fmtBRL(rev / n) + "</strong>");
  }
  function calcCM() {
    var price = toNum($("#cmPrice").value), vc = toNum($("#cmVarCost").value);
    var mc = price - vc;
    var pct = price > 0 ? (mc / price) * 100 : 0;
    miniResult($("#cmResult"), "MC: <strong>" + fmtBRL(mc) + "</strong> · MC%: <strong>" + fmtPct(pct) + "</strong>");
  }
  function calcPM() {
    var rev = toNum($("#pmRevenue").value), profit = toNum($("#pmProfit").value);
    if (rev <= 0) { miniResult($("#pmResult"), '<span class="neg-text">Informe o faturamento.</span>'); return; }
    miniResult($("#pmResult"), "Margem de lucro: <strong>" + fmtPct((profit / rev) * 100) + "</strong>");
  }
  function calcBE() {
    var fixed = toNum($("#beFixed").value), price = toNum($("#bePrice").value), vc = toNum($("#beVarCost").value);
    var mcUnit = price - vc;
    if (price <= 0 || mcUnit <= 0) { miniResult($("#beResult"), '<span class="neg-text">O preço deve ser maior que o custo variável.</span>'); return; }
    var mcPct = mcUnit / price;
    var beRS = fixed / mcPct;
    var beUn = fixed / mcUnit;
    miniResult($("#beResult"), "PE: <strong>" + fmtBRL(beRS) + "</strong> · <strong>" + fmtNum(beUn, 0) + "</strong> un.");
  }

  /* =======================================================================
     17. SIMULADOR DE CENÁRIOS
     ======================================================================= */
  function calcScenario() {
    var rev = toNum($("#scRevenue").value), costs = toNum($("#scCosts").value);
    var varPct = toNum($("#scVarPct").value), costPct = toNum($("#scCostPct").value);
    var newRev = rev * (1 + varPct / 100);
    var newCosts = costs * (1 + costPct / 100);
    var profit = newRev - newCosts;
    var oldProfit = rev - costs;
    var diff = profit - oldProfit;
    var el = $("#scResult");
    if (!el) return;
    el.className = "";
    el.innerHTML =
      '<div class="result-grid">' +
        '<div class="result-item result-highlight"><span>Resultado simulado</span><strong>' + fmtBRL(profit) + "</strong></div>" +
        '<div class="result-item"><span>Faturamento simulado</span><strong>' + fmtBRL(newRev) + "</strong></div>" +
        '<div class="result-item"><span>Custos simulados</span><strong>' + fmtBRL(newCosts) + "</strong></div>" +
        '<div class="result-item"><span>Variação do resultado</span><strong class="' + (diff >= 0 ? "pos-text" : "neg-text") + '">' + (diff >= 0 ? "+" : "") + fmtBRL(diff) + "</strong></div>" +
      "</div>";
  }

  /* =======================================================================
     18. EXPORTAÇÃO CSV / BACKUP
     ======================================================================= */
  function download(filename, content, type) {
    var blob = new Blob([content], { type: type || "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 200);
  }
  function csvCell(v) {
    var s = String(v === null || v === undefined ? "" : v);
    if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCSV(rows) {
    return rows.map(function (r) { return r.map(csvCell).join(";"); }).join("\r\n");
  }
  function exportTransactions() {
    var rows = [["Data", "Tipo", "Descrição", "Categoria", "Valor"]];
    state.data.transactions.forEach(function (t) {
      rows.push([t.date, t.type, t.desc, t.category || "", String(toNum(t.amount)).replace(".", ",")]);
    });
    download("resoluta-lancamentos.csv", "\ufeff" + toCSV(rows));
    toast("Exportação concluída", "Lançamentos exportados em CSV.", "success");
  }
  function exportProducts() {
    var rows = [["Nome", "Tipo", "Custo", "Preço", "Margem %"]];
    state.data.products.forEach(function (p) {
      var cost = toNum(p.cost), price = toNum(p.price);
      var margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      rows.push([p.name, p.type, String(cost).replace(".", ","), String(price).replace(".", ","), margin.toFixed(1).replace(".", ",")]);
    });
    download("resoluta-produtos.csv", "\ufeff" + toCSV(rows));
    toast("Exportação concluída", "Produtos exportados em CSV.", "success");
  }
  function exportReport() {
    var t = totals(state.data.transactions);
    var rows = [["Relatório Resoluta Finance"], []];
    rows.push(["Receita total", String(t.inc).replace(".", ",")]);
    rows.push(["Despesas totais", String(t.exp).replace(".", ",")]);
    rows.push(["Saldo", String(t.saldo).replace(".", ",")]);
    rows.push([]);
    rows.push(["Lançamentos"]);
    rows.push(["Data", "Tipo", "Descrição", "Categoria", "Valor"]);
    state.data.transactions.forEach(function (x) { rows.push([x.date, x.type, x.desc, x.category || "", String(toNum(x.amount)).replace(".", ",")]); });
    rows.push([]);
    rows.push(["Produtos"]);
    rows.push(["Nome", "Custo", "Preço"]);
    state.data.products.forEach(function (p) { rows.push([p.name, String(toNum(p.cost)).replace(".", ","), String(toNum(p.price)).replace(".", ",")]); });
    download("resoluta-relatorio.csv", "\ufeff" + toCSV(rows));
    toast("Relatório gerado", "Relatório completo exportado.", "success");
  }
  function exportAll() {
    var payload = { app: "Resoluta Finance", exportedAt: new Date().toISOString(), ns: state.ns, data: state.data, progress: state.progress };
    download("resoluta-backup.json", JSON.stringify(payload, null, 2), "application/json");
    toast("Backup gerado", "Arquivo JSON baixado.", "success");
  }
  function importAll(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        var d = obj.data || obj;
        state.data = Object.assign(blankData(), d);
        if (obj.progress) state.progress = Object.assign({ modules: {}, quiz: {} }, obj.progress);
        saveData(); saveProgress();
        renderAll();
        toast("Backup importado", "Seus dados foram restaurados.", "success");
      } catch (e) {
        toast("Falha ao importar", "Arquivo inválido.", "error");
      }
    };
    reader.readAsText(file);
  }
  function clearData() {
    confirmDialog("Apagar dados", "Todos os seus dados financeiros deste navegador serão removidos. Continuar?", function () {
      state.data = blankData();
      state.progress = { modules: {}, quiz: {} };
      saveData(); saveProgress();
      renderAll();
      toast("Dados apagados", "Tudo foi removido.", "warn");
    });
  }

  /* =======================================================================
     19. ASSISTENTE (baseado em regras)
     ======================================================================= */
  function assistantReply(text) {
    var q = String(text || "").toLowerCase();
    var d = state.data;
    var t = totals(d.transactions);
    var hs = healthScore();

    if (/markup|precif|pre[çc]o de venda/.test(q)) {
      return "O markup forma o preço a partir do custo. Use a fórmula: divisor = 1 − (despesas variáveis + despesas fixas + margem desejada); multiplicador = 1 ÷ divisor; preço = custo ÷ divisor. Exemplo: custo R$ 50, despesas 12% + 18% e margem 20% → divisor 0,5 → preço R$ 100. Abra a Calculadora de markup para calcular automaticamente.";
    }
    if (/ponto de equil|break.?even/.test(q)) {
      return "Ponto de equilíbrio é quanto você precisa faturar para cobrir todos os custos. PE (R$) = custos fixos ÷ margem de contribuição %. Acima dele você tem lucro; abaixo, prejuízo. Use a ferramenta Indicadores para calcular.";
    }
    if (/capital de giro/.test(q)) {
      return "Capital de giro = ativos circulantes − passivos circulantes. É o dinheiro disponível para a operação no curto prazo. Se ficar negativo, o negócio pode ter dificuldade de honrar compromissos.";
    }
    if (/margem de contribui/.test(q)) {
      return "Margem de contribuição = preço de venda − custos variáveis. Em percentual: MC ÷ preço. Ela mostra quanto cada venda contribui para pagar os custos fixos e gerar lucro.";
    }
    if (/ticket m[ée]dio/.test(q)) {
      return "Ticket médio = faturamento ÷ número de vendas. Ajuda a entender o valor médio gasto por cliente e a criar estratégias para aumentá-lo.";
    }
    if (/fluxo de caixa/.test(q)) {
      return "Fluxo de caixa é o registro de entradas e saídas ao longo do tempo. Saldo = entradas − saídas. Acompanhe mensalmente para prever apertos e sobras.";
    }
    if (/sa[úu]de|como est[áa]|diagn[óo]stico|situa/.test(q)) {
      if (hs.score === null) return "Ainda não tenho dados suficientes. Cadastre lançamentos, contas e metas para eu calcular sua saúde financeira.";
      return "Sua saúde financeira está em " + hs.score + "/100 (" + hs.label + "). Receita: " + fmtBRL(t.inc) + ", despesas: " + fmtBRL(t.exp) + ", saldo: " + fmtBRL(t.saldo) + ". Veja o Diagnóstico para detalhes e recomendações.";
    }
    if (/meta|planej|objetivo/.test(q)) {
      return "Defina metas na área Planejamento e metas: informe o valor alvo, o quanto já guardou e o prazo. Acompanhe a barra de progresso para manter o foco.";
    }
    if (/imposto|tribut|contador/.test(q)) {
      return "Sobre impostos, recomendo consultar um contador para o seu regime (MEI, Simples, etc.). O Resoluta Finance ajuda na gestão, mas não substitui a orientação contábil.";
    }
    if (/ol[áa]|oi|bom dia|boa tarde|boa noite/.test(q)) {
      return "Olá! Sou o assistente da Resoluta. Posso explicar markup, fluxo de caixa, capital de giro, ponto de equilíbrio e mostrar sua situação financeira. O que você quer saber?";
    }
    if (/obrigad|valeu|thanks/.test(q)) {
      return "De nada! Estou aqui para ajudar você a entender seus números e tomar melhores decisões. 😊";
    }
    return "Posso ajudar com: markup e precificação, fluxo de caixa, capital de giro, margem de contribuição, ticket médio, ponto de equilíbrio, metas e diagnóstico financeiro. Reformule sua pergunta ou use os atalhos abaixo.";
  }

  function pushMsg(who, text) {
    var log = $("#chatLog");
    if (!log) return;
    var el = document.createElement("div");
    el.className = "msg " + who;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function sendChat(text) {
    text = String(text || "").trim();
    if (!text) return;
    pushMsg("user", text);
    var reply = assistantReply(text);
    setTimeout(function () { pushMsg("bot", reply); }, 320);
  }

  /* =======================================================================
     20. LEITURA EM VOZ ALTA (SpeechSynthesis)
     ======================================================================= */
  var speech = { utter: null, active: false };
  function readAloud() {
    if (!("speechSynthesis" in window)) { toast("Indisponível", "Seu navegador não suporta leitura em voz alta.", "warn"); return; }
    var view = state.route && !$("#view-app").hidden ? $('.app-view[data-view="' + state.route + '"]') : $("#view-landing");
    var target = view || document.querySelector("main") || document.body;
    var text = (target.innerText || "").replace(/\s+/g, " ").trim().slice(0, 6000);
    if (!text) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 1;
    u.onend = function () { stopRead(); };
    speech.utter = u;
    speech.active = true;
    window.speechSynthesis.speak(u);
    var bar = $("#readBar"); if (bar) bar.hidden = false;
    $$('[data-a11y="readaloud"]').forEach(function (b) { if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", "true"); });
  }
  function pauseRead() { if (window.speechSynthesis) window.speechSynthesis.pause(); }
  function resumeRead() { if (window.speechSynthesis) window.speechSynthesis.resume(); }
  function stopRead() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speech.active = false;
    var bar = $("#readBar"); if (bar) bar.hidden = true;
    $$('[data-a11y="readaloud"]').forEach(function (b) { if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", "false"); });
  }

  /* =======================================================================
     21. VALIDAÇÃO DE FORMULÁRIOS
     ======================================================================= */
  function setError(fieldId, msg) {
    var input = document.getElementById(fieldId);
    var err = $('[data-error-for="' + fieldId + '"]');
    if (input) input.classList.add("invalid");
    if (err) err.textContent = msg;
  }
  function clearErrors(form) {
    if (!form) return;
    $$(".error-msg", form).forEach(function (e) { e.textContent = ""; });
    $$("input, select, textarea", form).forEach(function (i) { i.classList.remove("invalid"); });
  }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim()); }

  /* =======================================================================
     22. SIDEBAR (mobile)
     ======================================================================= */
  function openSidebar() {
    var s = $("#appSidebar"), b = $("#sidebarBackdrop");
    if (s) s.classList.add("open");
    if (b) b.classList.add("show");
  }
  function closeSidebar() {
    var s = $("#appSidebar"), b = $("#sidebarBackdrop");
    if (s) s.classList.remove("open");
    if (b) b.classList.remove("show");
  }

  /* =======================================================================
     23. HANDLERS DE AUTENTICAÇÃO
     ======================================================================= */
  function switchAuthTab(tab) {
    $$("[data-auth-tab]").forEach(function (b) {
      var on = b.getAttribute("data-auth-tab") === tab;
      b.classList.toggle("active", on);
      if (b.hasAttribute("aria-selected")) b.setAttribute("aria-selected", on ? "true" : "false");
    });
    var lf = $("#loginForm"), rf = $("#registerForm"), ff = $("#forgotForm");
    if (lf) lf.hidden = tab !== "login";
    if (rf) rf.hidden = tab !== "register";
    if (ff) ff.hidden = tab !== "forgot";
  }
  function doLogin() {
    clearErrors($("#loginForm"));
    var email = $("#loginEmail").value, pass = $("#loginPass").value;
    var ok = true;
    if (!isEmail(email)) { setError("loginEmail", "Informe um e-mail válido."); ok = false; }
    if (!pass) { setError("loginPass", "Informe sua senha."); ok = false; }
    if (!ok) return;
    var r = loginUser(email, pass);
    if (!r.ok) { setError("loginPass", r.error); toast("Não foi possível entrar", r.error, "error"); return; }
    startSession(r.user);
    closeModal("modalAuth");
    $("#loginForm").reset();
    renderAll();
    toast("Bem-vindo(a)!", "Você entrou como " + r.user.name + ".", "success");
    goRoute("painel");
  }
  function doRegister() {
    clearErrors($("#registerForm"));
    var name = $("#regName").value.trim();
    var email = $("#regEmail").value;
    var p1 = $("#regPass").value, p2 = $("#regPass2").value;
    var ok = true;
    if (!name) { setError("regName", "Informe seu nome."); ok = false; }
    if (!isEmail(email)) { setError("regEmail", "Informe um e-mail válido."); ok = false; }
    if (p1.length < 8) { setError("regPass", "A senha deve ter ao menos 8 caracteres."); ok = false; }
    if (p1 !== p2) { setError("regPass2", "As senhas não conferem."); ok = false; }
    if (!ok) return;
    var r = registerUser(name, email, p1);
    if (!r.ok) { setError("regEmail", r.error); return; }
    var lr = loginUser(email, p1);
    if (lr.ok) startSession(lr.user);
    closeModal("modalAuth");
    $("#registerForm").reset();
    renderAll();
    toast("Conta criada", "Bem-vindo(a), " + name + "!", "success");
    goRoute("painel");
  }
  function doForgot() {
    clearErrors($("#forgotForm"));
    var email = $("#forgotEmail").value;
    if (!isEmail(email)) { setError("forgotEmail", "Informe um e-mail válido."); return; }
    var u = findUser(email);
    if (!u) { setError("forgotEmail", "Não encontramos uma conta com este e-mail."); return; }
    toast("Instruções enviadas", "Em um ambiente real, você receberia um link de redefinição. Como os dados ficam no navegador, use a senha cadastrada ou crie uma nova conta.", "success");
    $("#forgotForm").reset();
    switchAuthTab("login");
  }

  /* =======================================================================
     24. COOKIES
     ======================================================================= */
  function initCookies() {
    var pref = LS.get(K.cookies, null);
    if (!pref) {
      var banner = $("#cookieBanner");
      if (banner) banner.hidden = false;
    }
  }
  function acceptCookies(v) {
    LS.set(K.cookies, { value: v, at: Date.now() });
    var banner = $("#cookieBanner"); if (banner) banner.hidden = true;
    closeModal("modalCookies");
    toast("Preferência salva", v === "accept" ? "Obrigado! Você aceitou o uso de armazenamento local." : "Usaremos apenas o essencial.", "success");
  }

  /* =======================================================================
     25. LANDING (menu, reveal, contadores, planos, contato)
     ======================================================================= */
  function initLanding() {
    var toggle = $(".menu-toggle"), nav = $(".main-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      $$(".main-nav a").forEach(function (a) {
        a.addEventListener("click", function () { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); });
      });
    }

    // Reveal on scroll
    var reveals = $$(".reveal");
    if ("IntersectionObserver" in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("visible"); });
    }

    // Counters
    var counters = $$("[data-counter]");
    if (counters.length && "IntersectionObserver" in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          var target = toNum(el.getAttribute("data-counter"));
          var start = null, dur = 1100;
          function step(ts) {
            if (!start) start = ts;
            var p = Math.min(1, (ts - start) / dur);
            el.textContent = fmtNum(Math.round(target * p), 0);
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
          cio.unobserve(el);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (c) { cio.observe(c); });
    } else {
      counters.forEach(function (c) { c.textContent = fmtNum(toNum(c.getAttribute("data-counter")), 0); });
    }

    // Plans tabs
    $$("[data-plan-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var which = tab.getAttribute("data-plan-tab");
        $$("[data-plan-tab]").forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("active", on);
          if (t.hasAttribute("aria-selected")) t.setAttribute("aria-selected", on ? "true" : "false");
        });
        $$("[data-plan-group]").forEach(function (g) { g.hidden = g.getAttribute("data-plan-group") !== which; });
      });
    });

    // Contact form
    var cf = $("#contactForm");
    if (cf) {
      cf.addEventListener("submit", function (e) {
        e.preventDefault();
        clearErrors(cf);
        var name = $("#contactName").value.trim();
        var email = $("#contactEmail").value;
        var ok = true;
        if (!name) { setError("contactName", "Informe seu nome."); ok = false; }
        if (!isEmail(email)) { setError("contactEmail", "Informe um e-mail válido."); ok = false; }
        if (!ok) return;
        cf.reset();
        toast("Mensagem enviada", "Obrigado, " + name + "! Entraremos em contato em breve.", "success");
      });
    }

    // Year
    var y = $("#year"); if (y) y.textContent = String(new Date().getFullYear());
  }

  /* =======================================================================
     26. DELEGAÇÃO DE EVENTOS
     ======================================================================= */
  function bindEvents() {
    // Cliques globais
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-action], [data-route], [data-close-modal], [data-auth-tab], [data-cookie], [data-a11y], [data-product-edit], [data-product-del], [data-tx-edit], [data-tx-del], [data-acc-edit], [data-acc-del], [data-acc-paid], [data-goal-del], [data-module], [data-quiz-opt], [data-quiz-close], [data-plan-tab]");
      if (!t) return;

      var action = t.getAttribute("data-action");
      var route = t.getAttribute("data-route");
      var closeId = t.getAttribute("data-close-modal");
      var authTab = t.getAttribute("data-auth-tab");
      var cookie = t.getAttribute("data-cookie");
      var a11y = t.getAttribute("data-a11y");
      var val = t.getAttribute("data-value");

      if (closeId) { closeModal(closeId); return; }
      if (authTab && !action) { switchAuthTab(authTab); return; }
      if (cookie) { acceptCookies(cookie); return; }
      if (a11y) { handleA11y(a11y, val, t); return; }
      if (route) { e.preventDefault(); goRoute(route); return; }

      if (t.hasAttribute("data-product-edit")) return editProduct(t.getAttribute("data-product-edit"));
      if (t.hasAttribute("data-product-del")) return delProduct(t.getAttribute("data-product-del"));
      if (t.hasAttribute("data-tx-edit")) return editTransaction(t.getAttribute("data-tx-edit"));
      if (t.hasAttribute("data-tx-del")) return delTransaction(t.getAttribute("data-tx-del"));
      if (t.hasAttribute("data-acc-edit")) return editAccount(t.getAttribute("data-acc-edit"));
      if (t.hasAttribute("data-acc-del")) return delAccount(t.getAttribute("data-acc-del"));
      if (t.hasAttribute("data-acc-paid")) return toggleAccountPaid(t.getAttribute("data-acc-paid"));
      if (t.hasAttribute("data-goal-del")) return delGoal(t.getAttribute("data-goal-del"));
      if (t.hasAttribute("data-module")) return openModule(t.getAttribute("data-module"));
      if (t.hasAttribute("data-quiz-opt")) return answerQuiz(parseInt(t.getAttribute("data-quiz-opt"), 10));
      if (t.hasAttribute("data-quiz-close")) { var qc = $("#quizCard"); if (qc) qc.hidden = true; return; }

      switch (action) {
        case "open-app": e.preventDefault(); goRoute("painel"); break;
        case "go-home": e.preventDefault(); location.hash = "#/"; break;
        case "open-auth": openModal("modalAuth"); if (authTab) switchAuthTab(authTab); break;
        case "open-a11y": toggleA11yPanel(); break;
        case "logout": logout(); toast("Sessão encerrada", "Você saiu da sua conta.", "success"); break;
        case "clear-markup": var mf = $("#markupForm"); if (mf) mf.reset(); clearErrors(mf); var mr = $("#mkResult"); if (mr) { mr.className = "result-empty"; mr.innerHTML = "<p>Preencha os campos e clique em <strong>Calcular preço</strong> para ver o resultado.</p>"; } state.lastCalc = null; break;
        case "save-calc": saveCalcToProducts(); break;
        case "reset-product": resetProductForm(); break;
        case "reset-tx": resetTxForm(); break;
        case "reset-acc": resetAccForm(); break;
        case "export-tx": exportTransactions(); break;
        case "export-products": exportProducts(); break;
        case "export-report": exportReport(); break;
        case "export-all": exportAll(); break;
        case "import-all": var fi = $("#importFile"); if (fi) fi.click(); break;
        case "clear-data": clearData(); break;
        case "print-report": window.print(); break;
        case "calc-cw": calcCW(); break;
        case "calc-tm": calcTM(); break;
        case "calc-cm": calcCM(); break;
        case "calc-pm": calcPM(); break;
        case "calc-be": calcBE(); break;
        case "calc-scenario": calcScenario(); break;
        case "plan-free": openModal("modalAuth"); switchAuthTab("register"); toast("Plano Free", "Crie sua conta para começar gratuitamente.", "success"); break;
        case "plan-pro": openModal("modalAuth"); switchAuthTab("register"); toast("Plano Pro", "Crie sua conta e ative o Pro quando estiver disponível.", "success"); break;
      }
    });

    // Sidebar
    var st = $("#sidebarToggle"); if (st) st.addEventListener("click", openSidebar);
    var sc = $("#sidebarClose"); if (sc) sc.addEventListener("click", closeSidebar);
    var sb = $("#sidebarBackdrop"); if (sb) sb.addEventListener("click", closeSidebar);

    // a11y fab / panel
    var fab = $("#a11yFab"); if (fab) fab.addEventListener("click", toggleA11yPanel);
    var ac = $("#a11yClose"); if (ac) ac.addEventListener("click", function () { toggleA11yPanel(false); });

    // Read aloud bar
    var rp = $("#readPause"); if (rp) rp.addEventListener("click", pauseRead);
    var rr = $("#readResume"); if (rr) rr.addEventListener("click", resumeRead);
    var rs = $("#readStop"); if (rs) rs.addEventListener("click", stopRead);

    // Forms
    var mf2 = $("#markupForm"); if (mf2) mf2.addEventListener("submit", function (e) { e.preventDefault(); runCalc(); });
    var pf = $("#productForm"); if (pf) pf.addEventListener("submit", function (e) { e.preventDefault(); saveProduct(); });
    var tf = $("#txForm"); if (tf) tf.addEventListener("submit", function (e) { e.preventDefault(); saveTransaction(); });
    var af = $("#accForm"); if (af) af.addEventListener("submit", function (e) { e.preventDefault(); saveAccount(); });
    var gf = $("#goalForm"); if (gf) gf.addEventListener("submit", function (e) { e.preventDefault(); saveGoal(); });
    var lf = $("#loginForm"); if (lf) lf.addEventListener("submit", function (e) { e.preventDefault(); doLogin(); });
    var rf = $("#registerForm"); if (rf) rf.addEventListener("submit", function (e) { e.preventDefault(); doRegister(); });
    var ff = $("#forgotForm"); if (ff) ff.addEventListener("submit", function (e) { e.preventDefault(); doForgot(); });
    var chf = $("#chatForm"); if (chf) chf.addEventListener("submit", function (e) { e.preventDefault(); var inp = $("#chatInput"); sendChat(inp.value); inp.value = ""; });

    // Password strength
    var rp2 = $("#regPass");
    if (rp2) rp2.addEventListener("input", function () {
      var s = passwordStrength(rp2.value);
      var bar = $("#strengthBar"), lab = $("#strengthLabel");
      if (bar) { bar.style.width = s.pct + "%"; bar.style.background = s.color; }
      if (lab) { lab.textContent = "Força da senha: " + s.label; lab.style.color = s.color; }
    });

    // Chat quick prompts
    $$("#chatQuick button").forEach(function (b) {
      b.addEventListener("click", function () { sendChat(b.getAttribute("data-prompt")); });
    });

    // Search / filters
    var ps = $("#prodSearch"); if (ps) ps.addEventListener("input", debounce(renderProducts, 180));
    var txs = $("#txSearch"); if (txs) txs.addEventListener("input", debounce(renderTransactions, 180));
    var tft = $("#txFilterType"); if (tft) tft.addEventListener("change", renderTransactions);

    // Import file
    var imp = $("#importFile");
    if (imp) imp.addEventListener("change", function () { if (imp.files && imp.files[0]) importAll(imp.files[0]); imp.value = ""; });

    // Confirm modal
    var ck = $("#confirmOk"); if (ck) ck.addEventListener("click", function () { var cb = confirmCb; closeModal("modalConfirm"); confirmCb = null; if (cb) cb(); });
    var cc = $("#confirmCancel"); if (cc) cc.addEventListener("click", function () { closeModal("modalConfirm"); confirmCb = null; });

    // ESC fecha modais/painel
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeModal("modalAuth"); closeModal("modalConfirm"); closeModal("modalCookies");
        toggleA11yPanel(false); closeSidebar();
      }
    });

    // Router
    window.addEventListener("hashchange", handleRoute);
  }

  function handleA11y(kind, val, btn) {
    if (kind === "theme") setSetting("theme", val === "dark" ? "dark" : "light");
    else if (kind === "contrast") setSetting("contrast", val === "high" ? "high" : "normal");
    else if (kind === "font") setSetting("font", String(val || "1"));
    else if (kind === "reading") setSetting("reading", !state.settings.reading);
    else if (kind === "motion") setSetting("motion", !state.settings.motion);
    else if (kind === "readaloud") { if (speech.active) stopRead(); else readAloud(); }
    if (btn && btn.hasAttribute("aria-pressed") && kind !== "readaloud") {
      // syncA11yButtons já ajusta; nada extra
    }
  }

  function toggleA11yPanel(force) {
    var p = $("#a11yPanel"), f = $("#a11yFab");
    if (!p) return;
    var open = typeof force === "boolean" ? force : p.hidden;
    p.hidden = !open;
    if (f) f.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* =======================================================================
     27. PWA
     ======================================================================= */
  function initPWA() {
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      });
    }
  }

  /* =======================================================================
     28. INIT
     ======================================================================= */
  function init() {
    loadSettings();
    restoreSession();
    loadData();
    applySettings();

    // Datas padrão
    var td = $("#txDate"); if (td && !td.value) td.value = todayISO();
    var ad = $("#accDue"); if (ad && !ad.value) ad.value = todayISO();

    initLanding();
    bindEvents();
    initCookies();
    initPWA();

    // Mensagem inicial do assistente
    var log = $("#chatLog");
    if (log && !log.children.length) {
      pushMsg("bot", "Olá! Sou o assistente da Resoluta. Posso explicar markup, fluxo de caixa, capital de giro, ponto de equilíbrio e analisar sua situação financeira. Como posso ajudar?");
    }

    handleRoute();
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
