/* script.js
   Front-end only: localStorage persistence, calculadora, CRUD produtos/lancamentos,
   dashboard, CSV export, assistente simples, preferências e cookie consent.
*/

/* Storage keys */
const STORE_PRODUCTS = 'resoluta_products_v1';
const STORE_TRANSACTIONS = 'resoluta_transactions_v1';
const STORE_PREFS = 'resoluta_prefs_v1';
const STORE_COOKIES = 'resoluta_cookie_consent_v1';

/* Helpers */
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);
const fmtBRL = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v || 0));

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupCookieBanner();
  setupPrefs();
  setupCalculator();
  renderProducts();
  renderTransactions();
  renderDashboard();
  setupModals();
  setupExports();
  setupAccessibilityHelpers();
});

/* NAV toggle */
function setupNav(){
  const toggle = $('navToggle');
  const nav = $('navMain');
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.style.display = expanded ? '' : 'block';
  });
}

/* Cookie banner */
function setupCookieBanner(){
  const banner = $('cookieBanner');
  const consent = localStorage.getItem(STORE_COOKIES);
  if (!consent) banner.hidden = false;
  $('acceptAll').addEventListener('click', () => {
    localStorage.setItem(STORE_COOKIES, JSON.stringify({essential:true,analytics:true,marketing:true}));
    banner.hidden = true;
  });
  $('rejectAll').addEventListener('click', () => {
    localStorage.setItem(STORE_COOKIES, JSON.stringify({essential:true,analytics:false,marketing:false}));
    banner.hidden = true;
  });
  $('manageCookies').addEventListener('click', () => {
    alert('Painel de cookies ainda em desenvolvimento. Preferências salvas no navegador.');
  });
}

/* Preferences (appearance, saldo inicial) */
function setupPrefs(){
  const prefs = loadPrefs();
  if (prefs){
    if (prefs.theme === 'dark') document.body.classList.add('theme-dark');
    if (prefs.fontSize) {
      $('fontSize').value = prefs.fontSize;
      document.documentElement.style.fontSize = prefs.fontSize + 'px';
      $('fontSizeLabel').textContent = prefs.fontSize;
    }
    if (typeof prefs.highContrast !== 'undefined') $('highContrast')?.checked = prefs.highContrast;
    if (typeof prefs.saldoInicial !== 'undefined') $('saldoInicialInput').value = prefs.saldoInicial;
  }
  $('fontSize').addEventListener('input', (e)=> {
    const v = e.target.value;
    $('fontSizeLabel').textContent = v;
    document.documentElement.style.fontSize = v + 'px';
  });
  $('savePrefs').addEventListener('click', () => {
    const theme = document.querySelector('input[name="theme"]:checked').value;
    if (theme === 'dark') document.body.classList.add('theme-dark'); else document.body.classList.remove('theme-dark');
    const prefsNew = {
      theme,
      highContrast: $('highContrast').checked,
      fontSize: $('fontSize').value,
      saldoInicial: Number($('saldoInicialInput').value || 0)
    };
    localStorage.setItem(STORE_PREFS, JSON.stringify(prefsNew));
    alert('Preferências salvas (armazenadas localmente).');
    renderDashboard();
  });

  $('resetData').addEventListener('click', () => {
    if (!confirm('Confirma limpar todos os dados locais (produtos e lançamentos)?')) return;
    localStorage.removeItem(STORE_PRODUCTS);
    localStorage.removeItem(STORE_TRANSACTIONS);
    alert('Dados locais removidos.');
    renderProducts();
    renderTransactions();
    renderDashboard();
  });
}

/* Load prefs helper */
function loadPrefs(){
  try { return JSON.parse(localStorage.getItem(STORE_PREFS) || 'null'); }
  catch(e){ return null; }
}

