import crypto from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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
const menuDataDir=path.resolve(process.env.DATA_DIR||path.join(rootDir,'data'));
const menuDbFile=path.join(menuDataDir,'db.json');
const menuSeedFile=path.join(rootDir,'data','seed.json');
const menuUploadDir=path.join(menuDataDir,'uploads','menu');
const adminPassword=String(process.env.ADMIN_PASSWORD||'');
const adminLoginEnabled=adminPassword.length>0;
const adminSessionSecret=String(process.env.SESSION_SECRET||process.env.ADMIN_SESSION_SECRET||crypto.randomBytes(32).toString('hex'));
const adminSessionMaxAgeMs=Math.max(1,Number(process.env.ADMIN_SESSION_HOURS)||12)*60*60*1000;
const defaultBusinessHours={openHour:19,closeHour:23,openDays:[0,3,4,5,6],timeZone:'America/Sao_Paulo',scheduleLeadMinutes:30};
const defaultDeliveryAreas=[
  {name:'Cachambi',fee:7,active:true},
  {name:'Méier',fee:8,active:true},
  {name:'Engenho de Dentro',fee:8,active:true},
  {name:'Pilares',fee:8,active:true},
  {name:'Riachuelo',fee:8,active:true},
  {name:'Maria da Graça',fee:7,active:true},
  {name:'Higienópolis',fee:8,active:true},
  {name:'Engenho Novo',fee:8,active:true},
  {name:'Del Castilho',fee:8,active:true},
  {name:'Abolição',fee:8,active:true},
  {name:'Piedade',fee:8,active:true}
];
const deliveryAreaDisplayNames=new Map(defaultDeliveryAreas.map(area=>[normalizeText(area.name),area.name]));
let orderPersistTimer=null;
const adminSessions=new Map();
const adminLoginAttempts=new Map();

loadOrderStore();
ensureMenuDb();
validateProductionConfig();

if(!adminLoginEnabled){
  console.warn(isProduction
    ? 'ADMIN_PASSWORD ausente; painel admin bloqueado ate a senha ser configurada no Railway.'
    : 'ADMIN_PASSWORD ausente; defina ADMIN_PASSWORD para acessar o painel admin local.');
}

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

function sendJsonWithHeaders(res,status,body,headers={}){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});
  res.end(JSON.stringify(body));
}

function ensureMenuDb(){
  if(!existsSync(menuDataDir)) mkdirSync(menuDataDir,{recursive:true});
  if(!existsSync(menuDbFile)){
    const seed=existsSync(menuSeedFile)
      ? readFileSync(menuSeedFile,'utf8')
      : JSON.stringify({menuCategories:[['todos','Todos']],menuProducts:[],promoProducts:[]},null,2);
    writeFileSync(menuDbFile,seed,'utf8');
  }
}

function defaultSiteSettings(){
  return {
    delivery:{
      defaultFee:8,
      areas:defaultDeliveryAreas.map(area=>({...area}))
    },
    businessHours:{
      ...defaultBusinessHours,
      openDays:[...defaultBusinessHours.openDays]
    }
  };
}

function normalizeFee(value,fallback=0,max=200){
  const fee=Number(value);
  if(!Number.isFinite(fee)||fee<0||fee>max) return fallback;
  return Math.round(fee*100)/100;
}

function normalizeHourValue(value,fallback,max=23){
  const raw=String(value??'');
  const fromTime=/^(\d{1,2}):\d{2}$/.exec(raw);
  const hour=fromTime?Number(fromTime[1]):Number(value);
  if(!Number.isFinite(hour)) return fallback;
  return Math.max(0,Math.min(max,Math.floor(hour)));
}

function normalizeOpenDays(value,fallback){
  const days=Array.isArray(value)
    ? [...new Set(value.map(day=>Number(day)).filter(day=>Number.isInteger(day)&&day>=0&&day<=6))]
    : [];
  return days.length?days.sort((a,b)=>a-b):[...fallback];
}

function normalizeDeliveryAreas(value,defaultFee){
  const source=Array.isArray(value)?value:defaultDeliveryAreas;
  const seen=new Set();
  return source.map((area,index)=>{
    const rawName=safeText(area?.name,80);
    const key=normalizeText(rawName);
    const name=deliveryAreaDisplayNames.get(key)||rawName;
    if(!name||seen.has(key)) return null;
    seen.add(key);
    return {
      id:slugify(area?.id||name)||`area-${index+1}`,
      name,
      fee:normalizeFee(area?.fee,defaultFee),
      active:area?.active!==false
    };
  }).filter(Boolean).slice(0,60);
}

function normalizeSiteSettings(settings={}){
  const defaults=defaultSiteSettings();
  const deliverySource=settings?.delivery&&typeof settings.delivery==='object'?settings.delivery:{};
  const businessSource=settings?.businessHours&&typeof settings.businessHours==='object'?settings.businessHours:{};
  const defaultFee=normalizeFee(deliverySource.defaultFee,defaults.delivery.defaultFee);
  const openHour=normalizeHourValue(businessSource.openHour,defaults.businessHours.openHour,23);
  let closeHour=normalizeHourValue(businessSource.closeHour,defaults.businessHours.closeHour,24);
  if(closeHour<=openHour) closeHour=Math.min(24,openHour+1);
  return {
    delivery:{
      defaultFee,
      areas:normalizeDeliveryAreas(deliverySource.areas,defaultFee)
    },
    businessHours:{
      openHour,
      closeHour,
      openDays:normalizeOpenDays(businessSource.openDays,defaults.businessHours.openDays),
      timeZone:safeText(businessSource.timeZone,60)||defaults.businessHours.timeZone,
      scheduleLeadMinutes:Number.isFinite(Number(businessSource.scheduleLeadMinutes))
        ? Math.max(0,Math.min(240,Math.floor(Number(businessSource.scheduleLeadMinutes))))
        : defaults.businessHours.scheduleLeadMinutes
    }
  };
}

