const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const loginScreen = $('#loginScreen');
const loginForm = $('#loginForm');
const loginPassword = $('#loginPassword');
const loginError = $('#loginError');
const app = $('#app');
const logoutBtn = $('#logoutBtn');
const kindTabs = $('#kindTabs');
const categoryFilter = $('#categoryFilter');
const newItemBtn = $('#newItemBtn');
const itemsGrid = $('#itemsGrid');
const statusBanner = $('#statusBanner');

const editorOverlay = $('#editorOverlay');
const editorForm = $('#editorForm');
const editorTitle = $('#editorTitle');
const editorClose = $('#editorClose');
const cancelBtn = $('#cancelBtn');
const deleteBtn = $('#deleteBtn');
const variantsList = $('#variantsList');
const addVariantBtn = $('#addVariantBtn');

let state = { menuCategories: [], menuProducts: [], promoProducts: [] };
let activeKind = 'product';
let activeCategory = 'todos';

function formatMoney(n){ return `R$ ${Number(n||0).toFixed(2).replace('.', ',')}`; }

function showStatus(msg, isError=false){
  statusBanner.textContent = msg;
  statusBanner.classList.toggle('is-error', isError);
  statusBanner.hidden = false;
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(()=>{ statusBanner.hidden = true; }, 3500);
}

async function api(path, options={}){
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
    credentials: 'same-origin'
  });
  if(res.status === 401){ showApp(false); throw new Error('not_authenticated'); }
  const data = await res.json().catch(()=>({}));
  if(!res.ok){ throw new Error(data.error || 'request_failed'); }
  return data;
}

// ---------- auth ----------
function showApp(loggedIn){
  loginScreen.hidden = loggedIn;
  app.hidden = !loggedIn;
}