/* Calculator */
function setupCalculator(){
  const calcBtn = $('calcBtn');
  const clearCalc = $('clearCalc');
  const resultBox = $('calcResult');

  calcBtn.addEventListener('click', () => {
    const costUnit = Number($('costUnit').value);
    if (!costUnit || costUnit <= 0) { resultBox.textContent = 'Informe um custo direto unitário maior que zero.'; return; }

    const percentVar = Number($('percentVar').value) || 0;
    const percentFix = Number($('percentFix').value) || 0;
    const percentProfit = Number($('percentProfit').value) || 0;
    const impostos = Number($('impostos').value) || 0;
    const taxas = Number($('taxas').value) || 0;
    const quantity = Number($('quantity').value) || 1;

    // Convert percent to decimal
    const pv = percentVar/100, pf = percentFix/100, pp = percentProfit/100, imp = impostos/100, tx = taxas/100;
    const soma = pv + pf + pp + imp + tx;
    const divisor = 1 - soma;

    if (divisor <= 0) {
      resultBox.innerHTML = `<strong>Erro:</strong> Markup inválido (divisor ≤ 0). Reduza percentuais.`;
      return;
    }

    const mult = 1 / divisor;
    const precoSugerido = costUnit * mult;
    const valorTotal = precoSugerido * quantity;
    const custoTotal = costUnit * quantity;
    const lucroBruto = valorTotal - custoTotal;
    const despFixVal = pf * valorTotal;
    const despVarVal = pv * valorTotal;
    const impostosVal = imp * valorTotal;
    const taxasVal = tx * valorTotal;
    const lucroLiquido = lucroBruto - despFixVal - despVarVal - impostosVal - taxasVal;
    const margemResult = valorTotal ? lucroLiquido / valorTotal : 0;

    resultBox.innerHTML = `
      <div><strong>Markup divisor:</strong> ${divisor.toFixed(4)}</div>
      <div><strong>Markup multiplicador:</strong> ${mult.toFixed(4)}</div>
      <div><strong>Preço sugerido:</strong> ${fmtBRL(precoSugerido)}</div>
      <div><strong>Quantidade:</strong> ${quantity}</div>
      <div><strong>Valor total (vendas):</strong> ${fmtBRL(valorTotal)}</div>
      <div><strong>Custo total:</strong> ${fmtBRL(custoTotal)}</div>
      <div><strong>Lucro bruto:</strong> ${fmtBRL(lucroBruto)}</div>
      <div><strong>Despesas fixas (valor):</strong> ${fmtBRL(despFixVal)}</div>
      <div><strong>Despesas variáveis (valor):</strong> ${fmtBRL(despVarVal)}</div>
      <div><strong>Impostos (valor):</strong> ${fmtBRL(impostosVal)}</div>
      <div><strong>Taxas (valor):</strong> ${fmtBRL(taxasVal)}</div>
      <div><strong>Lucro líquido estimado:</strong> ${fmtBRL(lucroLiquido)}</div>
      <div><strong>Margem resultante:</strong> ${(margemResult*100).toFixed(2)}%</div>
    `;
  });

  clearCalc.addEventListener('click', () => {
    $('calcForm').reset();
    $('calcResult').innerHTML = '';
  });
}

/* Products CRUD (localStorage) */
function getProducts(){ try { return JSON.parse(localStorage.getItem(STORE_PRODUCTS) || '[]'); } catch(e){ return []; } }
function saveProducts(arr){ localStorage.setItem(STORE_PRODUCTS, JSON.stringify(arr)); }

function renderProducts(){
  const list = $('productsList');
  const arr = getProducts();
  if (arr.length === 0){ list.innerHTML = '<p>Você ainda não cadastrou produtos.</p>'; $('panelProductsCount') && ($('panelProductsCount').textContent = '0'); return; }
  $('panelProductsCount') && ($('panelProductsCount').textContent = arr.length);
  list.innerHTML = arr.map(p=>{
    return `<div class="item" data-id="${p.id}">
      <div>
        <h4>${escapeHtml(p.name)}</h4>
        <small>${escapeHtml(p.category || '')} • ${escapeHtml(p.description || '')}</small>
        <div><strong>Preço:</strong> ${fmtBRL(p.price || 0)} • <strong>Custo:</strong> ${fmtBRL(p.cost_unit || 0)} • <strong>Qtd:</strong> ${p.quantity||0}</div>
      </div>
      <div>
        <button class="btn small" data-action="edit" aria-label="Editar ${escapeHtml(p.name)}">Editar</button>
        <button class="btn small" data-action="delete" aria-label="Excluir ${escapeHtml(p.name)}">Excluir</button>
      </div>
    </div>`;
  }).join('');
  // attach handlers
  list.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.item').dataset.id;
      const action = e.target.dataset.action;
      if (action === 'edit') openProductModal(id);
      if (action === 'delete') {
        if (!confirm('Confirma exclusão do produto?')) return;
        const newArr = getProducts().filter(x=>x.id!==id);
        saveProducts(newArr);
        renderProducts(); renderDashboard();
      }
    });
  });
}

