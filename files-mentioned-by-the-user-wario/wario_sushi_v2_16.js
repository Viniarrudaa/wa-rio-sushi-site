const navbar = document.getElementById('navbar');
const navToggle=document.getElementById('navToggle');
const navLinks=[...document.querySelectorAll('#navbarMenu a[href^="#"]')];
const navSections=[...new Set(navLinks.map(link=>link.getAttribute('href')).filter(href=>href&&href.length>1))]
  .map(href=>document.querySelector(href))
  .filter(Boolean);
function updateNavState(){
  navbar?.classList.toggle('scrolled',window.scrollY>60);
  const offset=window.scrollY+Math.max(100,window.innerHeight*.28);
  let current=navSections[0]?.id||'inicio';
  navSections.forEach(section=>{if(section.offsetTop<=offset) current=section.id;});
  let marked=false;
  navLinks.forEach(link=>{
    const isCurrent=!marked&&link.getAttribute('href')===`#${current}`;
    link.classList.toggle('is-current',isCurrent);
    if(isCurrent){
      link.setAttribute('aria-current','page');
      marked=true;
    }else{
      link.removeAttribute('aria-current');
    }
  });
}
window.addEventListener('scroll',updateNavState,{passive:true});
function syncHashScroll(){
  const hash=window.location.hash;
  if(!hash||hash.length<2) return window.requestAnimationFrame(updateNavState);
  const target=document.querySelector(hash);
  if(!target) return window.requestAnimationFrame(updateNavState);
  window.setTimeout(()=>{
    const top=Math.max(0,target.getBoundingClientRect().top+window.scrollY-76);
    document.documentElement.scrollTop=top;
    document.body.scrollTop=top;
    window.scrollTo(0,top);
    updateNavState();
  },120);
}
window.addEventListener('hashchange',syncHashScroll);
window.addEventListener('load',syncHashScroll);
window.requestAnimationFrame(syncHashScroll);
let hashSyncAttempts=0;
const hashSyncTimer=window.setInterval(()=>{
  hashSyncAttempts+=1;
  syncHashScroll();
  if(!window.location.hash||window.scrollY>0||hashSyncAttempts>=10) window.clearInterval(hashSyncTimer);
},260);
updateNavState();
function setNavMenuOpen(open){
  navbar?.classList.toggle('is-menu-open',open);
  navToggle?.setAttribute('aria-expanded',open?'true':'false');
  navToggle?.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
}
navToggle?.addEventListener('click',()=>setNavMenuOpen(!navbar.classList.contains('is-menu-open')));
document.querySelectorAll('a[href^="#"]').forEach(a=>{ a.addEventListener('click',e=>{ const href=a.getAttribute('href'); if(!href||href.length<2)return; const t=document.querySelector(href); if(t){e.preventDefault();setNavMenuOpen(false);t.scrollIntoView({behavior:'smooth'});} }); });
document.addEventListener('click',e=>{if(navbar?.classList.contains('is-menu-open')&&!navbar.contains(e.target))setNavMenuOpen(false);});
const whatsappPhone='5521982225443';
const moneyFormatter=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const formatMoney=value=>moneyFormatter.format(Number(value)||0);
const trustedImageHosts=new Set();
function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[char]));
}
function escapeAttr(value){return escapeHtml(value).replace(/`/g,'&#96;');}
function safeText(value,max=240){
  return String(value??'')
    .replace(/[\u0000-\u001F\u007F]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,max);
}
function safeImageSrc(value){
  const src=String(value??'').trim();
  if(/^[\w .()\-]+?\.(?:png|jpe?g|webp|gif|svg)$/i.test(src)&&!src.includes('..')) return src;
  try{
    const url=new URL(src);
    if(url.protocol==='https:'&&trustedImageHosts.has(url.hostname)) return url.href;
  }catch(error){}
  return 'logo_wariobranca - Editado.png';
}
const menuCategories=[
  ['todos','Todos'],
  ['combos','Combos'],
  ['filadelfia','Filadélfia'],
  ['hot','Hot Filadélfia'],
  ['temaki','Temaki'],
  ['uramaki','Uramaki'],
  ['sashimi','Sashimi'],
  ['niguiri','Niguiri'],
  ['joe','Joe Joe'],
  ['especiais','Especiais']
];
const menuProducts=[
  {id:'combo-du-chef',name:'Combo Du Chef',label:'Combos',category:'combos',badge:'36 peças',desc:'36 peças para dividir com hot, salmão, peças especiais e sashimi.',composition:'Itens inclusos no Combo Du Chef:',details:['20 Hot Filadélfia','5 Filadélfia','2 Sushi nigiri','3 Gunkan c/ tataki de salmão','2 Joe Joe','4 Sashimi de salmão'],variants:[{id:'36',label:'36 un',price:65}],meta:['36 peças','Chef'],image:'duchef_Cardapio_optimized.jpg'},
  {id:'combo-mix-joes',name:'Combo Mix Joes',label:'Combos',category:'combos',badge:'12 peças',desc:'12 peças autorais para quem gosta de joes, gunkans e geleias especiais.',composition:'Itens inclusos no Mix Joes:',details:['4 Joe de salmão c/ cream cheese','4 Gunkan c/ tataki de salmão','2 Joe c/ geleia de pimenta','2 Joe c/ geleia de maracujá'],variants:[{id:'12',label:'12 un',price:35.9}],meta:['12 peças','Joes'],image:'mixdejoe_cardapio_optimized.jpg'},
  {id:'combo-wa-rio-1',name:'Combo WA RIO 1',label:'Combos',category:'combos',badge:'31 peças',desc:'31 peças com filadélfia, hot, uramaki e peças especiais da casa.',composition:'Itens inclusos no WA RIO 1:',details:['10 Filadélfia','10 Hot Filadélfia','5 Uramaki de salmão','2 Joe c/ geleia de maracujá','2 Nigiri de salmão','2 Gunkan de tataki de salmão'],variants:[{id:'31',label:'31 un',price:55.9}],meta:['31 peças','WA RIO'],image:'wario1_cardapio_optimized.jpg'},
  {id:'combo-wa-rio-2',name:'Combo WA RIO 2',label:'Combos',category:'combos',badge:'36 peças',desc:'36 peças premium com sashimi, nigiri, joes, uramakis, filadélfia e hot.',composition:'Itens inclusos no WA RIO 2:',details:['4 Sashimi de salmão','4 Nigiri de salmão','2 Nigiri skin','2 Joe c/ cream cheese','4 Uramaki de salmão','4 Uramaki especial','10 Filadélfia roll','10 Hot Filadélfia'],variants:[{id:'36',label:'36 un',price:76.9}],meta:['36 peças','Premium'],image:'wario2_cardapio_optimized.jpg'},
  {id:'filadelfia-roll',name:'Filadélfia Roll',label:'Filadélfia',category:'filadelfia',badge:'Clássico',desc:'Salmão fresco, cream cheese e arroz temperado em uma opção cremosa e muito pedida da casa.',variants:[{id:'10',label:'10 un',price:16.9},{id:'20',label:'20 un',price:23},{id:'30',label:'30 un',price:31},{id:'40',label:'40 un',price:40},{id:'50',label:'50 un',price:50},{id:'60',label:'60 un',price:60}],meta:['10 a 60 un','Cream cheese'],image:'filadelfia_cardapio_optimized.jpg'},
  {id:'hot-filadelfia',name:'Hot Filadélfia',label:'Hot Filadélfia',category:'hot',badge:'Mais pedido',desc:'Hot crocante e filadélfia cremoso, organizado por quantidade para facilitar a escolha.',variants:[{id:'10',label:'10 un',price:16.9},{id:'20',label:'20 un',price:23},{id:'30',label:'30 un',price:31},{id:'40',label:'40 un',price:40},{id:'50',label:'50 un',price:50},{id:'60',label:'60 un',price:60}],meta:['10 a 60 un','Hot'],image:'Hot_roll_cardapio_optimized.jpg'},
  {id:'temaki-frio',name:'Temaki Frio',label:'Temaki',category:'temaki',desc:'Temaki fresco, bem recheado e finalizado com equilíbrio para uma porção individual.',variants:[{id:'1',label:'1 un',price:18.9}],meta:['Individual','Frio'],image:'TEMAKI_site_optimized.jpg'},
  {id:'temaki-hot',name:'Temaki Hot',label:'Temaki',category:'temaki',desc:'Versão quente e intensa do temaki, com textura crocante e recheio cremoso.',variants:[{id:'1',label:'1 un',price:19.9}],meta:['Individual','Hot'],image:'temakihot_cardapio_optimized.jpg'},
  {id:'sushi-dog',name:'Sushi Dog',label:'Especial',category:'especiais',badge:'Especial',desc:'Criação generosa da casa, pensada para quem gosta de uma experiência diferente.',variants:[{id:'1',label:'1 un',price:34.9}],meta:['Especial','Generoso'],image:'sushidog_cardapio_optimized.jpg'},
  {id:'uramaki-salmao',name:'Uramaki de Salmão',label:'Uramaki',category:'uramaki',desc:'Peças frias com salmão, arroz bem temperado e finalização delicada.',variants:[{id:'10',label:'10 un',price:18.9},{id:'20',label:'20 un',price:34.9}],meta:['Salmão','Frio'],image:'uramakisalmao_cardapio_optimized.jpg'},
  {id:'uramaki-especial',name:'Uramaki Especial',label:'Uramaki',category:'uramaki',badge:'Especial',desc:'Uramaki com montagem mais elaborada, acabamento premium e sabor marcante.',variants:[{id:'10',label:'10 un',price:21.9},{id:'20',label:'20 un',price:39.9}],meta:['Especial','Premium'],image:'uramakiespecialatualizado_cardapio_optimized.jpg'},
  {id:'sashimi',name:'Sashimi',label:'Sashimi',category:'sashimi',desc:'Cortes frescos de salmão para complementar o pedido com leveza e precisão.',variants:[{id:'1',label:'1 un',price:4},{id:'4',label:'4 un',price:14},{id:'5',label:'5 un',price:18}],meta:['Salmão','Cortes'],image:'sashimi_cardapio_optimized.jpg'},
  {id:'niguiri',name:'Sushi Niguiri',label:'Niguiri',category:'niguiri',desc:'Arroz temperado e salmão em corte delicado, servido em opções para completar a seleção.',variants:[{id:'1',label:'1 un',price:3},{id:'2',label:'2 un',price:5},{id:'4',label:'4 un',price:9}],meta:['Salmão','Clássico'],image:'sushinigiri_cardapio_optimized.jpg'},
  {id:'joe-joe',name:'Joe Joe',label:'Joe Joe',category:'joe',desc:'Peças cremosas e delicadas para adicionar um toque especial ao pedido.',variants:[{id:'1',label:'1 un',price:3},{id:'2',label:'2 un',price:5},{id:'4',label:'4 un',price:10}],meta:['Especial','Cremoso'],image:'joejoe_cardapio_optimized.jpg'}
];
function variantSummary(item){return `${safeText(item.name,120)}: ${item.variants.map(variant=>`${safeText(variant.label,40)} - ${formatMoney(variant.price)}`).join(', ')}`;}
function variantButtons(item){
  return item.variants.map((variant,index)=>{
    const price=Number(variant.price)||0;
    return `<button class="combo-variant-option${index===0?' is-selected':''}" type="button" data-variant-id="${escapeAttr(variant.id)}" data-variant-label="${escapeAttr(variant.label)}" data-variant-price="${price.toFixed(2)}"><span>${escapeHtml(variant.label)}</span><strong>${formatMoney(price)}</strong></button>`;
  }).join('');
}
function detailList(item){return item.details?.length?`<ul class="combo-detail-list">${item.details.map(detail=>`<li>${escapeHtml(detail)}</li>`).join('')}</ul>`:'';}

// menu filters
const comboGrid=document.getElementById('combosGrid');
const comboFeature=document.getElementById('comboFeature');
const comboList=document.getElementById('comboList');
const comboVisibleCount=document.getElementById('comboVisibleCount');
function renderMenu(){
  const tabs=document.querySelector('.menu-tabs');
  if(tabs){
    tabs.innerHTML=menuCategories.map(([filter,label],index)=>`<button class="menu-tab${index===0?' is-active':''}" type="button" role="tab" aria-selected="${index===0?'true':'false'}" data-filter="${escapeAttr(filter)}">${escapeHtml(label)}</button>`).join('');
  }
  if(comboList){
    comboList.innerHTML=menuProducts.map(item=>{
      const firstVariant=item.variants[0];
      const firstPrice=Number(firstVariant.price)||0;
      const cardId=escapeAttr(item.id);
      const itemName=escapeHtml(item.name);
      const itemNameAttr=escapeAttr(item.name);
      const itemLabel=escapeHtml(item.label);
      const itemLabelAttr=escapeAttr(item.label);
      const itemCategory=escapeAttr(item.category);
      const variantId=escapeAttr(firstVariant.id);
      const variantLabel=escapeHtml(firstVariant.label);
      const variantLabelAttr=escapeAttr(firstVariant.label);
      const imageSrc=escapeAttr(safeImageSrc(item.image));
      const badge=item.badge?escapeHtml(item.badge):'';
      return `
      <article class="combo-card" data-id="${cardId}" data-name="${itemNameAttr}" data-label="${itemLabelAttr}" data-price="${firstPrice.toFixed(2)}" data-variant-id="${variantId}" data-variant-label="${variantLabelAttr}" data-has-variants="${item.variants.length>1?'true':'false'}" data-category="${itemCategory}">
        <img src="${imageSrc}" alt="${itemNameAttr}" loading="lazy">
        ${badge?`<div class="combo-badge">${badge}</div>`:''}
        <div class="combo-body">
          <span class="combo-label">${itemLabel}</span>
          <div class="combo-title-row">
            <div class="combo-name">${itemName}</div>
            ${item.category==='combos'&&badge?`<span class="combo-pieces-inline">${badge}</span>`:''}
          </div>
          <p class="combo-desc">${escapeHtml(item.desc)}</p>
          ${item.composition?`<p class="combo-composition">${escapeHtml(item.composition)}</p>`:''}
          ${detailList(item)}
          <div class="combo-card-summary">
            <span class="combo-current-qty">${variantLabel}</span>
            <strong class="combo-card-price">${formatMoney(firstPrice)}</strong>
          </div>
          <div class="combo-variants" aria-label="Opcoes de ${itemNameAttr}">${variantButtons(item)}</div>
          <div class="combo-meta">${item.meta.map(meta=>`<span class="combo-pill">${escapeHtml(meta)}</span>`).join('')}</div>
          <button class="combo-cta add-to-order" type="button" aria-pressed="false" aria-label="Adicionar ${itemNameAttr} ao pedido"><span class="combo-cta-plus" aria-hidden="true">+</span><span class="combo-cta-text">Adicionar</span></button>
        </div>
      </article>`;
    }).join('');
  }
}
renderMenu();
const comboCards=[...document.querySelectorAll('.combo-card')];
function optionCount(total){return total===1?'1 opção':`${total} opções`;}
function updateFeaturedCard(){
  comboCards.forEach(card=>{
    card.classList.remove('is-featured');
    comboList?.appendChild(card);
  });
  const firstVisible=comboCards.find(card=>!card.classList.contains('is-hidden'));
  const visible=comboCards.filter(card=>!card.classList.contains('is-hidden'));
  if(firstVisible&&comboFeature){
    firstVisible.classList.add('is-featured');
    comboFeature.appendChild(firstVisible);
  }
  comboGrid?.classList.toggle('is-single',visible.length<=1);
  if(comboVisibleCount) comboVisibleCount.textContent=optionCount(visible.length);
  comboList?.scrollTo({top:0,left:0,behavior:'smooth'});
}
document.querySelectorAll('.menu-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    applyMenuFilter(tab.dataset.filter);
  });
});
function applyMenuFilter(filter='todos'){
  const activeFilter=safeText(filter,40)||'todos';
  if(comboGrid) comboGrid.dataset.activeFilter=activeFilter;
  document.querySelectorAll('.menu-tab').forEach(btn=>{
    const active=btn.dataset.filter===activeFilter;
    btn.classList.toggle('is-active',active);
    btn.setAttribute('aria-selected',active?'true':'false');
  });
  comboCards.forEach(card=>{
    const category=safeText(card.dataset.category,40);
    const shouldShow=activeFilter==='todos'||category===activeFilter;
    card.classList.toggle('is-hidden',!shouldShow);
  });
  updateFeaturedCard();
}
applyMenuFilter('todos');

function enableVariantScroller(scroller){
  let isDragging=false;
  let moved=false;
  let startX=0;
  let startScrollLeft=0;

  function canScrollHorizontally(){
    return scroller.scrollWidth>scroller.clientWidth+1;
  }

  scroller.addEventListener('wheel',event=>{
    if(!canScrollHorizontally()||Math.abs(event.deltaX)>Math.abs(event.deltaY)) return;
    const maxScroll=scroller.scrollWidth-scroller.clientWidth;
    const nextScroll=Math.max(0,Math.min(maxScroll,scroller.scrollLeft+event.deltaY));
    if(nextScroll===scroller.scrollLeft) return;
    event.preventDefault();
    scroller.scrollLeft=nextScroll;
  },{passive:false});

  scroller.addEventListener('pointerdown',event=>{
    if(event.button!==0||!canScrollHorizontally()) return;
    if(event.target.closest('.combo-variant-option')) return;
    isDragging=true;
    moved=false;
    startX=event.clientX;
    startScrollLeft=scroller.scrollLeft;
    scroller.classList.add('is-dragging');
    scroller.setPointerCapture?.(event.pointerId);
  });

  scroller.addEventListener('pointermove',event=>{
    if(!isDragging) return;
    const distance=event.clientX-startX;
    if(Math.abs(distance)>4) moved=true;
    scroller.scrollLeft=startScrollLeft-distance;
  });

  function stopDragging(event){
    if(!isDragging) return;
    isDragging=false;
    scroller.classList.remove('is-dragging');
    if(scroller.hasPointerCapture?.(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
  }

  scroller.addEventListener('pointerup',stopDragging);
  scroller.addEventListener('pointercancel',stopDragging);
  scroller.addEventListener('click',event=>{
    if(!moved) return;
    if(event.target.closest('.combo-variant-option')){
      moved=false;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    moved=false;
  },true);
}

document.querySelectorAll('.combo-variants').forEach(enableVariantScroller);

// order flow
const order=new Map();
const orderDrawer=document.getElementById('orderDrawer');
const orderContent=document.getElementById('orderContent');
const orderFoot=document.querySelector('.order-foot');
const orderScrollCue=document.getElementById('orderScrollCue');
const orderItems=document.getElementById('orderItems');
const orderEmpty=document.getElementById('orderEmpty');
const orderSubtotalEl=document.getElementById('orderSubtotal');
const orderDeliveryEl=document.getElementById('orderDelivery');
const orderTotal=document.getElementById('orderTotal');
const orderBar=document.getElementById('orderBar');
const orderBarSummary=document.getElementById('orderBarSummary');
const orderHeadCount=document.getElementById('orderHeadCount');
const orderSend=document.getElementById('orderSend');
const orderSupport=document.getElementById('orderSupport')||document.querySelector('.order-support');
const businessToast=document.getElementById('businessToast');
const orderClear=document.getElementById('orderClear');
const orderNote=document.getElementById('orderNote');
const paymentInputs=[...document.querySelectorAll('input[name="paymentMethod"]')];
const paymentHelp=document.getElementById('paymentHelp');
const pixPayment=document.getElementById('pixPayment');
const pixAmount=document.getElementById('pixAmount');
const pixCode=document.getElementById('pixCode');
const pixCreate=document.getElementById('pixCreate');
const pixCopy=document.getElementById('pixCopy');
const pixQrImage=document.getElementById('pixQrImage');
const pixStatus=document.getElementById('pixStatus');
const turnstileBox=document.getElementById('turnstileBox');
const turnstileWidget=document.getElementById('turnstileWidget');
const turnstileHint=document.getElementById('turnstileHint');
const deliveryCep=document.getElementById('deliveryCep');
const deliveryCheckButton=document.getElementById('deliveryCheckButton');
const deliveryManualButton=document.getElementById('deliveryManualButton');
const deliveryStatus=document.getElementById('deliveryStatus');
const customerName=document.getElementById('customerName');
const deliveryStreet=document.getElementById('deliveryStreet');
const deliveryNumber=document.getElementById('deliveryNumber');
const deliveryComplement=document.getElementById('deliveryComplement');
const deliveryNeighborhood=document.getElementById('deliveryNeighborhood');
const deliveryReference=document.getElementById('deliveryReference');
const addressHelp=document.getElementById('addressHelp');
const addressInputs=[customerName,deliveryStreet,deliveryNumber,deliveryComplement,deliveryNeighborhood,deliveryReference].filter(Boolean);
const scheduleFields=document.getElementById('scheduleFields');
const scheduleDate=document.getElementById('scheduleDate');
const scheduleTime=document.getElementById('scheduleTime');
const scheduleStatus=document.getElementById('scheduleStatus');
const deliveryState={status:'empty',cep:'',area:null};
const defaultDeliveryFee=8;
const orderSendCooldownMs=3000;
const businessToastMs=4000;
const businessHours={openHour:19,closeHour:23,openDays:[0,3,4,5,6],timeZone:'America/Sao_Paulo'};
const scheduleLeadMinutes=30;
let lastOrderSendAt=0;
let businessToastTimer=null;
const pixApi={
  create:'/api/pix/create',
  status:id=>`/api/pix/status/${encodeURIComponent(id)}`,
  security:'/api/security/config'
};
const turnstileState={
  enabled:false,
  siteKey:'',
  token:'',
  widgetId:null,
  scriptPromise:null
};
const pixState={
  paymentId:'',
  orderToken:'',
  status:'idle',
  approved:false,
  qrCode:'',
  qrCodeBase64:'',
  whatsappMessage:'',
  pollTimer:null
};
const deliveryFeeByNeighborhood={
  'cachambi':7,
  'maria da graca':7
};
const deliveryNeighborhoods=[
  // Edite esta lista para alterar os bairros atendidos.
  'Cachambi',
  'Méier',
  'Engenho de Dentro',
  'Pilares',
  'Riachuelo',
  'Maria da Graça',
  'Higienópolis',
  'Engenho Novo',
  'Del Castilho',
  'Abolição',
  'Piedade'
];

function pluralizeItem(total){return total===1?'1 item':`${total} itens`;}
function orderQty(){return [...order.values()].reduce((sum,item)=>sum+item.qty,0);}
function orderSubtotal(){return [...order.values()].reduce((sum,item)=>sum+(item.price*item.qty),0);}
function normalizeCep(value){return String(value||'').replace(/\D/g,'').slice(0,8);}
function formatCep(value){const digits=normalizeCep(value);return digits.length>5?`${digits.slice(0,5)}-${digits.slice(5)}`:digits;}
function normalizeText(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function isNeighborhoodServed(neighborhood){const normalized=normalizeText(neighborhood);return deliveryNeighborhoods.some(item=>normalizeText(item)===normalized);}
function currentDeliveryFee(){if(deliveryState.status!=='served')return null;return deliveryFeeByNeighborhood[normalizeText(deliveryState.area?.name)]??defaultDeliveryFee;}
function hasDeliveryAddressMode(){return deliveryState.status==='served'||deliveryState.status==='manual';}
function isAddressComplete(){
  const hasBaseAddress=Boolean(deliveryStreet?.value.trim())&&Boolean(deliveryNumber?.value.trim());
  const needsNeighborhood=deliveryState.status==='manual';
  return hasDeliveryAddressMode()&&hasBaseAddress&&(!needsNeighborhood||Boolean(deliveryNeighborhood?.value.trim()));
}
function requiresPixApproval(){return selectedPaymentMethod().value==='pix';}
function currentBusinessMinutes(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('pt-BR',{
      timeZone:businessHours.timeZone,
      hour:'2-digit',
      minute:'2-digit',
      hour12:false
    }).formatToParts(date);
    const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    const hour=Number(values.hour==='24'?'0':values.hour);
    const minute=Number(values.minute)||0;
    return (Number.isFinite(hour)?hour:0)*60+(Number.isFinite(minute)?minute:0);
  }catch(error){
    return date.getHours()*60+date.getMinutes();
  }
}
function currentBusinessDay(date=new Date()){
  try{
    const weekday=new Intl.DateTimeFormat('en-US',{
      timeZone:businessHours.timeZone,
      weekday:'short'
    }).format(date).slice(0,3).toLowerCase();
    return {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6}[weekday]??date.getDay();
  }catch(error){
    return date.getDay();
  }
}
function isBusinessDay(date=new Date()){
  return businessHours.openDays.includes(currentBusinessDay(date));
}
function isBusinessOpen(date=new Date()){
  const minutes=currentBusinessMinutes(date);
  return isBusinessDay(date)&&minutes>=businessHours.openHour*60&&minutes<businessHours.closeHour*60;
}
function closedOrderMessage(date=new Date()){
  const minutes=currentBusinessMinutes(date);
  const schedule='Atendemos de quarta a domingo, das 19h \u00e0s 23h.';
  if(!isBusinessDay(date)){
    return `Hoje n\u00e3o estamos abertos. ${schedule}`;
  }
  if(minutes<businessHours.openHour*60){
    return `Ainda n\u00e3o estamos abertos. ${schedule}`;
  }
  return `Atendimento encerrado por hoje. ${schedule}`;
}
function closedOrderButtonText(date=new Date()){
  if(!isBusinessDay(date)) return 'Fechado hoje';
  return currentBusinessMinutes(date)<businessHours.openHour*60?'Ainda n\u00e3o estamos abertos':'Atendimento encerrado';
}
function pad2(value){return String(value).padStart(2,'0');}
function brazilDateParts(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:businessHours.timeZone,
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).formatToParts(date);
    return Object.fromEntries(parts.map(part=>[part.type,part.value]));
  }catch(error){
    return {year:String(date.getFullYear()),month:pad2(date.getMonth()+1),day:pad2(date.getDate())};
  }
}
function brazilDateValue(date=new Date()){
  const parts=brazilDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function scheduleTimes(){
  const slots=[];
  for(let minutes=businessHours.openHour*60;minutes<businessHours.closeHour*60;minutes+=30){
    slots.push(`${pad2(Math.floor(minutes/60))}:${pad2(minutes%60)}`);
  }
  return slots;
}
function scheduleDateObject(dateValue){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue||''))) return null;
  const date=new Date(`${dateValue}T12:00:00-03:00`);
  return Number.isNaN(date.getTime())?null:date;
}
function scheduleTimestamp(dateValue,timeValue){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue||''))||!/^\d{2}:\d{2}$/.test(String(timeValue||''))) return NaN;
  return Date.parse(`${dateValue}T${timeValue}:00-03:00`);
}
function isBusinessTime(timeValue){
  const match=String(timeValue||'').match(/^(\d{2}):(\d{2})$/);
  if(!match) return false;
  const minutes=Number(match[1])*60+Number(match[2]);
  return Number.isFinite(minutes)&&minutes>=businessHours.openHour*60&&minutes<businessHours.closeHour*60;
}
function formatScheduleDate(dateValue){
  const date=scheduleDateObject(dateValue);
  if(!date) return '';
  return new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(date).replace('.', '');
}
function findNextScheduleSlot(){
  const now=Date.now();
  const minTime=now+scheduleLeadMinutes*60_000;
  const times=scheduleTimes();
  for(let dayOffset=0;dayOffset<21;dayOffset+=1){
    const probe=new Date(now+dayOffset*86_400_000);
    const dateValue=brazilDateValue(probe);
    const date=scheduleDateObject(dateValue);
    if(!date||!isBusinessDay(date)) continue;
    const time=times.find(slot=>scheduleTimestamp(dateValue,slot)>=minTime);
    if(time) return {date:dateValue,time};
  }
  return {date:brazilDateValue(),time:times[0]||'19:00'};
}
function setupScheduleControls(){
  if(scheduleDate){
    scheduleDate.min=brazilDateValue();
    if(!scheduleDate.value){
      const next=findNextScheduleSlot();
      scheduleDate.value=next.date;
      if(scheduleTime) scheduleTime.dataset.defaultTime=next.time;
    }
  }
  if(scheduleTime&&!scheduleTime.options.length){
    scheduleTime.innerHTML=scheduleTimes().map(time=>`<option value="${time}">${time}</option>`).join('');
    if(scheduleTime.dataset.defaultTime) scheduleTime.value=scheduleTime.dataset.defaultTime;
  }
}
function schedulePayload(){
  const date=safeText(scheduleDate?.value,10);
  const time=safeText(scheduleTime?.value,5);
  return {
    mode:'scheduled',
    date,
    time,
    label:`${formatScheduleDate(date)} \u00e0s ${time}`
  };
}
function scheduleValidation(isOpen=isBusinessOpen()){
  setupScheduleControls();
  const payload=schedulePayload();
  const date=scheduleDateObject(payload.date);
  if(!date) return {valid:false,status:'warning',message:'Escolha uma data para agendar a entrega.',payload};
  if(!isBusinessDay(date)) return {valid:false,status:'warning',message:'Escolha uma data de quarta a domingo.',payload};
  if(!isBusinessTime(payload.time)) return {valid:false,status:'warning',message:'Escolha um hor\u00e1rio entre 19h e 23h.',payload};
  const timestamp=scheduleTimestamp(payload.date,payload.time);
  if(!Number.isFinite(timestamp)||timestamp<Date.now()+scheduleLeadMinutes*60_000){
    return {valid:false,status:'warning',message:`Escolha um hor\u00e1rio com pelo menos ${scheduleLeadMinutes} minutos de anteced\u00eancia.`,payload};
  }
  return {valid:true,status:'success',message:`Entrega agendada para ${payload.label}.`,payload};
}
function updateScheduleUi(isOpen=isBusinessOpen()){
  setupScheduleControls();
  if(scheduleFields) scheduleFields.hidden=false;
  if(!scheduleStatus) return;
  const validation=scheduleValidation(isOpen);
  scheduleStatus.className=`schedule-status is-${validation.status}`.trim();
  scheduleStatus.textContent=validation.message;
}
function canAcceptOrder(isOpen=isBusinessOpen()){
  return scheduleValidation(isOpen).valid;
}
function selectScheduledMode(){
  setupScheduleControls();
}
function updateOrderSupport(isOpen=isBusinessOpen()){
  if(!orderSupport) return;
  const validation=scheduleValidation(isOpen);
  orderSupport.classList.toggle('is-warning',!validation.valid);
  orderSupport.textContent=validation.valid
    ? `Pedido agendado para ${validation.payload.label}.`
    : validation.message;
}
function showBusinessToast(message=closedOrderMessage()){
  if(!businessToast) return;
  businessToast.textContent=message;
  businessToast.setAttribute('aria-hidden','false');
  businessToast.classList.add('is-visible');
  window.clearTimeout(businessToastTimer);
  businessToastTimer=window.setTimeout(()=>{
    businessToast.classList.remove('is-visible');
    businessToast.setAttribute('aria-hidden','true');
  },businessToastMs);
}
function showClosedOrderNotice(){
  updateOrderSupport(false);
  showBusinessToast(closedOrderMessage());
}
function canSendOrder(isOpen=isBusinessOpen()){return canAcceptOrder(isOpen)&&orderQty()>0&&hasDeliveryAddressMode()&&isAddressComplete()&&(!requiresPixApproval()||pixState.approved);}
function selectedPaymentMethod(){
  const checked=paymentInputs.find(input=>input.checked)||paymentInputs[0];
  return {
    value:safeText(checked?.value,40)||'pix',
    label:safeText(checked?.dataset.label,80)||'Pix'
  };
}
function pixOrderAmount(){
  const fee=currentDeliveryFee();
  if(!orderQty()||typeof fee!=='number') return null;
  return orderGrandTotal();
}
function stopPixPolling(){
  if(pixState.pollTimer){
    window.clearInterval(pixState.pollTimer);
    pixState.pollTimer=null;
  }
}
function resetPixState(){
  stopPixPolling();
  pixState.paymentId='';
  pixState.orderToken='';
  pixState.status='idle';
  pixState.approved=false;
  pixState.qrCode='';
  pixState.qrCodeBase64='';
  pixState.whatsappMessage='';
  resetTurnstileToken(false);
}
function isTurnstileReady(){return !turnstileState.enabled||Boolean(turnstileState.token);}
function setTurnstileStatus(status,message){
  if(!turnstileBox||!turnstileHint) return;
  turnstileBox.classList.toggle('is-ready',status==='ready');
  turnstileBox.classList.toggle('is-error',status==='error');
  turnstileHint.textContent=message;
}
function loadTurnstileScript(){
  if(turnstileState.scriptPromise) return turnstileState.scriptPromise;
  turnstileState.scriptPromise=new Promise((resolve,reject)=>{
    if(window.turnstile) return resolve(window.turnstile);
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.defer=true;
    script.onload=()=>resolve(window.turnstile);
    script.onerror=()=>reject(new Error('Turnstile indisponivel'));
    document.head.appendChild(script);
  });
  return turnstileState.scriptPromise;
}
async function renderTurnstile(){
  if(!turnstileState.enabled||!turnstileBox||!turnstileWidget) return;
  turnstileBox.hidden=false;
  setTurnstileStatus('idle','Confirme a verificacao para gerar o Pix.');
  try{
    const turnstile=await loadTurnstileScript();
    if(turnstileState.widgetId!==null) return;
    turnstileState.widgetId=turnstile.render(turnstileWidget,{
      sitekey:turnstileState.siteKey,
      theme:'dark',
      callback:token=>{
        turnstileState.token=String(token||'');
        setTurnstileStatus('ready','Verificacao concluida. Pix liberado para gerar.');
        updatePixPayment();
      },
      'expired-callback':()=>{
        turnstileState.token='';
        setTurnstileStatus('idle','A verificacao expirou. Confirme novamente para gerar o Pix.');
        updatePixPayment();
      },
      'error-callback':()=>{
        turnstileState.token='';
        setTurnstileStatus('error','Nao foi possivel validar agora. Tente novamente.');
        updatePixPayment();
      }
    });
  }catch(error){
    setTurnstileStatus('error','Verificacao anti-bot indisponivel no momento.');
  }
}
function resetTurnstileToken(shouldUpdate=true){
  if(!turnstileState.enabled) return;
  turnstileState.token='';
  if(window.turnstile&&turnstileState.widgetId!==null){
    window.turnstile.reset(turnstileState.widgetId);
  }
  setTurnstileStatus('idle','Confirme a verificacao para gerar o Pix.');
  if(shouldUpdate) updatePixPayment();
}
async function initSecurityConfig(){
  try{
    const response=await fetch(pixApi.security,{headers:{Accept:'application/json'}});
    if(!response.ok) return;
    const data=await response.json();
    if(!data.turnstileEnabled||!data.turnstileSiteKey) return;
    turnstileState.enabled=true;
    turnstileState.siteKey=String(data.turnstileSiteKey);
    await renderTurnstile();
    updatePixPayment();
  }catch(error){
    // O servidor estatico local nao expoe essa rota; em producao ela vem do backend.
  }
}
function pixStatusText(status){
  return {
    idle:'Gere o Pix e pague no app do banco. O WhatsApp libera automaticamente depois da confirmação.',
    creating:'Gerando cobrança Pix segura...',
    pending:'Pix gerado. Após o pagamento, aguarde alguns segundos para liberar o WhatsApp.',
    approved:'Pagamento aprovado. Agora envie o pedido confirmado pelo WhatsApp.',
    error:'Não foi possível gerar ou confirmar o Pix agora. Tente novamente.'
  }[status]||'Aguardando pagamento Pix.';
}
function updatePixPayment(){
  if(!pixPayment||!pixCode||!pixCopy||!pixStatus) return;
  const method=selectedPaymentMethod();
  const showPix=method.value==='pix'&&orderQty()>0;
  pixPayment.hidden=!showPix;
  if(!showPix){
    pixCode.value='';
    pixCopy.disabled=true;
    if(pixCreate) pixCreate.disabled=true;
    if(pixQrImage){
      pixQrImage.hidden=true;
      pixQrImage.removeAttribute('src');
    }
    pixStatus.className='pix-status';
    return;
  }
  const scheduleCheck=scheduleValidation();
  if(!scheduleCheck.valid){
    if(pixAmount) pixAmount.textContent='Agende';
    pixCode.value='';
    if(pixCreate) pixCreate.disabled=true;
    pixCopy.disabled=true;
    if(pixQrImage){
      pixQrImage.hidden=true;
      pixQrImage.removeAttribute('src');
    }
    pixStatus.className='pix-status is-warning';
    pixStatus.textContent=scheduleCheck.message;
    return;
  }
  const amount=pixOrderAmount();
  if(!amount){
    if(pixAmount) pixAmount.textContent='A confirmar';
    pixCode.value='';
    if(pixCreate) pixCreate.disabled=true;
    pixCopy.disabled=true;
    if(pixQrImage){
      pixQrImage.hidden=true;
      pixQrImage.removeAttribute('src');
    }
    pixStatus.className='pix-status is-warning';
    pixStatus.textContent='Confirme um CEP atendido para gerar o Pix com valor exato. Sem CEP, a equipe confirma a taxa no WhatsApp.';
    return;
  }
  if(pixAmount) pixAmount.textContent=formatMoney(amount);
  pixCode.value=pixState.qrCode;
  pixCopy.disabled=!pixState.qrCode;
  if(turnstileState.enabled) renderTurnstile();
  if(pixCreate) pixCreate.disabled=pixState.status==='creating'||pixState.approved||!isTurnstileReady();
  if(pixQrImage){
    if(pixState.qrCodeBase64){
      pixQrImage.src=`data:image/png;base64,${pixState.qrCodeBase64}`;
      pixQrImage.hidden=false;
    }else{
      pixQrImage.hidden=true;
      pixQrImage.removeAttribute('src');
    }
  }
  pixStatus.className=`pix-status ${pixState.approved?'is-ready':pixState.status==='error'?'is-warning':''}`.trim();
  pixStatus.textContent=pixStatusText(pixState.status);
}
function updatePaymentHelp(){
  if(!paymentHelp) return;
  const method=selectedPaymentMethod();
  paymentHelp.classList.toggle('is-online',method.value==='pix');
  paymentHelp.textContent=method.value==='pix'
    ? 'O pedido so libera o WhatsApp depois da confirmacao do Pix.'
    : 'Pagamento na entrega. A forma escolhida sera enviada com o pedido.';
  updatePixPayment();
}
function orderPayloadForPayment(){
  const typedNeighborhood=safeText(deliveryNeighborhood?.value,80);
  const areaName=deliveryState.status==='manual'
    ? typedNeighborhood
    : deliveryState.area?safeText(deliveryState.area.name,80):'';
  const cep=normalizeCep(deliveryState.cep);
  return {
    amount:Number(orderGrandTotal().toFixed(2)),
    customerName:safeText(customerName?.value,80),
    items:[...order.values()].map(item=>({
      id:safeText(item.id,80),
      name:safeText(item.name,120),
      qty:Number(item.qty)||0,
      price:Number(item.price)||0
    })),
    address:{
      street:safeText(deliveryStreet?.value,140),
      number:safeText(deliveryNumber?.value,12),
      complement:safeText(deliveryComplement?.value,80),
      neighborhood:areaName,
      cep:cep?formatCep(cep):''
    },
    schedule:schedulePayload(),
    turnstileToken:turnstileState.token
  };
}
async function checkPixStatus(){
  if(!pixState.paymentId) return;
  try{
    const response=await fetch(`${pixApi.status(pixState.paymentId)}?token=${encodeURIComponent(pixState.orderToken)}`,{headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error('Falha ao consultar Pix');
    const data=await response.json();
    pixState.status=data.status||pixState.status;
    pixState.approved=data.status==='approved';
    if(data.whatsappMessage) pixState.whatsappMessage=String(data.whatsappMessage);
    if(pixState.approved) stopPixPolling();
    renderOrder();
  }catch(error){
    pixState.status='error';
    updatePixPayment();
  }
}
function startPixPolling(){
  stopPixPolling();
  pixState.pollTimer=window.setInterval(checkPixStatus,5000);
}
async function createPixCharge(){
  const scheduleCheck=scheduleValidation();
  if(!scheduleCheck.valid){
    setOrderOpen(true);
    showBusinessToast(scheduleCheck.message);
    updatePixPayment();
    return;
  }
  const amount=pixOrderAmount();
  if(!amount){
    updatePixPayment();
    return;
  }
  pixState.status='creating';
  pixState.approved=false;
  updatePixPayment();
  try{
    const response=await fetch(pixApi.create,{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify(orderPayloadForPayment())
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||'Falha ao gerar Pix');
    pixState.paymentId=String(data.paymentId||'');
    pixState.orderToken=String(data.orderToken||'');
    pixState.status=data.status==='approved'?'approved':'pending';
    pixState.approved=data.status==='approved';
    pixState.qrCode=String(data.qrCode||'');
    pixState.qrCodeBase64=String(data.qrCodeBase64||'');
    resetTurnstileToken(false);
    if(!pixState.approved) startPixPolling();
    renderOrder();
  }catch(error){
    pixState.status='error';
    resetTurnstileToken(false);
    updatePixPayment();
  }
}
function setAddressEnabled(enabled){addressInputs.forEach(input=>{input.disabled=!enabled;});updateAddressHelp();}
function updateAddressHelp(){
  if(!addressHelp) return;
  addressHelp.classList.toggle('is-success',isAddressComplete());
  addressHelp.classList.toggle('is-warning',deliveryState.status==='manual'&&!isAddressComplete());
  if(deliveryState.status==='served'){
    addressHelp.textContent=isAddressComplete()?'Endereço pronto para enviar no WhatsApp.':'Preencha endereço e número para liberar o envio do pedido.';
  }else if(deliveryState.status==='manual'){
    addressHelp.textContent=isAddressComplete()?'Endereço pronto para enviar no WhatsApp. A taxa será confirmada pela equipe.':'Preencha endereço, número e bairro para enviar sem CEP.';
  }else{
    addressHelp.textContent='Confirme o CEP ou toque em “Não sei meu CEP” para preencher o endereço.';
  }
}
function updateDeliveryStatus(status,message,area=null){
  deliveryState.status=status;
  deliveryState.cep=deliveryCep?.value||'';
  deliveryState.area=area;
  setAddressEnabled(status==='served'||status==='manual');
  if(deliveryStatus){
    deliveryStatus.className=`delivery-status ${status==='served'?'is-success':status==='blocked'?'is-error':status==='invalid'||status==='checking'||status==='manual'?'is-warning':''}`.trim();
    deliveryStatus.textContent=message;
  }
}
function startManualAddress(){
  resetPixState();
  if(deliveryCep) deliveryCep.value='';
  updateDeliveryStatus('manual','Tudo bem. Preencha o endereço completo e a equipe confirma a entrega no WhatsApp.');
  if(deliveryNeighborhood&&!deliveryNeighborhood.value.trim()) deliveryNeighborhood.focus();
  if(deliveryStreet&&!deliveryStreet.value.trim()) deliveryStreet.focus();
  renderOrder();
}
async function verifyDeliveryCep(){
  const cep=deliveryCep?.value||'';
  const digits=normalizeCep(cep);
  if(digits.length!==8){
    updateDeliveryStatus('invalid','Digite o CEP no formato 00000-000.');
    renderOrder();
    return false;
  }
  updateDeliveryStatus('checking','Consultando área de entrega...');
  renderOrder();
  try{
    const response=await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if(!response.ok) throw new Error('CEP indisponível');
    const data=await response.json();
    if(data.erro||!data.bairro){
      updateDeliveryStatus('invalid','Não encontramos esse CEP. Confira e tente novamente.');
      renderOrder();
      return false;
    }
    const area={name:data.bairro,city:data.localidade,state:data.uf,street:data.logradouro||''};
    if(isNeighborhoodServed(data.bairro)){
      if(deliveryStreet&&(!deliveryStreet.value.trim()||deliveryStreet.dataset.autofilled==='true')){
        deliveryStreet.value=data.logradouro||'';
        deliveryStreet.dataset.autofilled='true';
      }
      if(deliveryNeighborhood&&(!deliveryNeighborhood.value.trim()||deliveryNeighborhood.dataset.autofilled==='true')){
        deliveryNeighborhood.value=data.bairro||'';
        deliveryNeighborhood.dataset.autofilled='true';
      }
      updateDeliveryStatus('served','Entregamos na sua região!',area);
      renderOrder();
      return true;
    }
    updateDeliveryStatus('blocked','Infelizmente ainda não entregamos nesse endereço.',area);
    renderOrder();
    return false;
  }catch(error){
    updateDeliveryStatus('invalid','Não foi possível validar o CEP agora. Tente novamente em instantes.');
    renderOrder();
    return false;
  }
}
function orderGrandTotal(){const fee=currentDeliveryFee();return orderSubtotal()+(typeof fee==='number'?fee:0);}
function itemFromCard(card){
  const image=card.querySelector('img');
  const variant=card.querySelector('.combo-variant-option.is-selected');
  const variantId=variant?.dataset.variantId||card.dataset.variantId||'unico';
  const variantLabel=variant?.dataset.variantLabel||card.dataset.variantLabel||'1 un';
  const price=Number(variant?.dataset.variantPrice||card.dataset.price)||0;
  const hasVariants=card.dataset.hasVariants==='true';
  return {
    id:`${card.dataset.id}-${variantId}`,
    productId:card.dataset.id,
    name:hasVariants?`${card.dataset.name} (${variantLabel})`:card.dataset.name,
    label:`${card.dataset.label||'Seleção WA RIO'} • ${variantLabel}`,
    price,
    pieces:variantLabel,
    image:image?.currentSrc||image?.src||'',
    alt:image?.alt||card.dataset.name||''
  };
}
function setAddButtonDefault(button){
  const plus=document.createElement('span');
  plus.className='combo-cta-plus';
  plus.setAttribute('aria-hidden','true');
  plus.textContent='+';
  const text=document.createElement('span');
  text.className='combo-cta-text';
  text.textContent='Adicionar';
  button.replaceChildren(plus,text);
}
function setAddButtonAdded(button){
  const plus=document.createElement('span');
  plus.className='combo-cta-plus';
  plus.setAttribute('aria-hidden','true');
  plus.textContent='OK';
  const text=document.createElement('span');
  text.className='combo-cta-text';
  text.textContent='Adicionado';
  button.replaceChildren(plus,text);
}
function setAddButtonClosed(button){
  const plus=document.createElement('span');
  plus.className='combo-cta-plus';
  plus.setAttribute('aria-hidden','true');
  plus.textContent='!';
  const text=document.createElement('span');
  text.className='combo-cta-text';
  text.textContent='Fechado agora';
  button.replaceChildren(plus,text);
}
function updateOrderSelectionState(){
  const total=orderQty();
  orderBar?.classList.toggle('has-items',total>0);
  document.querySelectorAll('.combo-card').forEach(card=>{
    const button=card.querySelector('.add-to-order');
    if(!button) return;
    const item=itemFromCard(card);
    const selected=order.has(item.id);
    card.classList.toggle('is-in-order',selected);
    button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label',`Adicionar ${item.name} ao pedido`);
    if(!button.classList.contains('is-added')){
      setAddButtonDefault(button);
    }
  });
}
function setOrderOpen(open){
  document.body.classList.toggle('order-open',open);
  orderDrawer?.setAttribute('aria-hidden',open?'false':'true');
  window.requestAnimationFrame(updateOrderScrollCue);
}
function updateOrderScrollCue(){
  if(!orderDrawer||!orderContent||!orderScrollCue) return;
  if(orderFoot){
    orderDrawer.style.setProperty('--order-foot-height',`${Math.round(orderFoot.getBoundingClientRect().height)}px`);
  }
  const canScroll=orderContent.scrollHeight>orderContent.clientHeight+10;
  const nearBottom=orderContent.scrollTop+orderContent.clientHeight>=orderContent.scrollHeight-28;
  const shouldShow=document.body.classList.contains('order-open')&&canScroll&&!nearBottom;
  orderDrawer.classList.toggle('has-scroll-cue',shouldShow);
}
function scrollOrderContentForward(){
  if(!orderContent) return;
  orderContent.scrollBy({top:Math.max(180,orderContent.clientHeight*.72),behavior:'smooth'});
  window.setTimeout(updateOrderScrollCue,260);
}
function renderOrder(){
  if(!orderItems) return;
  orderItems.innerHTML='';
  const isOpen=isBusinessOpen();
  const items=[...order.values()];
  items.forEach(item=>{
    const row=document.createElement('div');
    row.className='order-item';
    row.dataset.id=item.id;

    const thumb=document.createElement('div');
    thumb.className='order-thumb';
    if(item.image){
      const img=document.createElement('img');
      img.src=item.image;
      img.alt=item.alt||item.name;
      thumb.appendChild(img);
    }else{
      thumb.textContent='WA';
    }

    const info=document.createElement('div');
    info.className='order-item-info';
    const name=document.createElement('strong');
    name.textContent=item.name;
    const label=document.createElement('span');
    label.className='order-item-label';
    label.textContent=item.label;
    const price=document.createElement('span');
    price.className='order-item-price';
    price.textContent=`${formatMoney(item.price)} un.`;
    info.append(name,label,price);

    const qty=document.createElement('div');
    qty.className='order-qty';
    const minus=document.createElement('button');
    minus.className='order-action';
    minus.type='button';
    minus.dataset.action='decrease';
    minus.textContent='−';
    minus.setAttribute('aria-label',`Diminuir ${item.name}`);
    const number=document.createElement('div');
    number.className='order-qty-number';
    number.textContent=item.qty;
    const plus=document.createElement('button');
    plus.className='order-action';
    plus.type='button';
    plus.dataset.action='increase';
    plus.textContent='+';
    plus.setAttribute('aria-label',`Aumentar ${item.name}`);
    qty.append(minus,number,plus);

    const remove=document.createElement('button');
    remove.className='order-remove';
    remove.type='button';
    remove.dataset.action='remove';
    remove.textContent='Remover';

    row.append(thumb,info,qty,remove);
    orderItems.append(row);
  });
  const total=orderQty();
  const subtotal=orderSubtotal();
  const fee=currentDeliveryFee();
  const deliveryText=deliveryState.status==='served'?(typeof fee==='number'?formatMoney(fee):'A calcular'):deliveryState.status==='manual'?'A confirmar':deliveryState.status==='blocked'?'Não atendido':'Informe CEP ou endereço';
  const grandTotal=orderGrandTotal();
  const totalText=deliveryState.status==='manual'?`${formatMoney(subtotal)} + entrega`:formatMoney(grandTotal);
  document.body.classList.toggle('has-order',total>0);
  orderEmpty?.classList.toggle('is-hidden',total>0);
  orderBar.classList.toggle('is-visible',total>0);
  if(orderSubtotalEl) orderSubtotalEl.textContent=formatMoney(subtotal);
  if(orderDeliveryEl) orderDeliveryEl.textContent=deliveryText;
  orderTotal.textContent=total>0?totalText:formatMoney(0);
  orderBarSummary.textContent=total>0?`${pluralizeItem(total)} • ${totalText}`:pluralizeItem(total);
  if(orderHeadCount) orderHeadCount.textContent=total>0?`${pluralizeItem(total)} • ${totalText}`:pluralizeItem(total);
  updateScheduleUi(isOpen);
  if(orderSend){
    orderSend.disabled=!canSendOrder(isOpen);
    orderSend.textContent=!canAcceptOrder(isOpen)?'Escolha um agendamento':total>0&&requiresPixApproval()&&!pixState.approved?'Aguardando pagamento Pix':'Enviar pedido pelo WhatsApp';
  }
  updateOrderSupport(isOpen);
  updateAddressHelp();
  updatePaymentHelp();
  updateOrderSelectionState();
  window.requestAnimationFrame(updateOrderScrollCue);
}
function selectVariant(button){
  const card=button.closest('.combo-card');
  if(!card) return;
  card.querySelectorAll('.combo-variant-option').forEach(option=>option.classList.toggle('is-selected',option===button));
  card.dataset.price=button.dataset.variantPrice;
  card.dataset.variantId=button.dataset.variantId;
  card.dataset.variantLabel=button.dataset.variantLabel;
  const summaryPrice=card.querySelector('.combo-card-price');
  const summaryQty=card.querySelector('.combo-current-qty');
  if(summaryPrice) summaryPrice.textContent=formatMoney(button.dataset.variantPrice);
  if(summaryQty) summaryQty.textContent=button.dataset.variantLabel;
  updateOrderSelectionState();
}
function addToOrder(card,button){
  const isOpen=isBusinessOpen();
  if(!isOpen) selectScheduledMode();
  const item=itemFromCard(card);
  const current=order.get(item.id);
  order.set(item.id,{...item,qty:current?current.qty+1:1});
  resetPixState();
  renderOrder();
  if(!isOpen){
    setOrderOpen(true);
    showBusinessToast('Item adicionado. Escolha o dia e hor\u00e1rio para agendar a entrega.');
  }
  if(orderBar){
    orderBar.classList.add('is-pulsing');
    window.clearTimeout(orderBar._pulseTimer);
    orderBar._pulseTimer=window.setTimeout(()=>orderBar.classList.remove('is-pulsing'),700);
  }
  if(button){
    button.classList.add('is-added');
    setAddButtonAdded(button);
    window.clearTimeout(button._orderTimer);
    button._orderTimer=window.setTimeout(()=>{
      button.classList.remove('is-added');
      setAddButtonDefault(button);
      updateOrderSelectionState();
    },1100);
  }
}
function buildWhatsappMessage(){
  const lines=[...order.values()].map(item=>`• ${Number(item.qty)||0}x ${safeText(item.name,120)} - ${formatMoney(item.price*item.qty)}`);
  const note=safeText(orderNote?.value,240);
  const method=selectedPaymentMethod();
  const schedule=schedulePayload();
  const paymentLabel=method.value==='pix'
    ? (pixState.approved?'Pix aprovado':'Pix aguardando confirmacao')
    : `${method.label} na entrega`;
  const subtotal=orderSubtotal();
  const fee=currentDeliveryFee();
  const hasDelivery=typeof fee==='number';
  const totalLine=hasDelivery?formatMoney(orderGrandTotal()):`${formatMoney(subtotal)} + entrega`;
  const typedNeighborhood=safeText(deliveryNeighborhood?.value,80);
  const areaName=deliveryState.status==='manual'
    ? typedNeighborhood
    : deliveryState.area?safeText(deliveryState.area.name,80):'';
  const clientName=safeText(customerName?.value,80);
  const street=safeText(deliveryStreet?.value,140);
  const number=safeText(deliveryNumber?.value,12);
  const complement=safeText(deliveryComplement?.value,80);
  const reference=safeText(deliveryReference?.value,140);
  const cep=normalizeCep(deliveryState.cep);
  const addressParts=[
    `${street}, nº ${number}`,
    complement,
    areaName,
    cep?`CEP ${formatCep(cep)}`:'',
    reference?`Ref: ${reference}`:''
  ].filter(Boolean);
  const addressLine=hasDeliveryAddressMode()?addressParts.join(' - '):'Não informado';
  return [
    'Olá, WA RIO Sushi!',
    `Nome: ${clientName || 'Não informado'}`,
    'Pedido:',
    ...lines,
    `Endereço: ${addressLine}`,
    `Agendamento: ${schedule.label}`,
    `Pagamento: ${paymentLabel}`,
    `Total: ${totalLine}`,
    note?`Obs: ${note}`:''
  ].filter(Boolean).join('\n');
}
document.addEventListener('click',event=>{
  const button=event.target.closest('.combo-variant-option');
  if(!button) return;
  event.preventDefault();
  selectVariant(button);
});
document.querySelectorAll('.add-to-order').forEach(button=>{
  button.addEventListener('click',()=>{const card=button.closest('.combo-card');if(card)addToOrder(card,button);});
});
document.querySelectorAll('a[href*="wa.me/5521982225443"]').forEach(link=>{
  link.addEventListener('click',()=>{
    setNavMenuOpen(false);
    if(!isBusinessOpen()&&!link.classList.contains('btn-buffet')){
      showBusinessToast(closedOrderMessage());
    }
  });
});
orderBar?.addEventListener('click',()=>setOrderOpen(true));
orderContent?.addEventListener('scroll',updateOrderScrollCue,{passive:true});
orderScrollCue?.addEventListener('click',scrollOrderContentForward);
window.addEventListener('resize',updateOrderScrollCue);
document.querySelectorAll('[data-order-close]').forEach(btn=>btn.addEventListener('click',()=>setOrderOpen(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){setNavMenuOpen(false);setOrderOpen(false);}});
orderItems?.addEventListener('click',e=>{
  const button=e.target.closest('button[data-action]');
  if(!button) return;
  const id=button.closest('.order-item')?.dataset.id;
  const item=order.get(id);
  if(!item) return;
  if(button.dataset.action==='increase'&&!canAcceptOrder()){
    showBusinessToast(scheduleValidation().message);
    updatePixPayment();
    return;
  }
  if(button.dataset.action==='increase') item.qty+=1;
  if(button.dataset.action==='decrease') item.qty-=1;
  if(button.dataset.action==='remove'||item.qty<=0) order.delete(id);
  resetPixState();
  renderOrder();
});
deliveryCep?.addEventListener('input',()=>{
  resetPixState();
  deliveryCep.value=formatCep(deliveryCep.value);
  if(normalizeCep(deliveryCep.value).length===8){
    verifyDeliveryCep();
  }else{
    updateDeliveryStatus('empty','Digite o CEP ou use a opção sem CEP para preencher o endereço.');
    renderOrder();
  }
});
deliveryCep?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();verifyDeliveryCep();}});
deliveryCheckButton?.addEventListener('click',()=>verifyDeliveryCep());
deliveryManualButton?.addEventListener('click',startManualAddress);
addressInputs.forEach(input=>{
  input.addEventListener('input',()=>{
    if(input===deliveryStreet) deliveryStreet.dataset.autofilled='false';
    if(input===deliveryNeighborhood) deliveryNeighborhood.dataset.autofilled='false';
    resetPixState();
    renderOrder();
  });
});
paymentInputs.forEach(input=>input.addEventListener('change',()=>{
  resetPixState();
  renderOrder();
}));
[scheduleDate,scheduleTime].filter(Boolean).forEach(input=>input.addEventListener('change',()=>{
  resetPixState();
  renderOrder();
}));
pixCreate?.addEventListener('click',createPixCharge);
pixCopy?.addEventListener('click',async()=>{
  const code=pixCode?.value||'';
  if(!code) return;
  try{
    await navigator.clipboard.writeText(code);
    if(pixStatus){
      pixStatus.className='pix-status is-ready';
      pixStatus.textContent='Código Pix copiado. Agora é só colar no app do banco.';
    }
  }catch(error){
    pixCode?.focus();
    pixCode?.select();
    if(pixStatus){
      pixStatus.className='pix-status is-warning';
      pixStatus.textContent='Selecione o código acima e copie manualmente.';
    }
  }
});
orderClear?.addEventListener('click',()=>{
  order.clear();
  orderNote.value='';
  resetPixState();
  const pixInput=paymentInputs.find(input=>input.value==='pix');
  if(pixInput) pixInput.checked=true;
  updatePaymentHelp();
  renderOrder();
  if(window.matchMedia('(max-width:900px)').matches)setOrderOpen(false);
});
orderSend?.addEventListener('click',()=>{
  const scheduleCheck=scheduleValidation();
  if(!scheduleCheck.valid){
    setOrderOpen(true);
    showBusinessToast(scheduleCheck.message);
    updatePixPayment();
    return;
  }
  if(!orderQty()) return;
  if(requiresPixApproval()&&!pixState.approved){
    setOrderOpen(true);
    updatePixPayment();
    return;
  }
  if(!hasDeliveryAddressMode()){
    setOrderOpen(true);
    startManualAddress();
    return;
  }
  if(!isAddressComplete()){
    setOrderOpen(true);
    updateAddressHelp();
    const missingField=!deliveryStreet?.value.trim()?deliveryStreet:!deliveryNumber?.value.trim()?deliveryNumber:deliveryNeighborhood;
    missingField?.focus();
    return;
  }
  const now=Date.now();
  if(now-lastOrderSendAt<orderSendCooldownMs) return;
  lastOrderSendAt=now;
  const message=requiresPixApproval()&&pixState.whatsappMessage?pixState.whatsappMessage:buildWhatsappMessage();
  const url=`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
  const opened=window.open(url,'_blank','noopener,noreferrer');
  if(opened) opened.opener=null;
  if(!opened) window.location.assign(url);
});
setupScheduleControls();
initSecurityConfig();
renderOrder();

// horizontal drag only when the layout becomes scrollable on very small screens
(function(){
  const grid=comboList;
  if(!grid) return;
  let down=false,startX,scrollLeft;
  const canDrag=()=>grid.scrollWidth>grid.clientWidth+8;
  grid.addEventListener('mousedown',e=>{if(!canDrag()||e.target.closest('button'))return;down=true;startX=e.pageX-grid.offsetLeft;scrollLeft=grid.scrollLeft;e.preventDefault();});
  document.addEventListener('mouseup',()=>{down=false;});
  document.addEventListener('mousemove',e=>{if(!down)return;const x=e.pageX-grid.offsetLeft;grid.scrollLeft=scrollLeft-(x-startX)*1.2;});
})();
// scroll reveal
const obs=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-revealed');obs.unobserve(e.target);}});},{threshold:0.1});
document.querySelectorAll('.combo-card,.dep-card,.bf-content,.ps-card').forEach(el=>{el.classList.add('reveal-target');obs.observe(el);});
