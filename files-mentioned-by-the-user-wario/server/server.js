import crypto from 'node:crypto';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const rootDir=path.resolve(__dirname,'..');

loadEnv(path.join(__dirname,'.env'));

const port=Number(process.env.PORT)||3000;
const isProduction=process.env.NODE_ENV==='production';
const mpAccessToken=process.env.MP_ACCESS_TOKEN;
const mpWebhookSecret=process.env.MP_WEBHOOK_SECRET;
const defaultPayerEmail=process.env.DEFAULT_PAYER_EMAIL||'pedido@wariosushi.com.br';
const payerFirstNameOverride=process.env.MP_PAYER_FIRST_NAME||'';
const pixExpiration=process.env.PIX_EXPIRATION||'';
const mpTimeoutMs=Math.max(5000,Math.min(60000,Number(process.env.MP_TIMEOUT_MS)||20000));
const appOrigins=(process.env.APP_ORIGIN||process.env.ALLOWED_ORIGINS||'')
  .split(',')
  .map(origin=>origin.trim())
  .filter(Boolean);
const allowedOrigins=new Set(appOrigins.length?appOrigins:['http://localhost:3000','http://127.0.0.1:3000']);
const orders=new Map();
const webhookEvents=new Set();
const requestLog=new Map();
const trustProxy=String(process.env.TRUST_PROXY||'').toLowerCase()==='true';
const turnstileSiteKey=process.env.TURNSTILE_SITE_KEY||'';
const turnstileSecretKey=process.env.TURNSTILE_SECRET_KEY||'';
const gaMeasurementId=String(process.env.GA_MEASUREMENT_ID||'').trim();
const turnstileRequired=String(process.env.TURNSTILE_REQUIRED||'').toLowerCase()==='true'||(isProduction&&Boolean(turnstileSiteKey&&turnstileSecretKey));
const turnstileEnabled=Boolean(turnstileSiteKey&&turnstileSecretKey&&turnstileRequired);
const orderPersistenceEnabled=String(process.env.ORDER_STORE||'file').toLowerCase()!=='memory';
const orderStoreFile=path.resolve(__dirname,process.env.ORDER_STORE_FILE||path.join('data','orders.json'));
const orderStoreTtlMs=Math.max(1,Number(process.env.ORDER_STORE_TTL_HOURS)||72)*60*60*1000;
const businessHours={openHour:19,closeHour:23,openDays:[0,3,4,5,6],timeZone:'America/Sao_Paulo'};
const scheduleLeadMinutes=30;
let orderPersistTimer=null;

loadOrderStore();
validateProductionConfig();

function loadEnv(filePath){
  if(!existsSync(filePath)) return;
  const lines=readFileSync(filePath,'utf8').split(/\r?\n/);
  for(const line of lines){
    const trimmed=line.trim();
    if(!trimmed||trimmed.startsWith('#')) continue;
    const index=trimmed.indexOf('=');
    if(index<0) continue;
    const key=trimmed.slice(0,index).trim();
    let value=trimmed.slice(index+1).trim();
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))){
      value=value.slice(1,-1);
    }
    if(key&&!process.env[key]) process.env[key]=value;
  }
}

function validateProductionConfig(){
  if(!isProduction) return;
  const warnings=[];
  if(!appOrigins.length) warnings.push('APP_ORIGIN ausente; configure o dominio final antes de usar APIs em producao.');
  if(!mpAccessToken) warnings.push('MP_ACCESS_TOKEN ausente; Pix online ficara indisponivel.');
  if(!mpWebhookSecret) warnings.push('MP_WEBHOOK_SECRET ausente; webhook do Mercado Pago ficara indisponivel.');
  if(turnstileRequired&&!turnstileSiteKey) warnings.push('TURNSTILE_SITE_KEY ausente; validacao anti-bot do Pix ficara bloqueada.');
  if(turnstileRequired&&!turnstileSecretKey) warnings.push('TURNSTILE_SECRET_KEY ausente; validacao anti-bot do Pix ficara bloqueada.');
  for(const origin of appOrigins){
    if(!/^https:\/\//i.test(origin)){
      warnings.push('APP_ORIGIN/ALLOWED_ORIGINS deve usar HTTPS em producao.');
    }
  }
  if(warnings.length) console.warn(`Avisos de configuracao em producao: ${warnings.join(' | ')}`);
}

