const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const loginScreen = $('#loginScreen');
const loginForm = $('#loginForm');
const loginPassword = $('#loginPassword');
const loginError = $('#loginError');
const app = $('#app');
const logoutBtn = $('#logoutBtn');
const sectionTabs = $('#sectionTabs');
const sectionPanels = $$('.admin-panel');
const dashboardCards = $('#dashboardCards');
const hiddenItemsList = $('#hiddenItemsList');
const schedulePreview = $('#schedulePreview');
const refreshDashboardBtn = $('#refreshDashboardBtn');
const kindTabs = $('#kindTabs');
const categoryFilter = $('#categoryFilter');
const searchInput = $('#searchInput');
const newItemBtn = $('#newItemBtn');
const itemsGrid = $('#itemsGrid');
const categoriesList = $('#categoriesList');
const newCategoryBtn = $('#newCategoryBtn');
const saveCategoriesBtn = $('#saveCategoriesBtn');
const statusBanner = $('#statusBanner');

const editorOverlay = $('#editorOverlay');
const editorForm = $('#editorForm');
const editorTitle = $('#editorTitle');
const editorClose = $('#editorClose');
const cancelBtn = $('#cancelBtn');
const deleteBtn = $('#deleteBtn');
const variantsList = $('#variantsList');
const addVariantBtn = $('#addVariantBtn');
const imageOptions = $('#imageOptions');
const imagePreview = $('#imagePreview');
const imageUploadInput = $('#imageUploadInput');
const imageUploadStatus = $('#imageUploadStatus');
const imageLibrary = $('#imageLibrary');
const editorImageUploadInput = $('#editorImageUploadInput');
const placementPreview = $('#placementPreview');
const itemLivePreview = $('#itemLivePreview');
const defaultFeeInput = $('#defaultFeeInput');
const deliveryRows = $('#deliveryRows');
const addAreaBtn = $('#addAreaBtn');
const saveDeliveryBtn = $('#saveDeliveryBtn');
const openTimeInput = $('#openTimeInput');
const closeTimeInput = $('#closeTimeInput');
const leadMinutesInput = $('#leadMinutesInput');
const openDaysGroup = $('#openDaysGroup');
const saveHoursBtn = $('#saveHoursBtn');
const ordersList = $('#ordersList');
const refreshOrdersBtn = $('#refreshOrdersBtn');
const deployChecklist = $('#deployChecklist');
const downloadBackupBtn = $('#downloadBackupBtn');
const showcasePanel = $('#showcasePanel');
const showcasePreview = $('#showcasePreview');
const saveShowcaseBtn = $('#saveShowcaseBtn');
const showcaseHeroImageUploadInput = $('#showcaseHeroImageUploadInput');
const showcasePromoImageUploadInput = $('#showcasePromoImageUploadInput');
const showcaseFields = {
  noticeActive: $('#showcaseNoticeActive'),
  noticeText: $('#showcaseNoticeText'),
  noticeButtonText: $('#showcaseNoticeButtonText'),
  noticeButtonHref: $('#showcaseNoticeButtonHref'),
  premiumActive: $('#showcasePremiumActive'),
  premiumKicker: $('#showcasePremiumKicker'),
  premiumTitle: $('#showcasePremiumTitle'),
  premiumText: $('#showcasePremiumText'),
  premiumPulse: $('#showcasePremiumPulse'),
  premiumButtonText: $('#showcasePremiumButtonText'),
  premiumButtonHref: $('#showcasePremiumButtonHref'),
  heroTag: $('#showcaseHeroTag'),
  heroTitle: $('#showcaseHeroTitle'),
  heroEmphasis: $('#showcaseHeroEmphasis'),
  heroText: $('#showcaseHeroText'),
  heroButtonText: $('#showcaseHeroButtonText'),
  heroButtonHref: $('#showcaseHeroButtonHref'),
  heroImage: $('#showcaseHeroImage'),
  promoImage: $('#showcasePromoImage'),
  menuTag: $('#showcaseMenuTag'),
  menuTitle: $('#showcaseMenuTitle'),
  menuEmphasis: $('#showcaseMenuEmphasis'),
  menuText: $('#showcaseMenuText'),
  menuActionText: $('#showcaseMenuActionText'),
  whatsappPhone: $('#showcaseWhatsappPhone'),
  whatsappMessage: $('#showcaseWhatsappMessage'),
  instagramUrl: $('#showcaseInstagramUrl'),
  googleUrl: $('#showcaseGoogleUrl')
};

const dayFullNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const maxOriginalImageBytes = 20 * 1024 * 1024;
const maxUploadImageBytes = 8 * 1024 * 1024;
const maxImageSide = 1600;
const imageQuality = 0.84;

let state = {
  menuCategories: [],
  menuProducts: [],
  promoProducts: [],
  images: [],
  imageUsage: {},
  categoryCounts: {},
  orders: [],
  siteSettings: null,
  deployCheck: null
};
let activeKind = 'product';
let activeCategory = 'todos';
let activeSection = 'dashboard';

function defaultShowcase(){
  return {
    notice: {
      active: false,
      text: '',
      buttonText: 'Ver cardápio',
      buttonHref: '#combos'
    },
    premium: {
      active: true,
      kicker: 'Promoção especial',
      title: 'WA RIO Sushi Premium',
      text: '35 peças + 4 bananas crocantes com Nutella por R$ 79,00.',
      pulse: 'Preço especial',
      buttonText: 'Ver promoção',
      buttonHref: '#promocoes-premium'
    },
    hero: {
      tag: 'WA RIO Premium',
      title: 'O verdadeiro',
      emphasis: 'sabor japonês.',
      description: 'Ingredientes selecionados, técnicas tradicionais e uma experiência especial para o seu pedido.',
      buttonText: 'Ver Cardápio',
      buttonHref: '#combos',
      image: 'hero_desktop_wa_rio_optimized.jpg'
    },
    promo: {
      image: 'wario2_cardapio_optimized.jpg'
    },
    menu: {
      tag: 'Nosso Cardápio',
      title: 'Seleção',
      emphasis: 'WA RIO',
      text: 'Uma curadoria dos pedidos mais desejados da casa, preparada para quem busca frescor, textura e sabor japonês com acabamento especial.',
      actionText: 'Falar com atendente'
    },
    links: {
      whatsappPhone: '5521982225443',
      whatsappMessage: 'Olá, WA RIO Sushi! Quero falar com o atendimento.',
      instagramUrl: 'https://www.instagram.com/wariosushi/',
      googleUrl: 'https://maps.app.goo.gl/xuXupQpwMX77WqdR8'
    }
  };
}

function defaultSettings(){
  return {
    delivery: {
      defaultFee: 8,
      areas: [
        { name: 'Cachambi', fee: 7, active: true },
        { name: 'Méier', fee: 8, active: true },
        { name: 'Engenho de Dentro', fee: 8, active: true },
        { name: 'Pilares', fee: 8, active: true },
        { name: 'Riachuelo', fee: 8, active: true },
        { name: 'Maria da Graça', fee: 7, active: true },
        { name: 'Higienópolis', fee: 8, active: true },
        { name: 'Engenho Novo', fee: 8, active: true },
        { name: 'Del Castilho', fee: 8, active: true },
        { name: 'Abolição', fee: 8, active: true },
        { name: 'Piedade', fee: 8, active: true }
      ]
    },
    businessHours: {
      openHour: 19,
      closeHour: 23,
      openDays: [0, 3, 4, 5, 6],
      timeZone: 'America/Sao_Paulo',
      scheduleLeadMinutes: 30
    },
    showcase: defaultShowcase()
  };
}

