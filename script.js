(function () {
'use strict';
var KEY = 'resoluta.v1';
var $ = function (id) { return document.getElementById(id); };
var S = load();

function load() {
  var d = { ini: 0, lanc: [], prod: [], cfg: { tema: 'claro', contraste: 0, leitura: 0, anim: 1, fonte: 100, cookie: 0 } };
  try {
    var r = JSON.parse(localStorage.getItem(KEY));
    if (r) { d.ini = r.ini || 0; d.lanc = r.lanc || []; d.prod = r.prod || []; Object.assign(d.cfg, r.cfg || {}); }
  } catch (e) { /* armazenamento indisponível ou corrompido */ }
  return d;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { toast('Não foi possível salvar os dados neste navegador.'); return false; }
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function brl(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function dt(s) { return s ? s.split('-').reverse().join('/') : '—'; }
function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function toast(m) { var t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 3000); }
function msg(id, text, ok) { var e = $(id); e.textContent = text; e.className = 'msg ' + (ok ? 'ok' : 'bad'); }
function num(id) { var v = $(id).value; return v === '' ? NaN : parseFloat(v); }

/* ---------- Navegação ---------- */
var pages = ['inicio', 'sobre', 'painel', 'calculadora', 'produtos', 'lancamentos', 'aprenda', 'contato', 'config', 'privacidade', 'cookies', 'termos'];
function route() {
  var h = (location.hash || '#inicio').slice(1);
  if (pages.indexOf(h) < 0) h = 'inicio';
  pages.forEach(function (p) { $('p-' + p).hidden = p !== h; });
  document.querySelectorAll('nav a').forEach(function (a) {
    if (a.getAttribute('href') === '#' + h) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = $('p-' + h).querySelector('h1').textContent + ' · Resoluta AGI';
  $('nav').classList.remove('open'); $('menuBtn').setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0); $('main').focus();
  if (h === 'painel') renderPainel();
  if (h === 'produtos') renderProd();
  if (h === 'lancamentos') renderLanc();
}
window.addEventListener('hashchange', route);
$('menuBtn').onclick = function () { var o = $('nav').classList.toggle('open'); this.setAttribute('aria-expanded', o); };

/* ---------- Lançamentos ---------- */
function status(l) {
  if (l.sit === 'realizado') return 'realizado';
  return l.venc && l.venc < today() ? 'vencido' : 'pendente';
}
function statusTxt(l) {
  var s = status(l);
  if (s === 'realizado') return l.tipo === 'receita' ? 'Recebido' : 'Pago';
  return s === 'vencido' ? 'Vencido' : 'Pendente (previsto)';
}
$('fLanc').onsubmit = function (e) {
  e.preventDefault();
  var f = { desc: $('lDesc').value.trim(), tipo: $('lTipo').value, cat: $('lCat').value.trim(), valor: num('lValor'), venc: $('lVenc').value, sit: $('lSit').value, pag: $('lPag').value, forma: $('lForma').value.trim(), obs: $('lObs').value.trim() };
  if (!f.desc || !f.cat) return msg('lMsg', 'Preencha descrição e categoria.', false);
  if (!(f.valor > 0)) return msg('lMsg', 'Informe um valor maior que zero.', false);
  if (!f.venc) return msg('lMsg', 'Informe a data de vencimento.', false);
  if (f.sit === 'realizado' && !f.pag) f.pag = today();
  if (f.sit === 'pendente') f.pag = '';
  var id = $('lId').value;
  if (!id && S.lanc.some(function (l) { return l.desc === f.desc && l.valor === f.valor && l.venc === f.venc && l.tipo === f.tipo; }))
    return msg('lMsg', 'Lançamento duplicado: já existe um igual (mesma descrição, valor, tipo e vencimento).', false);
  if (id) { var i = S.lanc.findIndex(function (l) { return l.id === id; }); f.id = id; S.lanc[i] = f; }
  else { f.id = uid(); f.criado = today(); S.lanc.push(f); }
  if (save()) { msg('lMsg', 'Lançamento salvo com sucesso.', true); resetL(); renderLanc(); }
};
function resetL() { $('fLanc').reset(); $('lId').value = ''; }
$('lCancel').onclick = function () { resetL(); msg('lMsg', '', true); };
function filtrados() {
  var q = $('lBusca').value.toLowerCase(), t = $('lFTipo').value, s = $('lFSit').value;
  return S.lanc.filter(function (l) {
    return (!q || (l.desc + ' ' + l.cat).toLowerCase().indexOf(q) >= 0) && (!t || l.tipo === t) && (!s || status(l) === s);
  }).sort(function (a, b) { return a.venc < b.venc ? -1 : 1; });
}
function renderLanc() {
  var L = filtrados();
  $('lTb').innerHTML = L.map(function (l) {
    return '<tr><td>' + dt(l.venc) + '</td><td>' + esc(l.desc) + '</td><td>' + (l.tipo === 'receita' ? 'Receita' : 'Despesa') + '</td><td>' + esc(l.cat) + '</td><td>' + brl(l.valor) + '</td><td>' + statusTxt(l) + '</td><td><button class="btn ghost" data-ed="' + l.id + '" aria-label="Editar ' + esc(l.desc) + '">Editar</button><button class="btn danger" data-del="' + l.id + '" aria-label="Excluir ' + esc(l.desc) + '">Excluir</button></td></tr>';
  }).join('');
  $('lVazio').hidden = L.length > 0;
}
$('lTb').onclick = function (e) {
  var ed = e.target.dataset.ed, del = e.target.dataset.del;
  if (ed) {
    var l = S.lanc.find(function (x) { return x.id === ed; });
    $('lId').value = l.id; $('lDesc').value = l.desc; $('lTipo').value = l.tipo; $('lCat').value = l.cat; $('lValor').value = l.valor; $('lVenc').value = l.venc; $('lSit').value = l.sit; $('lPag').value = l.pag; $('lForma').value = l.forma; $('lObs').value = l.obs;
    $('lDesc').focus(); window.scrollTo(0, 0);
  }
  if (del && confirm('Excluir este lançamento definitivamente?')) {
    S.lanc = S.lanc.filter(function (x) { return x.id !== del; });
    if (save()) { renderLanc(); toast('Lançamento excluído.'); }
  }
};
['lBusca', 'lFTipo', 'lFSit'].forEach(function (id) { $(id).oninput = renderLanc; });
function download(name, text, type) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
$('lCsv').onclick = function () {
  var L = filtrados();
  if (!L.length) return toast('Não há lançamentos para exportar.');
  var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  var rows = [['Vencimento', 'Descricao', 'Tipo', 'Categoria', 'Valor', 'Situacao', 'Pagamento/Recebimento', 'Forma', 'Observacoes']].concat(L.map(function (l) {
    return [l.venc, l.desc, l.tipo, l.cat, l.valor.toFixed(2).replace('.', ','), statusTxt(l), l.pag, l.forma, l.obs];
  }));
  download('lancamentos.csv', '\ufeff' + rows.map(function (r) { return r.map(q).join(';'); }).join('\r\n'), 'text/csv;charset=utf-8');
};

/* ---------- Painel ---------- */
function renderPainel() {
  $('saldoIni').value = S.ini;
  var de = $('pDe').value, ate = $('pAte').value;
  var inR = function (d) { return d && (!de || d >= de) && (!ate || d <= ate); };
  var rec = 0, desp = 0, aRec = 0, aPag = 0;
  S.lanc.forEach(function (l) {
    if (l.sit === 'realizado') { if (inR(l.pag)) { if (l.tipo === 'receita') rec += l.valor; else desp += l.valor; } }
    else if (inR(l.venc)) { if (l.tipo === 'receita') aRec += l.valor; else aPag += l.valor; }
  });
  var real = S.ini + rec - desp, proj = real + aRec - aPag;
  $('painelVazio').hidden = S.lanc.length > 0;
  $('qtdProd').textContent = S.prod.length;
  var k = [['Saldo inicial', S.ini], ['Receitas recebidas', rec], ['Despesas pagas', desp], ['Resultado do período (realizado)', rec - desp], ['Saldo realizado', real], ['A receber (previsto)', aRec], ['A pagar (previsto)', aPag], ['Saldo projetado', proj]];
  $('kpis').innerHTML = k.map(function (x) { return '<article class="card"><h2>' + x[0] + '</h2><p class="v">' + brl(x[1]) + '</p></article>'; }).join('');
  var bars = [['Recebido', rec, 0], ['Pago', desp, 0], ['A receber', aRec, 0], ['A pagar', aPag, 0]];
  var max = Math.max.apply(null, bars.map(function (b) { return b[1]; }).concat([1]));
  $('grafico').innerHTML = bars.map(function (b) { return '<div class="bar"><span>' + brl(b[1]) + '</span><i style="height:' + Math.round(b[1] / max * 130) + 'px"></i><span>' + b[0] + '</span></div>'; }).join('');
  $('grafico').setAttribute('aria-label', 'Gráfico de barras: recebido, pago, a receber e a pagar');
  $('graficoTxt').textContent = 'Descrição do gráfico: recebido ' + brl(rec) + '; pago ' + brl(desp) + '; a receber ' + brl(aRec) + '; a pagar ' + brl(aPag) + '.' + (proj < 0 ? ' Atenção: o saldo projetado é negativo, indicando possível falta de caixa.' : '');
}
$('saldoIni').onchange = function () { S.ini = parseFloat(this.value) || 0; save(); renderPainel(); };
$('pDe').onchange = $('pAte').onchange = renderPainel;
$('limpaPeriodo').onclick = function () { $('pDe').value = ''; $('pAte').value = ''; renderPainel(); };

/* ---------- Calculadora ---------- */
var ultimo = null;
function calc(e) {
  e.preventDefault();
  var nome = $('cNome').value.trim(), c = num('cCusto'), v = num('cVar'), fx = num('cFix'), lu = num('cLucro'), q = num('cQtd'), pp = num('cPreco');
  ultimo = null; $('cSalva').disabled = true; $('cRes').innerHTML = '';
  if (!nome) return msg('cMsg', 'Informe o nome do produto ou serviço.', false);
  if ([c, v, fx, lu].some(isNaN) || c < 0 || v < 0 || fx < 0 || lu < 0) return msg('cMsg', 'Preencha custo, despesas variáveis, fixas e lucro com valores válidos (não negativos).', false);
  if (v > 100 || fx > 100 || lu > 100) return msg('cMsg', 'Percentuais não podem passar de 100%.', false);
  var div = 1 - (v + fx + lu) / 100;
  if (div <= 0) return msg('cMsg', 'Cálculo bloqueado: a soma dos percentuais (' + (v + fx + lu).toFixed(2) + '%) é 100% ou mais, então o divisor fica ' + div.toFixed(2) + '. Reduza algum percentual.', false);
  var mult = 1 / div, sug = c / div;
  var cards = [['Markup divisor', div.toFixed(4)], ['Markup multiplicador', mult.toFixed(4)], ['Preço de venda sugerido', brl(sug)]];
  if (!isNaN(pp) && pp > 0) {
    cards.push(['Preço praticado', brl(pp)]);
    if (!isNaN(q) && q > 0) {
      var vendas = pp * q, custo = c * q, bruto = vendas - custo, dv = vendas * v / 100, df = vendas * fx / 100, liq = bruto - dv - df;
      cards.push(['Quantidade vendida', q], ['Total das vendas', brl(vendas)], ['Custo dos itens vendidos', brl(custo)], ['Lucro bruto', brl(bruto)], ['Despesas variáveis (estimadas)', brl(dv)], ['Despesas fixas (estimadas)', brl(df)], ['Lucro líquido estimado', brl(liq)], ['Margem líquida resultante', (liq / vendas * 100).toFixed(2) + '%']);
    } else cards.push(['Observação', 'Informe a quantidade vendida para ver lucro bruto e líquido estimado.']);
  } else cards.push(['Observação', 'Informe o preço praticado e a quantidade para comparar com o resultado real.']);
  $('cRes').innerHTML = cards.map(function (x) { return '<article class="card"><h2>' + x[0] + '</h2><p class="v">' + esc(x[1]) + '</p></article>'; }).join('');
  ultimo = { nome: nome, custo: c, preco: Math.round(sug * 100) / 100 };
  $('cSalva').disabled = false;
  msg('cMsg', 'Cálculo realizado. Resultado é uma estimativa.', true);
}
$('fCalc').onsubmit = calc;
$('cLimpa').onclick = function () { $('fCalc').reset(); $('cRes').innerHTML = ''; msg('cMsg', '', true); $('cSalva').disabled = true; ultimo = null; };
$('cSalva').onclick = function () {
  if (!ultimo) return;
  S.prod.push({ id: uid(), nome: ultimo.nome, cat: '', desc: 'Criado pela calculadora', custo: ultimo.custo, preco: ultimo.preco, qtd: '', criado: today() });
  if (save()) { toast('Produto salvo com preço sugerido.'); location.hash = '#produtos'; }
};

/* ---------- Produtos ---------- */
$('fProd').onsubmit = function (e) {
  e.preventDefault();
  var p = { nome: $('prNome').value.trim(), cat: $('prCat').value.trim(), desc: $('prDesc').value.trim(), custo: num('prCusto'), preco: num('prPreco'), qtd: $('prQtd').value };
  if (!p.nome) return msg('prMsg', 'Informe o nome.', false);
  if (isNaN(p.custo) || isNaN(p.preco) || p.custo < 0 || p.preco < 0) return msg('prMsg', 'Informe custo e preço válidos.', false);
  var id = $('prId').value;
  if (id) { var i = S.prod.findIndex(function (x) { return x.id === id; }); p.id = id; p.criado = S.prod[i].criado; S.prod[i] = p; }
  else { p.id = uid(); p.criado = today(); S.prod.push(p); }
  if (save()) { msg('prMsg', 'Produto salvo com sucesso.', true); $('fProd').reset(); $('prId').value = ''; renderProd(); }
};
$('prCancel').onclick = function () { $('fProd').reset(); $('prId').value = ''; msg('prMsg', '', true); };
function renderProd() {
  $('prTb').innerHTML = S.prod.map(function (p) {
    var m = p.preco > 0 ? ((p.preco - p.custo) / p.preco * 100).toFixed(1) + '%' : '—';
    return '<tr><td>' + esc(p.nome) + '</td><td>' + esc(p.cat) + '</td><td>' + brl(p.custo) + '</td><td>' + brl(p.preco) + '</td><td>' + m + '</td><td>' + esc(p.qtd) + '</td><td>' + dt(p.criado) + '</td><td><button class="btn ghost" data-ed="' + p.id + '" aria-label="Editar ' + esc(p.nome) + '">Editar</button><button class="btn danger" data-del="' + p.id + '" aria-label="Excluir ' + esc(p.nome) + '">Excluir</button><button class="btn alt" data-calc="' + p.id + '" aria-label="Usar ' + esc(p.nome) + ' na calculadora">Calcular</button></td></tr>';
  }).join('');
  $('prVazio').hidden = S.prod.length > 0;
}
$('prTb').onclick = function (e) {
  var d = e.target.dataset, p = S.prod.find(function (x) { return x.id === (d.ed || d.del || d.calc); });
  if (!p) return;
  if (d.ed) { $('prId').value = p.id; $('prNome').value = p.nome; $('prCat').value = p.cat; $('prDesc').value = p.desc; $('prCusto').value = p.custo; $('prPreco').value = p.preco; $('prQtd').value = p.qtd; $('prNome').focus(); window.scrollTo(0, 0); }
  if (d.del && confirm('Excluir "' + p.nome + '" definitivamente?')) { S.prod = S.prod.filter(function (x) { return x.id !== p.id; }); if (save()) { renderProd(); toast('Produto excluído.'); } }
  if (d.calc) { location.hash = '#calculadora'; $('cNome').value = p.nome; $('cCusto').value = p.custo; $('cPreco').value = p.preco; }
};

/* ---------- Configurações e acessibilidade ---------- */
function aplicaCfg() {
  var c = S.cfg, h = document.documentElement;
  h.dataset.tema = c.tema; h.dataset.contraste = c.contraste ? '1' : '0'; h.dataset.leitura = c.leitura ? '1' : '0'; h.dataset.anim = c.anim ? '1' : '0';
  h.style.fontSize = c.fonte + '%';
  $('cfTema').value = c.tema; $('cfContraste').checked = !!c.contraste; $('cfLeitura').checked = !!c.leitura; $('cfAnim').checked = !c.anim;
}
$('cfTema').onchange = function () { S.cfg.tema = this.value; save(); aplicaCfg(); };
$('cfContraste').onchange = function () { S.cfg.contraste = this.checked ? 1 : 0; save(); aplicaCfg(); };
$('cfLeitura').onchange = function () { S.cfg.leitura = this.checked ? 1 : 0; save(); aplicaCfg(); };
$('cfAnim').onchange = function () { S.cfg.anim = this.checked ? 0 : 1; save(); aplicaCfg(); };
$('fMais').onclick = function () { S.cfg.fonte = Math.min(200, S.cfg.fonte + 10); save(); aplicaCfg(); };
$('fMenos').onclick = function () { S.cfg.fonte = Math.max(80, S.cfg.fonte - 10); save(); aplicaCfg(); };
var tts = 'speechSynthesis' in window;
function voz(fn) { if (!tts) return msg('cfMsg', 'Seu navegador não suporta leitura em voz alta.', false); fn(); }
$('lerBtn').onclick = function () {
  voz(function () {
    speechSynthesis.cancel();
    var vis = pages.map(function (p) { return $('p-' + p); }).filter(function (s) { return !s.hidden; })[0];
    var u = new SpeechSynthesisUtterance(vis.innerText); u.lang = 'pt-BR'; speechSynthesis.speak(u);
  });
};
$('pausaBtn').onclick = function () { voz(function () { speechSynthesis.speaking && !speechSynthesis.paused ? speechSynthesis.pause() : speechSynthesis.resume(); }); };
$('paraBtn').onclick = function () { voz(function () { speechSynthesis.cancel(); }); };
$('exportaTudo').onclick = function () { download('resoluta-dados.json', JSON.stringify(S, null, 2), 'application/json'); msg('cfMsg', 'Arquivo gerado.', true); };
$('apagaTudo').onclick = function () {
  if (!confirm('Apagar TODOS os dados deste navegador? Esta ação não pode ser desfeita.')) return;
  try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
  S = load(); aplicaCfg(); msg('cfMsg', 'Dados apagados.', true);
};

/* ---------- Cookies ---------- */
$('cookie').hidden = !!S.cfg.cookie;
$('cookieOk').onclick = function () { S.cfg.cookie = 1; save(); $('cookie').hidden = true; };

aplicaCfg();
route();
})();