/* New product modal */
function openProductModal(id){
  const modal = showModal();
  const isEdit = !!id;
  const prod = isEdit ? getProducts().find(p=>p.id===id) : {name:'',category:'',description:'',cost_unit:0,price:0,quantity:0};
  modal.querySelector('#modalBody').innerHTML = `
    <h3>${isEdit? 'Editar' : 'Novo'} produto</h3>
    <form id="productForm">
      <label>Nome<input name="name" required value="${escapeAttr(prod.name)}"></label>
      <label>Categoria<input name="category" value="${escapeAttr(prod.category)}"></label>
      <label>Descrição<textarea name="description">${escapeAttr(prod.description)}</textarea></label>
      <label>Custo unitário (R$)<input name="cost_unit" type="number" step="0.01" value="${prod.cost_unit}"></label>
      <label>Preço de venda (R$)<input name="price" type="number" step="0.01" value="${prod.price}"></label>
      <label>Quantidade disponível<input name="quantity" type="number" value="${prod.quantity || 0}"></label>
      <div style="margin-top:0.5rem">
        <button type="submit" class="btn primary">${isEdit? 'Salvar' : 'Criar'}</button>
        <button type="button" id="cancelProd" class="btn ghost">Cancelar</button>
      </div>
    </form>
  `;
  modal.querySelector('#cancelProd').addEventListener('click', hideModal);
  modal.querySelector('#productForm').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const obj = {
      id: isEdit ? prod.id : String(Date.now()),
      name: fd.get('name').trim(),
      category: fd.get('category').trim(),
      description: fd.get('description').trim(),
      cost_unit: parseFloat(fd.get('cost_unit') || 0),
      price: parseFloat(fd.get('price') || 0),
      quantity: parseInt(fd.get('quantity') || 0, 10),
      created_at: new Date().toISOString()
    };
    if (!obj.name || obj.cost_unit<=0) { alert('Nome e custo unitário (>0) são obrigatórios.'); return; }
    let arr = getProducts();
    if (isEdit) arr = arr.map(x=> x.id===obj.id ? obj : x);
    else arr.unshift(obj);
    saveProducts(arr);
    hideModal(); renderProducts(); renderDashboard();
  });
}

/* Transactions CRUD */
function getTransactions(){ try { return JSON.parse(localStorage.getItem(STORE_TRANSACTIONS) || '[]'); } catch(e){ return []; } }
function saveTransactions(arr){ localStorage.setItem(STORE_TRANSACTIONS, JSON.stringify(arr)); }