function currentSettings(){
  return state.siteSettings || defaultSettings();
}

function currentShowcase(){
  const defaults = defaultShowcase();
  const source = currentSettings().showcase || {};
  return {
    notice: { ...defaults.notice, ...(source.notice || {}) },
    premium: { ...defaults.premium, ...(source.premium || {}) },
    hero: { ...defaults.hero, ...(source.hero || {}) },
    promo: { ...defaults.promo, ...(source.promo || {}) },
    menu: { ...defaults.menu, ...(source.menu || {}) },
    links: { ...defaults.links, ...(source.links || {}) }
  };
}

function allItems(){
  return [...(state.menuProducts || []), ...(state.promoProducts || [])];
}

function formatMoney(n){
  return `R$ ${Number(n || 0).toFixed(2).replace('.', ',')}`;
}

function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function slugify(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function normalizeCategory(entry, index = 0){
  const isArray = Array.isArray(entry);
  const id = isArray ? entry[0] : (entry?.id || entry?.filter || entry?.value);
  const label = isArray ? entry[1] : (entry?.label || entry?.name || entry?.title);
  const normalizedId = slugify(id || label) || `categoria-${index + 1}`;
  return {
    id: normalizedId === 'todos' ? 'todos' : normalizedId,
    label: String(label || id || normalizedId || '').trim() || `Categoria ${index + 1}`,
    active: normalizedId === 'todos' ? true : entry?.active !== false
  };
}

function categories(){
  const list = Array.isArray(state.menuCategories) ? state.menuCategories : [];
  const normalized = list.map((entry, index) => normalizeCategory(entry, index));
  if(!normalized.some(category => category.id === 'todos')){
    normalized.unshift({ id: 'todos', label: 'Todos', active: true });
  }
  const seen = new Set();
  return normalized.filter(category => {
    if(!category.id || seen.has(category.id)) return false;
    seen.add(category.id);
    return true;
  });
}

function editableCategories(){
  return categories().filter(category => category.id !== 'todos');
}

function normalizeFee(value, fallback = 0){
  const fee = Number(value);
  if(!Number.isFinite(fee) || fee < 0) return fallback;
  return Math.round(fee * 100) / 100;
}

function pad2(value){
  return String(value).padStart(2, '0');
}

function hourToTime(value){
  const hour = Math.max(0, Math.min(24, Math.floor(Number(value) || 0)));
  return `${pad2(hour)}:00`;
}

function timeToHour(value, fallback = NaN){
  const match = String(value || '').match(/^(\d{1,2}):\d{2}$/);
  const hour = match ? Number(match[1]) : Number(value);
  return Number.isFinite(hour) ? Math.floor(hour) : fallback;
}

function hourLabel(value){
  return `${pad2(Math.floor(Number(value) || 0))}h`;
}

function joinText(items){
  if(items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function daysLabel(days){
  const normalized = [...new Set((days || []).map(Number).filter(day => day >= 0 && day <= 6))].sort((a, b) => a - b);
  if(normalized.length === 7) return 'Todos os dias';
  if(normalized.join(',') === '0,3,4,5,6') return 'Quarta a domingo';
  return joinText(normalized.map(day => dayFullNames[day]).filter(Boolean)).replace(/^./, c => c.toUpperCase());
}

function scheduleLabel(){
  const hours = currentSettings().businessHours || defaultSettings().businessHours;
  return `${daysLabel(hours.openDays)}, ${hourLabel(hours.openHour)} às ${hourLabel(hours.closeHour)}`;
}

function formatDateTime(value){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showStatus(msg, isError = false){
  statusBanner.textContent = msg;
  statusBanner.classList.toggle('is-error', isError);
  statusBanner.hidden = false;
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => { statusBanner.hidden = true; }, 3500);
}

function categoryOptionsFor(kind, currentCategory = ''){
  const base = editableCategories().map(category => [category.id, `${category.label}${category.active === false ? ' (oculta)' : ''}`]);
  const existing = (kind === 'promo' ? state.promoProducts : state.menuProducts)
    .map(item => [item.category, item.category])
    .filter(([f]) => f && !base.some(([baseFilter]) => baseFilter === f));
  const promo = kind === 'promo' && !base.some(([f]) => f === 'promocoes')
    ? [['promocoes', 'Promoções']]
    : [];
  const current = currentCategory
    && !base.some(([f]) => f === currentCategory)
    && !existing.some(([f]) => f === currentCategory)
    && !promo.some(([f]) => f === currentCategory)
      ? [[currentCategory, currentCategory]]
      : [];
  return [...promo, ...base, ...existing, ...current].filter(([filter], index, items) =>
    items.findIndex(([candidate]) => candidate === filter) === index
  );
}

function populateImageOptions(){
  if(!imageOptions) return;
  imageOptions.innerHTML = (state.images || [])
    .map(name => `<option value="${escapeHtml(name)}"></option>`)
    .join('');
}

function imageUrl(name){
  return `/${String(name || '').split('/').map(part => encodeURIComponent(part)).join('/')}`;
}

function setFieldValue(field, value){
  if(field) field.value = String(value ?? '');
}

function setFieldChecked(field, checked){
  if(field) field.checked = !!checked;
}

function fieldValue(field, fallback = '', allowBlank = false){
  const value = field?.value.trim();
  if(value) return value;
  return allowBlank ? '' : fallback;
}

function fieldChecked(field, fallback = false){
  return field ? !!field.checked : fallback;
}

function collectShowcaseSettings(){
  const defaults = defaultShowcase();
  const phone = fieldValue(showcaseFields.whatsappPhone, defaults.links.whatsappPhone).replace(/\D/g, '');
  return {
    notice: {
      active: fieldChecked(showcaseFields.noticeActive, defaults.notice.active),
      text: fieldValue(showcaseFields.noticeText, defaults.notice.text, true),
      buttonText: fieldValue(showcaseFields.noticeButtonText, defaults.notice.buttonText),
      buttonHref: fieldValue(showcaseFields.noticeButtonHref, defaults.notice.buttonHref)
    },
    premium: {
      active: fieldChecked(showcaseFields.premiumActive, defaults.premium.active),
      kicker: fieldValue(showcaseFields.premiumKicker, defaults.premium.kicker),
      title: fieldValue(showcaseFields.premiumTitle, defaults.premium.title),
      text: fieldValue(showcaseFields.premiumText, defaults.premium.text),
      pulse: fieldValue(showcaseFields.premiumPulse, defaults.premium.pulse),
      buttonText: fieldValue(showcaseFields.premiumButtonText, defaults.premium.buttonText),
      buttonHref: fieldValue(showcaseFields.premiumButtonHref, defaults.premium.buttonHref)
    },
    hero: {
      tag: fieldValue(showcaseFields.heroTag, defaults.hero.tag),
      title: fieldValue(showcaseFields.heroTitle, defaults.hero.title),
      emphasis: fieldValue(showcaseFields.heroEmphasis, defaults.hero.emphasis),
      description: fieldValue(showcaseFields.heroText, defaults.hero.description),
      buttonText: fieldValue(showcaseFields.heroButtonText, defaults.hero.buttonText),
      buttonHref: fieldValue(showcaseFields.heroButtonHref, defaults.hero.buttonHref),
      image: fieldValue(showcaseFields.heroImage, defaults.hero.image)
    },
    promo: {
      image: fieldValue(showcaseFields.promoImage, defaults.promo.image)
    },
    menu: {
      tag: fieldValue(showcaseFields.menuTag, defaults.menu.tag),
      title: fieldValue(showcaseFields.menuTitle, defaults.menu.title),
      emphasis: fieldValue(showcaseFields.menuEmphasis, defaults.menu.emphasis),
      text: fieldValue(showcaseFields.menuText, defaults.menu.text),
      actionText: fieldValue(showcaseFields.menuActionText, defaults.menu.actionText)
    },
    links: {
      whatsappPhone: phone || defaults.links.whatsappPhone,
      whatsappMessage: fieldValue(showcaseFields.whatsappMessage, defaults.links.whatsappMessage),
      instagramUrl: fieldValue(showcaseFields.instagramUrl, defaults.links.instagramUrl),
      googleUrl: fieldValue(showcaseFields.googleUrl, defaults.links.googleUrl)
    }
  };
}

function renderShowcasePreview(showcase = collectShowcaseSettings()){
  if(!showcasePreview) return;
  const notice = showcase.notice || {};
  const premium = showcase.premium || {};
  const hero = showcase.hero || {};
  const promo = showcase.promo || {};
  const menu = showcase.menu || {};
  const noticeMarkup = notice.active && notice.text
    ? `<div class="admin-showcase-preview-notice"><span>${escapeHtml(notice.text)}</span><strong>${escapeHtml(notice.buttonText)}</strong></div>`
    : `<div class="admin-showcase-preview-notice"><span>Aviso temporário oculto</span><strong>Oculto</strong></div>`;
  showcasePreview.innerHTML = `
    <div class="admin-showcase-preview-box">${noticeMarkup}</div>
    <div class="admin-showcase-preview-box admin-showcase-preview-banner">
      <span>${escapeHtml(premium.kicker)}</span>
      <strong>${escapeHtml(premium.title)}</strong>
      <p>${escapeHtml(premium.text)}</p>
      <div class="admin-showcase-preview-button">${escapeHtml(premium.buttonText)}</div>
    </div>
    <div class="admin-showcase-preview-box admin-showcase-preview-hero">
      <img src="${escapeAttr(imageUrl(hero.image || defaultShowcase().hero.image))}" alt="">
      <div class="admin-showcase-preview-hero-body">
        <span>${escapeHtml(hero.tag)}</span>
        <h3>${escapeHtml(hero.title)}<br><em>${escapeHtml(hero.emphasis)}</em></h3>
        <p>${escapeHtml(hero.description)}</p>
        <div class="admin-showcase-preview-button">${escapeHtml(hero.buttonText)}</div>
      </div>
    </div>
    <div class="admin-showcase-preview-box admin-showcase-preview-menu">
      <span>${escapeHtml(menu.tag)}</span>
      <strong>${escapeHtml(menu.title)} ${escapeHtml(menu.emphasis)}</strong>
      <p>${escapeHtml(menu.text)}</p>
    </div>
    <div class="admin-showcase-preview-box admin-showcase-preview-promo">
      <img src="${escapeAttr(imageUrl(promo.image || defaultShowcase().promo.image))}" alt="">
      <div>
        <strong>WA RIO Sushi Premium</strong>
        <span>R$ 79,00</span>
      </div>
    </div>
  `;
}

function renderShowcase(){
  const showcase = currentShowcase();
  setFieldChecked(showcaseFields.noticeActive, showcase.notice.active);
  setFieldValue(showcaseFields.noticeText, showcase.notice.text);
  setFieldValue(showcaseFields.noticeButtonText, showcase.notice.buttonText);
  setFieldValue(showcaseFields.noticeButtonHref, showcase.notice.buttonHref);
  setFieldChecked(showcaseFields.premiumActive, showcase.premium.active);
  setFieldValue(showcaseFields.premiumKicker, showcase.premium.kicker);
  setFieldValue(showcaseFields.premiumTitle, showcase.premium.title);
  setFieldValue(showcaseFields.premiumText, showcase.premium.text);
  setFieldValue(showcaseFields.premiumPulse, showcase.premium.pulse);
  setFieldValue(showcaseFields.premiumButtonText, showcase.premium.buttonText);
  setFieldValue(showcaseFields.premiumButtonHref, showcase.premium.buttonHref);
  setFieldValue(showcaseFields.heroTag, showcase.hero.tag);
  setFieldValue(showcaseFields.heroTitle, showcase.hero.title);
  setFieldValue(showcaseFields.heroEmphasis, showcase.hero.emphasis);
  setFieldValue(showcaseFields.heroText, showcase.hero.description);
  setFieldValue(showcaseFields.heroButtonText, showcase.hero.buttonText);
  setFieldValue(showcaseFields.heroButtonHref, showcase.hero.buttonHref);
  setFieldValue(showcaseFields.heroImage, showcase.hero.image);
  setFieldValue(showcaseFields.promoImage, showcase.promo.image);
  setFieldValue(showcaseFields.menuTag, showcase.menu.tag);
  setFieldValue(showcaseFields.menuTitle, showcase.menu.title);
  setFieldValue(showcaseFields.menuEmphasis, showcase.menu.emphasis);
  setFieldValue(showcaseFields.menuText, showcase.menu.text);
  setFieldValue(showcaseFields.menuActionText, showcase.menu.actionText);
  setFieldValue(showcaseFields.whatsappPhone, showcase.links.whatsappPhone);
  setFieldValue(showcaseFields.whatsappMessage, showcase.links.whatsappMessage);
  setFieldValue(showcaseFields.instagramUrl, showcase.links.instagramUrl);
  setFieldValue(showcaseFields.googleUrl, showcase.links.googleUrl);
  renderShowcasePreview(showcase);
}

function updateImagePreview(){
  if(!imagePreview) return;
  const value = $('#fImage')?.value.trim();
  if(!value){
    imagePreview.hidden = true;
    imagePreview.removeAttribute('src');
    return;
  }
  imagePreview.src = imageUrl(value);
  imagePreview.hidden = false;
}

function showImageStatus(message, isError = false){
  if(!imageUploadStatus) return;
  imageUploadStatus.textContent = message;
  imageUploadStatus.classList.toggle('is-error', isError);
  imageUploadStatus.hidden = false;
}

function imageUsageCount(name){
  if(Array.isArray(state.imageUsage?.[name])) return state.imageUsage[name].length;
  const showcase = currentShowcase();
  const showcaseCount = [showcase.hero?.image, showcase.promo?.image].filter(image => image === name).length;
  return allItems().filter(item => item.image === name).length + showcaseCount;
}

function isUploadedImage(name){
  return /^uploads\/menu\//i.test(String(name || ''));
}

function renderImages(){
  if(!imageLibrary) return;
  const images = state.images || [];
  if(!images.length){
    imageLibrary.innerHTML = '<p class="admin-empty">Nenhuma imagem encontrada.</p>';
    return;
  }
  imageLibrary.innerHTML = images.map(name => `
    <article class="admin-image-card">
      <img src="${imageUrl(name)}" alt="">
      <div class="admin-image-card-body">
        <strong class="admin-image-name" title="${escapeHtml(name)}">${escapeHtml(name)}</strong>
        <span class="admin-image-meta">${imageUsageCount(name) ? `${imageUsageCount(name)} uso(s) no site` : (isUploadedImage(name) ? 'Imagem enviada pelo painel' : 'Arquivo fixo do site')}</span>
        <div class="admin-image-actions">
          <button type="button" class="admin-btn admin-btn-ghost admin-btn-sm" data-image-name="${escapeHtml(name)}">Usar no item</button>
          ${isUploadedImage(name) && !imageUsageCount(name) ? `<button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-delete-image="${escapeHtml(name)}">Remover</button>` : ''}
        </div>
      </div>
    </article>
  `).join('');
}

function arrayBufferToBase64(buffer){
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for(let i = 0; i < bytes.length; i += chunkSize){
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function extensionForMime(mime){
  return mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
}

function filenameWithMime(name, mime){
  return String(name || 'imagem-cardapio')
    .replace(/\.[a-z0-9]+$/i, extensionForMime(mime));
}

function canvasToBlob(canvas, mime, quality){
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')), mime, quality);
  });
}

async function imageBitmapFromFile(file){
  if('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível abrir essa imagem.'));
    };
    img.src = url;
  });
}