function loadOrderStore(){
  if(!orderPersistenceEnabled||!existsSync(orderStoreFile)) return;
  try{
    const data=JSON.parse(readFileSync(orderStoreFile,'utf8'));
    const cutoff=Date.now()-orderStoreTtlMs;
    const storedOrders=Array.isArray(data.orders)?data.orders:[];
    for(const order of storedOrders){
      const mpOrderId=safeText(order?.mpOrderId||order?.paymentId,80);
      const createdAtMs=Number(order?.createdAtMs)||Date.parse(order?.createdAt)||Date.now();
      if(!mpOrderId||createdAtMs<cutoff) continue;
      orders.set(mpOrderId,{...order,mpOrderId,createdAtMs});
    }
  }catch(error){
    console.error('Falha ao carregar pedidos persistidos:',error.message);
  }
}

function scheduleOrderPersist(){
  if(!orderPersistenceEnabled) return;
  if(orderPersistTimer) clearTimeout(orderPersistTimer);
  orderPersistTimer=setTimeout(()=>{
    persistOrders().catch(error=>console.error('Falha ao persistir pedidos:',error.message));
  },150);
  if(typeof orderPersistTimer.unref==='function') orderPersistTimer.unref();
}

async function persistOrders(){
  if(!orderPersistenceEnabled) return;
  const cutoff=Date.now()-orderStoreTtlMs;
  for(const [id,order] of orders){
    const createdAtMs=Number(order?.createdAtMs)||Date.parse(order?.createdAt)||Date.now();
    if(createdAtMs<cutoff) orders.delete(id);
  }
  const payload={
    updatedAt:new Date().toISOString(),
    orders:[...orders.values()]
  };
  await mkdir(path.dirname(orderStoreFile),{recursive:true});
  await writeFile(orderStoreFile,JSON.stringify(payload,null,2),'utf8');
}

function sendJson(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(body));
}

function summarizeMpError(error){
  const details=error?.details;
  if(!details||typeof details!=='object') return error.message;
  const causes=Array.isArray(details.cause)
    ? details.cause.map(cause=>[cause.code,cause.description].filter(Boolean).join(': ')).filter(Boolean)
    : [];
  return [
    error.message,
    details.error,
    details.status,
    causes.join(' | ')
  ].filter(Boolean).join(' - ');
}

function setSecurityHeaders(req,res){
  const csp=[
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "script-src 'self' 'sha256-Pdwf9f7BmDWe4dD63iUff1TmwlLIN74NdCoz221f/fw=' https://challenges.cloudflare.com https://www.googletagmanager.com",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
    "connect-src 'self' https://viacep.com.br https://challenges.cloudflare.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "form-action 'none'",
    isProduction?'upgrade-insecure-requests':''
  ].filter(Boolean).join('; ');
  res.setHeader('Content-Security-Policy',csp);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('X-Powered-By','');
  if(isProduction) res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains; preload');
}

function applyCors(req,res){
  const origin=req.headers.origin;
  if(!origin) return true;
  if(!allowedOrigins.has(origin)&&!isSameHostOrigin(req,origin)) return false;
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Accept');
  res.setHeader('Access-Control-Max-Age','600');
  return true;
}

function isSameHostOrigin(req,origin){
  if(appOrigins.length) return false;
  try{
    return new URL(origin).host===String(req.headers.host||'');
  }catch(error){
    return false;
  }
}

function clientIp(req){
  const direct=req.socket.remoteAddress||'unknown';
  if(!trustProxy) return direct;
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  return forwarded||direct;
}

function ratePolicy(pathname){
  if(pathname==='/api/pix/create') return {windowMs:60_000,max:6};
  if(pathname.startsWith('/api/pix/status/')) return {windowMs:60_000,max:90};
  if(pathname==='/api/pix/webhook') return {windowMs:60_000,max:120};
  return {windowMs:60_000,max:40};
}

function rateKey(pathname){
  if(pathname.startsWith('/api/pix/status/')) return '/api/pix/status';
  return pathname;
}