function renderTransactions(){
  const list = $('transactionsList');
  const arr = getTransactions();
  if (!arr.length){ list.innerHTML = '<p>Sem lançamentos cadastrados.</p>'; return; }
  list.innerHTML = arr.map(t=>{
    return `<div class="item" data-id="${t.id}">
      <div>
        <h4>${(t.type==='income' ? 'Receita' : 'Despesa')} • ${escapeHtml(t.category||'')}</h4>
        <small>${escapeHtml(t.description||'')}</small>
        <div><strong>Valor:</strong> ${fmtBRL(t.amount)} • <strong>Competência:</strong> ${escapeHtml(t.date_competence||'—')} • <strong>Status:</strong> ${escapeHtml(t.status||'pendente')}</div>
      </div>
      <div>
        <button class="btn small" data-action="edit">Editar</button>
        <button class="btn small" data-action="delete">Excluir</button>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.closest('.item').dataset.id;
      const action = e.target.dataset.action;
      if (action === 'edit') openTransactionModal(id);
      if (action === 'delete') {
        if (!confirm('Confirmar exclusão do lançamento?')) return;
        const newArr = getTransactions().filter(x=>x.id!==id);
        saveTransactions(newArr);
        renderTransactions(); renderDashboard();
      }
    });
  });
}

/* Transaction modal */
function openTransactionModal(id){
  const modal = showModal();
  const isEdit = !!id;
  const trx = isEdit ? getTransactions().find(t=>t.id===id) : {type:'expense',category:'',description:'',amount:0,date_competence:'',date_payment:'',date_due:'',status:'pending',payment_method:''};
  modal.querySelector('#modalBody').innerHTML = `
    <h3>${isEdit? 'Editar' : 'Novo'} lançamento</h3>
    <form id="trxForm">
      <label>Tipo
        <select name="type">
          <option value="income" ${trx.type==='income' ? 'selected':''}>Receita</option>
          <option value="expense" ${trx.type==='expense' ? 'selected':''}>Despesa</option>
        </select>
      </label>
      <label>Categoria<input name="category" value="${escapeAttr(trx.category)}"></label>
      <label>Descrição<textarea name="description">${escapeAttr(trx.description)}</textarea></label>
      <label>Valor (R$)<input name="amount" type="number" step="0.01" value="${trx.amount}"></label>
      <label>Data de competência<input name="date_competence" type="date" value="${trx.date_competence||''}"></label>
      <label>Data de pagamento/recebimento<input name="date_payment" type="date" value="${trx.date_payment||''}"></label>
      <label>Data de vencimento<input name="date_due" type="date" value="${trx.date_due||''}"></label>
      <label>Status
        <select name="status">
          <option value="pending" ${trx.status==='pending'?'selected':''}>Pendente</option>
          <option value="paid" ${trx.status==='paid'?'selected':''}>Pago</option>
          <option value="received" ${trx.status==='received'?'selected':''}>Recebido</option>
          <option value="overdue" ${trx.status==='overdue'?'selected':''}>Vencido</option>
        </select>
      </label>
      <label>Forma de pagamento<input name="payment_method" value="${escapeAttr(trx.payment_method)}"></label>
      <div style="margin-top:0.5rem">
        <button type="submit" class="btn primary">${isEdit? 'Salvar' : 'Criar'}</button>
        <button type="button" id="cancelTrx" class="btn ghost">Cancelar</button>
      </div>
    </form>
  `;
  modal.querySelector('#cancelTrx').addEventListener('click', hideModal);
  modal.querySelector('#trxForm').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const obj = {
      id: isEdit ? trx.id : String(Date.now()),
      type: fd.get('type'),
      category: fd.get('category'),
      description: fd.get('description'),
      amount: Number(fd.get('amount')||0),
      date_competence: fd.get('date_competence'),
      date_payment: fd.get('date_payment'),
      date_due: fd.get('date_due'),
      status: fd.get('status'),
      payment_method: fd.get('payment_method'),
      created_at: new Date().toISOString()
    };
    if (!obj.amount || obj.amount <= 0) { alert('Informe um valor maior que zero.'); return; }
    let arr = getTransactions();
    if (isEdit) arr = arr.map(x=> x.id===obj.id ? obj : x);
    else arr.unshift(obj);
    saveTransactions(arr);
    hideModal(); renderTransactions(); renderDashboard();
  });
}

/* Dashboard calculations */
function renderDashboard(){
  const prefs = loadPrefs() || {};
  const saldoInicial = Number(prefs.saldoInicial || 0);
  const txs = getTransactions();
  const incomes = txs.filter(t=>t.type==='income' && (t.status==='received' || t.status==='paid')).reduce((s,t)=>s + Number(t.amount||0),0);
  const expenses = txs.filter(t=>t.type==='expense' && (t.status==='paid' || t.status==='received')).reduce((s,t)=>s + Number(t.amount||0),0);
  const contasPagar = txs.filter(t=>t.type==='expense' && t.status!=='paid').reduce((s,t)=>s + Number(t.amount||0),0);
  const contasReceber = txs.filter(t=>t.type==='income' && t.status!=='received').reduce((s,t)=>s + Number(t.amount||0),0);
  const resultado = incomes - expenses;
  $('saldoInicial').textContent = fmtBRL(saldoInicial);
  $('receitas').textContent = fmtBRL(incomes);
  $('despesas').textContent = fmtBRL(expenses);
  $('resultado').textContent = fmtBRL(resultado);
  $('contasPagar').textContent = fmtBRL(contasPagar);
  $('contasReceber').textContent = fmtBRL(contasReceber);
  $('panelProductsCount') && ($('panelProductsCount').textContent = getProducts().length);

  // Simple flow chart: last 30 days grouped by day (income-expense)
  renderFlowChart(txs);
}

/* Simple SVG flow chart implementation */
function renderFlowChart(txs){
  const svg = $('flowSvg');
  const today = new Date();
  const days = 15; // show last 15 days for readability
  const labels = [];
  const series = [];
  for (let i=days-1;i>=0;i--){
    const d = new Date(); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0,10);
    labels.push(key);
    series.push({date:key, income:0, expense:0});
  }
  txs.forEach(t=>{
    const comp = t.date_competence ? t.date_competence.slice(0,10) : null;
    if (!comp) return;
    const idx = series.findIndex(s=>s.date===comp);
    if (idx>=0){
      if (t.type==='income') series[idx].income += Number(t.amount||0);
      else series[idx].expense += Number(t.amount||0);
    }
  });
  const max = Math.max(...series.flatMap(s=>[s.income,s.expense]),1);
  // draw bars
  const w = svg.clientWidth || 600;
  const h = 120;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = '';
  const bw = Math.max(4, Math.floor(w / (series.length * 2)));
  series.forEach((s,i)=>{
    const x = 10 + i * bw * 2;
    const incomeH = (s.income / max) * (h - 30);
    const expenseH = (s.expense / max) * (h - 30);
    const incY = h - incomeH - 10;
    const expY = h - expenseH - 10;
    const rectInc = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rectInc.setAttribute('x', x); rectInc.setAttribute('y', incY); rectInc.setAttribute('width', bw); rectInc.setAttribute('height', incomeH);
    rectInc.setAttribute('fill', '#2e8b57'); rectInc.setAttribute('title', `Receita ${s.date}: ${fmtBRL(s.income)}`);
    svg.appendChild(rectInc);
    const rectExp = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rectExp.setAttribute('x', x + bw); rectExp.setAttribute('y', expY); rectExp.setAttribute('width', bw); rectExp.setAttribute('height', expenseH);
    rectExp.setAttribute('fill', '#b03a2e'); rectExp.setAttribute('title', `Despesa ${s.date}: ${fmtBRL(s.expense)}`);
    svg.appendChild(rectExp);
  });
}

/* Modal management */
function setupModals(){
  const modal = $('modal');
  modal.querySelector('.modal-close').addEventListener('click', hideModal);
  modal.addEventListener('click', (e)=> { if (e.target === modal) hideModal(); });
  // New product / transaction buttons
  $('btnNewProduct').addEventListener('click', ()=> openProductModal());
  $('btnNewTransaction').addEventListener('click', ()=> openTransactionModal());
}

/* show/hide modal helpers */
function showModal(){
  const modal = $('modal');
  modal.setAttribute('aria-hidden','false');
  modal.querySelector('#modalBody').innerHTML = ''; // ensure exists
  return modal;
}
function hideModal(){
  const modal = $('modal');
  modal.setAttribute('aria-hidden','true');
}

/* CSV export */
function setupExports(){
  $('exportProducts').addEventListener('click', exportProductsCSV);
  $('exportTransactions').addEventListener('click', exportTransactionsCSV);
}
function exportProductsCSV(){
  const arr = getProducts();
  if (!arr.length){ alert('Nenhum produto para exportar.'); return; }
  const rows = [['id','name','category','description','cost_unit','price','quantity','created_at']];
  arr.forEach(p => rows.push([p.id,p.name,p.category,p.description,p.cost_unit,p.price,p.quantity,p.created_at]));
  downloadCSV(rows, 'products.csv');
}
function exportTransactionsCSV(){
  const arr = getTransactions();
  if (!arr.length){ alert('Nenhum lançamento para exportar.'); return; }
  const rows = [['id','type','category','description','amount','date_competence','date_payment','date_due','status','payment_method','created_at']];
  arr.forEach(t=> rows.push([t.id,t.type,t.category,t.description,t.amount,t.date_competence,t.date_payment,t.date_due,t.status,t.payment_method,t.created_at]));
  downloadCSV(rows, 'transactions.csv');
}
function downloadCSV(rows, filename){
  const csv = rows.map(r => r.map(cell => `"${String(cell||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* Small assistant (rule-based) */
function assistantAnswer(question){
  const ql = (question||'').toLowerCase();
  if (!ql) return 'Pergunte algo sobre markup, precificação, despesas ou o uso das ferramentas.';
  if (ql.includes('markup') || ql.includes('preço')) return 'O markup ajuda a formar preço: informe custo direto, despesas variáveis e fixas (%) e margem desejada. Preço sugerido = custo / (1 - soma_percentuais).';
  if (ql.includes('lucro') || ql.includes('margem')) return 'Lucro bruto = receita − custo dos itens vendidos. Lucro líquido = lucro bruto − despesas (fixas+variáveis) − impostos − taxas.';
  if (ql.includes('fluxo')) return 'Fluxo de caixa registra entradas e saídas por data; diferencie valores recebidos/pagos de previstos (pendentes).';
  return 'Desculpe — posso explicar conceitos e como usar as ferramentas, mas não substituir orientação contábil especializada.';
}

/* Accessibility helpers */
function setupAccessibilityHelpers(){
  // focus visible styles for keyboard users already handled in CSS with :focus
  // Add live region notices when needed (aria-live used in DOM)
}

/* Utilities */
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function escapeAttr(s){ return String(s||'').replace(/"/g,'&quot;'); }

/* Expose some functions for debug (optional) */
window._resoluta = {
  getProducts, saveProducts, getTransactions, saveTransactions, renderDashboard, assistantAnswer
};