async function prepareImageForUpload(file){
  if(!file) return null;
  if(file.size > maxOriginalImageBytes){
    throw new Error('A imagem original deve ter até 20 MB.');
  }
  if(/^image\/gif$/i.test(file.type || '')){
    if(file.size > maxUploadImageBytes) throw new Error('GIF precisa ter até 8 MB.');
    return { blob: file, filename: file.name, mime: file.type, compressed: false };
  }
  if(!/^image\/(?:png|jpe?g|webp)$/i.test(file.type || '')){
    throw new Error('Envie JPG, PNG, WebP ou GIF.');
  }
  const bitmap = await imageBitmapFromFile(file);
  const scale = Math.min(1, maxImageSide / Math.max(bitmap.width || 1, bitmap.height || 1));
  const width = Math.max(1, Math.round((bitmap.width || 1) * scale));
  const height = Math.max(1, Math.round((bitmap.height || 1) * scale));
  const shouldResize = scale < 1;
  const shouldCompress = file.size > 900 * 1024 || shouldResize;
  if(!shouldCompress && file.size <= maxUploadImageBytes){
    if(typeof bitmap.close === 'function') bitmap.close();
    return { blob: file, filename: file.name, mime: file.type, compressed: false };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if(typeof bitmap.close === 'function') bitmap.close();
  const outputMime = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputMime, imageQuality);
  if(blob.size > maxUploadImageBytes){
    const jpegBlob = outputMime === 'image/jpeg'
      ? blob
      : await canvasToBlob(canvas, 'image/jpeg', 0.82);
    if(jpegBlob.size > maxUploadImageBytes) throw new Error('Mesmo comprimida, a imagem ficou acima de 8 MB.');
    return { blob: jpegBlob, filename: filenameWithMime(file.name, 'image/jpeg'), mime: 'image/jpeg', compressed: true };
  }
  return { blob, filename: filenameWithMime(file.name, outputMime), mime: outputMime, compressed: true };
}