function pruneRequestLog(now){
  if(requestLog.size<2000) return;
  for(const [key,hits] of requestLog){
    const fresh=hits.filter(time=>now-time<5*60_000);
    if(fresh.length) requestLog.set(key,fresh);
    else requestLog.delete(key);
  }
}

function rateLimit(req,url){
  const now=Date.now();
  pruneRequestLog(now);
  const policy=ratePolicy(url.pathname);
  const key=`${clientIp(req)}:${rateKey(url.pathname)}`;
  const hits=(requestLog.get(key)||[]).filter(time=>now-time<policy.windowMs);
  hits.push(now);
  requestLog.set(key,hits);
  return hits.length<=policy.max;
}

function requiresJson(req,pathname){
  return req.method==='POST'&&(pathname==='/api/pix/create'||pathname==='/api/pix/webhook');
}

function hasJsonContentType(req){
  return String(req.headers['content-type']||'').toLowerCase().includes('application/json');
}

function securityConfig(){
  return {
    turnstileEnabled,
    turnstileSiteKey:turnstileEnabled?turnstileSiteKey:'',
    gaMeasurementId:/^G-[A-Z0-9]+$/i.test(gaMeasurementId)?gaMeasurementId:''
  };
}

async function verifyTurnstileToken(token,req){
  if(!turnstileRequired) return true;
  const cleaned=safeText(token,2048);
  if(!cleaned||!turnstileSecretKey) return false;
  const params=new URLSearchParams({
    secret:turnstileSecretKey,
    response:cleaned
  });
  const ip=clientIp(req);
  if(ip&&ip!=='unknown') params.set('remoteip',ip);
  try{
    const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',
      signal:AbortSignal.timeout(8000),
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:params
    });
    const data=await response.json().catch(()=>({}));
    return response.ok&&data.success===true;
  }catch(error){
    console.error('Falha ao validar Turnstile:',error.message);
    return false;
  }
}

async function readJson(req){
  let size=0;
  const chunks=[];
  for await(const chunk of req){
    size+=chunk.length;
    if(size>32*1024){
      const error=new Error('Payload muito grande.');
      error.status=413;
      throw error;
    }
    chunks.push(chunk);
  }
  if(!chunks.length) return {};
  try{
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch(error){
    const parseError=new Error('JSON invalido.');
    parseError.status=400;
    throw parseError;
  }
}

function safeText(value,max=160){
  return String(value??'')
    .replace(/[\u0000-\u001F\u007F]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,max);
}

function normalizeAmount(value){
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<=0||amount>5000) return null;
  return Math.round(amount*100)/100;
}