async function checkSession(){
  try{
    const data = await api('/api/admin/session');
    showApp(!!data.loggedIn);
    if(data.loggedIn) await loadData();
  }catch(e){ showApp(false); }
}

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  loginError.hidden = true;
  try{
    await api('/api/admin/login', { method:'POST', body: JSON.stringify({ password: loginPassword.value }) });
    loginPassword.value = '';
    showApp(true);
    await loadData();
  }catch(err){
    loginError.textContent = err.message === 'too_many_attempts'
      ? 'Muitas tentativas. Aguarde alguns minutos.'
      : 'Senha incorreta.';
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener('click', async ()=>{
  await api('/api/admin/logout', { method:'POST' }).catch(()=>{});
  showApp(false);
});

// ---------- data loading ----------
async function loadData(){
  try{
    state = await api('/api/admin/menu');
    populateCategoryFilter();
    renderGrid();
  }catch(e){
    showStatus('Não foi possível carregar o cardápio.', true);
  }
}

function currentList(){
  return activeKind === 'promo' ? state.promoProducts : state.menuProducts;
}

function populateCategoryFilter(){
  const cats = state.menuCategories.filter(([f])=>f!=='todos');
  categoryFilter.innerHTML = ['<option value="todos">Todas as categorias</option>']
    .concat(cats.map(([f,l])=>`<option value="${f}">${l}</option>`)).join('');
  categoryFilter.value = activeCategory;
}

kindTabs.addEventListener('click', (e)=>{
  const btn = e.target.closest('.admin-tab');
  if(!btn) return;
  $$('.admin-tab').forEach(t=>t.classList.toggle('is-active', t===btn));
  activeKind = btn.dataset.kind;
  renderGrid();
});

categoryFilter.addEventListener('change', ()=>{
  activeCategory = categoryFilter.value;
  renderGrid();
});

function renderGrid(){
  const list = currentList().filter(p => activeCategory==='todos' || p.category===activeCategory);
  if(!list.length){
    itemsGrid.innerHTML = `<p style="color:var(--gray);font-size:13px;grid-column:1/-1;">Nenhum item nessa categoria ainda.</p>`;
    return;
  }
  itemsGrid.innerHTML = list.map(item=>{
    const firstPrice = item.variants?.[0]?.price ?? 0;
    const priceLabel = item.variants?.length > 1 ? `a partir de ${formatMoney(firstPrice)}` : formatMoney(firstPrice);
    return `
    <article class="admin-item-card${item.soldOut?' is-soldout':''}" data-id="${item.id}">
      <div class="admin-item-card-top">
        <div class="admin-item-name">${escapeHtml(item.name)}</div>
        ${item.soldOut ? '<span class="admin-item-badge is-soldout-tag">Esgotado</span>' : (item.badge?`<span class="admin-item-badge">${escapeHtml(item.badge)}</span>`:'')}
      </div>
      <p class="admin-item-desc">${escapeHtml(item.desc||'')}</p>
      <div class="admin-item-foot">
        <span class="admin-item-price">${priceLabel}</span>
        <span class="admin-item-cat">${escapeHtml(item.category)}</span>
      </div>
      <button type="button" class="admin-btn admin-btn-ghost admin-btn-sm admin-quick-toggle" data-toggle-id="${item.id}">
        ${item.soldOut ? 'Marcar como disponível' : 'Marcar como esgotado'}
      </button>
    </article>`;
  }).join('');
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

itemsGrid.addEventListener('click', async (e)=>{
  const toggleBtn = e.target.closest('[data-toggle-id]');
  if(toggleBtn){
    e.stopPropagation();
    const id = toggleBtn.dataset.toggleId;
    const item = currentList().find(p=>p.id===id);
    if(!item) return;
    try{
      await api(`/api/admin/menu/${activeKind}/${id}/soldout`, { method:'PATCH', body: JSON.stringify({ soldOut: !item.soldOut }) });
      item.soldOut = !item.soldOut;
      renderGrid();
      showStatus(item.soldOut ? 'Item marcado como esgotado.' : 'Item disponível novamente.');
    }catch(err){ showStatus('Erro ao atualizar item.', true); }
    return;
  }
  const card = e.target.closest('.admin-item-card');
  if(card) openEditor(currentList().find(p=>p.id===card.dataset.id));
});

// ---------- editor ----------
function variantRow(v={label:'',price:''}){
  const row = document.createElement('div');
  row.className = 'admin-variant-row';
  row.innerHTML = `
    <input type="text" class="v-label" placeholder="Ex: 10 un" value="${escapeHtml(v.label||'')}" required>
    <input type="number" class="v-price" placeholder="Preço" step="0.01" min="0" value="${v.price ?? ''}" required>
    <button type="button" class="admin-variant-remove" aria-label="Remover variante">×</button>
  `;
  row.querySelector('.admin-variant-remove').addEventListener('click', ()=>row.remove());
  return row;
}

addVariantBtn.addEventListener('click', ()=> variantsList.appendChild(variantRow()));

function openEditor(item){
  editorTitle.textContent = item ? 'Editar item' : 'Novo item';
  $('#fId').value = item?.id || '';
  $('#fKind').value = activeKind;
  $('#fName').value = item?.name || '';
  $('#fLabel').value = item?.label || '';
  $('#fBadge').value = item?.badge || '';
  $('#fImage').value = item?.image || '';
  $('#fDesc').value = item?.desc || '';
  $('#fComposition').value = item?.composition || '';
  $('#fDetails').value = (item?.details||[]).join('\n');
  $('#fMeta').value = (item?.meta||[]).join(', ');
  $('#fSoldOut').checked = !!item?.soldOut;

  const catSelect = $('#fCategory');
  catSelect.innerHTML = state.menuCategories.filter(([f])=>f!=='todos').map(([f,l])=>`<option value="${f}">${l}</option>`).join('');
  if(item) catSelect.value = item.category;

  variantsList.innerHTML = '';
  const variants = item?.variants?.length ? item.variants : [{label:'',price:''}];
  variants.forEach(v => variantsList.appendChild(variantRow(v)));

  deleteBtn.hidden = !item;
  editorOverlay.hidden = false;
}

function closeEditor(){ editorOverlay.hidden = true; }
editorClose.addEventListener('click', closeEditor);
cancelBtn.addEventListener('click', closeEditor);
editorOverlay.addEventListener('click', (e)=>{ if(e.target === editorOverlay) closeEditor(); });

newItemBtn.addEventListener('click', ()=> openEditor(null));

editorForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const id = $('#fId').value;
  const kind = $('#fKind').value;
  const variants = $$('.admin-variant-row').map(row=>({
    label: row.querySelector('.v-label').value.trim(),
    price: parseFloat(row.querySelector('.v-price').value)
  })).filter(v=>v.label && !isNaN(v.price));

  if(!variants.length){ showStatus('Adicione ao menos uma variante com preço válido.', true); return; }

  const payload = {
    name: $('#fName').value.trim(),
    category: $('#fCategory').value,
    label: $('#fLabel').value.trim(),
    badge: $('#fBadge').value.trim(),
    image: $('#fImage').value.trim(),
    desc: $('#fDesc').value.trim(),
    composition: $('#fComposition').value.trim(),
    details: $('#fDetails').value.split('\n').map(s=>s.trim()).filter(Boolean),
    meta: $('#fMeta').value.split(',').map(s=>s.trim()).filter(Boolean),
    variants,
    soldOut: $('#fSoldOut').checked
  };

  try{
    if(id){
      await api(`/api/admin/menu/${kind}/${id}`, { method:'PUT', body: JSON.stringify(payload) });
      showStatus('Item atualizado.');
    }else{
      await api(`/api/admin/menu/${kind}`, { method:'POST', body: JSON.stringify(payload) });
      showStatus('Item criado.');
    }
    closeEditor();
    await loadData();
  }catch(err){
    showStatus('Erro ao salvar item.', true);
  }
});

deleteBtn.addEventListener('click', async ()=>{
  const id = $('#fId').value;
  const kind = $('#fKind').value;
  if(!id) return;
  if(!confirm('Excluir este item permanentemente?')) return;
  try{
    await api(`/api/admin/menu/${kind}/${id}`, { method:'DELETE' });
    showStatus('Item excluído.');
    closeEditor();
    await loadData();
  }catch(err){
    showStatus('Erro ao excluir item.', true);
  }
});

checkSession();