async function uploadImageFile(file){
  if(!file) return '';
  uploadImageFile.lastCompressed = false;
  const prepared = await prepareImageForUpload(file);
  uploadImageFile.lastCompressed = !!prepared.compressed;
  const dataBase64 = arrayBufferToBase64(await prepared.blob.arrayBuffer());
  const data = await api('/api/admin/images', {
    method: 'POST',
    body: JSON.stringify({ filename: prepared.filename, mime: prepared.mime, dataBase64 })
  });
  state.images = Array.isArray(data.images) ? data.images : state.images;
  state.imageUsage = data.usage || state.imageUsage || {};
  populateImageOptions();
  renderImages();
  return data.image || '';
}

async function handleImageUpload(input, useOnOpenItem = false){
  const file = input?.files?.[0];
  if(!file) return;
  showImageStatus('Enviando imagem...');
  try{
    const imageName = await uploadImageFile(file);
    if(useOnOpenItem && imageName && $('#fImage')){
      $('#fImage').value = imageName;
      updateImagePreview();
      updateEditorPreview();
    }
    showImageStatus(uploadImageFile.lastCompressed ? 'Imagem reduzida automaticamente e pronta para usar.' : 'Imagem enviada e pronta para usar.');
    showStatus('Imagem enviada.');
  }catch(err){
    showImageStatus(err.message || 'Erro ao enviar imagem.', true);
    showStatus(err.message || 'Erro ao enviar imagem.', true);
  }finally{
    if(input) input.value = '';
  }
}

async function handleShowcaseImageUpload(input, targetField){
  const file = input?.files?.[0];
  if(!file) return;
  showImageStatus('Enviando imagem...');
  try{
    const imageName = await uploadImageFile(file);
    if(imageName && targetField){
      targetField.value = imageName;
      renderShowcasePreview();
    }
    showImageStatus(uploadImageFile.lastCompressed ? 'Imagem reduzida automaticamente e selecionada na vitrine.' : 'Imagem enviada e selecionada na vitrine.');
    showStatus('Imagem pronta para a vitrine.');
  }catch(err){
    showImageStatus(err.message || 'Erro ao enviar imagem.', true);
    showStatus(err.message || 'Erro ao enviar imagem.', true);
  }finally{
    if(input) input.value = '';
  }
}

function selectImageForEditor(name){
  if(!editorOverlay || editorOverlay.hidden){
    showImageStatus('Abra ou crie um item no cardápio e escolha a imagem por lá.');
    return;
  }
  $('#fImage').value = name;
  updateImagePreview();
  updateEditorPreview();
  showImageStatus('Imagem selecionada para o item aberto.');
}

function categoryLabel(category){
  const match = categories().find(item => item.id === category);
  return match?.label || category || 'categoria escolhida';
}

function categoryIsHidden(category){
  const match = categories().find(item => item.id === category);
  return match ? match.active === false : false;
}

function placementText(kind, category, isHidden = false, isNew = true){
  if(isHidden){
    return 'Este item está marcado como oculto. Ele fica salvo no painel, mas não aparece para o cliente até você desmarcar essa opção.';
  }
  if(kind === 'promo'){
    return isNew
      ? 'Vai aparecer na seção de promoções do site, antes do cardápio principal. Se já existir outra promoção, entra depois das promoções atuais.'
      : 'Aparece na seção de promoções do site, antes do cardápio principal. A ordem pode ser ajustada pelos botões Subir e Descer.';
  }
  if(categoryIsHidden(category)){
    return `Este item está na categoria ${categoryLabel(category)}, que está oculta. Ele fica salvo no painel, mas não aparece no site enquanto a categoria estiver oculta.`;
  }
  return isNew
    ? `Vai aparecer no Cardápio, dentro da aba ${categoryLabel(category)}. Como item novo, ele entra no final da lista dessa categoria.`
    : `Aparece no Cardápio, dentro da aba ${categoryLabel(category)}. A posição pode ser ajustada pelos botões Subir e Descer.`;
}

function placementSummary(kind, item){
  if(item?.soldOut) return 'Oculto no site';
  if(kind === 'promo') return 'Site: seção Promoções';
  if(categoryIsHidden(item?.category)) return `Oculto: categoria ${categoryLabel(item?.category)}`;
  return `Site: Cardápio > ${categoryLabel(item?.category)}`;
}

function updatePlacementPreview(){
  if(!placementPreview) return;
  const kind = $('#fKind')?.value || activeKind;
  const category = $('#fCategory')?.value || activeCategory;
  const isHidden = !!$('#fSoldOut')?.checked;
  const isNew = !$('#fId')?.value;
  placementPreview.innerHTML = `<strong>Onde aparece no site</strong>${escapeHtml(placementText(kind, category, isHidden, isNew))}`;
}

