const wheel=document.getElementById('rouletteWheel');
const spinButton=document.getElementById('rouletteSpinButton');
const statusText=document.getElementById('rouletteStatus');
const titleEl=document.getElementById('rouletteTitle');
const subtitleEl=document.getElementById('rouletteSubtitle');
const logoEl=document.getElementById('rouletteLogo');
const logoFallback=document.getElementById('rouletteLogoFallback');
const modal=document.getElementById('rouletteModal');
const modalClose=document.getElementById('rouletteModalClose');
const modalTitle=document.getElementById('rouletteModalTitle');
const modalSubtitle=document.getElementById('rouletteModalSubtitle');
const modalKicker=document.getElementById('rouletteModalKicker');
const prizeText=document.getElementById('roulettePrizeText');
const applyButton=document.getElementById('rouletteApplyButton');

const couponStorageKey='wa_rio_cupons_ativos';
const palette=['#68110c','#151518','#8d1c16','#222225','#4a0e17','#303035','#a82127','#101012'];
let settings=null;
let lastRotation=0;
let spinning=false;

function fallbackSettings(){
  return {
    active:true,
    title:'Roleta diária WA RIO',
    subtitle:'Gire uma vez por dia e concorra a prêmios para usar no seu pedido.',
    logo:'logo_wariobranca - Editado.png',
    buttonText:'Girar roleta',
    alreadySpunText:'Você já girou a roleta hoje. Volte amanhã para tentar novamente.',
    inactiveText:'A roleta está pausada no momento.',
    resultSubtitle:'Use seu prêmio no pedido pelo site.',
    applyButtonText:'Usar no cardápio',
    menuHref:'/wario_sushi_v2_16.html#combos',
    maxCouponsPerCustomer:2,
    prizes:[
      {id:'desconto-5',label:'5% de Desconto',resultText:'5% de Desconto!',type:'percent',active:true},
      {id:'desconto-10',label:'10% de Desconto',resultText:'10% de Desconto!',type:'percent',active:true},
      {id:'tente-amanha',label:'Tente Amanhã',resultText:'Não foi dessa vez. Tente novamente amanhã!',type:'none',active:true},
      {id:'hots-gratis',label:'6 Hots Grátis',resultText:'6 Hot Filadélfia no próximo pedido!',type:'gift',active:true},
      {id:'desconto-15',label:'15% de Desconto',resultText:'15% de Desconto!',type:'percent',active:true},
      {id:'frete-gratis',label:'Frete Grátis',resultText:'Frete Grátis!',type:'free_shipping',active:true}
    ]
  };
}

function safeText(value,fallback=''){
  const text=String(value??'').trim();
  return text||fallback;
}

function readCoupons(){
  try{
    const raw=localStorage.getItem(couponStorageKey);
    const list=raw?JSON.parse(raw):[];
    if(!Array.isArray(list)) return [];
    const now=Date.now();
    const cleaned=list.filter(coupon=>{
      if(!coupon||typeof coupon!=='object') return false;
      if(!coupon.id||!coupon.token||!coupon.expiresAt) return false;
      return Date.parse(coupon.expiresAt)>now;
    });
    if(cleaned.length!==list.length) saveCoupons(cleaned);
    return cleaned;
  }catch(error){
    return [];
  }
}

function saveCoupons(coupons){
  const max=Math.max(1,Number(settings?.maxCouponsPerCustomer)||2);
  localStorage.setItem(couponStorageKey,JSON.stringify(coupons.slice(-max)));
}

function activePrizes(){
  const prizes=Array.isArray(settings?.prizes)?settings.prizes.filter(prize=>prize.active!==false):[];
  return prizes.length?prizes:fallbackSettings().prizes;
}

function labelText(value){
  return safeText(value).replace(/\s+/g,' ');
}

function renderWheel(){
  if(!wheel) return;
  const prizes=activePrizes();
  const segment=360/prizes.length;
  const gradient=prizes.map((prize,index)=>{
    const start=(index*segment).toFixed(3);
    const end=((index+1)*segment).toFixed(3);
    return `${palette[index%palette.length]} ${start}deg ${end}deg`;
  }).join(',');
  wheel.style.background=`conic-gradient(from -90deg,${gradient})`;
  wheel.innerHTML='';
  prizes.forEach((prize,index)=>{
    const label=document.createElement('span');
    label.className='roulette-label';
    const angle=index*segment+(segment/2);
    label.style.transform=`rotate(${angle}deg) translateY(-118px) rotate(${90-angle}deg)`;
    label.textContent=labelText(prize.label);
    wheel.appendChild(label);
  });
}