function normalizeText(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

const productCatalog=new Map([
  ['combo-du-chef-36',{name:'Combo Du Chef (36 un)',price:65}],
  ['combo-mix-joes-12',{name:'Combo Mix Joes (12 un)',price:35.9}],
  ['combo-wa-rio-1-31',{name:'Combo WA RIO 1 (31 un)',price:55.9}],
  ['combo-wa-rio-2-36',{name:'Combo WA RIO 2 (36 un)',price:76.9}],
  ['filadelfia-roll-10',{name:'Filadelfia Roll (10 un)',price:16.9}],
  ['filadelfia-roll-20',{name:'Filadelfia Roll (20 un)',price:23}],
  ['filadelfia-roll-30',{name:'Filadelfia Roll (30 un)',price:31}],
  ['filadelfia-roll-40',{name:'Filadelfia Roll (40 un)',price:40}],
  ['filadelfia-roll-50',{name:'Filadelfia Roll (50 un)',price:50}],
  ['filadelfia-roll-60',{name:'Filadelfia Roll (60 un)',price:60}],
  ['hot-filadelfia-10',{name:'Hot Filadelfia (10 un)',price:16.9}],
  ['hot-filadelfia-20',{name:'Hot Filadelfia (20 un)',price:23}],
  ['hot-filadelfia-30',{name:'Hot Filadelfia (30 un)',price:31}],
  ['hot-filadelfia-40',{name:'Hot Filadelfia (40 un)',price:40}],
  ['hot-filadelfia-50',{name:'Hot Filadelfia (50 un)',price:50}],
  ['hot-filadelfia-60',{name:'Hot Filadelfia (60 un)',price:60}],
  ['temaki-frio-1',{name:'Temaki Frio',price:18.9}],
  ['temaki-hot-1',{name:'Temaki Hot',price:19.9}],
  ['sushi-dog-1',{name:'Sushi Dog',price:34.9}],
  ['uramaki-salmao-10',{name:'Uramaki de Salmao (10 un)',price:18.9}],
  ['uramaki-salmao-20',{name:'Uramaki de Salmao (20 un)',price:34.9}],
  ['uramaki-especial-10',{name:'Uramaki Especial (10 un)',price:21.9}],
  ['uramaki-especial-20',{name:'Uramaki Especial (20 un)',price:39.9}],
  ['sashimi-1',{name:'Sashimi (1 un)',price:4}],
  ['sashimi-4',{name:'Sashimi (4 un)',price:14}],
  ['sashimi-5',{name:'Sashimi (5 un)',price:18}],
  ['niguiri-1',{name:'Sushi Niguiri (1 un)',price:3}],
  ['niguiri-2',{name:'Sushi Niguiri (2 un)',price:5}],
  ['niguiri-4',{name:'Sushi Niguiri (4 un)',price:9}],
  ['joe-joe-1',{name:'Joe Joe (1 un)',price:3}],
  ['joe-joe-2',{name:'Joe Joe (2 un)',price:5}],
  ['joe-joe-4',{name:'Joe Joe (4 un)',price:10}]
]);

const deliveryFeeByNeighborhood={
  'cachambi':7,
  'maria da graca':7
};
const deliveryNeighborhoods=[
  'cachambi',
  'meier',
  'engenho de dentro',
  'pilares',
  'riachuelo',
  'maria da graca',
  'higienopolis',
  'engenho novo',
  'del castilho',
  'abolicao',
  'piedade'
];

function deliveryFeeFor(neighborhood){
  const normalized=normalizeText(neighborhood);
  if(!deliveryNeighborhoods.includes(normalized)) return null;
  return deliveryFeeByNeighborhood[normalized]??8;
}

function normalizeOrder(body,schedule){
  const submittedAmount=normalizeAmount(body?.amount);
  const address={
    street:safeText(body?.address?.street,140),
    number:safeText(body?.address?.number,12),
    complement:safeText(body?.address?.complement,80),
    neighborhood:safeText(body?.address?.neighborhood,80),
    cep:safeText(body?.address?.cep,12)
  };
  if(!address.street||!address.number||!address.neighborhood) return null;
  const deliveryFee=deliveryFeeFor(address.neighborhood);
  if(typeof deliveryFee!=='number') return null;
  const submittedItems=Array.isArray(body?.items)?body.items.slice(0,30):[];
  const items=submittedItems.map(item=>{
    const id=safeText(item.id,80);
    const product=productCatalog.get(id);
    if(!product) return null;
    const qty=Math.max(1,Math.min(20,Number(item.qty)||1));
    return {id,name:product.name,qty,price:product.price,total:Math.round(product.price*qty*100)/100};
  });
  if(!items.length||items.some(item=>!item)) return null;
  const subtotal=Math.round(items.reduce((sum,item)=>sum+item.total,0)*100)/100;
  const amount=Math.round((subtotal+deliveryFee)*100)/100;
  if(!submittedAmount||Math.abs(submittedAmount-amount)>0.01) return null;
  return {
    orderId:`WR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    orderToken:crypto.randomBytes(24).toString('hex'),
    createdAt:new Date().toISOString(),
    createdAtMs:Date.now(),
    amount,
    subtotal,
    deliveryFee,
    customerName:safeText(body?.customerName,80)||'Cliente WA RIO',
    items,
    address,
    schedule
  };
}

async function mercadoPago(pathname,options={}){
  if(!mpAccessToken){
    const error=new Error('MP_ACCESS_TOKEN nao configurado no servidor.');
    error.status=500;
    throw error;
  }
  let response;
  try{
    response=await fetch(`https://api.mercadopago.com${pathname}`,{
      ...options,
      signal:AbortSignal.timeout(mpTimeoutMs),
      headers:{
        Authorization:`Bearer ${mpAccessToken}`,
        'Content-Type':'application/json',
        ...(options.headers||{})
      }
    });
  }catch(error){
    const mpError=new Error(`Falha de conexao com Mercado Pago: ${error.message}`);
    mpError.status=502;
    throw mpError;
  }
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(data.message||data.error||'Erro no Mercado Pago.');
    error.status=response.status;
    error.details=data;
    throw error;
  }
  return data;
}

