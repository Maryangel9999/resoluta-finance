/* =========================================================
   Resoluta AGI + Resoluta Finance — script.js
   Aplicação de página única (SPA) com armazenamento local.
   ========================================================= */
(function () {
'use strict';

/* ---------- Estado ---------- */
var KEY = 'resoluta.v2';
var $ = function (id) { return document.getElementById(id); };
var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

var PADRAO = {
  ini: 0,
  lanc: [],
  prod: [],
  metas: [],
  ai: [],
  conta: null,
  sessao: null,
  cfg: {
    tema: 'claro', contraste: 0, leitura: 0, anim: 1, fonte: 100, cookie: 0,
    moeda: 'BRL', dataFmt: 'br', lembretes: 1,
    cat: 'Vendas,Serviços,Aluguel,Fornecedores,Impostos,Taxas,Marketing,Transporte,Salários,Outros'
  }
};
var S = carrega();

function carrega() {
  var d = JSON.parse(JSON.stringify(PADRAO));
  try {
    var r = JSON.parse(localStorage.getItem(KEY));
    if (r) {
      d.ini = typeof r.ini === 'number' ? r.ini : 0;
      d.lanc = r.lanc || []; d.prod = r.prod || []; d.metas = r.metas || [];
      d.ai = r.ai || []; d.conta = r.conta || null; d.sessao = r.sessao || null;
      Object.assign(d.cfg, r.cfg || {});
    }
  } catch (e) { /* armazenamento indisponível ou corrompido */ }
  return d;
}
function salva() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { toast('Não foi possível salvar os dados neste navegador.'); return false; }
}

/* ---------- Utilidades ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c];
  });
}
function brl(n) {
  var v = Number(n || 0);
  try {
    return v.toLocaleString(S.cfg.moeda === 'BRL' ? 'pt-BR' : (S.cfg.moeda === 'EUR' ? 'de-DE' : 'en-US'),
      { style: 'currency', currency: S.cfg.moeda });
  } catch (e) { return 'R$ ' + v.toFixed(2); }
}
function dt(s) {
  if (!s) return '—';
  if (S.cfg.dataFmt === 'iso') return s;
  return s.split('-').reverse().join('/');
}
function hoje() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function num(id) { var v = $(id).value; return v === '' ? NaN : parseFloat(v); }
function toast(m) {
  var t = $('toast'); t.textContent = m; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 3200);
}
function msg(id, text, ok) {
  var e = $(id); if (!e) return;
  e.textContent = text; e.className = 'msg ' + (ok ? 'ok' : 'bad');
}
function download(nome, texto, tipo) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}
function csvValor(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
function csvBaixar(nome, linhas) {
  var txt = '\ufeff' + linhas.map(function (r) { return r.map(csvValor).join(';'); }).join('\r\n');
  download(nome, txt, 'text/csv;charset=utf-8');
}

/* ---------- Navegação ---------- */
var paginas = ['inicio','sobre','painel','calculadora','produtos','lancamentos','fluxo','contas',
  'relatorios','planejamento','assistente','aprenda','config','conta','contato','privacidade','cookies','termos'];

function rota() {
  var h = (location.hash || '#inicio').slice(1);
  if (paginas.indexOf(h) < 0) h = 'inicio';
  paginas.forEach(function (p) { var el = $('p-' + p); if (el) el.hidden = (p !== h); });
  $$('nav a').forEach(function (a) {
    if (a.getAttribute('href') === '#' + h) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  var sec = $('p-' + h);
  var h1 = sec && sec.querySelector('h1');
  document.title = (h1 ? h1.textContent : 'Resoluta AGI') + ' · Resoluta AGI';
  fecharMenu();
  window.scrollTo(0, 0);
  if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  if (h === 'painel') renderPainel();
  if (h === 'produtos') renderProd();
  if (h === 'lancamentos') renderLanc();
  if (h === 'fluxo') renderFluxo();
  if (h === 'contas') renderContas();
  if (h === 'planejamento') { renderMetas(); }
  if (h === 'assistente') renderAi();
  if (h === 'aprenda') renderAprenda();
  if (h === 'conta') renderConta();
}
function fecharMenu() { $('nav').classList.remove('open'); $('menuBtn').setAttribute('aria-expanded', 'false'); }
window.addEventListener('hashchange', rota);
$('menuBtn').addEventListener('click', function () {
  var o = $('nav').classList.toggle('open');
  this.setAttribute('aria-expanded', o ? 'true' : 'false');
});

/* menu suspenso de ferramentas (acessível) */
var dd = $('ddFerramentas'), ddBtn = $('ddBtn');
ddBtn.addEventListener('click', function () {
  var o = dd.classList.toggle('open');
  ddBtn.setAttribute('aria-expanded', o ? 'true' : 'false');
});
document.addEventListener('click', function (e) { if (!dd.contains(e.target)) { dd.classList.remove('open'); ddBtn.setAttribute('aria-expanded', 'false'); } });
dd.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { dd.classList.remove('open'); ddBtn.setAttribute('aria-expanded', 'false'); ddBtn.focus(); }
});

/* ---------- Situação de lançamentos ---------- */
function situacao(l) {
  if (l.sit === 'realizado') return 'realizado';
  return (l.venc && l.venc < hoje()) ? 'vencido' : 'pendente';
}
function sitTxt(l) {
  var s = situacao(l);
  if (s === 'realizado') return l.tipo === 'receita' ? 'Recebido' : 'Pago';
  if (s === 'vencido') return 'Vencido';
  return 'Pendente (previsto)';
}
function tagSit(l) {
  var s = situacao(l);
  return '<span class="tag ' + s + '">' + sitTxt(l) + '</span>';
}
function tagTipo(t) {
  return '<span class="tag ' + t + '">' + (t === 'receita' ? 'Receita' : 'Despesa') + '</span>';
}

/* ---------- Lançamentos ---------- */
$('fLanc').addEventListener('submit', function (e) {
  e.preventDefault();
  var f = {
    desc: $('lDesc').value.trim(), tipo: $('lTipo').value, cat: $('lCat').value.trim(),
    valor: num('lValor'), venc: $('lVenc').value, sit: $('lSit').value,
    pag: $('lPag').value, forma: $('lForma').value.trim(), obs: $('lObs').value.trim()
  };
  $$('#fLanc input, #fLanc select').forEach(function (i) { i.classList.remove('err'); });
  if (!f.desc) { $('lDesc').classList.add('err'); return msg('lMsg', 'Informe a descrição.', false); }
  if (!f.cat) { $('lCat').classList.add('err'); return msg('lMsg', 'Informe a categoria.', false); }
  if (!(f.valor > 0)) { $('lValor').classList.add('err'); return msg('lMsg', 'Informe um valor maior que zero.', false); }
  if (!f.venc) { $('lVenc').classList.add('err'); return msg('lMsg', 'Informe a data de vencimento.', false); }
  if (f.sit === 'realizado' && !f.pag) f.pag = hoje();
  if (f.sit === 'pendente') f.pag = '';
  var id = $('lId').value;
  var dup = S.lanc.some(function (l) {
    return l.id !== id && l.desc === f.desc && l.valor === f.valor && l.venc === f.venc && l.tipo === f.tipo;
  });
  if (dup) return msg('lMsg', 'Lançamento duplicado: já existe um igual (mesma descrição, valor, tipo e vencimento).', false);
  if (id) {
    var i = S.lanc.findIndex(function (l) { return l.id === id; });
    f.id = id; f.criado = S.lanc[i].criado; S.lanc[i] = f;
  } else { f.id = uid(); f.criado = hoje(); S.lanc.push(f); }
  if (salva()) { msg('lMsg', 'Lançamento salvo com sucesso.', true); resetLanc(); renderLanc(); }
});
function resetLanc() { $('fLanc').reset(); $('lId').value = ''; }
$('lCancel').addEventListener('click', function () { resetLanc(); msg('lMsg', '', true); });

function lancFiltrados() {
  var q = $('lBusca').value.toLowerCase().trim(), t = $('lFTipo').value, s = $('lFSit').value, ord = $('lOrd').value;
  var L = S.lanc.filter(function (l) {
    return (!q || (l.desc + ' ' + l.cat).toLowerCase().indexOf(q) >= 0)
      && (!t || l.tipo === t) && (!s || situacao(l) === s);
  });
  L.sort(function (a, b) {
    if (ord === 'valor') return b.valor - a.valor;
    if (ord === 'desc') return a.desc.localeCompare(b.desc, 'pt-BR');
    return (a.venc || '').localeCompare(b.venc || '');
  });
  return L;
}
function renderLanc() {
  var L = lancFiltrados();
  $('lTb').innerHTML = L.map(function (l) {
    return '<tr><td>' + dt(l.venc) + '</td><td>' + esc(l.desc) + '</td><td>' + tagTipo(l.tipo) +
      '</td><td>' + esc(l.cat) + '</td><td>' + brl(l.valor) + '</td><td>' + tagSit(l) +
      '</td><td><button class="btn ghost" data-ed="' + l.id + '" aria-label="Editar ' + esc(l.desc) + '">Editar</button>' +
      '<button class="btn danger" data-del="' + l.id + '" aria-label="Excluir ' + esc(l.desc) + '">Excluir</button></td></tr>';
  }).join('');
  $('lVazio').hidden = L.length > 0;
}
$('lTb').addEventListener('click', function (e) {
  var ed = e.target.getAttribute('data-ed'), del = e.target.getAttribute('data-del');
  if (ed) {
    var l = S.lanc.find(function (x) { return x.id === ed; }); if (!l) return;
    $('lId').value = l.id; $('lDesc').value = l.desc; $('lTipo').value = l.tipo; $('lCat').value = l.cat;
    $('lValor').value = l.valor; $('lVenc').value = l.venc; $('lSit').value = l.sit; $('lPag').value = l.pag;
    $('lForma').value = l.forma; $('lObs').value = l.obs;
    $('lDesc').focus(); window.scrollTo(0, 0); msg('lMsg', 'Editando lançamento. Altere e salve.', true);
  }
  if (del && confirm('Excluir este lançamento definitivamente? Esta ação não pode ser desfeita.')) {
    S.lanc = S.lanc.filter(function (x) { return x.id !== del; });
    if (salva()) { renderLanc(); toast('Lançamento excluído.'); }
  }
});
['lBusca', 'lFTipo', 'lFSit', 'lOrd'].forEach(function (id) { $(id).addEventListener('input', renderLanc); });
$('lCsv').addEventListener('click', function () {
  var L = lancFiltrados();
  if (!L.length) return toast('Não há lançamentos para exportar.');
  var linhas = [['Vencimento','Descrição','Tipo','Categoria','Valor','Situação','Pagamento/Recebimento','Forma','Observações']]
    .concat(L.map(function (l) {
      return [l.venc, l.desc, l.tipo, l.cat, String(l.valor).replace('.', ','), sitTxt(l), l.pag, l.forma, l.obs];
    }));
  csvBaixar('lancamentos-resoluta.csv', linhas);
  toast('CSV gerado.');
});

/* ---------- Agregações ---------- */
function noIntervalo(d, de, ate) { return d && (!de || d >= de) && (!ate || d <= ate); }
function totais(de, ate, cat) {
  var t = { recR: 0, despR: 0, recP: 0, despP: 0 };
  S.lanc.forEach(function (l) {
    if (cat && l.cat !== cat) return;
    if (l.sit === 'realizado') {
      if (noIntervalo(l.pag, de, ate)) { if (l.tipo === 'receita') t.recR += l.valor; else t.despR += l.valor; }
    } else {
      if (noIntervalo(l.venc, de, ate)) { if (l.tipo === 'receita') t.recP += l.valor; else t.despP += l.valor; }
    }
  });
  return t;
}
function cardKpi(titulo, valor, extra) {
  return '<article class="card"><h2>' + titulo + '</h2><p class="v ' + (extra || '') + '">' + valor + '</p></article>';
}

/* ---------- Painel ---------- */
function renderPainel() {
  $('saldoIni').value = S.ini;
  var de = $('pDe').value, ate = $('pAte').value;
  var t = totais(de, ate, '');
  var real = S.ini + t.recR - t.despR;
  var proj = real + t.recP - t.despP;
  var resultado = t.recR - t.despR;

  $('painelVazio').hidden = S.lanc.length > 0;

  $('kpis').innerHTML =
    cardKpi('Saldo inicial', brl(S.ini)) +
    cardKpi('Receitas recebidas', brl(t.recR), 'pos') +
    cardKpi('Despesas pagas', brl(t.despR), 'neg') +
    cardKpi('Resultado do período', brl(resultado), resultado < 0 ? 'neg' : 'pos') +
    cardKpi('Saldo realizado', brl(real), real < 0 ? 'neg' : '') +
    cardKpi('A receber (previsto)', brl(t.recP)) +
    cardKpi('A pagar (previsto)', brl(t.despP)) +
    cardKpi('Saldo projetado', brl(proj), proj < 0 ? 'neg' : 'pos');

  desenhaBarras('grafico', [
    { rot: 'Recebido', val: t.recR, cls: 'rec' },
    { rot: 'Pago', val: t.despR, cls: 'desp' },
    { rot: 'A receber', val: t.recP, cls: '' },
    { rot: 'A pagar', val: t.despP, cls: 'neg' }
  ]);
  $('graficoTxt').textContent = 'Descrição do gráfico: recebido ' + brl(t.recR) + '; pago ' + brl(t.despR) +
    '; a receber ' + brl(t.recP) + '; a pagar ' + brl(t.despP) + '.' +
    (proj < 0 ? ' Atenção: o saldo projetado é negativo, indicando possível falta de caixa.' : '');

  renderEvolucao(de, ate);
  renderMetasResumo();
  renderProdResumo();
}

function desenhaBarras(id, dados) {
  var max = Math.max.apply(null, dados.map(function (d) { return d.val; }).concat([1]));
  $(id).innerHTML = dados.map(function (d) {
    var h = Math.max(3, Math.round(d.val / max * 150));
    return '<div class="bar ' + d.cls + '"><b>' + brl(d.val) + '</b><i style="height:' + h + 'px"></i><span class="lbl">' + d.rot + '</span></div>';
  }).join('');
}

function renderEvolucao(de, ate) {
  var mapa = {};
  S.lanc.forEach(function (l) {
    var ref = l.sit === 'realizado' ? l.pag : l.venc;
    if (!ref) return;
    if (!noIntervalo(ref, de, ate)) return;
    var mes = ref.slice(0, 7);
    if (!mapa[mes]) mapa[mes] = { rec: 0, desp: 0 };
    if (l.tipo === 'receita') mapa[mes].rec += l.valor; else mapa[mes].desp += l.valor;
  });
  var meses = Object.keys(mapa).sort();
  if (!meses.length) {
    $('evoChart').innerHTML = '<p class="note" style="margin:auto">Sem dados no período para exibir a evolução.</p>';
    $('evoTxt').textContent = '';
    return;
  }
  var max = Math.max.apply(null, meses.map(function (m) { return Math.max(mapa[m].rec, mapa[m].desp); }).concat([1]));
  $('evoChart').innerHTML = meses.map(function (m) {
    var r = Math.round(mapa[m].rec / max * 130), d = Math.round(mapa[m].desp / max * 130);
    return '<div class="bar"><b>' + m.split('-').reverse().join('/') + '</b>' +
      '<div style="display:flex;gap:4px;align-items:flex-end;height:140px;width:100%;justify-content:center">' +
      '<i class="rec" style="height:' + Math.max(3, r) + 'px;width:26px;background:linear-gradient(180deg,#1a7a3a,#2ea85a);border-radius:6px 6px 0 0"></i>' +
      '<i class="desp" style="height:' + Math.max(3, d) + 'px;width:26px;background:linear-gradient(180deg,#b00020,#d94a63);border-radius:6px 6px 0 0"></i>' +
      '</div><span class="lbl">R ' + brl(mapa[m].rec) + ' · D ' + brl(mapa[m].desp) + '</span></div>';
  }).join('');
  $('evoTxt').textContent = 'Descrição: evolução mensal de receitas (verde) e despesas (vermelho) para ' + meses.length + ' mês(es).';
}

function renderMetasResumo() {
  var el = $('metasResumo');
  if (!S.metas.length) { el.innerHTML = '<p class="empty">Nenhuma meta cadastrada. Defina metas em <a href="#planejamento">Planejamento</a>.</p>'; return; }
  el.innerHTML = S.metas.slice(0, 4).map(function (m) {
    var pct = m.alvo > 0 ? Math.min(100, Math.round(m.atual / m.alvo * 100)) : 0;
    return '<div class="mini"><b>' + esc(m.nome) + '</b> <span class="badge">' + pct + '%</span>' +
      '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
      '<span class="note">' + brl(m.atual) + ' de ' + brl(m.alvo) + (m.prazo ? ' · prazo ' + dt(m.prazo) : '') + '</span></div>';
  }).join('');
}
function renderProdResumo() {
  var el = $('prodResumo');
  if (!S.prod.length) { el.innerHTML = '<p class="empty">Nenhum produto cadastrado. Comece em <a href="#produtos">Produtos e serviços</a>.</p>'; return; }
  var total = S.prod.length;
  var somaMargem = 0, cont = 0;
  S.prod.forEach(function (p) { if (p.preco > 0) { somaMargem += (p.preco - p.custo) / p.preco * 100; cont++; } });
  var media = cont ? (somaMargem / cont).toFixed(1) + '%' : '—';
  el.innerHTML = '<div class="mini"><b>' + total + '</b> item(ns) cadastrado(s)</div>' +
    '<div class="mini">Margem média: <b>' + media + '</b></div>' +
    '<div class="mini">Veja a lista completa em <a href="#produtos">Produtos e serviços</a>.</div>';
}

$('saldoIni').addEventListener('change', function () { S.ini = parseFloat(this.value) || 0; salva(); renderPainel(); });
$('pDe').addEventListener('change', renderPainel);
$('pAte').addEventListener('change', renderPainel);
$('limpaPeriodo').addEventListener('click', function () { $('pDe').value = ''; $('pAte').value = ''; renderPainel(); });

/* ---------- Calculadora de markup ---------- */
var ultimoCalc = null;
function calcular(e) {
  if (e) e.preventDefault();
  var nome = $('cNome').value.trim();
  var c = num('cCusto'), v = num('cVar'), fx = num('cFix'), lu = num('cLucro'), q = num('cQtd'), pp = num('cPreco');
  ultimoCalc = null; $('cSalva').disabled = true; $('cRes').innerHTML = '';
  $$('#fCalc input').forEach(function (i) { i.classList.remove('err'); });

  if (!nome) { $('cNome').classList.add('err'); return msg('cMsg', 'Informe o nome do produto ou serviço.', false); }
  if ([c, v, fx, lu].some(isNaN) || c < 0 || v < 0 || fx < 0 || lu < 0) {
    return msg('cMsg', 'Preencha custo, despesas variáveis, fixas e lucro com valores válidos (não negativos).', false);
  }
  if (v > 100 || fx > 100 || lu > 100) return msg('cMsg', 'Os percentuais não podem passar de 100%.', false);

  var soma = v + fx + lu;
  var divisor = 1 - soma / 100;
  if (divisor <= 0) {
    return msg('cMsg', 'Cálculo bloqueado: a soma dos percentuais (' + soma.toFixed(2) + '%) é 100% ou mais, então o divisor fica ' + divisor.toFixed(2) + '. Não existe preço que cubra essas despesas com esse custo. Reduza algum percentual.', false);
  }
  var mult = 1 / divisor;
  var sugerido = c / divisor;

  var cards = [
    ['Markup divisor', divisor.toFixed(4)],
    ['Markup multiplicador', mult.toFixed(4)],
    ['Preço de venda sugerido', brl(sugerido)]
  ];

  if (!isNaN(pp) && pp > 0) {
    cards.push(['Preço praticado', brl(pp)]);
    if (!isNaN(q) && q > 0) {
      var vendas = pp * q, custoTotal = c * q, bruto = vendas - custoTotal;
      var dv = vendas * v / 100, df = vendas * fx / 100, oper = bruto - dv - df;
      var liq = oper; /* despesas já consideradas: não contar duas vezes */
      cards.push(['Quantidade vendida', String(q)]);
      cards.push(['Valor total das vendas', brl(vendas)]);
      cards.push(['Custo total dos itens vendidos', brl(custoTotal)]);
      cards.push(['Lucro bruto', brl(bruto)]);
      cards.push(['Despesas variáveis (estimadas)', brl(dv)]);
      cards.push(['Despesas fixas (estimadas)', brl(df)]);
      cards.push(['Resultado operacional', brl(oper)]);
      cards.push(['Lucro líquido estimado', brl(liq)]);
      cards.push(['Margem líquida resultante', (vendas > 0 ? (liq / vendas * 100).toFixed(2) : '0.00') + '%']);
    } else {
      cards.push(['Observação', 'Informe a quantidade vendida para ver lucro bruto, operacional e líquido estimado.']);
    }
  } else {
    cards.push(['Observação', 'Informe o preço praticado e a quantidade para comparar o preço sugerido com o resultado real.']);
  }

  $('cRes').innerHTML = cards.map(function (x) {
    return '<article class="card"><h2>' + esc(x[0]) + '</h2><p class="v">' + esc(x[1]) + '</p></article>';
  }).join('');
  ultimoCalc = { nome: nome, custo: c, preco: Math.round(sugerido * 100) / 100 };
  $('cSalva').disabled = false;
  msg('cMsg', 'Cálculo realizado. O resultado é uma estimativa e não substitui orientação contábil.', true);
}
$('fCalc').addEventListener('submit', calcular);
$('cLimpa').addEventListener('click', function () {
  $('fCalc').reset(); $('cRes').innerHTML = ''; msg('cMsg', '', true); $('cSalva').disabled = true; ultimoCalc = null;
});
$('cSalva').addEventListener('click', function () {
  if (!ultimoCalc) return;
  S.prod.push({ id: uid(), nome: ultimoCalc.nome, cat: '', desc: 'Criado pela calculadora', custo: ultimoCalc.custo, preco: ultimoCalc.preco, qtd: '', criado: hoje() });
  if (salva()) { toast('Produto salvo com o preço sugerido.'); location.hash = '#produtos'; }
});

/* ---------- Produtos ---------- */
$('fProd').addEventListener('submit', function (e) {
  e.preventDefault();
  var p = { nome: $('prNome').value.trim(), cat: $('prCat').value.trim(), desc: $('prDesc').value.trim(), custo: num('prCusto'), preco: num('prPreco'), qtd: $('prQtd').value };
  $$('#fProd input').forEach(function (i) { i.classList.remove('err'); });
  if (!p.nome) { $('prNome').classList.add('err'); return msg('prMsg', 'Informe o nome.', false); }
  if (isNaN(p.custo) || isNaN(p.preco) || p.custo < 0 || p.preco < 0) { $('prCusto').classList.add('err'); $('prPreco').classList.add('err'); return msg('prMsg', 'Informe custo e preço válidos.', false); }
  var id = $('prId').value;
  if (id) { var i = S.prod.findIndex(function (x) { return x.id === id; }); p.id = id; p.criado = S.prod[i].criado; S.prod[i] = p; }
  else { p.id = uid(); p.criado = hoje(); S.prod.push(p); }
  if (salva()) { msg('prMsg', 'Produto salvo com sucesso.', true); $('fProd').reset(); $('prId').value = ''; renderProd(); atualizaDatalists(); }
});
$('prCancel').addEventListener('click', function () { $('fProd').reset(); $('prId').value = ''; msg('prMsg', '', true); });
function renderProd() {
  var q = ($('prBusca').value || '').toLowerCase().trim();
  var lista = S.prod.filter(function (p) { return !q || (p.nome + ' ' + p.cat).toLowerCase().indexOf(q) >= 0; });
  $('prTb').innerHTML = lista.map(function (p) {
    var m = p.preco > 0 ? ((p.preco - p.custo) / p.preco * 100).toFixed(1) + '%' : '—';
    return '<tr><td>' + esc(p.nome) + '</td><td>' + esc(p.cat) + '</td><td>' + brl(p.custo) + '</td><td>' + brl(p.preco) +
      '</td><td>' + m + '</td><td>' + esc(p.qtd) + '</td><td>' + dt(p.criado) +
      '</td><td><button class="btn ghost" data-ed="' + p.id + '" aria-label="Editar ' + esc(p.nome) + '">Editar</button>' +
      '<button class="btn danger" data-del="' + p.id + '" aria-label="Excluir ' + esc(p.nome) + '">Excluir</button>' +
      '<button class="btn alt" data-calc="' + p.id + '" aria-label="Usar ' + esc(p.nome) + ' na calculadora">Calcular</button></td></tr>';
  }).join('');
  $('prVazio').hidden = lista.length > 0;
}
$('prTb').addEventListener('click', function (e) {
  var d = { ed: e.target.getAttribute('data-ed'), del: e.target.getAttribute('data-del'), calc: e.target.getAttribute('data-calc') };
  var p = S.prod.find(function (x) { return x.id === (d.ed || d.del || d.calc); });
  if (!p) return;
  if (d.ed) {
    $('prId').value = p.id; $('prNome').value = p.nome; $('prCat').value = p.cat; $('prDesc').value = p.desc;
    $('prCusto').value = p.custo; $('prPreco').value = p.preco; $('prQtd').value = p.qtd;
    $('prNome').focus(); window.scrollTo(0, 0); msg('prMsg', 'Editando produto. Altere e salve.', true);
  }
  if (d.del && confirm('Excluir "' + p.nome + '" definitivamente?')) {
    S.prod = S.prod.filter(function (x) { return x.id !== p.id; });
    if (salva()) { renderProd(); atualizaDatalists(); toast('Produto excluído.'); }
  }
  if (d.calc) {
    location.hash = '#calculadora';
    $('cNome').value = p.nome; $('cCusto').value = p.custo; $('cPreco').value = p.preco;
    msg('cMsg', 'Preencha despesas e margem desejada e clique em Calcular.', true);
  }
});
$('prBusca').addEventListener('input', renderProd);

/* ---------- Fluxo de caixa ---------- */
function chavePeriodo(data, visao) {
  if (visao === 'mensal') return data.slice(0, 7);
  if (visao === 'semanal') {
    var d = new Date(data + 'T00:00:00');
    var dia = d.getDay(); var seg = new Date(d); seg.setDate(d.getDate() - ((dia + 6) % 7));
    return 'Semana de ' + seg.toISOString().slice(0, 10);
  }
  return data;
}
function renderFluxo() {
  var de = $('fxDe').value, ate = $('fxAte').value, visao = $('fxVisao').value, cat = $('fxCat').value.trim();
  var grupos = {};
  S.lanc.forEach(function (l) {
    if (cat && l.cat !== cat) return;
    var ref = l.sit === 'realizado' ? l.pag : l.venc;
    if (!ref || !noIntervalo(ref, de, ate)) return;
    var k = chavePeriodo(ref, visao);
    if (!grupos[k]) grupos[k] = { recR: 0, despR: 0, recP: 0, despP: 0 };
    if (l.sit === 'realizado') { if (l.tipo === 'receita') grupos[k].recR += l.valor; else grupos[k].despR += l.valor; }
    else { if (l.tipo === 'receita') grupos[k].recP += l.valor; else grupos[k].despP += l.valor; }
  });
  var chaves = Object.keys(grupos).sort();
  var tot = { recR: 0, despR: 0, recP: 0, despP: 0 };
  chaves.forEach(function (k) { tot.recR += grupos[k].recR; tot.despR += grupos[k].despR; tot.recP += grupos[k].recP; tot.despP += grupos[k].despP; });
  var saldoReal = S.ini + tot.recR - tot.despR;
  var saldoProj = saldoReal + tot.recP - tot.despP;

  $('fxResumo').innerHTML =
    cardKpi('Saldo inicial', brl(S.ini)) +
    cardKpi('Entradas realizadas', brl(tot.recR), 'pos') +
    cardKpi('Saídas realizadas', brl(tot.despR), 'neg') +
    cardKpi('Saldo realizado', brl(saldoReal), saldoReal < 0 ? 'neg' : '') +
    cardKpi('Saldo projetado', brl(saldoProj), saldoProj < 0 ? 'neg' : 'pos');

  $('fxTb').innerHTML = chaves.map(function (k) {
    var g = grupos[k], saldo = g.recR - g.despR;
    return '<tr><td>' + esc(k) + '</td><td>' + brl(g.recR) + '</td><td>' + brl(g.despR) + '</td><td>' + brl(g.recP) +
      '</td><td>' + brl(g.despP) + '</td><td>' + brl(saldo) + '</td></tr>';
  }).join('');
  $('fxVazio').hidden = chaves.length > 0;

  desenhaBarras('fxChart', [
    { rot: 'Entradas realizadas', val: tot.recR, cls: 'rec' },
    { rot: 'Saídas realizadas', val: tot.despR, cls: 'desp' },
    { rot: 'Entradas previstas', val: tot.recP, cls: '' },
    { rot: 'Saídas previstas', val: tot.despP, cls: 'neg' }
  ]);
  $('fxTxt').textContent = 'Descrição: entradas realizadas ' + brl(tot.recR) + '; saídas realizadas ' + brl(tot.despR) +
    '; entradas previstas ' + brl(tot.recP) + '; saídas previstas ' + brl(tot.despP) + '.';

  var alerta = $('fxAlerta');
  var vencidas = S.lanc.filter(function (l) { return situacao(l) === 'vencido'; });
  if (S.cfg.lembretes && vencidas.length) {
    var somaV = vencidas.reduce(function (a, l) { return a + (l.tipo === 'despesa' ? l.valor : 0); }, 0);
    alerta.hidden = false; alerta.className = 'alert warn';
    alerta.innerHTML = '<b>Atenção:</b> há ' + vencidas.length + ' conta(s) vencida(s) e ainda pendente(s), somando ' + brl(somaV) + ' a pagar. Veja em <a href="#contas">Contas a pagar e receber</a>.';
  } else if (saldoProj < 0) {
    alerta.hidden = false; alerta.className = 'alert bad';
    alerta.innerHTML = '<b>Possível falta de caixa:</b> o saldo projetado é ' + brl(saldoProj) + '. Considere antecipar recebimentos ou renegociar pagamentos.';
  } else { alerta.hidden = true; }
}
$('fxDe').addEventListener('change', renderFluxo);
$('fxAte').addEventListener('change', renderFluxo);
$('fxVisao').addEventListener('change', renderFluxo);
$('fxCat').addEventListener('input', renderFluxo);
$('fxLimpa').addEventListener('click', function () { $('fxDe').value = ''; $('fxAte').value = ''; $('fxCat').value = ''; renderFluxo(); });

/* ---------- Contas a pagar e receber ---------- */
function renderContas() {
  var f = $('ctFiltro').value;
  var pend = S.lanc.filter(function (l) { return l.sit !== 'realizado'; });
  var aPagar = pend.filter(function (l) { return l.tipo === 'despesa'; });
  var aReceber = pend.filter(function (l) { return l.tipo === 'receita'; });
  var venc = pend.filter(function (l) { return situacao(l) === 'vencido'; });
  var soma = function (arr) { return arr.reduce(function (a, l) { return a + l.valor; }, 0); };

  $('ctResumo').innerHTML =
    cardKpi('Total a pagar', brl(soma(aPagar)), 'neg') +
    cardKpi('Total a receber', brl(soma(aReceber)), 'pos') +
    cardKpi('Contas vencidas', String(venc.length), venc.length ? 'neg' : '') +
    cardKpi('Saldo previsto das contas', brl(soma(aReceber) - soma(aPagar)), (soma(aReceber) - soma(aPagar)) < 0 ? 'neg' : 'pos');

  var lista = pend;
  if (f === 'pagar') lista = aPagar;
  else if (f === 'receber') lista = aReceber;
  else if (f === 'vencidas') lista = venc;
  lista = lista.slice().sort(function (a, b) { return (a.venc || '').localeCompare(b.venc || ''); });

  $('ctTb').innerHTML = lista.map(function (l) {
    return '<tr><td>' + dt(l.venc) + '</td><td>' + esc(l.desc) + '</td><td>' + tagTipo(l.tipo) + '</td><td>' + esc(l.cat) +
      '</td><td>' + brl(l.valor) + '</td><td>' + tagSit(l) + '</td>' +
      '<td><button class="btn alt" data-quitar="' + l.id + '" aria-label="Marcar ' + esc(l.desc) + ' como pago ou recebido">Quitar</button>' +
      '<button class="btn ghost" data-ed="' + l.id + '" aria-label="Editar ' + esc(l.desc) + '">Editar</button></td></tr>';
  }).join('');
  $('ctVazio').hidden = lista.length > 0;

  var alerta = $('ctAlerta');
  if (venc.length) {
    alerta.hidden = false; alerta.className = 'alert warn';
    alerta.innerHTML = '<b>' + venc.length + ' conta(s) vencida(s):</b> ' + venc.slice(0, 5).map(function (l) { return esc(l.desc) + ' (' + dt(l.venc) + ')'; }).join('; ') + (venc.length > 5 ? '…' : '');
  } else { alerta.hidden = true; }
}
$('ctFiltro').addEventListener('change', renderContas);
$('ctTb').addEventListener('click', function (e) {
  var quitar = e.target.getAttribute('data-quitar'), ed = e.target.getAttribute('data-ed');
  if (quitar) {
    var l = S.lanc.find(function (x) { return x.id === quitar; }); if (!l) return;
    l.sit = 'realizado'; l.pag = hoje();
    if (salva()) { renderContas(); toast('Conta marcada como ' + (l.tipo === 'receita' ? 'recebida' : 'paga') + '.'); }
  }
  if (ed) { location.hash = '#lancamentos'; setTimeout(function () { $('lTb').querySelector('[data-ed="' + ed + '"]') && $('lTb').querySelector('[data-ed="' + ed + '"]').click(); }, 60); }
});
$('ctCsv').addEventListener('click', function () {
  var pend = S.lanc.filter(function (l) { return l.sit !== 'realizado'; });
  if (!pend.length) return toast('Não há contas pendentes para exportar.');
  var linhas = [['Vencimento','Descrição','Tipo','Categoria','Valor','Situação']]
    .concat(pend.map(function (l) { return [l.venc, l.desc, l.tipo, l.cat, String(l.valor).replace('.', ','), sitTxt(l)]; }));
  csvBaixar('contas-resoluta.csv', linhas); toast('CSV gerado.');
});

/* ---------- Relatórios ---------- */
var ultimoRel = null;
function filtroRel() {
  var de = $('rDe').value, ate = $('rAte').value, tipo = $('rTipo').value, cat = $('rCat').value.trim(), prod = $('rProd').value.trim();
  return S.lanc.filter(function (l) {
    var ref = l.sit === 'realizado' ? l.pag : l.venc;
    if (!noIntervalo(ref, de, ate)) return false;
    if (tipo && l.tipo !== tipo) return false;
    if (cat && l.cat !== cat) return false;
    if (prod && (l.desc + ' ' + l.cat).toLowerCase().indexOf(prod.toLowerCase()) < 0) return false;
    return true;
  });
}
function geraRelatorio(e) {
  if (e) e.preventDefault();
  var L = filtroRel();
  ultimoRel = L;
  if (!L.length) { $('rSaida').innerHTML = ''; $('rVazio').hidden = false; msg('rMsg', 'Nenhum dado para os filtros escolhidos.', false); return; }
  $('rVazio').hidden = true; msg('rMsg', 'Relatório gerado com ' + L.length + ' registro(s).', true);

  var recR = 0, despR = 0, recP = 0, despP = 0;
  var porCat = {}, porTipo = { receita: 0, despesa: 0 };
  L.forEach(function (l) {
    var ref = l.sit === 'realizado' ? l.pag : l.venc;
    if (l.sit === 'realizado') { if (l.tipo === 'receita') recR += l.valor; else despR += l.valor; }
    else { if (l.tipo === 'receita') recP += l.valor; else despP += l.valor; }
    if (!porCat[l.cat]) porCat[l.cat] = { receita: 0, despesa: 0 };
    porCat[l.cat][l.tipo] += l.valor;
    porTipo[l.tipo] += l.valor;
  });
  var resultado = recR - despR;

  var html = '';
  html += '<div class="grid">' +
    cardKpi('Receitas recebidas', brl(recR), 'pos') +
    cardKpi('Despesas pagas', brl(despR), 'neg') +
    cardKpi('Resultado realizado', brl(resultado), resultado < 0 ? 'neg' : 'pos') +
    cardKpi('A receber / a pagar', brl(recP) + ' / ' + brl(despP)) +
    '</div>';

  html += '<div class="card"><h2>Receitas e despesas por categoria</h2><div class="tw"><table><caption class="sr">Resumo por categoria</caption>' +
    '<thead><tr><th scope="col">Categoria</th><th scope="col">Receitas</th><th scope="col">Despesas</th><th scope="col">Saldo</th></tr></thead><tbody>' +
    Object.keys(porCat).sort().map(function (c) {
      var x = porCat[c];
      return '<tr><td>' + esc(c) + '</td><td>' + brl(x.receita) + '</td><td>' + brl(x.despesa) + '</td><td>' + brl(x.receita - x.despesa) + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';

  var margem = recR > 0 ? (resultado / recR * 100).toFixed(1) + '%' : '—';
  html += '<div class="card"><h2>Indicadores</h2><ul class="ticks">' +
    '<li>Margem sobre receitas realizadas: <b>' + margem + '</b></li>' +
    '<li>Total de receitas (realizadas + previstas): <b>' + brl(recR + recP) + '</b></li>' +
    '<li>Total de despesas (realizadas + previstas): <b>' + brl(despR + despP) + '</b></li>' +
    '<li>Produtos e serviços cadastrados: <b>' + S.prod.length + '</b></li>' +
    '</ul><p class="note">Indicadores gerenciais de apoio. Não substituem demonstrações contábeis oficiais.</p></div>';

  $('rSaida').innerHTML = html;
}
$('fRel').addEventListener('submit', geraRelatorio);
$('rCsv').addEventListener('click', function () {
  var L = filtroRel();
  if (!L.length) return toast('Nenhum dado para exportar.');
  var linhas = [['Vencimento','Pagamento','Descrição','Tipo','Categoria','Valor','Situação']]
    .concat(L.map(function (l) { return [l.venc, l.pag, l.desc, l.tipo, l.cat, String(l.valor).replace('.', ','), sitTxt(l)]; }));
  csvBaixar('relatorio-resoluta.csv', linhas); toast('CSV do relatório gerado.');
});
$('rPdf').addEventListener('click', function () {
  if (!$('rSaida').innerHTML) { geraRelatorio(); }
  toast('Use a janela de impressão para salvar em PDF.');
  setTimeout(function () { window.print(); }, 300);
});

/* ---------- Planejamento e metas ---------- */
$('fMeta').addEventListener('submit', function (e) {
  e.preventDefault();
  var m = { nome: $('mtNome').value.trim(), alvo: num('mtAlvo'), atual: num('mtAtual') || 0, prazo: $('mtPrazo').value };
  $$('#fMeta input').forEach(function (i) { i.classList.remove('err'); });
  if (!m.nome) { $('mtNome').classList.add('err'); return msg('mtMsg', 'Informe o nome da meta.', false); }
  if (!(m.alvo > 0)) { $('mtAlvo').classList.add('err'); return msg('mtMsg', 'Informe um valor alvo maior que zero.', false); }
  if (m.atual < 0) return msg('mtMsg', 'O valor alcançado não pode ser negativo.', false);
  var id = $('mtId').value;
  if (id) { var i = S.metas.findIndex(function (x) { return x.id === id; }); m.id = id; S.metas[i] = m; }
  else { m.id = uid(); m.criado = hoje(); S.metas.push(m); }
  if (salva()) { msg('mtMsg', 'Meta salva com sucesso.', true); $('fMeta').reset(); $('mtId').value = ''; renderMetas(); }
});
$('mtCancel').addEventListener('click', function () { $('fMeta').reset(); $('mtId').value = ''; msg('mtMsg', '', true); });
function renderMetas() {
  $('mtLista').innerHTML = S.metas.map(function (m) {
    var pct = m.alvo > 0 ? Math.min(100, Math.round(m.atual / m.alvo * 100)) : 0;
    var falta = Math.max(0, m.alvo - m.atual);
    return '<div class="mini"><div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap">' +
      '<b>' + esc(m.nome) + '</b><span class="badge">' + pct + '%</span></div>' +
      '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
      '<span class="note">' + brl(m.atual) + ' de ' + brl(m.alvo) + ' · faltam ' + brl(falta) + (m.prazo ? ' · prazo ' + dt(m.prazo) : '') + '</span>' +
      '<div class="actions"><button class="btn ghost" data-ed="' + m.id + '" aria-label="Editar meta ' + esc(m.nome) + '">Editar</button>' +
      '<button class="btn danger" data-del="' + m.id + '" aria-label="Excluir meta ' + esc(m.nome) + '">Excluir</button></div></div>';
  }).join('');
  $('mtVazio').hidden = S.metas.length > 0;
}
$('mtLista').addEventListener('click', function (e) {
  var ed = e.target.getAttribute('data-ed'), del = e.target.getAttribute('data-del');
  if (ed) {
    var m = S.metas.find(function (x) { return x.id === ed; }); if (!m) return;
    $('mtId').value = m.id; $('mtNome').value = m.nome; $('mtAlvo').value = m.alvo; $('mtAtual').value = m.atual; $('mtPrazo').value = m.prazo;
    $('mtNome').focus(); window.scrollTo(0, 0);
  }
  if (del && confirm('Excluir esta meta definitivamente?')) {
    S.metas = S.metas.filter(function (x) { return x.id !== del; });
    if (salva()) { renderMetas(); toast('Meta excluída.'); }
  }
});

$('fCenario').addEventListener('submit', function (e) {
  e.preventDefault();
  var c = num('cnCusto'), p = num('cnPreco'), vol = num('cnVolume');
  var vc = num('cnVarCusto') || 0, vp = num('cnVarPreco') || 0, vv = num('cnVarVolume') || 0;
  if ([c, p, vol].some(isNaN) || c < 0 || p < 0 || vol < 0) return msg('cnMsg', 'Informe custo, preço e volume válidos (não negativos).', false);
  var c2 = c * (1 + vc / 100), p2 = p * (1 + vp / 100), vol2 = vol * (1 + vv / 100);
  var atual = (p - c) * vol;
  var novo = (p2 - c2) * vol2;
  var dif = novo - atual;
  $('cnRes').innerHTML =
    cardKpi('Lucro atual (estimado)', brl(atual), atual < 0 ? 'neg' : 'pos') +
    cardKpi('Novo custo unitário', brl(c2)) +
    cardKpi('Novo preço de venda', brl(p2)) +
    cardKpi('Novo volume', vol2.toFixed(0)) +
    cardKpi('Lucro no cenário (estimado)', brl(novo), novo < 0 ? 'neg' : 'pos') +
    cardKpi('Diferença', brl(dif), dif < 0 ? 'neg' : 'pos');
  msg('cnMsg', 'Simulação concluída. Projeção estimada — não é garantia de resultado.', true);
});
$('cnLimpa').addEventListener('click', function () { $('fCenario').reset(); $('cnRes').innerHTML = ''; msg('cnMsg', '', true); });

/* ---------- Assistente financeiro (baseado em regras) ---------- */
var REGRAS = [
  { k: ['markup', 'o que é markup'], r: 'Markup é o fator aplicado sobre o custo para chegar ao preço de venda, cobrindo despesas e a margem desejada. O markup divisor = 1 − (variáveis% + fixas% + lucro%). O multiplicador = 1 ÷ divisor. Exemplo: divisor 0,50 → multiplicador 2,00. Use a Calculadora para aplicar aos seus números.' },
  { k: ['preço de venda', 'como calcular o preço', 'precificar', 'precificação'], r: 'Para calcular o preço: 1) some custo direto + despesas variáveis + despesas fixas rateadas + margem desejada; 2) calcule o markup divisor = 1 − (percentuais); 3) preço sugerido = custo direto ÷ divisor. Abra a Calculadora e preencha os campos que você conhece.' },
  { k: ['lucro bruto', 'lucro líquido', 'diferença entre lucro', 'bruto e líquido'], r: 'Lucro bruto = vendas − custo dos itens vendidos. Resultado operacional = lucro bruto − despesas. Lucro líquido estimado = resultado após considerar todas as despesas informadas. Cuidado para não contar a mesma despesa duas vezes.' },
  { k: ['fluxo de caixa', 'organizar o caixa', 'caixa'], r: 'Registre toda entrada e saída em Lançamentos, controlando vencimentos. Compare o saldo realizado (o que já foi pago/recebido) com o saldo projetado (inclui pendentes) para antecipar períodos de falta de caixa. Veja o módulo Fluxo de caixa.' },
  { k: ['relatório', 'interpretar', 'análise'], r: 'Nos Relatórios você vê receitas e despesas por período e categoria, o resultado e indicadores como margem sobre receitas. Filtre por data, categoria e tipo. São relatórios gerenciais de apoio, não demonstrações contábeis oficiais.' },
  { k: ['lançamento', 'cadastrar', 'onde cadastro'], r: 'Cadastre em Lançamentos: descrição, tipo (receita/despesa), categoria, valor, vencimento e situação. Marque como realizado quando já foi pago/recebido. Valores pendentes são projeções.' },
  { k: ['despesa fixa', 'despesa variável', 'custo fixo', 'custo variável'], r: 'Despesas fixas não mudam com as vendas (ex.: aluguel). Despesas variáveis mudam conforme você vende (ex.: comissão, embalagem, taxas de cartão). Custos diretos estão ligados ao produto; indiretos são rateados.' },
  { k: ['meta', 'planejamento', 'capital de giro'], r: 'Defina metas com valor e prazo em Planejamento e acompanhe o progresso. Capital de giro é o dinheiro para manter a operação rodando. Use o simulador de cenários para testar mudanças de custo, preço e volume.' },
  { k: ['imposto', 'taxa', 'comissão'], r: 'Impostos, taxas e comissões devem entrar nas despesas variáveis. Informe apenas os percentuais que você realmente conhece — não invente valores. A calculadora usa o que você informar.' },
  { k: ['seguro', 'privacidade', 'dados', 'lgpd'], r: 'Nesta versão os dados ficam apenas no seu navegador (armazenamento local). Você pode exportar ou apagar tudo em Configurações. Não há envio a servidores nem rastreamento.' },
  { k: ['acessibilidade', 'leitor de tela', 'contraste', 'fonte'], r: 'Em Configurações você ajusta tema claro/escuro, alto contraste, tamanho da fonte, leitura simplificada e leitura em voz alta. O site é navegável por teclado e compatível com leitores de tela.' },
  { k: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'], r: 'Olá! Posso explicar conceitos como markup, custos, despesas, lucro e fluxo de caixa, e ajudar você a usar as ferramentas do site. O que você gostaria de entender?' }
];
function respostaAi(txt) {
  var t = txt.toLowerCase();
  var melhor = null, score = 0;
  REGRAS.forEach(function (r) {
    var s = 0;
    r.k.forEach(function (k) { if (t.indexOf(k) >= 0) s += k.length; });
    if (s > score) { score = s; melhor = r; }
  });
  if (melhor) return melhor.r;
  return 'Ainda não tenho uma resposta pronta para isso. Posso ajudar com: markup, preço de venda, lucro bruto e líquido, custos e despesas, fluxo de caixa, relatórios, metas e uso do site. Tente reformular a pergunta ou veja a área Aprenda. Lembre-se: sou uma ajuda por regras e não substituo orientação contábil, jurídica ou financeira.';
}
function bolha(txt, quem) {
  var d = document.createElement('div');
  d.className = 'bubble ' + quem;
  d.textContent = txt;
  $('aiLog').appendChild(d);
  $('aiLog').scrollTop = $('aiLog').scrollHeight;
}
function renderAi() {
  $('aiLog').innerHTML = '';
  if (!S.ai.length) {
    bolha('Olá! Sou o assistente da Resoluta. Posso explicar markup, custos, despesas, lucro, fluxo de caixa e ajudar a usar o site. Como posso ajudar?', 'bot');
  } else {
    S.ai.forEach(function (m) { bolha(m.t, m.q); });
  }
}
function enviarAi(txt) {
  txt = (txt || '').trim(); if (!txt) return;
  bolha(txt, 'user'); S.ai.push({ q: 'user', t: txt });
  var r = respostaAi(txt);
  setTimeout(function () { bolha(r, 'bot'); S.ai.push({ q: 'bot', t: r }); salva(); }, 250);
  salva();
}
$('fAi').addEventListener('submit', function (e) {
  e.preventDefault();
  enviarAi($('aiInput').value); $('aiInput').value = '';
});
$('aiSug').addEventListener('click', function (e) {
  var q = e.target.getAttribute('data-q'); if (q) enviarAi(q);
});
$('aiLimpa').addEventListener('click', function () {
  S.ai = []; salva(); renderAi(); toast('Conversa limpa.');
});

/* ---------- Aprenda ---------- */
var MODULOS = [
  { t: 'Módulo 1 — Fundamentos financeiros', l: [
    { h: 'Organização financeira', p: 'Organizar é registrar o que entra e o que sai, com datas e categorias. Sem registro, não há clareza. Comece anotando toda movimentação e revise semanalmente.' },
    { h: 'Faturamento, receita, lucro e saldo', p: 'Faturamento é tudo que você vendeu. Receita é o valor reconhecido das vendas. Lucro é o que sobra após custos e despesas. Saldo é o dinheiro disponível no caixa. Exemplo: vendeu R$ 1.000, gastou R$ 800 → lucro R$ 200, mesmo que o saldo seja diferente por contas a receber.' },
    { h: 'Finanças pessoais x empresariais', p: 'Separe as contas do negócio das pessoais. Use contas ou carteiras distintas para não misturar e conseguir medir o resultado real da empresa.' }
  ], g: ['Faturamento: total vendido.', 'Lucro: sobra após custos e despesas.', 'Saldo: dinheiro disponível.'],
    q: [{ q: 'Vendi R$ 1.000 e gastei R$ 800. Qual o lucro?', o: ['R$ 1.800', 'R$ 200', 'R$ 800'], c: 1, e: 'Lucro = 1.000 − 800 = R$ 200.' }] },
  { t: 'Módulo 2 — Custos e despesas', l: [
    { h: 'Custos fixos e variáveis', p: 'Fixos não mudam com as vendas (aluguel, internet). Variáveis mudam conforme você vende (comissão, embalagem, taxas de cartão).' },
    { h: 'Custos diretos e indiretos', p: 'Diretos estão ligados diretamente ao produto (matéria-prima). Indiretos são rateados entre os produtos (aluguel da oficina).' },
    { h: 'Impacto das despesas no lucro', p: 'Cada despesa reduz o lucro. Conhecer o total de despesas por venda ajuda a definir preços que realmente cubram os custos.' }
  ], g: ['Custo fixo: não varia com vendas.', 'Custo variável: varia com vendas.', 'Rateio: distribuição de custos indiretos.'],
    q: [{ q: 'Comissão sobre vendas é uma despesa…', o: ['Fixa', 'Variável', 'Indireta fixa'], c: 1, e: 'Comissões variam conforme as vendas, logo são despesas variáveis.' }] },
  { t: 'Módulo 3 — Precificação', l: [
    { h: 'Conceito de markup', p: 'Markup é o fator sobre o custo que forma o preço. Divisor = 1 − (variáveis% + fixas% + lucro%); multiplicador = 1 ÷ divisor.' },
    { h: 'Formação do preço de venda', p: 'Preço sugerido = custo direto ÷ markup divisor. Exemplo: custo R$ 20, divisor 0,50 → preço R$ 40.' },
    { h: 'Margem de lucro', p: 'Margem é o percentual de lucro sobre o preço. Revise sempre que custos ou despesas mudarem.' },
    { h: 'Taxas, impostos e comissões', p: 'Inclua-os nas despesas variáveis. Use apenas percentuais reais do seu negócio.' },
    { h: 'Erros comuns', p: 'Esquecer taxas de cartão, não ratear despesas fixas e contar a mesma despesa duas vezes.' }
  ], g: ['Markup divisor: 1 − soma dos percentuais.', 'Preço sugerido: custo ÷ divisor.', 'Margem: lucro sobre o preço.'],
    q: [{ q: 'Custo R$ 20 e divisor 0,50. Preço sugerido?', o: ['R$ 10', 'R$ 40', 'R$ 60'], c: 1, e: 'Preço = 20 ÷ 0,50 = R$ 40.' }] },
  { t: 'Módulo 4 — Fluxo de caixa', l: [
    { h: 'Registro de entradas e saídas', p: 'Registre tudo com data. Separe realizado de previsto.' },
    { h: 'Controle de vencimentos', p: 'Acompanhe o que vence e evite atrasos e juros.' },
    { h: 'Projeção de saldo', p: 'Some o que ainda vai entrar e sair para prever o saldo futuro e antecipar falta de caixa.' },
    { h: 'Organização dos pagamentos', p: 'Agrupe pagamentos por data e priorize essenciais.' }
  ], g: ['Saldo realizado: já pago/recebido.', 'Saldo projetado: inclui pendentes.'],
    q: [{ q: 'O saldo projetado inclui contas pendentes?', o: ['Não', 'Sim', 'Só despesas'], c: 1, e: 'O saldo projetado considera também o que está pendente.' }] },
  { t: 'Módulo 5 — Planejamento empresarial', l: [
    { h: 'Capital de giro', p: 'É o dinheiro para manter a operação rodando entre receber e pagar.' },
    { h: 'Metas financeiras', p: 'Defina metas com valor e prazo e acompanhe o progresso.' },
    { h: 'Análise de resultados', p: 'Compare períodos e categorias para entender o que melhora o lucro.' },
    { h: 'Períodos de baixa venda', p: 'Mantenha uma reserva para meses mais fracos.' }
  ], g: ['Capital de giro: sustenta a operação.', 'Reserva: proteção para baixa venda.'],
    q: [{ q: 'Capital de giro serve para…', o: ['Comprar imóvel', 'Manter a operação rodando', 'Pagar só impostos'], c: 1, e: 'É o recurso para manter o negócio funcionando no dia a dia.' }] }
];
function renderAprenda() {
  var el = $('aprendaModulos');
  if (el.dataset.pronto === '1') return;
  el.innerHTML = MODULOS.map(function (m, mi) {
    var licoes = m.l.map(function (l) { return '<h3>' + esc(l.h) + '</h3><p>' + esc(l.p) + '</p>'; }).join('');
    var glos = '<h3>Glossário</h3><ul class="ticks">' + m.g.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>';
    var quiz = '<div class="quiz" data-quiz="' + mi + '"><p><b>Exercício:</b> ' + esc(m.q[0].q) + '</p>' +
      m.q[0].o.map(function (o, oi) { return '<label class="opt"><input type="radio" name="q' + mi + '" value="' + oi + '"> ' + esc(o) + '</label>'; }).join('') +
      '<button type="button" class="btn" data-corrige="' + mi + '">Corrigir</button><p class="fb" role="status"></p></div>';
    return '<details class="lesson"><summary>' + esc(m.t) + '</summary><div class="lesson-body">' + licoes + glos + quiz + '</div></details>';
  }).join('');
  el.dataset.pronto = '1';
}
$('aprendaModulos').addEventListener('click', function (e) {
  var mi = e.target.getAttribute('data-corrige'); if (mi == null) return;
  var box = e.target.closest('.quiz'); var fb = box.querySelector('.fb');
  var sel = box.querySelector('input:checked');
  if (!sel) { fb.textContent = 'Selecione uma alternativa.'; fb.style.color = 'var(--aviso)'; return; }
  var mod = MODULOS[mi];
  if (Number(sel.value) === mod.q[0].c) { fb.textContent = 'Correto! ' + mod.q[0].e; fb.style.color = 'var(--ok)'; }
  else { fb.textContent = 'Não é essa. ' + mod.q[0].e; fb.style.color = 'var(--erro)'; }
});

/* ---------- Configurações e acessibilidade ---------- */
function aplicaCfg() {
  var c = S.cfg, h = document.documentElement;
  h.dataset.tema = c.tema;
  h.dataset.contraste = c.contraste ? '1' : '0';
  h.dataset.leitura = c.leitura ? '1' : '0';
  h.dataset.anim = c.anim ? '1' : '0';
  h.style.fontSize = c.fonte + '%';
  $('cfTema').value = c.tema;
  $('cfContraste').checked = !!c.contraste;
  $('cfLeitura').checked = !!c.leitura;
  $('cfAnim').checked = !c.anim;
  $('cfMoeda').value = c.moeda;
  $('cfData').value = c.dataFmt;
  $('cfCat').value = c.cat;
  $('cfLembretes').checked = !!c.lembretes;
}
$('cfTema').addEventListener('change', function () { S.cfg.tema = this.value; salva(); aplicaCfg(); });
$('cfContraste').addEventListener('change', function () { S.cfg.contraste = this.checked ? 1 : 0; salva(); aplicaCfg(); });
$('cfLeitura').addEventListener('change', function () { S.cfg.leitura = this.checked ? 1 : 0; salva(); aplicaCfg(); });
$('cfAnim').addEventListener('change', function () { S.cfg.anim = this.checked ? 0 : 1; salva(); aplicaCfg(); });
$('cfMoeda').addEventListener('change', function () { S.cfg.moeda = this.value; salva(); atualizaTudo(); });
$('cfData').addEventListener('change', function () { S.cfg.dataFmt = this.value; salva(); atualizaTudo(); });
$('cfCat').addEventListener('change', function () { S.cfg.cat = this.value; salva(); atualizaDatalists(); });
$('cfLembretes').addEventListener('change', function () { S.cfg.lembretes = this.checked ? 1 : 0; salva(); });
$('fMais').addEventListener('click', function () { S.cfg.fonte = Math.min(200, S.cfg.fonte + 10); salva(); aplicaCfg(); });
$('fMenos').addEventListener('click', function () { S.cfg.fonte = Math.max(80, S.cfg.fonte - 10); salva(); aplicaCfg(); });
$('fReset').addEventListener('click', function () { S.cfg.fonte = 100; salva(); aplicaCfg(); });
$('exportaTudo').addEventListener('click', function () {
  download('resoluta-dados.json', JSON.stringify(S, null, 2), 'application/json');
  msg('cfMsg', 'Arquivo de dados gerado.', true);
});
$('apagaTudo').addEventListener('click', function () {
  if (!confirm('Apagar TODOS os dados deste navegador? Esta ação não pode ser desfeita.')) return;
  try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
  S = carrega(); aplicaCfg(); atualizaDatalists(); msg('cfMsg', 'Dados apagados.', true);
});

/* Leitura em voz alta */
var tts = 'speechSynthesis' in window;
function voz(fn) { if (!tts) { msg('cfMsg', 'Seu navegador não suporta leitura em voz alta.', false); return; } fn(); }
$('lerBtn').addEventListener('click', function () {
  voz(function () {
    speechSynthesis.cancel();
    var vis = paginas.map(function (p) { return $('p-' + p); }).filter(function (s) { return s && !s.hidden; })[0];
    if (!vis) return;
    var u = new SpeechSynthesisUtterance(vis.innerText);
    u.lang = 'pt-BR'; speechSynthesis.speak(u);
  });
});
$('pausaBtn').addEventListener('click', function () {
  voz(function () { if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause(); else speechSynthesis.resume(); });
});
$('paraBtn').addEventListener('click', function () { voz(function () { speechSynthesis.cancel(); }); });

/* ---------- Conta (demonstração local) ---------- */
function hashSenha(senha, salt) {
  /* Demonstração: hash simples no navegador. NÃO é segurança real. */
  var str = salt + '::' + senha, h = 5381;
  for (var i = 0; i < str.length; i++) { h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; }
  return 'd' + h.toString(16);
}
function renderConta() {
  var logado = !!S.sessao;
  $('contaLogado').hidden = !logado;
  $('contaFormularios').hidden = logado;
  if (logado) $('contaNome').textContent = S.sessao.nome + ' (' + S.sessao.email + ')';
}
$('fCadastro').addEventListener('submit', function (e) {
  e.preventDefault();
  var nome = $('cadNome').value.trim(), email = $('cadEmail').value.trim().toLowerCase(), senha = $('cadSenha').value;
  if (!nome) return msg('cadMsg', 'Informe seu nome.', false);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return msg('cadMsg', 'Informe um e-mail válido.', false);
  if (senha.length < 6) return msg('cadMsg', 'A senha deve ter ao menos 6 caracteres.', false);
  var salt = uid();
  S.conta = { nome: nome, email: email, salt: salt, hash: hashSenha(senha, salt) };
  S.sessao = { nome: nome, email: email };
  if (salva()) { msg('cadMsg', 'Perfil local criado.', true); $('fCadastro').reset(); renderConta(); toast('Bem-vindo(a), ' + nome + '!'); }
});
$('fLogin').addEventListener('submit', function (e) {
  e.preventDefault();
  var email = $('logEmail').value.trim().toLowerCase(), senha = $('logSenha').value;
  if (!S.conta) return msg('logMsg', 'Nenhum perfil cadastrado neste navegador. Crie um perfil ao lado.', false);
  if (email !== S.conta.email || hashSenha(senha, S.conta.salt) !== S.conta.hash) return msg('logMsg', 'E-mail ou senha incorretos.', false);
  S.sessao = { nome: S.conta.nome, email: S.conta.email };
  if (salva()) { msg('logMsg', 'Sessão iniciada.', true); $('fLogin').reset(); renderConta(); toast('Olá de novo, ' + S.conta.nome + '!'); }
});
$('contaSair').addEventListener('click', function () { S.sessao = null; salva(); renderConta(); toast('Sessão encerrada.'); });

/* ---------- Contato ---------- */
$('fContato').addEventListener('submit', function (e) {
  e.preventDefault();
  var nome = $('ctNome').value.trim(), email = $('ctEmail').value.trim(), assunto = $('ctAssunto').value.trim(), msgTxt = $('ctMensagem').value.trim();
  if (!nome || !email || !msgTxt) return msg('ctMsg', 'Preencha nome, e-mail e mensagem.', false);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return msg('ctMsg', 'Informe um e-mail válido.', false);
  var corpo = encodeURIComponent(msgTxt + '\n\n— ' + nome + ' (' + email + ')');
  var link = 'mailto:?subject=' + encodeURIComponent(assunto || 'Contato pelo site Resoluta') + '&body=' + corpo;
  window.location.href = link;
  msg('ctMsg', 'Abrimos seu aplicativo de e-mail com a mensagem preenchida. Se nada abrir, copie o texto e envie pelo Instagram @resoluta.agi.', true);
});

/* ---------- Cookies ---------- */
$('cookie').hidden = !!S.cfg.cookie;
$('cookieOk').addEventListener('click', function () { S.cfg.cookie = 1; salva(); $('cookie').hidden = true; toast('Preferência salva.'); });
$('cookieNao').addEventListener('click', function () { S.cfg.cookie = 1; salva(); $('cookie').hidden = true; toast('Preferência salva. Apenas o essencial será usado.'); });

/* ---------- Datalists ---------- */
function atualizaDatalists() {
  var cats = (S.cfg.cat || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  S.prod.forEach(function (p) { if (p.cat && cats.indexOf(p.cat) < 0) cats.push(p.cat); });
  $('listaCategorias').innerHTML = cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  $('listaProdutos').innerHTML = S.prod.map(function (p) { return '<option value="' + esc(p.nome) + '">'; }).join('');
}

/* ---------- Atualização geral ---------- */
function atualizaTudo() {
  var h = (location.hash || '#inicio').slice(1);
  if (h === 'painel') renderPainel();
  if (h === 'produtos') renderProd();
  if (h === 'lancamentos') renderLanc();
  if (h === 'fluxo') renderFluxo();
  if (h === 'contas') renderContas();
  if (h === 'planejamento') renderMetas();
}

/* ---------- Inicialização ---------- */
aplicaCfg();
atualizaDatalists();
rota();
if (!S.cfg.cookie) $('cookie').hidden = false;

})();