function renderPage(payload){
  settings={...fallbackSettings(),...(payload?.settings||{})};
  titleEl.textContent=safeText(settings.title,fallbackSettings().title);
  subtitleEl.textContent=safeText(settings.subtitle,fallbackSettings().subtitle);
  spinButton.textContent=safeText(settings.buttonText,'Girar roleta');
  applyButton.textContent=safeText(settings.applyButtonText,'Usar no cardápio');
  if(settings.logo&&logoEl){
    logoEl.src=settings.logo;
    logoEl.hidden=false;
  }
  renderWheel();

  const status=payload?.status||{};
  if(settings.active===false||status.active===false){
    spinButton.disabled=true;
    setStatus(settings.inactiveText,'alert');
    return;
  }
  if(status.alreadySpun){
    spinButton.disabled=true;
    setStatus(settings.alreadySpunText,'alert');
    return;
  }
  spinButton.disabled=false;
  setStatus('Toque em girar e boa sorte.','');
}

function setStatus(message,kind=''){
  statusText.textContent=message;
  statusText.className=`roulette-status ${kind?`is-${kind}`:''}`.trim();
}

function spinToIndex(index){
  const prizes=activePrizes();
  const segment=360/prizes.length;
  const offset=(Math.random()-.5)*Math.min(20,segment*.35);
  const center=index*segment+(segment/2);
  const target=360-center+offset;
  lastRotation=Math.ceil(lastRotation/360)*360+1800+target;
  wheel.style.transform=`rotate(${lastRotation}deg)`;
}

function openResult(prize,coupon){
  const won=Boolean(coupon);
  modalTitle.textContent=won?'Você ganhou!':'Resultado da roleta';
  modalKicker.textContent=won?'Prêmio liberado':'Tente novamente amanhã';
  modalSubtitle.textContent=won?safeText(settings.resultSubtitle,'Use seu prêmio no pedido pelo site.'):safeText(prize.resultText,'Não foi dessa vez. Tente novamente amanhã.');
  prizeText.textContent=safeText(prize.resultText||prize.label,'Resultado');
  applyButton.hidden=!won;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
}

function closeResult(){
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');
}

async function loadRoulette(){
  try{
    const response=await fetch('/api/roulette',{headers:{Accept:'application/json'}});
    const payload=await response.json();
    if(!response.ok) throw new Error(payload.error||'Falha ao carregar roleta.');
    renderPage(payload);
  }catch(error){
    settings=fallbackSettings();
    renderPage({settings});
    spinButton.disabled=true;
    setStatus('Não foi possível carregar a roleta agora. Tente novamente em alguns minutos.','alert');
  }
}

async function spinRoulette(){
  if(spinning||spinButton.disabled) return;
  spinning=true;
  spinButton.disabled=true;
  setStatus('Sorteando seu prêmio...','');
  try{
    const response=await fetch('/api/roulette/spin',{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({couponCount:readCoupons().length})
    });
    const payload=await response.json().catch(()=>({}));
    if(response.status===409){
      renderPage(payload);
      return;
    }
    if(!response.ok) throw new Error(payload.message||payload.error||'Não foi possível girar agora.');

    if(payload.settings) settings={...settings,...payload.settings};
    const currentPrizes=activePrizes();
    const byId=currentPrizes.findIndex(prize=>prize.id===payload.prize?.id);
    const index=byId>=0?byId:(Number.isInteger(payload.prizeIndex)?payload.prizeIndex:0);
    spinToIndex(index);
    window.setTimeout(()=>{
      const prize=payload.prize||currentPrizes[index]||{};
      if(payload.coupon){
        const coupons=readCoupons();
        saveCoupons([...coupons,payload.coupon]);
        setStatus('Prêmio salvo para usar no pedido.','win');
      }else{
        setStatus(safeText(prize.resultText,'Não foi dessa vez. Tente novamente amanhã.'),'alert');
      }
      openResult(prize,payload.coupon);
      spinning=false;
      spinButton.disabled=true;
    },5100);
  }catch(error){
    spinning=false;
    spinButton.disabled=false;
    setStatus(error.message||'Não foi possível girar agora. Tente novamente.','alert');
  }
}

logoEl?.addEventListener('error',()=>{
  logoEl.hidden=true;
  if(logoFallback) logoFallback.hidden=false;
});

spinButton?.addEventListener('click',spinRoulette);
modalClose?.addEventListener('click',closeResult);
modal?.addEventListener('click',event=>{
  if(event.target===modal) closeResult();
});
applyButton?.addEventListener('click',()=>{
  window.location.assign(settings?.menuHref||'/wario_sushi_v2_16.html#combos');
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape') closeResult();
});

loadRoulette();