function normalizeMenuCategory(entry,index=0,seen=new Set()){
  const isArray=Array.isArray(entry);
  const source=entry&&typeof entry==='object'?entry:{};
  const rawId=isArray?entry[0]:(source.id||source.filter||source.value);
  const rawLabel=isArray?entry[1]:(source.label||source.name||source.title);
  let id=slugify(rawId)||slugify(rawLabel);
  let label=safeText(rawLabel,80)||safeText(rawId,80);
  if(!id&&!label) return null;
  if(!id) id=`categoria-${index+1}`;
  if(!label) label=id;
  if(id==='todos'){
    id='todos';
    label='Todos';
  }
  let uniqueId=id;
  let suffix=2;
  while(seen.has(uniqueId)){
    uniqueId=`${id}-${suffix}`;
    suffix+=1;
  }
  seen.add(uniqueId);
  return {
    id:uniqueId,
    label,
    active:uniqueId==='todos'?true:source.active!==false
  };
}

function normalizeMenuCategories(value){
  const source=Array.isArray(value)?value:[['todos','Todos']];
  const seen=new Set();
  const normalized=source
    .map((entry,index)=>normalizeMenuCategory(entry,index,seen))
    .filter(Boolean);
  const withoutTodos=normalized.filter(category=>category.id!=='todos');
  return [{id:'todos',label:'Todos',active:true},...withoutTodos].slice(0,80);
}

function normalizeMenuDb(db){
  return {
    menuCategories:normalizeMenuCategories(db?.menuCategories),
    menuProducts:Array.isArray(db?.menuProducts)?db.menuProducts:[],
    promoProducts:Array.isArray(db?.promoProducts)?db.promoProducts:[],
    siteSettings:normalizeSiteSettings(db?.siteSettings)
  };
}

function readMenuDb(){
  ensureMenuDb();
  try{
    return normalizeMenuDb(JSON.parse(readFileSync(menuDbFile,'utf8')));
  }catch(error){
    console.error('Falha ao ler cardapio:',error.message);
    return normalizeMenuDb(JSON.parse(readFileSync(menuSeedFile,'utf8')));
  }
}

function writeMenuDb(db){
  ensureMenuDb();
  writeFileSync(menuDbFile,JSON.stringify(normalizeMenuDb(db),null,2),'utf8');
}

function publicMenuPayload(){
  const db=readMenuDb();
  const visibleCategories=db.menuCategories.filter(category=>category.id==='todos'||category.active!==false);
  const visibleCategoryIds=new Set(visibleCategories.map(category=>category.id));
  return {
    menuCategories:visibleCategories.map(category=>[category.id,category.label]),
    menuProducts:db.menuProducts.filter(product=>!product.soldOut&&visibleCategoryIds.has(product.category)),
    promoProducts:db.promoProducts.filter(product=>!product.soldOut),
    siteSettings:db.siteSettings
  };
}

function collectionFor(kind,db){
  if(kind==='promo') return db.promoProducts;
  if(kind==='product') return db.menuProducts;
  return null;
}

function slugify(value){
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'')
    .slice(0,80);
}

function normalizeArrayText(value,maxItems=40,maxLength=160){
  return Array.isArray(value)
    ? value.map(item=>safeText(item,maxLength)).filter(Boolean).slice(0,maxItems)
    : [];
}

function normalizeVariants(value){
  if(!Array.isArray(value)) return [];
  const ids=new Set();
  return value.map(variant=>{
    const label=safeText(variant?.label,60);
    const price=Number(variant?.price);
    let id=slugify(variant?.id||label)||'unico';
    if(ids.has(id)){
      let index=2;
      while(ids.has(`${id}-${index}`)) index+=1;
      id=`${id}-${index}`;
    }
    ids.add(id);
    return {id,label,price:Math.round(price*100)/100};
  }).filter(variant=>variant.label&&Number.isFinite(variant.price)&&variant.price>=0);
}

function validateAdminProduct(body){
  if(!body||typeof body!=='object') return 'Dados invalidos.';
  if(!safeText(body.name,120)) return 'Informe o nome do item.';
  if(!safeText(body.category,60)) return 'Informe a categoria.';
  if(!normalizeVariants(body.variants).length) return 'Adicione ao menos uma variante com preco.';
  return '';
}

function adminProductPayload(body,existing={}){
  return {
    ...existing,
    name:safeText(body.name,120),
    label:safeText(body.label,60),
    category:safeText(body.category,60),
    badge:safeText(body.badge,60),
    desc:safeText(body.desc,500),
    composition:safeText(body.composition,140),
    details:normalizeArrayText(body.details,60,180),
    variants:normalizeVariants(body.variants),
    meta:normalizeArrayText(body.meta,20,60),
    image:safeText(body.image,180)||existing.image||'logo_wariobranca - Editado.png',
    soldOut:Boolean(body.soldOut)
  };
}