function firstNonEmpty(...values){
  for(const value of values){
    if(value!==undefined&&value!==null&&String(value).trim()) return String(value);
  }
  return '';
}

function orderPayment(mpOrder){
  const payments=[
    ...(Array.isArray(mpOrder?.transactions?.payments)?mpOrder.transactions.payments:[]),
    ...(Array.isArray(mpOrder?.transaction?.payments)?mpOrder.transaction.payments:[]),
    ...(Array.isArray(mpOrder?.payments)?mpOrder.payments:[])
  ];
  return payments[0]||{};
}

function normalizedOrderStatus(mpOrder){
  const payment=orderPayment(mpOrder);
  const paymentStatus=payment.status;
  const orderStatus=mpOrder?.status;
  if(paymentStatus==='approved'||orderStatus==='processed'||orderStatus==='paid') return 'approved';
  if(['rejected','cancelled','canceled','expired'].includes(paymentStatus)||['cancelled','canceled','expired'].includes(orderStatus)) return 'rejected';
  return paymentStatus||orderStatus||'pending';
}

function pixResponse(mpOrder,order){
  const payment=orderPayment(mpOrder);
  const paymentMethod=payment.payment_method||{};
  const qrCode=firstNonEmpty(paymentMethod.qr_code,payment.qr_code,mpOrder.qr_code,mpOrder.qr_data);
  const qrCodeBase64=firstNonEmpty(paymentMethod.qr_code_base64,payment.qr_code_base64,mpOrder.qr_code_base64);
  const ticketUrl=firstNonEmpty(paymentMethod.ticket_url,payment.ticket_url,mpOrder.ticket_url);
  return {
    orderId:order.orderId,
    orderToken:order.orderToken,
    paymentId:String(mpOrder.id),
    status:normalizedOrderStatus(mpOrder),
    statusDetail:payment.status_detail||mpOrder.status_detail||'',
    qrCode,
    qrCodeBase64,
    ticketUrl
  };
}

function formatMoney(value){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
}

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
  const schedule='Atendemos de quarta a domingo, das 19h as 23h.';
  if(!isBusinessDay(date)){
    return `Hoje nao estamos abertos. ${schedule}`;
  }
  if(minutes<businessHours.openHour*60){
    return `Ainda nao estamos abertos. ${schedule}`;
  }
  return `Atendimento encerrado por hoje. ${schedule}`;
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
  return new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(date).replace('.','');
}

function normalizeSchedule(value){
  const mode=safeText(value?.mode,40);
  if(mode!=='scheduled') return null;
  const date=safeText(value?.date,10);
  const time=safeText(value?.time,5);
  const dateObject=scheduleDateObject(date);
  const timestamp=scheduleTimestamp(date,time);
  if(!dateObject||!isBusinessDay(dateObject)||!isBusinessTime(time)) return null;
  if(!Number.isFinite(timestamp)||timestamp<Date.now()+scheduleLeadMinutes*60*1000) return null;
  return {
    mode:'scheduled',
    date,
    time,
    label:`${formatScheduleDate(date)} as ${time}`
  };
}

function buildWhatsappMessage(order){
  const addressParts=[
    `${order.address.street}, no ${order.address.number}`,
    order.address.complement,
    order.address.neighborhood,
    order.address.cep?`CEP ${order.address.cep}`:''
  ].filter(Boolean);
  return [
    'Ola, WA RIO Sushi!',
    `Nome: ${order.customerName}`,
    'Pedido:',
    ...order.items.map(item=>`- ${item.qty}x ${item.name} - ${formatMoney(item.total)}`),
    `Endereco: ${addressParts.join(' - ')}`,
    `Agendamento: ${order.schedule?.label||'Nao informado'}`,
    'Pagamento: Pix aprovado',
    `Total: ${formatMoney(order.amount)}`,
    `Codigo do pagamento: ${order.mpOrderId||order.paymentId}`
  ].join('\n');
}