function editorVariants(){
  return $$('.admin-variant-row').map(row => ({
    label: row.querySelector('.v-label')?.value.trim() || '',
    price: parseFloat(row.querySelector('.v-price')?.value)
  })).filter(v => v.label && !Number.isNaN(v.price));
}

function editorDraft(){
  return {
    name: $('#fName')?.value.trim() || 'Nome do item',
    category: $('#fCategory')?.value || '',
    label: $('#fLabel')?.value.trim() || categoryLabel($('#fCategory')?.value),
    badge: $('#fBadge')?.value.trim() || '',
    image: $('#fImage')?.value.trim() || '',
    desc: $('#fDesc')?.value.trim() || 'Descrição do item aparecerá aqui.',
    meta: ($('#fMeta')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
    variants: editorVariants(),
    soldOut: !!$('#fSoldOut')?.checked,
    kind: $('#fKind')?.value || activeKind
  };
}

function renderItemLivePreview(){
  if(!itemLivePreview || editorOverlay?.hidden) return;
  const item = editorDraft();
  const firstPrice = item.variants?.[0]?.price ?? 0;
  const priceLabel = item.variants?.length > 1 ? `a partir de ${formatMoney(firstPrice)}` : formatMoney(firstPrice);
  const tags = [item.badge, ...item.meta].filter(Boolean).slice(0, 4);
  itemLivePreview.classList.toggle('is-hidden', item.soldOut || (item.kind === 'product' && categoryIsHidden(item.category)));
  itemLivePreview.innerHTML = `
    ${item.image ? `<img src="${imageUrl(item.image)}" alt="">` : '<div class="admin-live-preview-placeholder">Sem imagem</div>'}
    <div class="admin-live-preview-body">
      <span class="admin-live-preview-kicker">${escapeHtml(item.kind === 'promo' ? 'Prévia da promoção' : item.label)}</span>
      <strong class="admin-live-preview-title">${escapeHtml(item.name)}</strong>
      <p class="admin-live-preview-desc">${escapeHtml(item.desc)}</p>
      ${tags.length ? `<div class="admin-live-preview-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      <span class="admin-live-preview-price">${escapeHtml(priceLabel)}</span>
    </div>
  `;
}

function updateEditorPreview(){
  updatePlacementPreview();
  renderItemLivePreview();
}

async function api(path, options = {}){
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin'
  });
  if(res.status === 401){
    showApp(false);
    throw new Error('not_authenticated');
  }
  const data = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error(data.error || 'request_failed');
  return data;
}

function showApp(loggedIn){
  loginScreen.hidden = loggedIn;
  app.hidden = !loggedIn;
}

async function checkSession(){
  try{
    const data = await api('/api/admin/session');
    showApp(!!data.loggedIn);
    if(data.loggedIn) await loadData();
  }catch(e){
    showApp(false);
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  try{
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: loginPassword.value }) });
    loginPassword.value = '';
    showApp(true);
    await loadData();
  }catch(err){
    loginError.textContent = err.message === 'too_many_attempts'
      ? 'Muitas tentativas. Aguarde alguns minutos.'
      : err.message === 'admin_password_missing'
        ? 'Senha do painel ainda não configurada no servidor.'
      : 'Senha incorreta.';
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
  showApp(false);
});

async function loadData(){
  try{
    const [menuData, imageData, settingsData, ordersData, categoryData, deployData] = await Promise.all([
      api('/api/admin/menu'),
      api('/api/admin/images').catch(() => ({ images: [] })),
      api('/api/admin/settings').catch(() => null),
      api('/api/admin/orders').catch(() => ({ orders: [] })),
      api('/api/admin/categories').catch(() => ({ categories: null, counts: {} })),
      api('/api/admin/deploy-check').catch(() => null)
    ]);
    state = {
      menuCategories: Array.isArray(categoryData.categories) ? categoryData.categories : (Array.isArray(menuData.menuCategories) ? menuData.menuCategories : []),
      menuProducts: Array.isArray(menuData.menuProducts) ? menuData.menuProducts : [],
      promoProducts: Array.isArray(menuData.promoProducts) ? menuData.promoProducts : [],
      images: Array.isArray(imageData.images) ? imageData.images : [],
      imageUsage: imageData.usage || {},
      categoryCounts: categoryData.counts || {},
      orders: Array.isArray(ordersData.orders) ? ordersData.orders : [],
      siteSettings: settingsData || menuData.siteSettings || defaultSettings(),
      deployCheck: deployData
    };
    renderAll();
  }catch(e){
    showStatus('Não foi possível carregar o painel.', true);
  }
}

async function refreshOrders(showMessage = true){
  try{
    const data = await api('/api/admin/orders');
    state.orders = Array.isArray(data.orders) ? data.orders : [];
    renderOrders();
    renderDashboard();
    if(showMessage) showStatus('Pedidos atualizados.');
  }catch(e){
    showStatus('Não foi possível carregar os pedidos.', true);
  }
}

function renderAll(){
  populateImageOptions();
  populateCategoryFilter();
  renderGrid();
  renderCategories();
  renderImages();
  renderDashboard();
  renderShowcase();
  renderDelivery();
  renderHours();
  renderOrders();
  renderTools();
  switchSection(activeSection);
}

function switchSection(section){
  activeSection = section || 'dashboard';
  $$('.admin-section-tab').forEach(tab => {
    const active = tab.dataset.section === activeSection;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  sectionPanels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === activeSection));
}

sectionTabs?.addEventListener('click', (e) => {
  const btn = e.target.closest('.admin-section-tab');
  if(!btn) return;
  switchSection(btn.dataset.section);
});

refreshDashboardBtn?.addEventListener('click', async () => {
  await loadData();
  showStatus('Resumo atualizado.');
});

function compactRow(label, value){
  return `<div class="admin-compact-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderDashboard(){
  const items = allItems();
  const hidden = items.filter(item => item.soldOut);
  const delivery = currentSettings().delivery || defaultSettings().delivery;
  const activeAreas = (delivery.areas || []).filter(area => area.active !== false);
  if(dashboardCards){
    dashboardCards.innerHTML = [
      ['Itens no cardápio', state.menuProducts.length],
      ['Promoções', state.promoProducts.length],
      ['Ocultos', hidden.length],
      ['Bairros ativos', activeAreas.length]
    ].map(([label, value]) => `
      <article class="admin-metric">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `).join('');
  }
  if(hiddenItemsList){
    hiddenItemsList.innerHTML = hidden.length
      ? hidden.slice(0, 8).map(item => compactRow(item.name, item.category || 'Sem categoria')).join('')
      : '<p class="admin-empty">Nenhum item oculto no momento.</p>';
  }
  if(schedulePreview){
    const hours = currentSettings().businessHours || defaultSettings().businessHours;
    schedulePreview.innerHTML = [
      compactRow('Funcionamento', scheduleLabel()),
      compactRow('Antecedência', `${hours.scheduleLeadMinutes || 0} min`),
      compactRow('Taxa padrão', formatMoney(delivery.defaultFee)),
      compactRow('Pedidos Pix recentes', String(state.orders.length))
    ].join('');
  }
}

function renderCategories(){
  if(!categoriesList) return;
  const cats = editableCategories();
  if(!cats.length){
    categoriesList.innerHTML = '<p class="admin-empty">Nenhuma categoria cadastrada.</p>';
    return;
  }
  categoriesList.innerHTML = cats.map((category, index) => {
    const count = Number(state.categoryCounts?.[category.id] || state.menuProducts.filter(item => item.category === category.id).length || 0);
    return `
      <div class="admin-category-row" data-category-id="${escapeHtml(category.id)}">
        <span class="admin-category-handle">${index + 1}</span>
        <input type="text" class="category-label" value="${escapeHtml(category.label)}" maxlength="80" aria-label="Nome da categoria">
        <span class="admin-category-id">${escapeHtml(category.id)}</span>
        <span class="admin-category-count">${count ? `${count} item(ns)` : 'Sem itens'}</span>
        <label class="admin-switch">
          <input type="checkbox" class="category-active" ${category.active === false ? '' : 'checked'}>
          <span>Ativa</span>
        </label>
        <div class="admin-category-moves">
          <button type="button" class="admin-btn admin-btn-ghost" data-category-move="up" ${index === 0 ? 'disabled' : ''}>Subir</button>
          <button type="button" class="admin-btn admin-btn-ghost" data-category-move="down" ${index === cats.length - 1 ? 'disabled' : ''}>Descer</button>
        </div>
        <button type="button" class="admin-row-remove" data-category-delete aria-label="Excluir categoria" ${count ? 'disabled' : ''}>×</button>
      </div>
    `;
  }).join('');
  refreshCategoryMoveButtons();
}

function refreshCategoryMoveButtons(){
  const rows = $$('#categoriesList .admin-category-row');
  rows.forEach((row, index) => {
    const handle = row.querySelector('.admin-category-handle');
    const up = row.querySelector('[data-category-move="up"]');
    const down = row.querySelector('[data-category-move="down"]');
    if(handle) handle.textContent = index + 1;
    if(up) up.disabled = index === 0;
    if(down) down.disabled = index === rows.length - 1;
  });
}

function categoryRowsPayload(){
  const rows = $$('#categoriesList .admin-category-row');
  const seen = new Set();
  const categoriesPayload = rows.map((row, index) => {
    const label = row.querySelector('.category-label')?.value.trim() || '';
    const existingId = row.dataset.categoryId || '';
    const id = existingId.startsWith('nova-') ? slugify(label) : existingId;
    if(!label) throw new Error('Informe o nome de todas as categorias.');
    if(!id) throw new Error('Não foi possível criar o código da categoria.');
    if(seen.has(id)) throw new Error('Existem categorias com o mesmo nome/código.');
    seen.add(id);
    return {
      id,
      label,
      active: !!row.querySelector('.category-active')?.checked,
      position: index + 1
    };
  });
  return [{ id: 'todos', label: 'Todos', active: true }, ...categoriesPayload];
}

async function saveCategories(){
  try{
    const data = await api('/api/admin/categories', {
      method: 'PUT',
      body: JSON.stringify({ categories: categoryRowsPayload() })
    });
    state.menuCategories = data.categories || state.menuCategories;
    state.categoryCounts = data.counts || state.categoryCounts || {};
    await loadData();
    showStatus('Categorias salvas.');
  }catch(err){
    showStatus(err.message || 'Erro ao salvar categorias.', true);
  }
}

function currentList(){
  return activeKind === 'promo' ? state.promoProducts : state.menuProducts;
}

function populateCategoryFilter(){
  const cats = categoryOptionsFor(activeKind);
  const values = ['todos', ...cats.map(([f]) => f)];
  if(!values.includes(activeCategory)) activeCategory = 'todos';
  categoryFilter.innerHTML = ['<option value="todos">Todas as categorias</option>']
    .concat(cats.map(([f, l]) => `<option value="${escapeHtml(f)}">${escapeHtml(l)}</option>`))
    .join('');
  categoryFilter.value = activeCategory;
}

kindTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.admin-tab');
  if(!btn) return;
  $$('.admin-tab').forEach(t => t.classList.toggle('is-active', t === btn));
  activeKind = btn.dataset.kind;
  activeCategory = 'todos';
  populateCategoryFilter();
  renderGrid();
});