function categoryUseCounts(db){
  const counts={};
  for(const product of db.menuProducts){
    const category=safeText(product?.category,80);
    if(!category) continue;
    counts[category]=(counts[category]||0)+1;
  }
  return counts;
}

function applyCategoryUpdate(db,categories){
  const next=normalizeMenuCategories(categories);
  const nextIds=new Set(next.map(category=>category.id));
  const counts=categoryUseCounts(db);
  const missing=Object.keys(counts).filter(category=>!nextIds.has(category));
  if(missing.length){
    const error=new Error(`Antes de excluir, mova os itens das categorias: ${missing.join(', ')}.`);
    error.status=400;
    throw error;
  }
  db.menuCategories=next;
  return next;
}

function moveProduct(list,id,direction,categoryScope=''){
  const productIndex=list.findIndex(product=>product.id===id);
  if(productIndex<0) return false;
  const step=direction==='up'?-1:direction==='down'?1:0;
  if(!step) return false;
  const scope=safeText(categoryScope,80);
  const scopedIndexes=list
    .map((product,index)=>({product,index}))
    .filter(({product})=>!scope||scope==='todos'||safeText(product?.category,80)===scope)
    .map(({index})=>index);
  const scopedPosition=scopedIndexes.indexOf(productIndex);
  const targetIndex=scopedIndexes[scopedPosition+step];
  if(scopedPosition<0||targetIndex===undefined) return false;
  const current=list[productIndex];
  list[productIndex]=list[targetIndex];
  list[targetIndex]=current;
  return true;
}