async function createPixOrder(req,res){
  const body=await readJson(req);
  const schedule=normalizeSchedule(body?.schedule);
  if(!schedule) return sendJson(res,400,{error:'Agendamento invalido.'});
  if(!await verifyTurnstileToken(body?.turnstileToken,req)){
    return sendJson(res,403,{error:'Confirme a verificacao anti-bot para gerar o Pix.'});
  }
  const order=normalizeOrder(body,schedule);
  if(!order) return sendJson(res,400,{error:'Pedido invalido ou valor divergente.'});
  const mpOrder=await mercadoPago('/v1/orders',{
    method:'POST',
    headers:{'X-Idempotency-Key':order.orderId},
    body:JSON.stringify({
      type:'online',
      external_reference:order.orderId,
      total_amount:order.amount.toFixed(2),
      processing_mode:'automatic',
      payer:{
        email:defaultPayerEmail,
        first_name:payerFirstNameOverride||order.customerName
      },
      transactions:{
        payments:[{
          amount:order.amount.toFixed(2),
          payment_method:{
            id:'pix',
            type:'bank_transfer'
          },
          ...(pixExpiration?{expiration_time:pixExpiration}:{})
        }]
      }
    })
  });
  const responseBody=pixResponse(mpOrder,order);
  if(!responseBody.qrCode&&!responseBody.ticketUrl){
    console.warn('Mercado Pago retornou Pix sem QR/copia-e-cola.',{
      paymentId:responseBody.paymentId,
      status:responseBody.status,
      statusDetail:responseBody.statusDetail
    });
  }
  orders.set(String(mpOrder.id),{...order,mpOrderId:String(mpOrder.id),status:responseBody.status});
  scheduleOrderPersist();
  return sendJson(res,200,responseBody);
}

async function getPixStatus(req,res,paymentId,url){
  const mpOrderId=safeText(paymentId,80);
  if(!/^[A-Za-z0-9_-]{6,80}$/.test(mpOrderId)) return sendJson(res,400,{error:'Pagamento invalido.'});
  const order=orders.get(mpOrderId);
  const token=safeText(url.searchParams.get('token'),80);
  if(!order||token!==order.orderToken) return sendJson(res,404,{error:'Pagamento nao encontrado.'});
  const mpOrder=await mercadoPago(`/v1/orders/${mpOrderId}`);
  const payment=orderPayment(mpOrder);
  const status=normalizedOrderStatus(mpOrder);
  order.status=status;
  scheduleOrderPersist();
  return sendJson(res,200,{
    paymentId:mpOrderId,
    status,
    statusDetail:payment.status_detail||mpOrder.status_detail||'',
    whatsappMessage:status==='approved'?buildWhatsappMessage(order):''
  });
}

function parseSignature(header){
  return String(header||'').split(',').reduce((acc,part)=>{
    const [key,value]=part.split('=');
    if(key&&value) acc[key.trim()]=value.trim();
    return acc;
  },{});
}