categoryFilter.addEventListener('change', () => {
  activeCategory = categoryFilter.value;
  renderGrid();
});

searchInput?.addEventListener('input', renderGrid);

function renderGrid(){
  const query = (searchInput?.value || '').trim().toLowerCase();
  const list = currentList().filter(p => {
    const categoryOk = activeCategory === 'todos' || p.category === activeCategory;
    const haystack = [p.name, p.label, p.badge, p.desc, p.category, ...(p.meta || []), ...(p.details || [])].join(' ').toLowerCase();
    return categoryOk && (!query || haystack.includes(query));
  });
  if(!list.length){
    itemsGrid.innerHTML = '<p class="admin-empty">Nenhum item encontrado.</p>';
    return;
  }
  itemsGrid.innerHTML = list.map((item, index) => {
    const firstPrice = item.variants?.[0]?.price ?? 0;
    const priceLabel = item.variants?.length > 1 ? `a partir de ${formatMoney(firstPrice)}` : formatMoney(firstPrice);
    return `
    <article class="admin-item-card${item.soldOut ? ' is-soldout' : ''}" data-id="${escapeHtml(item.id)}">
      <div class="admin-item-card-top">
        <div class="admin-item-name">${escapeHtml(item.name)}</div>
        ${item.soldOut ? '<span class="admin-item-badge is-soldout-tag">Oculto</span>' : (item.badge ? `<span class="admin-item-badge">${escapeHtml(item.badge)}</span>` : '')}
      </div>
      <p class="admin-item-desc">${escapeHtml(item.desc || '')}</p>
      <p class="admin-item-placement">${escapeHtml(placementSummary(activeKind, item))}</p>
      <div class="admin-item-foot">
        <span class="admin-item-price">${priceLabel}</span>
        <span class="admin-item-cat">${escapeHtml(item.category)}</span>
      </div>
      <button type="button" class="admin-btn admin-btn-ghost admin-btn-sm admin-quick-toggle" data-toggle-id="${escapeHtml(item.id)}">
        ${item.soldOut ? 'Mostrar no site' : 'Ocultar no site'}
      </button>
      <div class="admin-item-actions">
        <button type="button" class="admin-btn admin-btn-ghost admin-order-btn" data-move-id="${escapeHtml(item.id)}" data-direction="up" ${index === 0 ? 'disabled' : ''}>Subir</button>
        <button type="button" class="admin-btn admin-btn-ghost admin-order-btn" data-move-id="${escapeHtml(item.id)}" data-direction="down" ${index === list.length - 1 ? 'disabled' : ''}>Descer</button>
      </div>
    </article>`;
  }).join('');
}