function deploymentChecklist(){
  const dataDirNormalized=path.normalize(menuDataDir).replace(/\\/g,'/');
  const dataEnvNormalized=path.normalize(process.env.DATA_DIR||'').replace(/\\/g,'/');
  const dataLooksPersistent=dataEnvNormalized==='/data';
  const hasHttpsOrigin=appOrigins.some(origin=>/^https:\/\//i.test(origin));
  return {
    generatedAt:new Date().toISOString(),
    environment:isProduction?'production':'local',
    checks:[
      {
        id:'admin-password',
        label:'Senha do painel',
        ok:Boolean(process.env.ADMIN_PASSWORD),
        detail:process.env.ADMIN_PASSWORD?'ADMIN_PASSWORD configurada.':'Configure ADMIN_PASSWORD no Railway antes de publicar.'
      },
      {
        id:'session-secret',
        label:'Sessão do painel',
        ok:Boolean(process.env.SESSION_SECRET||process.env.ADMIN_SESSION_SECRET),
        detail:(process.env.SESSION_SECRET||process.env.ADMIN_SESSION_SECRET)?'SESSION_SECRET configurada.':'Configure SESSION_SECRET para não deslogar todo mundo a cada deploy.'
      },
      {
        id:'data-volume',
        label:'Volume persistente',
        ok:dataLooksPersistent,
        detail:dataLooksPersistent?`DATA_DIR apontando para ${menuDataDir}.`:'No Railway, monte um Volume em /data e defina DATA_DIR=/data.'
      },
      {
        id:'order-store',
        label:'Pedidos Pix',
        ok:orderPersistenceEnabled,
        detail:orderPersistenceEnabled?`Pedidos configurados para salvar em arquivo.`:'ORDER_STORE está em memória; pedidos podem sumir ao reiniciar.'
      },
      {
        id:'app-origin',
        label:'Domínio oficial',
        ok:!isProduction||hasHttpsOrigin,
        detail:hasHttpsOrigin?'APP_ORIGIN/ALLOWED_ORIGINS usa HTTPS.':'Em produção, configure APP_ORIGIN=https://wariosushi.com.br.'
      }
    ]
  };
}

function productCatalogFromMenu(){
  const db=readMenuDb();
  const catalog=new Map();
  const visibleCategoryIds=new Set(db.menuCategories.filter(category=>category.id==='todos'||category.active!==false).map(category=>category.id));
  for(const product of [...db.menuProducts,...db.promoProducts]){
    if(product?.soldOut) continue;
    if(db.menuProducts.includes(product)&&!visibleCategoryIds.has(product.category)) continue;
    const variants=Array.isArray(product?.variants)?product.variants:[];
    for(const variant of variants){
      const variantId=slugify(variant?.id||variant?.label)||'unico';
      const id=`${safeText(product?.id,80)}-${variantId}`;
      const price=Number(variant?.price);
      if(!safeText(product?.id,80)||!Number.isFinite(price)||price<0) continue;
      const name=variants.length>1
        ? `${safeText(product.name,120)} (${safeText(variant.label,60)})`
        : safeText(product.name,120);
      catalog.set(id,{name,price:Math.round(price*100)/100});
    }
  }
  return catalog;
}

const adminImageExtensions=new Set(['.jpg','.jpeg','.png','.webp','.gif','.ico']);
const uploadMimeExtensions=new Map([
  ['image/jpeg','.jpg'],
  ['image/png','.png'],
  ['image/webp','.webp'],
  ['image/gif','.gif']
]);

function listImageFiles(dir,prefix='',depth=0){
  if(!existsSync(dir)||depth>3) return [];
  const files=[];
  for(const entry of readdirSync(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.')) continue;
    const fullPath=path.join(dir,entry.name);
    const publicName=`${prefix}${entry.name}`;
    if(entry.isDirectory()){
      files.push(...listImageFiles(fullPath,`${publicName}/`,depth+1));
    }else if(entry.isFile()&&adminImageExtensions.has(path.extname(entry.name).toLowerCase())){
      files.push(publicName.replace(/\\/g,'/'));
    }
  }
  return files;
}

function listAdminImages(){
  const files=new Set();
  for(const dir of [rootDir,path.join(rootDir,'public')]){
    if(!existsSync(dir)) continue;
    for(const entry of readdirSync(dir,{withFileTypes:true})){
      if(entry.isFile()&&adminImageExtensions.has(path.extname(entry.name).toLowerCase())) files.add(entry.name);
    }
  }
  listImageFiles(path.join(menuDataDir,'uploads'),'uploads/').forEach(file=>files.add(file));
  return [...files].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}

function adminImageUsage(db=readMenuDb()){
  const usage={};
  for(const product of [...db.menuProducts,...db.promoProducts]){
    const image=safeText(product?.image,180);
    if(!image) continue;
    if(!usage[image]) usage[image]=[];
    usage[image].push({
      id:safeText(product?.id,80),
      name:safeText(product?.name,120),
      kind:db.promoProducts.includes(product)?'promo':'product'
    });
  }
  return usage;
}

function uploadedImagePath(image){
  const imageName=safeText(image,220).replace(/\\/g,'/');
  if(!/^uploads\/menu\/[\w .()\-]+\.(?:png|jpe?g|webp|gif)$/i.test(imageName)||imageName.includes('..')) return null;
  const filePath=path.resolve(menuDataDir,`.${path.sep}${imageName}`);
  return isPathInside(filePath,menuUploadDir)?filePath:null;
}

function deleteAdminImage(image,force=false){
  const db=readMenuDb();
  const imageName=safeText(image,220).replace(/\\/g,'/');
  const filePath=uploadedImagePath(imageName);
  if(!filePath){
    const error=new Error('Só imagens enviadas pelo painel podem ser removidas.');
    error.status=400;
    throw error;
  }
  const usedBy=adminImageUsage(db)[imageName]||[];
  if(usedBy.length&&!force){
    const error=new Error('Essa imagem está em uso em um item do cardápio.');
    error.status=409;
    error.usedBy=usedBy;
    throw error;
  }
  if(existsSync(filePath)) unlinkSync(filePath);
  return imageName;
}

function imageBufferMatchesMime(buffer,mime){
  if(mime==='image/png') return buffer.length>8&&buffer[0]===0x89&&buffer[1]===0x50&&buffer[2]===0x4e&&buffer[3]===0x47;
  if(mime==='image/jpeg') return buffer.length>3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
  if(mime==='image/gif') return buffer.length>6&&buffer.toString('ascii',0,3)==='GIF';
  if(mime==='image/webp') return buffer.length>12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP';
  return false;
}

function saveAdminImage(body){
  const originalName=safeText(body?.filename,180);
  const mime=safeText(body?.mime,80).toLowerCase();
  const ext=uploadMimeExtensions.get(mime);
  if(!ext) {
    const error=new Error('Envie uma imagem JPG, PNG, WebP ou GIF.');
    error.status=400;
    throw error;
  }
  const rawBase64=String(body?.dataBase64||'').replace(/^data:[^;]+;base64,/i,'').replace(/\s/g,'');
  if(!rawBase64){
    const error=new Error('Imagem vazia.');
    error.status=400;
    throw error;
  }
  const buffer=Buffer.from(rawBase64,'base64');
  if(!buffer.length||buffer.length>8*1024*1024){
    const error=new Error('A imagem deve ter ate 8 MB.');
    error.status=413;
    throw error;
  }
  if(!imageBufferMatchesMime(buffer,mime)){
    const error=new Error('O arquivo enviado nao parece ser uma imagem valida.');
    error.status=400;
    throw error;
  }
  const baseName=slugify(path.basename(originalName,path.extname(originalName)))||'imagem-cardapio';
  const filename=`${baseName}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}${ext}`;
  mkdirSync(menuUploadDir,{recursive:true});
  writeFileSync(path.join(menuUploadDir,filename),buffer);
  return `uploads/menu/${filename}`;
}

function mergeSiteSettings(body,existing){
  const patch=body&&typeof body==='object'?body:{};
  const patchDelivery=patch.delivery&&typeof patch.delivery==='object'?patch.delivery:{};
  const patchHours=patch.businessHours&&typeof patch.businessHours==='object'?patch.businessHours:{};
  return normalizeSiteSettings({
    delivery:{
      ...(existing?.delivery||{}),
      ...patchDelivery,
      areas:Object.prototype.hasOwnProperty.call(patchDelivery,'areas')
        ? patchDelivery.areas
        : existing?.delivery?.areas
    },
    businessHours:{
      ...(existing?.businessHours||{}),
      ...patchHours,
      openDays:Object.prototype.hasOwnProperty.call(patchHours,'openDays')
        ? patchHours.openDays
        : existing?.businessHours?.openDays
    }
  });
}

function adminOrdersPayload(){
  const sortedOrders=[...orders.values()].sort((a,b)=>{
    const bTime=Number(b?.createdAtMs)||Date.parse(b?.createdAt)||0;
    const aTime=Number(a?.createdAtMs)||Date.parse(a?.createdAt)||0;
    return bTime-aTime;
  });
  return {
    orders:sortedOrders.slice(0,100).map(order=>({
      orderId:safeText(order?.orderId,80),
      paymentId:safeText(order?.mpOrderId||order?.paymentId,80),
      status:safeText(order?.status||'pending',40),
      amount:normalizeFee(order?.amount,0,5000),
      subtotal:normalizeFee(order?.subtotal,0,5000),
      deliveryFee:normalizeFee(order?.deliveryFee,0),
      customerName:safeText(order?.customerName,80),
      address:{
        street:safeText(order?.address?.street,140),
        number:safeText(order?.address?.number,12),
        complement:safeText(order?.address?.complement,80),
        neighborhood:safeText(order?.address?.neighborhood,80),
        cep:safeText(order?.address?.cep,12)
      },
      schedule:{
        mode:safeText(order?.schedule?.mode,40),
        date:safeText(order?.schedule?.date,10),
        time:safeText(order?.schedule?.time,5),
        label:safeText(order?.schedule?.label,80)
      },
      items:Array.isArray(order?.items)
        ? order.items.slice(0,30).map(item=>({
          name:safeText(item?.name,120),
          qty:Math.max(1,Math.min(20,Number(item?.qty)||1)),
          total:normalizeFee(item?.total,0)
        }))
        : [],
      createdAt:safeText(order?.createdAt,40)
    }))
  };
}

function parseCookies(header){
  return String(header||'').split(';').reduce((cookies,part)=>{
    const index=part.indexOf('=');
    if(index<0) return cookies;
    const key=part.slice(0,index).trim();
    const value=part.slice(index+1).trim();
    if(key) cookies[key]=decodeURIComponent(value);
    return cookies;
  },{});
}

function signSession(id){
  return crypto.createHmac('sha256',adminSessionSecret).update(id).digest('base64url');
}

function hashAdminPassword(value){
  return crypto.createHash('sha256').update(String(value)).digest();
}

function sameSecret(a,b){
  return crypto.timingSafeEqual(hashAdminPassword(a),hashAdminPassword(b));
}

function adminCookie(value,maxAgeSeconds){
  const parts=[
    `wario_admin_session=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0,maxAgeSeconds)}`
  ];
  if(isProduction) parts.push('Secure');
  return parts.join('; ');
}

function createAdminSession(){
  const id=crypto.randomBytes(24).toString('base64url');
  const expiresAt=Date.now()+adminSessionMaxAgeMs;
  adminSessions.set(id,{expiresAt});
  return `${id}.${signSession(id)}`;
}

function adminSessionId(req){
  const token=parseCookies(req.headers.cookie).wario_admin_session||'';
  const [id,signature]=token.split('.');
  if(!id||!signature||signature!==signSession(id)) return '';
  const session=adminSessions.get(id);
  if(!session||session.expiresAt<Date.now()){
    if(id) adminSessions.delete(id);
    return '';
  }
  return id;
}

function isAdminAuthenticated(req){
  return Boolean(adminSessionId(req));
}

function pruneAdminSessions(){
  const now=Date.now();
  for(const [id,session] of adminSessions){
    if(!session||session.expiresAt<now) adminSessions.delete(id);
  }
}

function adminTooManyAttempts(ip){
  const now=Date.now();
  const entry=adminLoginAttempts.get(ip)||{count:0,ts:now};
  if(now-entry.ts>15*60_000){
    entry.count=0;
    entry.ts=now;
  }
  adminLoginAttempts.set(ip,entry);
  return entry.count>=8;
}

function registerAdminAttempt(ip,success){
  if(success){
    adminLoginAttempts.delete(ip);
    return;
  }
  const now=Date.now();
  const entry=adminLoginAttempts.get(ip)||{count:0,ts:now};
  if(now-entry.ts>15*60_000){
    entry.count=0;
    entry.ts=now;
  }
  entry.count+=1;
  adminLoginAttempts.set(ip,entry);
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
    "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com https://api.qrserver.com",
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
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
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
  if(pathname==='/api/admin/login') return {windowMs:60_000,max:12};
  if(pathname.startsWith('/api/admin/')) return {windowMs:60_000,max:120};
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
  return (req.method==='POST'&&(pathname==='/api/pix/create'||pathname==='/api/pix/webhook'))
    || (['POST','PUT','PATCH'].includes(req.method)&&pathname.startsWith('/api/admin/'));
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

async function readJson(req,maxBytes=32*1024){
  let size=0;
  const chunks=[];
  for await(const chunk of req){
    size+=chunk.length;
    if(size>maxBytes){
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

function deliverySettings(){
  return readMenuDb().siteSettings.delivery;
}

function businessHoursConfig(){
  return readMenuDb().siteSettings.businessHours;
}

function deliveryFeeFor(neighborhood){
  const normalized=normalizeText(neighborhood);
  const delivery=deliverySettings();
  const area=delivery.areas.find(item=>item.active!==false&&normalizeText(item.name)===normalized);
  if(!area) return null;
  return normalizeFee(area.fee,delivery.defaultFee);
}

function normalizeOrder(body,schedule){
  normalizeOrder.lastError='';
  const submittedAmount=normalizeAmount(body?.amount);
  const address={
    street:safeText(body?.address?.street,140),
    number:safeText(body?.address?.number,12),
    complement:safeText(body?.address?.complement,80),
    neighborhood:safeText(body?.address?.neighborhood,80),
    cep:safeText(body?.address?.cep,12)
  };
  if(!address.street||!address.number||!address.neighborhood){
    normalizeOrder.lastError='Preencha endereco, numero e bairro antes de gerar o Pix.';
    return null;
  }
  const deliveryFee=deliveryFeeFor(address.neighborhood);
  if(typeof deliveryFee!=='number'){
    normalizeOrder.lastError='Esse bairro ainda nao esta em uma area atendida pelo delivery.';
    return null;
  }
  const productCatalog=productCatalogFromMenu();
  const submittedItems=Array.isArray(body?.items)?body.items.slice(0,30):[];
  const items=submittedItems.map(item=>{
    const id=safeText(item.id,80);
    const product=productCatalog.get(id);
    if(!product){
      normalizeOrder.lastError='Um item do cardapio nao foi reconhecido. Atualize a pagina e tente novamente.';
      return null;
    }
    const qty=Math.max(1,Math.min(20,Number(item.qty)||1));
    return {id,name:product.name,qty,price:product.price,total:Math.round(product.price*qty*100)/100};
  });
  if(!items.length){
    normalizeOrder.lastError='Adicione pelo menos um item ao pedido antes de gerar o Pix.';
    return null;
  }
  if(items.some(item=>!item)) return null;
  const subtotal=Math.round(items.reduce((sum,item)=>sum+item.total,0)*100)/100;
  const amount=Math.round((subtotal+deliveryFee)*100)/100;
  if(!submittedAmount||Math.abs(submittedAmount-amount)>0.01){
    normalizeOrder.lastError='O total do pedido mudou. Atualize o carrinho e tente gerar o Pix novamente.';
    return null;
  }
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

function findFirstStringField(value,fieldNames,depth=0,seen=new WeakSet()){
  if(!value||typeof value!=='object'||depth>8) return '';
  if(seen.has(value)) return '';
  seen.add(value);
  if(Array.isArray(value)){
    for(const item of value){
      const found=findFirstStringField(item,fieldNames,depth+1,seen);
      if(found) return found;
    }
    return '';
  }
  for(const name of fieldNames){
    const candidate=value[name];
    if(candidate!==undefined&&candidate!==null&&String(candidate).trim()) return String(candidate);
  }
  for(const child of Object.values(value)){
    const found=findFirstStringField(child,fieldNames,depth+1,seen);
    if(found) return found;
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
  const qrCode=firstNonEmpty(
    paymentMethod.qr_code,
    payment.qr_code,
    mpOrder.qr_code,
    mpOrder.qr_data,
    findFirstStringField(mpOrder,['qr_code','qr_data'])
  );
  const qrCodeBase64=firstNonEmpty(
    paymentMethod.qr_code_base64,
    payment.qr_code_base64,
    mpOrder.qr_code_base64,
    findFirstStringField(mpOrder,['qr_code_base64','qr_code_based64'])
  );
  const ticketUrl=firstNonEmpty(
    paymentMethod.ticket_url,
    payment.ticket_url,
    mpOrder.ticket_url,
    findFirstStringField(mpOrder,['ticket_url'])
  );
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

async function ensurePixQrImage(responseBody){
  return responseBody;
}

function formatMoney(value){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0);
}

function joinPortugueseList(items){
  if(items.length<=1) return items[0]||'';
  return `${items.slice(0,-1).join(', ')} e ${items[items.length-1]}`;
}

function formatBusinessHour(hour){
  return `${String(Math.floor(Number(hour)||0)).padStart(2,'0')}h`;
}

function businessDaysText(hours=businessHoursConfig()){
  const days=Array.isArray(hours.openDays)?hours.openDays:[];
  const normalized=[...new Set(days)].sort((a,b)=>a-b);
  const names=['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
  if(normalized.length===7) return 'todos os dias';
  if(normalized.join(',')==='0,3,4,5,6') return 'de quarta a domingo';
  return joinPortugueseList(normalized.map(day=>names[day]).filter(Boolean));
}

function businessScheduleText(hours=businessHoursConfig()){
  return `Atendemos ${businessDaysText(hours)}, das ${formatBusinessHour(hours.openHour)} as ${formatBusinessHour(hours.closeHour)}.`;
}

function currentBusinessMinutes(date=new Date(),hours=businessHoursConfig()){
  try{
    const parts=new Intl.DateTimeFormat('pt-BR',{
      timeZone:hours.timeZone,
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

function currentBusinessDay(date=new Date(),hours=businessHoursConfig()){
  try{
    const weekday=new Intl.DateTimeFormat('en-US',{
      timeZone:hours.timeZone,
      weekday:'short'
    }).format(date).slice(0,3).toLowerCase();
    return {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6}[weekday]??date.getDay();
  }catch(error){
    return date.getDay();
  }
}

function isBusinessDay(date=new Date(),hours=businessHoursConfig()){
  return hours.openDays.includes(currentBusinessDay(date,hours));
}

function isBusinessOpen(date=new Date(),hours=businessHoursConfig()){
  const minutes=currentBusinessMinutes(date,hours);
  return isBusinessDay(date,hours)&&minutes>=hours.openHour*60&&minutes<hours.closeHour*60;
}

function closedOrderMessage(date=new Date()){
  const hours=businessHoursConfig();
  const minutes=currentBusinessMinutes(date,hours);
  const schedule=businessScheduleText(hours);
  if(!isBusinessDay(date,hours)){
    return `Hoje nao estamos abertos. ${schedule}`;
  }
  if(minutes<hours.openHour*60){
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

function isBusinessTime(timeValue,hours=businessHoursConfig()){
  const match=String(timeValue||'').match(/^(\d{2}):(\d{2})$/);
  if(!match) return false;
  const minutes=Number(match[1])*60+Number(match[2]);
  return Number.isFinite(minutes)&&minutes>=hours.openHour*60&&minutes<hours.closeHour*60;
}

function formatScheduleDate(dateValue){
  const date=scheduleDateObject(dateValue);
  if(!date) return '';
  return new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).format(date).replace('.','');
}

function normalizeSchedule(value){
  normalizeSchedule.lastError='';
  const hours=businessHoursConfig();
  const mode=safeText(value?.mode,40);
  if(mode==='now'){
    if(!isBusinessOpen(new Date(),hours)){
      normalizeSchedule.lastError=`Agora estamos fechados. Escolha um agendamento. ${businessScheduleText(hours)}`;
      return null;
    }
    return {
      mode:'now',
      date:'',
      time:'',
      label:'Entrega agora'
    };
  }
  if(mode!=='scheduled'){
    normalizeSchedule.lastError='Escolha data e horario para a entrega.';
    return null;
  }
  const date=safeText(value?.date,10);
  const time=safeText(value?.time,5);
  const dateObject=scheduleDateObject(date);
  const timestamp=scheduleTimestamp(date,time);
  if(!dateObject){
    normalizeSchedule.lastError='Escolha uma data valida para a entrega.';
    return null;
  }
  if(!isBusinessDay(dateObject,hours)){
    normalizeSchedule.lastError=`Escolha uma data dentro dos dias de atendimento. ${businessScheduleText(hours)}`;
    return null;
  }
  if(!isBusinessTime(time,hours)){
    normalizeSchedule.lastError=`Escolha um horario entre ${formatBusinessHour(hours.openHour)} e ${formatBusinessHour(hours.closeHour)}.`;
    return null;
  }
  if(!Number.isFinite(timestamp)||timestamp<Date.now()+hours.scheduleLeadMinutes*60*1000){
    normalizeSchedule.lastError=`Escolha um horario com pelo menos ${hours.scheduleLeadMinutes} minutos de antecedencia.`;
    return null;
  }
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
    `Entrega: ${order.schedule?.label||'Nao informado'}`,
    'Pagamento: Pix aprovado',
    `Total: ${formatMoney(order.amount)}`,
    `Codigo do pagamento: ${order.mpOrderId||order.paymentId}`
  ].join('\n');
}

async function createPixOrder(req,res){
  const body=await readJson(req);
  const schedule=normalizeSchedule(body?.schedule);
  if(!schedule){
    const error=normalizeSchedule.lastError||'Agendamento invalido.';
    console.warn('Pix recusado por agendamento invalido:',error);
    return sendJson(res,400,{error});
  }
  if(!await verifyTurnstileToken(body?.turnstileToken,req)){
    return sendJson(res,403,{error:'Confirme a verificacao anti-bot para gerar o Pix.'});
  }
  const order=normalizeOrder(body,schedule);
  if(!order){
    const error=normalizeOrder.lastError||'Pedido invalido ou valor divergente.';
    console.warn('Pix recusado por pedido invalido:',error);
    return sendJson(res,400,{error});
  }
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
  const responseBody=await ensurePixQrImage(pixResponse(mpOrder,order));
  if(!responseBody.qrCode&&!responseBody.qrCodeBase64){
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

async function handleMenuAdminApi(req,res,url){
  if(req.method==='GET'&&url.pathname==='/api/menu'){
    return sendJson(res,200,publicMenuPayload());
  }
  if(req.method==='GET'&&url.pathname==='/api/admin/session'){
    return sendJson(res,200,{loggedIn:isAdminAuthenticated(req)});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/login'){
    if(!adminLoginEnabled) return sendJson(res,503,{error:'admin_password_missing'});
    const ip=clientIp(req);
    if(adminTooManyAttempts(ip)) return sendJson(res,429,{error:'too_many_attempts'});
    const body=await readJson(req);
    const ok=typeof body?.password==='string'&&body.password.length>0&&sameSecret(body.password,adminPassword);
    registerAdminAttempt(ip,ok);
    if(!ok) return sendJson(res,401,{error:'invalid_password'});
    pruneAdminSessions();
    const token=createAdminSession();
    return sendJsonWithHeaders(res,200,{ok:true},{'Set-Cookie':adminCookie(token,Math.round(adminSessionMaxAgeMs/1000))});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/logout'){
    const id=adminSessionId(req);
    if(id) adminSessions.delete(id);
    return sendJsonWithHeaders(res,200,{ok:true},{'Set-Cookie':adminCookie('',0)});
  }
  if(!url.pathname.startsWith('/api/admin/')) return false;
  if(!isAdminAuthenticated(req)) return sendJson(res,401,{error:'not_authenticated'});

  if(req.method==='GET'&&url.pathname==='/api/admin/menu'){
    return sendJson(res,200,readMenuDb());
  }
  if(req.method==='GET'&&url.pathname==='/api/admin/backup'){
    const date=new Date().toISOString().slice(0,10);
    return sendJsonWithHeaders(res,200,{
      generatedAt:new Date().toISOString(),
      source:'WA RIO Admin',
      menu:readMenuDb()
    },{
      'Cache-Control':'no-store',
      'Content-Disposition':`attachment; filename="wa-rio-cardapio-backup-${date}.json"`
    });
  }
  if(req.method==='GET'&&url.pathname==='/api/admin/deploy-check'){
    return sendJson(res,200,deploymentChecklist());
  }
  if(req.method==='GET'&&url.pathname==='/api/admin/categories'){
    const db=readMenuDb();
    return sendJson(res,200,{categories:db.menuCategories,counts:categoryUseCounts(db)});
  }
  if(req.method==='PUT'&&url.pathname==='/api/admin/categories'){
    const body=await readJson(req);
    const db=readMenuDb();
    const categories=applyCategoryUpdate(db,body?.categories);
    writeMenuDb(db);
    return sendJson(res,200,{ok:true,categories,counts:categoryUseCounts(db)});
  }
  if(req.method==='GET'&&url.pathname==='/api/admin/images'){
    return sendJson(res,200,{images:listAdminImages(),usage:adminImageUsage()});
  }
  if(req.method==='POST'&&url.pathname==='/api/admin/images'){
    const body=await readJson(req,12*1024*1024);
    const image=saveAdminImage(body);
    return sendJson(res,200,{ok:true,image,images:listAdminImages(),usage:adminImageUsage()});
  }
  if(req.method==='DELETE'&&url.pathname==='/api/admin/images'){
    const body=await readJson(req);
    const deleted=deleteAdminImage(body?.image,Boolean(body?.force));
    return sendJson(res,200,{ok:true,deleted,images:listAdminImages(),usage:adminImageUsage()});
  }
  if(req.method==='GET'&&url.pathname==='/api/admin/settings'){
    return sendJson(res,200,readMenuDb().siteSettings);
  }
  if(req.method==='PUT'&&url.pathname==='/api/admin/settings'){
    const body=await readJson(req);
    const db=readMenuDb();
    db.siteSettings=mergeSiteSettings(body,db.siteSettings);
    writeMenuDb(db);
    return sendJson(res,200,{ok:true,siteSettings:db.siteSettings});
  }
  if(req.method==='GET'&&url.pathname==='/api/admin/orders'){
    return sendJson(res,200,adminOrdersPayload());
  }

  const parts=url.pathname.split('/').filter(Boolean);
  if(parts[0]!=='api'||parts[1]!=='admin'||parts[2]!=='menu') return false;
  const kind=parts[3];
  const id=parts[4]?decodeURIComponent(parts[4]):'';
  const action=parts[5]||'';
  const db=readMenuDb();
  const list=collectionFor(kind,db);
  if(!list) return sendJson(res,404,{error:'invalid_kind'});

  if(req.method==='PATCH'&&id==='reorder'&&!action){
    const body=await readJson(req);
    const moved=moveProduct(list,safeText(body?.id,80),safeText(body?.direction,20),safeText(body?.category,80));
    if(!moved) return sendJson(res,400,{error:'Não foi possível mover este item.'});
    writeMenuDb(db);
    return sendJson(res,200,{ok:true});
  }

  if(req.method==='POST'&&!id){
    const body=await readJson(req);
    const validationError=validateAdminProduct(body);
    if(validationError) return sendJson(res,400,{error:validationError});
    const allProducts=[...db.menuProducts,...db.promoProducts];
    const baseId=slugify(body.id||body.name)||`item-${Date.now()}`;
    let uniqueId=baseId;
    let index=2;
    while(allProducts.some(product=>product.id===uniqueId)){
      uniqueId=`${baseId}-${index}`;
      index+=1;
    }
    const product={id:uniqueId,...adminProductPayload(body)};
    list.push(product);
    writeMenuDb(db);
    return sendJson(res,200,{ok:true,product});
  }

  const productIndex=list.findIndex(product=>product.id===id);
  if(productIndex<0) return sendJson(res,404,{error:'not_found'});

  if(req.method==='PUT'&&id&&!action){
    const body=await readJson(req);
    const validationError=validateAdminProduct(body);
    if(validationError) return sendJson(res,400,{error:validationError});
    list[productIndex]=adminProductPayload(body,list[productIndex]);
    writeMenuDb(db);
    return sendJson(res,200,{ok:true,product:list[productIndex]});
  }

  if(req.method==='PATCH'&&id&&action==='soldout'){
    const body=await readJson(req);
    list[productIndex].soldOut=Boolean(body?.soldOut);
    writeMenuDb(db);
    return sendJson(res,200,{ok:true,product:list[productIndex]});
  }

  if(req.method==='DELETE'&&id&&!action){
    list.splice(productIndex,1);
    writeMenuDb(db);
    return sendJson(res,200,{ok:true});
  }

  return sendJson(res,404,{error:'Endpoint nao encontrado.'});
}

function isPathInside(targetPath,basePath){
  const relative=path.relative(basePath,targetPath);
  return relative===''||Boolean(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
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
  const isUploadPath=pathname.startsWith('/uploads/');
  const staticRoot=isUploadPath?path.join(menuDataDir,'uploads'):rootDir;
  const filePath=isUploadPath
    ? path.resolve(menuDataDir,`.${pathname}`)
    : pathname==='/admin'||pathname==='/admin/'
      ? path.join(rootDir,'public','admin','index.html')
      : pathname.startsWith('/admin/')
        ? path.resolve(rootDir,'public',`.${pathname}`)
        : path.resolve(rootDir,`.${pathname}`);
  if(!isPathInside(filePath,staticRoot)){
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
      '.gif':'image/gif',
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
      const menuAdminHandled=await handleMenuAdminApi(req,res,url);
      if(menuAdminHandled!==false) return;
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