function timingSafeEqualHex(a,b){
  if(!/^[a-f0-9]+$/i.test(a)||!/^[a-f0-9]+$/i.test(b)||a.length!==b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}

function verifyMercadoPagoWebhook(req,body,url){
  if(!mpWebhookSecret) return !isProduction;
  const signature=parseSignature(req.headers['x-signature']);
  const requestId=safeText(req.headers['x-request-id'],120);
  const dataId=safeText(url.searchParams.get('data.id')||body?.data?.id,80);
  const ts=safeText(signature.ts,24);
  const hash=safeText(signature.v1,128);
  if(!dataId||!requestId||!ts||!hash) return false;
  const age=Math.abs(Date.now()-Number(ts));
  if(!Number.isFinite(age)||age>5*60*1000) return false;
  const manifest=`id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected=crypto.createHmac('sha256',mpWebhookSecret).update(manifest).digest('hex');
  return timingSafeEqualHex(expected,hash);
}

async function handleWebhook(req,res,url){
  const body=await readJson(req).catch(()=>({}));
  if(!verifyMercadoPagoWebhook(req,body,url)){
    res.writeHead(401);
    res.end();
    return;
  }
  res.writeHead(200);
  res.end();
  const eventId=safeText(body?.id||url.searchParams.get('id'),80);
  if(eventId&&webhookEvents.has(eventId)) return;
  if(eventId){
    webhookEvents.add(eventId);
    if(webhookEvents.size>2000) webhookEvents.delete(webhookEvents.values().next().value);
  }
  const mpOrderId=safeText(body?.data?.id||url.searchParams.get('data.id')||url.searchParams.get('id'),80);
  if(!/^[A-Za-z0-9_-]{6,80}$/.test(mpOrderId)) return;
  try{
    const mpOrder=await mercadoPago(`/v1/orders/${mpOrderId}`);
    const order=orders.get(mpOrderId);
    if(order){
      order.status=normalizedOrderStatus(mpOrder);
      scheduleOrderPersist();
    }
  }catch(error){
    console.error('Falha ao processar webhook Mercado Pago:',error.message);
  }
}

async function serveStatic(req,res,url){
  let pathname;
  try{
    pathname=decodeURIComponent(url.pathname);
  }catch(error){
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  if(pathname==='/'||pathname==='') pathname='/wario_sushi_v2_16.html';
  const pathParts=pathname.split('/').filter(Boolean);
  if(pathname.startsWith('/server')||pathname.includes('..')||pathname.includes('\\')||pathParts.some(part=>part.startsWith('.'))){
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const filePath=path.resolve(rootDir,`.${pathname}`);
  if(!filePath.startsWith(rootDir)){
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  try{
    const fileStat=await stat(filePath);
    if(!fileStat.isFile()) throw new Error('Not file');
    const ext=path.extname(filePath).toLowerCase();
    const type={
      '.html':'text/html; charset=utf-8',
      '.css':'text/css; charset=utf-8',
      '.js':'text/javascript; charset=utf-8',
      '.png':'image/png',
      '.jpg':'image/jpeg',
      '.jpeg':'image/jpeg',
      '.webp':'image/webp',
      '.ico':'image/x-icon',
      '.xml':'application/xml; charset=utf-8',
      '.txt':'text/plain; charset=utf-8'
    }[ext];
    if(!type){
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200,{
      'Content-Type':type,
      'Cache-Control':/\.(?:html|css|js)$/i.test(filePath)?'no-store':'public, max-age=86400'
    });
    createReadStream(filePath).pipe(res);
  }catch(error){
    res.writeHead(404);
    res.end('Not found');
  }
}

const server=http.createServer(async(req,res)=>{
  try{
    setSecurityHeaders(req,res);
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(isProduction&&req.headers['x-forwarded-proto']&&req.headers['x-forwarded-proto']!=='https'){
      res.writeHead(301,{Location:`https://${req.headers.host}${req.url}`});
      res.end();
      return;
    }
    if(url.pathname.startsWith('/api/')){
      if(!applyCors(req,res)) return sendJson(res,403,{error:'Origem nao permitida.'});
      if(req.method==='OPTIONS'){
        res.writeHead(204);
        res.end();
        return;
      }
      if(requiresJson(req,url.pathname)&&!hasJsonContentType(req)) return sendJson(res,415,{error:'Content-Type application/json obrigatorio.'});
      if(!rateLimit(req,url)) return sendJson(res,429,{error:'Muitas tentativas. Aguarde um minuto.'});
      if(req.method==='GET'&&url.pathname==='/api/security/config') return sendJson(res,200,securityConfig());
      if(req.method==='POST'&&url.pathname==='/api/pix/create') return await createPixOrder(req,res);
      if(req.method==='GET'&&url.pathname.startsWith('/api/pix/status/')) return await getPixStatus(req,res,url.pathname.split('/').pop(),url);
      if(req.method==='POST'&&url.pathname==='/api/pix/webhook') return await handleWebhook(req,res,url);
      return sendJson(res,404,{error:'Endpoint nao encontrado.'});
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){
      res.writeHead(405);
      res.end('Method not allowed');
      return;
    }
    return await serveStatic(req,res,url);
  }catch(error){
    console.error('Erro no servidor:',summarizeMpError(error));
    if(!res.headersSent) sendJson(res,error.status||500,{error:error.status&&error.status<500?error.message:'Erro interno.'});
  }
});

server.listen(port,()=>{
  console.log(`WA RIO Pix server rodando em http://localhost:${port}`);
});