itemsGrid.addEventListener('click', async (e) => {
  const moveBtn = e.target.closest('[data-move-id]');
  if(moveBtn){
    e.stopPropagation();
    try{
      await api(`/api/admin/menu/${activeKind}/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({
          id: moveBtn.dataset.moveId,
          direction: moveBtn.dataset.direction,
          category: activeKind === 'product' ? activeCategory : ''
        })
      });
      await loadData();
      showStatus('Ordem atualizada.');
    }catch(err){
      showStatus(err.message || 'Não foi possível mover este item.', true);
    }
    return;
  }
  const toggleBtn = e.target.closest('[data-toggle-id]');
  if(toggleBtn){
    e.stopPropagation();
    const id = toggleBtn.dataset.toggleId;
    const item = currentList().find(p => p.id === id);
    if(!item) return;
    const willHide = !item.soldOut;
    try{
      await api(`/api/admin/menu/${activeKind}/${encodeURIComponent(id)}/soldout`, { method: 'PATCH', body: JSON.stringify({ soldOut: willHide }) });
      await loadData();
      showStatus(willHide ? 'Item ocultado do site.' : 'Item visível no site novamente.');
    }catch(err){
      showStatus('Erro ao atualizar item.', true);
    }
    return;
  }
  const card = e.target.closest('.admin-item-card');
  if(card) openEditor(currentList().find(p => p.id === card.dataset.id));
});

function variantRow(v = { label: '', price: '' }){
  const row = document.createElement('div');
  row.className = 'admin-variant-row';
  row.innerHTML = `
    <input type="text" class="v-label" placeholder="Ex: 10 un" value="${escapeHtml(v.label || '')}" required>
    <input type="number" class="v-price" placeholder="Preço" step="0.01" min="0" value="${v.price ?? ''}" required>
    <button type="button" class="admin-variant-remove" aria-label="Remover variante">×</button>
  `;
  row.querySelector('.admin-variant-remove').addEventListener('click', () => {
    row.remove();
    updateEditorPreview();
  });
  return row;
}

addVariantBtn.addEventListener('click', () => {
  variantsList.appendChild(variantRow());
  updateEditorPreview();
});
$('#fImage')?.addEventListener('input', () => {
  updateImagePreview();
  updateEditorPreview();
});
$('#fCategory')?.addEventListener('change', updateEditorPreview);
$('#fSoldOut')?.addEventListener('change', updateEditorPreview);
editorForm?.addEventListener('input', updateEditorPreview);
editorForm?.addEventListener('change', updateEditorPreview);
imageUploadInput?.addEventListener('change', () => handleImageUpload(imageUploadInput, false));
editorImageUploadInput?.addEventListener('change', () => handleImageUpload(editorImageUploadInput, true));
showcasePanel?.addEventListener('input', () => renderShowcasePreview());
showcasePanel?.addEventListener('change', () => renderShowcasePreview());
showcaseHeroImageUploadInput?.addEventListener('change', () => handleShowcaseImageUpload(showcaseHeroImageUploadInput, showcaseFields.heroImage));
showcasePromoImageUploadInput?.addEventListener('change', () => handleShowcaseImageUpload(showcasePromoImageUploadInput, showcaseFields.promoImage));
imageLibrary?.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('[data-delete-image]');
  if(deleteBtn){
    const image = deleteBtn.dataset.deleteImage;
    if(!confirm('Remover esta imagem da biblioteca?')) return;
    api('/api/admin/images', {
      method: 'DELETE',
      body: JSON.stringify({ image })
    }).then(data => {
      state.images = Array.isArray(data.images) ? data.images : state.images;
      state.imageUsage = data.usage || state.imageUsage || {};
      populateImageOptions();
      renderImages();
      showImageStatus('Imagem removida.');
      showStatus('Imagem removida da biblioteca.');
    }).catch(err => {
      showImageStatus(err.message || 'Erro ao remover imagem.', true);
      showStatus(err.message || 'Erro ao remover imagem.', true);
    });
    return;
  }
  const btn = e.target.closest('[data-image-name]');
  if(!btn) return;
  selectImageForEditor(btn.dataset.imageName);
});

saveShowcaseBtn?.addEventListener('click', async () => {
  try{
    const showcase = collectShowcaseSettings();
    const data = await api('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ showcase })
    });
    state.siteSettings = data.siteSettings || { ...currentSettings(), showcase };
    renderAll();
    showStatus('Vitrine salva.');
  }catch(err){
    showStatus(err.message || 'Erro ao salvar vitrine.', true);
  }
});

newCategoryBtn?.addEventListener('click', () => {
  const id = `nova-${Date.now().toString(36)}`;
  state.menuCategories = [...categories(), { id, label: 'Nova categoria', active: true }];
  state.categoryCounts = { ...(state.categoryCounts || {}), [id]: 0 };
  renderCategories();
  const row = $$('#categoriesList .admin-category-row').find(item => item.dataset.categoryId === id);
  const input = row?.querySelector('.category-label');
  input?.focus();
  input?.select();
});

saveCategoriesBtn?.addEventListener('click', saveCategories);

categoriesList?.addEventListener('click', (e) => {
  const row = e.target.closest('.admin-category-row');
  if(!row) return;
  const move = e.target.closest('[data-category-move]');
  if(move){
    const direction = move.dataset.categoryMove;
    const sibling = direction === 'up' ? row.previousElementSibling : row.nextElementSibling;
    if(sibling){
      if(direction === 'up') categoriesList.insertBefore(row, sibling);
      else categoriesList.insertBefore(sibling, row);
      refreshCategoryMoveButtons();
    }
    return;
  }
  const deleteCategory = e.target.closest('[data-category-delete]');
  if(deleteCategory){
    const count = Number(state.categoryCounts?.[row.dataset.categoryId] || 0);
    if(count){
      showStatus('Essa categoria tem itens. Mova os itens antes de excluir.', true);
      return;
    }
    row.remove();
    refreshCategoryMoveButtons();
  }
});

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
  $('#fDetails').value = (item?.details || []).join('\n');
  $('#fMeta').value = (item?.meta || []).join(', ');
  $('#fSoldOut').checked = !!item?.soldOut;
  updateImagePreview();

  const catSelect = $('#fCategory');
  catSelect.innerHTML = categoryOptionsFor(activeKind, item?.category)
    .map(([f, l]) => `<option value="${escapeHtml(f)}">${escapeHtml(l)}</option>`)
    .join('');
  if(item) catSelect.value = item.category;

  variantsList.innerHTML = '';
  const variants = item?.variants?.length ? item.variants : [{ label: '', price: '' }];
  variants.forEach(v => variantsList.appendChild(variantRow(v)));

  deleteBtn.hidden = !item;
  editorOverlay.hidden = false;
  updateEditorPreview();
}

function closeEditor(){
  editorOverlay.hidden = true;
}

editorClose.addEventListener('click', closeEditor);
cancelBtn.addEventListener('click', closeEditor);
editorOverlay.addEventListener('click', (e) => {
  if(e.target === editorOverlay) closeEditor();
});
newItemBtn.addEventListener('click', () => openEditor(null));

editorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#fId').value;
  const kind = $('#fKind').value;
  const variants = editorVariants();

  if(!variants.length){
    showStatus('Adicione ao menos uma variante com preço válido.', true);
    return;
  }

  const payload = {
    name: $('#fName').value.trim(),
    category: $('#fCategory').value,
    label: $('#fLabel').value.trim(),
    badge: $('#fBadge').value.trim(),
    image: $('#fImage').value.trim(),
    desc: $('#fDesc').value.trim(),
    composition: $('#fComposition').value.trim(),
    details: $('#fDetails').value.split('\n').map(s => s.trim()).filter(Boolean),
    meta: $('#fMeta').value.split(',').map(s => s.trim()).filter(Boolean),
    variants,
    soldOut: $('#fSoldOut').checked
  };

  try{
    if(id){
      await api(`/api/admin/menu/${kind}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
      showStatus('Item atualizado.');
    }else{
      await api(`/api/admin/menu/${kind}`, { method: 'POST', body: JSON.stringify(payload) });
      showStatus('Item criado.');
    }
    closeEditor();
    await loadData();
  }catch(err){
    showStatus('Erro ao salvar item.', true);
  }
});

deleteBtn.addEventListener('click', async () => {
  const id = $('#fId').value;
  const kind = $('#fKind').value;
  if(!id) return;
  if(!confirm('Excluir este item permanentemente?')) return;
  try{
    await api(`/api/admin/menu/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    showStatus('Item excluído.');
    closeEditor();
    await loadData();
  }catch(err){
    showStatus('Erro ao excluir item.', true);
  }
});

function deliveryRow(area = {}){
  const row = document.createElement('div');
  row.className = 'admin-delivery-row';
  row.innerHTML = `
    <input type="text" class="area-name" placeholder="Bairro" maxlength="80" value="${escapeHtml(area.name || '')}">
    <input type="number" class="area-fee" placeholder="Taxa" min="0" step="0.01" value="${area.fee ?? currentSettings().delivery.defaultFee}">
    <label class="admin-switch">
      <input type="checkbox" class="area-active" ${area.active === false ? '' : 'checked'}>
      <span>Ativo</span>
    </label>
    <button type="button" class="admin-row-remove" aria-label="Remover bairro">×</button>
  `;
  return row;
}

function renderDelivery(){
  if(!deliveryRows || !defaultFeeInput) return;
  const delivery = currentSettings().delivery || defaultSettings().delivery;
  defaultFeeInput.value = normalizeFee(delivery.defaultFee, 8);
  deliveryRows.innerHTML = '';
  (delivery.areas || []).forEach(area => deliveryRows.appendChild(deliveryRow(area)));
}

function collectDeliverySettings(){
  const defaultFee = normalizeFee(defaultFeeInput.value, NaN);
  if(!Number.isFinite(defaultFee)) throw new Error('Informe a taxa padrão.');
  const areas = $$('.admin-delivery-row')
    .map(row => ({
      name: row.querySelector('.area-name')?.value.trim() || '',
      fee: normalizeFee(row.querySelector('.area-fee')?.value, defaultFee),
      active: !!row.querySelector('.area-active')?.checked
    }))
    .filter(area => area.name);
  if(!areas.length) throw new Error('Adicione pelo menos um bairro.');
  return { defaultFee, areas };
}

deliveryRows?.addEventListener('click', (e) => {
  const remove = e.target.closest('.admin-row-remove');
  if(remove) remove.closest('.admin-delivery-row')?.remove();
});

addAreaBtn?.addEventListener('click', () => {
  deliveryRows.appendChild(deliveryRow({ fee: defaultFeeInput.value || currentSettings().delivery.defaultFee, active: true }));
});

saveDeliveryBtn?.addEventListener('click', async () => {
  try{
    const delivery = collectDeliverySettings();
    const data = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ delivery }) });
    state.siteSettings = data.siteSettings || { ...currentSettings(), delivery };
    renderAll();
    showStatus('Entregas salvas.');
  }catch(err){
    showStatus(err.message || 'Erro ao salvar entregas.', true);
  }
});

function renderHours(){
  if(!openTimeInput || !closeTimeInput || !leadMinutesInput || !openDaysGroup) return;
  const hours = currentSettings().businessHours || defaultSettings().businessHours;
  openTimeInput.value = hourToTime(hours.openHour);
  closeTimeInput.value = hourToTime(hours.closeHour);
  leadMinutesInput.value = Number(hours.scheduleLeadMinutes) || 0;
  const openDays = new Set((hours.openDays || []).map(Number));
  [...openDaysGroup.querySelectorAll('input[type="checkbox"]')].forEach(input => {
    input.checked = openDays.has(Number(input.value));
  });
}

function collectHoursSettings(){
  const openHour = timeToHour(openTimeInput.value);
  const closeHour = timeToHour(closeTimeInput.value);
  const scheduleLeadMinutes = Math.max(0, Math.min(240, Math.floor(Number(leadMinutesInput.value) || 0)));
  const openDays = [...openDaysGroup.querySelectorAll('input[type="checkbox"]:checked')].map(input => Number(input.value));
  if(!Number.isFinite(openHour) || !Number.isFinite(closeHour)) throw new Error('Informe abertura e fechamento.');
  if(closeHour <= openHour) throw new Error('O fechamento precisa ser depois da abertura.');
  if(!openDays.length) throw new Error('Escolha pelo menos um dia de atendimento.');
  return { openHour, closeHour, openDays, scheduleLeadMinutes, timeZone: 'America/Sao_Paulo' };
}

saveHoursBtn?.addEventListener('click', async () => {
  try{
    const businessHours = collectHoursSettings();
    const data = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ businessHours }) });
    state.siteSettings = data.siteSettings || { ...currentSettings(), businessHours };
    renderAll();
    showStatus('Horários salvos.');
  }catch(err){
    showStatus(err.message || 'Erro ao salvar horários.', true);
  }
});

function statusLabel(status){
  return {
    approved: 'Aprovado',
    pending: 'Pendente',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
    canceled: 'Cancelado',
    expired: 'Expirado',
    error: 'Erro'
  }[status] || status || 'Pendente';
}

function renderOrders(){
  if(!ordersList) return;
  if(!state.orders.length){
    ordersList.innerHTML = '<p class="admin-empty">Nenhum pedido Pix recente encontrado.</p>';
    return;
  }
  ordersList.innerHTML = state.orders.map(order => {
    const address = order.address || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const addressLine = [address.street && `${address.street}, ${address.number || 's/n'}`, address.complement, address.neighborhood, address.cep].filter(Boolean).join(' - ');
    const itemLine = items.map(item => `${item.qty || 1}x ${item.name}`).join(', ');
    return `
      <article class="admin-order-card">
        <div class="admin-order-top">
          <div>
            <div class="admin-order-code">${escapeHtml(order.orderId || order.paymentId || 'Pedido')}</div>
            <div class="admin-order-date">${escapeHtml(formatDateTime(order.createdAt))}</div>
          </div>
          <span class="admin-order-status">${escapeHtml(statusLabel(order.status))}</span>
        </div>
        <div class="admin-order-body">
          <strong>${escapeHtml(order.customerName || 'Cliente WA RIO')}</strong><br>
          ${escapeHtml(addressLine || 'Endereço não informado')}<br>
          ${escapeHtml(order.schedule?.label || 'Entrega não informada')}<br>
          <span class="admin-order-items">${escapeHtml(itemLine || 'Itens não informados')}</span>
        </div>
        <div class="admin-order-foot">
          <span>Entrega: ${escapeHtml(formatMoney(order.deliveryFee || 0))}</span>
          <strong class="admin-order-total">${escapeHtml(formatMoney(order.amount || 0))}</strong>
        </div>
      </article>
    `;
  }).join('');
}

refreshOrdersBtn?.addEventListener('click', () => refreshOrders(true));

function renderTools(){
  if(!deployChecklist) return;
  const checks = Array.isArray(state.deployCheck?.checks) ? state.deployCheck.checks : [];
  if(!checks.length){
    deployChecklist.innerHTML = '<p class="admin-empty">Checklist indisponível no momento.</p>';
    return;
  }
  deployChecklist.innerHTML = checks.map(check => `
    <div class="admin-check-row${check.ok ? '' : ' is-warn'}">
      <span class="admin-check-dot" aria-hidden="true"></span>
      <div>
        <strong>${escapeHtml(check.label)}</strong>
        <span>${escapeHtml(check.detail)}</span>
      </div>
    </div>
  `).join('');
}

downloadBackupBtn?.addEventListener('click', async () => {
  try{
    const res = await fetch('/api/admin/backup', { credentials: 'same-origin' });
    if(!res.ok) throw new Error('Não foi possível baixar o backup.');
    const blob = await res.blob();
    const date = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wa-rio-cardapio-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showStatus('Backup baixado.');
  }catch(err){
    showStatus(err.message || 'Erro ao baixar backup.', true);
  }
});

checkSession();
