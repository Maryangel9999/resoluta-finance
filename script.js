/* Resoluta Finance — Supabase Auth + PWA
   Compatível com GitHub Pages (https://maryangel9999.github.io/resoluta-finance/) */
(function () {
  'use strict';

  /* =====================================================================
     CONFIGURAÇÃO — é AQUI que você coloca a Publishable Key do Supabase
     (Supabase → Project Settings → API Keys → "Publishable key", sb_publishable_...)
     Use SOMENTE a Publishable (ou a antiga "anon"). NUNCA a Secret / service_role.
     ===================================================================== */
  var CONFIG = {
    SUPABASE_URL: 'https://rflziflcxmfvetobdqyk.supabase.co',
    SUPABASE_KEY: 'COLE_AQUI_SUA_PUBLISHABLE_KEY',
    SITE_URL: 'https://maryangel9999.github.io/resoluta-finance/', // destino dos links dos e-mails
    MAX_TRIES: 3,          // tentativas erradas antes de bloquear
    LOCK_MIN: 15,          // minutos de bloqueio
    MIN_SCORE: 3,          // 3 = "Forte" (mínimo exigido ao criar/trocar senha)
    RESET_COOLDOWN_S: 60   // intervalo entre pedidos de recuperação
  };

  var $ = function (id) { return document.getElementById(id); };
  var client = null;
  var recovery = false;   // true enquanto o usuário redefine a senha pelo link do e-mail

  /* ---------- utilidades ---------- */
  function norm(e) { return String(e || '').trim().toLowerCase(); }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
  function setMsg(el, text, type) {
    if (!text) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = text; el.className = 'msg ' + (type || 'info'); el.hidden = false;
  }
  function busy(btn, on, label) {
    if (on) { btn.dataset.l = btn.textContent; btn.textContent = label || 'Aguarde…'; }
    else if (btn.dataset.l) { btn.textContent = btn.dataset.l; }
    btn.disabled = on;
  }
  var VIEWS = ['view-loading', 'view-auth', 'view-reset', 'view-app'];
  function show(name) {
    VIEWS.forEach(function (v) { $(v).hidden = (v !== name); });
    $('who').hidden = (name !== 'view-app');
    window.scrollTo(0, 0);
  }

  /* ---------- medidor de senha forte/fraca ---------- */
  var COMMON = ['123456', '12345678', '123456789', 'senha', 'senha123', 'password', 'qwerty', 'abc123',
                '111111', '000000', 'admin', 'resoluta', 'iloveyou', '123123', 'brasil', '102030'];
  var LEVELS = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
  var COLORS = ['#c62828', '#e64a19', '#e69500', '#7cb342', '#2e7d32'];
  function strength(pw, email) {
    if (!pw) return { score: 0, tips: [] };
    var low = pw.toLowerCase(), tips = [], s = 0, user = (email || '').split('@')[0];
    if (COMMON.some(function (c) { return low.indexOf(c) > -1; })) return { score: 1, tips: ['Evite sequências e senhas comuns'] };
    if (user.length >= 3 && low.indexOf(user) > -1) return { score: 1, tips: ['Não use seu e-mail na senha'] };
    if (pw.length >= 8) s++; else tips.push('Use 8 ou mais caracteres');
    if (pw.length >= 12) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++; else tips.push('Misture maiúsculas e minúsculas');
    if (/\d/.test(pw)) s++; else tips.push('Adicione números');
    if (/[^A-Za-z0-9]/.test(pw)) s++; else tips.push('Adicione símbolos (!@#$)');
    if (/(.)\1{2,}/.test(pw)) { s--; tips.push('Evite repetir o mesmo caractere'); }
    if (pw.length < 8) s = Math.min(s, 1);
    return { score: Math.max(0, Math.min(4, s)), tips: tips };
  }
  function bindMeter(pwId, emailId, barId, txtId) {
    var pw = $(pwId), em = emailId ? $(emailId) : null, bar = $(barId), txt = $(txtId);
    function update() {
      var r = strength(pw.value, em ? norm(em.value) : '');
      bar.style.width = pw.value ? ((r.score + 1) * 20) + '%' : '0';
      bar.style.background = COLORS[r.score];
      txt.textContent = '';
      if (pw.value) {
        var b = document.createElement('b');
        b.style.color = COLORS[r.score]; b.textContent = LEVELS[r.score];
        txt.appendChild(b);
        if (r.tips.length) txt.appendChild(document.createTextNode(' · ' + r.tips[0]));
      }
    }
    pw.addEventListener('input', update);
    if (em) em.addEventListener('input', update);
  }

  /* ---------- bloqueio após 3 tentativas incorretas ----------
     1) Local (localStorage): funciona sempre, mas pode ser burlado por quem sabe usar o DevTools.
     2) Servidor (funções SQL do arquivo supabase-lockout.sql): compartilhado entre aparelhos.
        Se o SQL não foi executado, o código ignora e usa só o bloqueio local. */
  var LK = 'rf_lock', lockTimer = null;
  function lget() { try { return JSON.parse(localStorage.getItem(LK)) || {}; } catch (e) { return {}; } }
  function lset(o) { try { localStorage.setItem(LK, JSON.stringify(o)); } catch (e) {} }
  function localLockMs(email) { var l = lget()[email]; return l && l.until > Date.now() ? l.until - Date.now() : 0; }
  function localFail(email) {
    var o = lget(), l = o[email] || { n: 0, until: 0 };
    if (l.until && l.until <= Date.now()) l = { n: 0, until: 0 };
    l.n++;
    if (l.n >= CONFIG.MAX_TRIES) l = { n: 0, until: Date.now() + CONFIG.LOCK_MIN * 60000 };
    o[email] = l; lset(o); return l;
  }
  function localClear(email) { var o = lget(); delete o[email]; lset(o); }
  function rpc(fn, args) {
    return client.rpc(fn, args).then(function (r) { return r.error ? null : r.data; }, function () { return null; });
  }
  function startLock(untilTs) {
    var btn = $('btn-login'), box = $('auth-msg');
    clearInterval(lockTimer);
    function tick() {
      var s = Math.ceil((untilTs - Date.now()) / 1000);
      if (s <= 0) { clearInterval(lockTimer); btn.disabled = false; setMsg(box, '', ''); return; }
      btn.disabled = true;
      var mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
      setMsg(box, 'Muitas tentativas incorretas. Acesso bloqueado. Tente novamente em ' + mm + ':' + ss + '.', 'err');
    }
    tick(); lockTimer = setInterval(tick, 1000);
  }

  /* ---------- telas Entrar / Cadastrar / Esqueci ---------- */
  function panel(name) {
    ['login', 'register', 'forgot'].forEach(function (p) { $('form-' + p).hidden = (p !== name); });
    $('tabs').hidden = (name === 'forgot');
    [].forEach.call($('tabs').querySelectorAll('button'), function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    if (!lockTimer) setMsg($('auth-msg'), '', '');
    var first = $('form-' + name).querySelector('input'); if (first) setTimeout(function () { first.focus(); }, 30);
  }

  /* ---------- LOGIN ---------- */
  function isBadCreds(err) {
    return err.code === 'invalid_credentials' || /invalid login credentials/i.test(err.message || '');
  }
  async function onLogin(ev) {
    ev.preventDefault();
    var box = $('auth-msg'), btn = $('btn-login'), email = norm($('l-email').value), pw = $('l-pw').value;
    clearInterval(lockTimer); lockTimer = null; setMsg(box, '', '');
    if (!validEmail(email) || !pw) return setMsg(box, 'Informe e-mail e senha.', 'err');
    busy(btn, true, 'Entrando…');

    var ms = localLockMs(email);
    if (!ms) { var st = await rpc('login_lock_status', { p_email: email }); if (st && st.locked) ms = st.seconds * 1000; }
    if (ms > 0) { busy(btn, false); return startLock(Date.now() + ms); }

    var r;
    try { r = await client.auth.signInWithPassword({ email: email, password: pw }); }
    catch (e) { r = { error: { message: 'network' } }; }

    if (r.error) {
      if (isBadCreds(r.error)) {
        var l = localFail(email), sv = await rpc('login_failed', { p_email: email });
        var lockMs = Math.max(localLockMs(email), sv && sv.locked ? sv.seconds * 1000 : 0);
        busy(btn, false);
        if (lockMs > 0) return startLock(Date.now() + lockMs);
        var left = Math.min(CONFIG.MAX_TRIES - l.n, sv && typeof sv.remaining === 'number' ? sv.remaining : CONFIG.MAX_TRIES);
        return setMsg(box, 'E-mail ou senha incorretos. Restam ' + left + ' tentativa(s).', 'err');
      }
      busy(btn, false);
      if (/confirm/i.test(r.error.message || '')) return setMsg(box, 'Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada ou no spam.', 'err');
      return setMsg(box, 'Não foi possível entrar. Verifique sua conexão e tente novamente.', 'err');
    }
    localClear(email);
    rpc('login_reset', {});          // zera o contador no servidor (se existir)
    $('l-pw').value = '';
    busy(btn, false);                // a troca de tela é feita pelo onAuthStateChange
  }

  /* ---------- CADASTRO ---------- */
  async function onRegister(ev) {
    ev.preventDefault();
    var box = $('auth-msg'), btn = $('btn-register');
    var name = $('r-name').value.trim(), email = norm($('r-email').value), pw = $('r-pw').value;
    setMsg(box, '', '');
    if (name.length < 2) return setMsg(box, 'Informe seu nome.', 'err');
    if (!validEmail(email)) return setMsg(box, 'E-mail inválido.', 'err');
    if (strength(pw, email).score < CONFIG.MIN_SCORE) return setMsg(box, 'Senha fraca demais. Alcance ao menos o nível "Forte".', 'err');
    busy(btn, true, 'Criando conta…');
    var r;
    try {
      r = await client.auth.signUp({ email: email, password: pw,
        options: { data: { full_name: name }, emailRedirectTo: CONFIG.SITE_URL } });
    } catch (e) { r = { error: { message: 'network' } }; }
    busy(btn, false);
    if (r.error) {
      if (/at least|weak|short/i.test(r.error.message || '')) return setMsg(box, 'A senha não atende aos requisitos de segurança.', 'err');
      if (/rate|too many|seconds/i.test(r.error.message || '')) return setMsg(box, 'Muitas solicitações. Aguarde alguns minutos e tente de novo.', 'err');
      return setMsg(box, 'Não foi possível criar a conta. Verifique sua conexão e tente novamente.', 'err');
    }
    if (r.data && r.data.session) { $('r-pw').value = ''; return; }   // confirmação de e-mail desativada: já entra
    /* Mensagem neutra: não revela se o e-mail já existe */
    $('form-register').reset(); $('r-bar').style.width = '0'; $('r-meter-txt').textContent = '';
    panel('login');
    setMsg(box, 'Quase lá! Se o e-mail for válido, enviamos um link de confirmação. Se você já tem conta, use "Entrar" ou "Esqueci minha senha".', 'ok');
  }

  /* ---------- RECUPERAÇÃO DE SENHA ---------- */
  async function onForgot(ev) {
    ev.preventDefault();
    var box = $('auth-msg'), btn = $('btn-forgot'), email = norm($('f-email').value);
    setMsg(box, '', '');
    if (!validEmail(email)) return setMsg(box, 'Informe um e-mail válido.', 'err');
    var last = Number(sessionStorage.getItem('rf_reset_ts') || 0), wait = CONFIG.RESET_COOLDOWN_S * 1000 - (Date.now() - last);
    if (wait > 0) return setMsg(box, 'Aguarde ' + Math.ceil(wait / 1000) + 's para pedir outro link.', 'err');
    busy(btn, true, 'Enviando…');
    var r;
    try { r = await client.auth.resetPasswordForEmail(email, { redirectTo: CONFIG.SITE_URL }); }
    catch (e) { r = { error: { message: 'network' } }; }
    busy(btn, false);
    if (r.error && /rate|too many|seconds/i.test(r.error.message || '')) return setMsg(box, 'Limite de e-mails atingido. Tente novamente mais tarde.', 'err');
    if (r.error && r.error.message === 'network') return setMsg(box, 'Sem conexão. Tente novamente.', 'err');
    sessionStorage.setItem('rf_reset_ts', String(Date.now()));
    setMsg(box, 'Se este e-mail tiver conta, enviamos um link para criar uma nova senha. Confira também o spam.', 'ok');
  }

  /* Tela "nova senha" (aberta pelo link do e-mail) */
  async function onReset(ev) {
    ev.preventDefault();
    var box = $('reset-msg'), btn = $('btn-reset'), pw = $('n-pw').value, pw2 = $('n-pw2').value;
    setMsg(box, '', '');
    if (pw !== pw2) return setMsg(box, 'As senhas não coincidem.', 'err');
    var u = (await client.auth.getUser()).data.user;
    if (strength(pw, u ? norm(u.email) : '').score < CONFIG.MIN_SCORE) return setMsg(box, 'Senha fraca demais. Alcance ao menos o nível "Forte".', 'err');
    busy(btn, true, 'Salvando…');
    var r = await client.auth.updateUser({ password: pw });
    busy(btn, false);
    if (r.error) {
      var m = /same|different/i.test(r.error.message || '') ? 'Use uma senha diferente da anterior.' :
              /expired|session|jwt/i.test(r.error.message || '') ? 'O link expirou. Peça um novo em "Esqueci minha senha".' :
              'Não foi possível salvar a nova senha. Tente novamente.';
      return setMsg(box, m, 'err');
    }
    recovery = false; $('form-reset').reset();
    enterApp(r.data.user);
  }

  /* ---------- LOGOUT ---------- */
  async function logout() {
    try { await client.auth.signOut(); } catch (e) {}
    recovery = false; show('view-auth'); panel('login');
  }

  /* ---------- área logada ---------- */
  function enterApp(user) {
    if (!user) return;
    var meta = user.user_metadata || {};
    var name = meta.full_name || (user.email || '').split('@')[0] || 'usuário';
    $('app-name').textContent = name.split(' ')[0];
    $('who-name').textContent = name.split(' ')[0];
    $('app-email').textContent = user.email || '';
    /* Para o resto do site: use window.ResolutaApp.client (Supabase) e .user (usuário logado) */
    window.ResolutaApp = { client: client, user: user };
    show('view-app');
  }

  /* ---------- erros vindos do link do e-mail (ex.: link expirado) ---------- */
  function readUrlError() {
    var h = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    var q = new URLSearchParams(location.search);
    var code = h.get('error_code') || q.get('error_code');
    if (!code) return null;
    return code === 'otp_expired' ? 'O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".'
                                  : 'Não foi possível validar o link. Tente novamente.';
  }

  /* ---------- PWA: service worker + instalação (Android e iOS) ---------- */
  function setupPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).catch(function () {});
      });
    }
    var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    var dismissed = false; try { dismissed = !!localStorage.getItem('rf_install_off'); } catch (e) {}
    if (standalone || dismissed) return;
    var ua = navigator.userAgent;
    var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var box = $('install'), deferred = null;
    function open(text, canInstall) {
      $('install-text').innerHTML = text;
      $('install-yes').hidden = !canInstall; box.hidden = false;
    }
    $('install-no').onclick = function () { box.hidden = true; try { localStorage.setItem('rf_install_off', '1'); } catch (e) {} };
    $('install-yes').onclick = function () { if (deferred) { box.hidden = true; deferred.prompt(); deferred = null; } };
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); deferred = e;
      setTimeout(function () { open('Acesse como aplicativo, com abertura mais rápida.', true); }, 4000);
    });
    window.addEventListener('appinstalled', function () { box.hidden = true; });
    if (ios) setTimeout(function () {
      open('No Safari, toque em <b>Compartilhar</b> (ícone ⬆︎) e depois em <b>Adicionar à Tela de Início</b>.', false);
    }, 5000);
  }

  /* ---------- início ---------- */
  function wire() {
    [].forEach.call($('tabs').querySelectorAll('button'), function (b) { b.onclick = function () { panel(b.dataset.tab); }; });
    $('go-forgot').onclick = function () { panel('forgot'); };
    $('back-login').onclick = function () { panel('login'); };
    $('form-login').addEventListener('submit', onLogin);
    $('form-register').addEventListener('submit', onRegister);
    $('form-forgot').addEventListener('submit', onForgot);
    $('form-reset').addEventListener('submit', onReset);
    $('btn-logout').onclick = logout; $('btn-logout-top').onclick = logout;
    [].forEach.call(document.querySelectorAll('[data-eye]'), function (b) {
      b.onclick = function () {
        var i = $(b.dataset.eye), s = i.type === 'password';
        i.type = s ? 'text' : 'password'; b.textContent = s ? 'Ocultar' : 'Mostrar';
      };
    });
    bindMeter('r-pw', 'r-email', 'r-bar', 'r-meter-txt');
    bindMeter('n-pw', null, 'n-bar', 'n-meter-txt');
    function net() { $('offline-bar').hidden = navigator.onLine; }
    window.addEventListener('online', net); window.addEventListener('offline', net); net();
  }

  function start() {
    wire(); setupPWA();
    var urlErr = readUrlError();

    if (!window.supabase || !window.supabase.createClient) {
      show('view-auth');
      return setMsg($('auth-msg'), 'Não foi possível carregar o serviço de login. Verifique sua conexão e recarregue a página.', 'err');
    }
    if (CONFIG.SUPABASE_KEY.indexOf('COLE_AQUI') === 0) {
      show('view-auth');
      return setMsg($('auth-msg'), 'Configuração pendente: cole a Publishable Key do Supabase em script.js (CONFIG.SUPABASE_KEY).', 'err');
    }
    client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    /* Importante: não use "await" do Supabase dentro deste callback (risco de travar). */
    client.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY') { recovery = true; show('view-reset'); return; }
      if (event === 'SIGNED_OUT') { recovery = false; show('view-auth'); return; }
      if (recovery) return;                       // mantém a tela de nova senha
      if (session) setTimeout(function () { enterApp(session.user); }, 0);
      else show('view-auth');
    });
    client.auth.getSession().then(function (r) {
      if (!$('view-loading').hidden) {
        if (r.data.session && !recovery) enterApp(r.data.session.user); else if (!recovery) show('view-auth');
      }
      if (urlErr) { show('view-auth'); setMsg($('auth-msg'), urlErr, 'err'); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
