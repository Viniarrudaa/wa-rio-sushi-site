# Auditoria de seguranca - WA RIO Sushi

Data: 2026-06-02

Escopo analisado: site estatico, cardapio, checkout por WhatsApp/Pix e backend Node em `server/server.js`.
Nao foram executados ataques reais; a analise foi defensiva, baseada em leitura de codigo e validacao local.

## 1. Vulnerabilidades e riscos encontrados

1. Rate limit inicial era generico e baseado em memoria.
   - Risco: bots podem consumir tentativas de criacao de Pix, consultar status em excesso ou pressionar o servidor com muitas requisicoes.
   - Correcao aplicada: limites separados por rota e limpeza periodica em `server/server.js`.

2. `X-Forwarded-For` era aceito diretamente para identificar IP.
   - Risco: se o app receber trafego direto, o atacante pode forjar esse header e tentar driblar rate limit.
   - Correcao aplicada: o servidor so confia no header quando `TRUST_PROXY=true`.

3. Webhook do Mercado Pago podia aceitar requisicoes sem segredo configurado.
   - Risco: em producao, uma configuracao incompleta poderia permitir notificacoes falsas ou ruido operacional.
   - Correcao aplicada: em producao, `MP_WEBHOOK_SECRET` passou a ser obrigatorio.

4. Variaveis criticas de producao nao eram obrigatorias no startup.
   - Risco: site ir ao ar sem token, sem origem correta, sem HTTPS ou sem segredo de webhook.
   - Correcao aplicada: o servidor agora falha ao iniciar em producao se faltar `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` ou `APP_ORIGIN`, e exige HTTPS nas origens.

5. Imagens externas antigas ainda estavam no HTML/JS e no CSP.
   - Risco: dependencia de terceiros, mais superficie para carregamento externo e politica CSP mais aberta.
   - Correcao aplicada: referencias `images.unsplash.com` removidas; CSP aceita imagens apenas de `self` e `data:`.

6. Pedidos e eventos de webhook ficam em memoria.
   - Risco: reiniciar o servidor perde pedidos pendentes; um cliente pode pagar e o site nao conseguir confirmar pela memoria local.
   - Correcao aplicada: pedidos passaram a ser persistidos em arquivo local (`server/data/orders.json`) com TTL.
   - Recomendacao futura: para maior volume, trocar arquivo local por SQLite/Postgres/Supabase/Firebase/Redis.

7. Nao existe CAPTCHA ou desafio anti-bot no fluxo de Pix.
   - Risco: automacoes podem criar cobrancas Pix e consumir chamadas ao Mercado Pago.
   - Correcao aplicada: Cloudflare Turnstile foi integrado ao frontend e ao backend, ativado por variaveis de ambiente.

8. Nao ha login, sessoes ou upload no projeto atual.
   - Risco atual: baixo para forca bruta de login e upload inseguro, porque essas superficies nao existem.
   - Recomendacao: se criar painel administrativo, implementar MFA, cookies seguros, hash forte de senha e rate limit especifico.

9. SQL Injection nao foi identificado.
   - Motivo: nao ha banco SQL no codigo atual.
   - Recomendacao: se adicionar banco, usar queries parametrizadas e nunca concatenar entrada do usuario em SQL.

10. XSS esta parcialmente mitigado no frontend.
    - Pontos positivos: os renders dinamicos principais usam `escapeHtml` e `escapeAttr`.
    - Risco residual: qualquer dado futuro vindo de API/administrador nao deve entrar em `innerHTML` sem sanitizacao.

## 2. Correcoes recomendadas com exemplos

Rate limit por rota e IP confiavel:

```js
function clientIp(req){
  const direct=req.socket.remoteAddress||'unknown';
  if(!trustProxy) return direct;
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  return forwarded||direct;
}

function ratePolicy(pathname){
  if(pathname==='/api/pix/create') return {windowMs:60_000,max:6};
  if(pathname.startsWith('/api/pix/status/')) return {windowMs:60_000,max:90};
  return {windowMs:60_000,max:40};
}
```

Webhook obrigatorio em producao:

```js
function verifyMercadoPagoWebhook(req,body,url){
  if(!mpWebhookSecret) return !isProduction;
  // validar assinatura HMAC aqui
}
```

CAPTCHA defensivo para criar Pix:

```js
async function verifyTurnstile(token,ip){
  const body=new URLSearchParams({
    secret:process.env.TURNSTILE_SECRET_KEY,
    response:token,
    remoteip:ip
  });
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',
    body
  });
  const data=await response.json();
  return data.success===true;
}
```

Persistencia recomendada para pedidos:

```js
// Exemplo conceitual: salve orderId, orderToken, mpOrderId, amount, status e createdAt.
await db.orders.insert({
  orderId:order.orderId,
  orderToken:order.orderToken,
  mpOrderId:String(mpOrder.id),
  amount:order.amount,
  status:normalizedOrderStatus(mpOrder),
  createdAt:new Date().toISOString()
});
```

## 3. Protecao contra bots

- Colocar Cloudflare ou WAF equivalente na frente do site.
- Ativar rate limit por rota:
  - `/api/pix/create`: baixo, por exemplo 5 a 10 por minuto por IP.
  - `/api/pix/status/*`: medio, pois o cliente consulta o pagamento.
  - `/api/pix/webhook`: permitir Mercado Pago, mas manter limite alto e validar assinatura.
- Ativar Turnstile apenas no botao de criar Pix com `TURNSTILE_REQUIRED=true`.
- Bloquear paises/regioes se o negocio for apenas local e o trafego abusivo vier de fora.
- Monitorar picos de 4xx/5xx, criacao de Pix e chamadas ao Mercado Pago.

## 4. Protecao de APIs e formularios

- Manter validacao de preco e catalogo no backend; isso ja existe e e essencial.
- Validar tamanho, formato e obrigatoriedade dos campos no backend, nao apenas no frontend.
- Exigir `Content-Type: application/json` nas rotas POST; correcao aplicada.
- Usar CORS com `APP_ORIGIN` exato em producao; nao usar `*`.
- Logar erros sem incluir token, QR code, dados completos de cliente ou headers sensiveis.
- Para WhatsApp sem Pix, aceitar que a validacao e principalmente de UX; para pagamento, confiar apenas no backend.

## 5. Autenticacao, sessoes, cookies e permissoes

Estado atual:
- Nao existe login.
- Nao existem cookies de sessao.
- Nao existe painel administrativo.

Se criar painel:
- Senhas com Argon2id ou bcrypt.
- MFA para administrador.
- Rate limit e lockout progressivo no login.
- Cookies `HttpOnly`, `Secure`, `SameSite=Lax` ou `Strict`.
- CSRF token em formularios autenticados.
- Perfis de permissao: administrador, operador e leitura.

## 6. Checklist antes de publicar

- Definir dominio oficial em `APP_ORIGIN`.
- Usar HTTPS obrigatorio.
- Confirmar `NODE_ENV=production`.
- Configurar `MP_ACCESS_TOKEN` de producao.
- Configurar `MP_WEBHOOK_SECRET`.
- Configurar webhook do Mercado Pago apontando para `/api/pix/webhook`.
- Testar Pix com valor pequeno em producao.
- Colocar Cloudflare/WAF com regras anti-bot.
- Ativar Turnstile/reCAPTCHA para criacao de Pix.
- Confirmar que `server/data/orders.json` esta fora do Git e fora da pasta publica.
- Para volume real, migrar persistencia de pedidos para banco/Redis.
- Conferir que `.env` nao esta no diretorio publico e nao sera enviado para GitHub.
- Conferir headers de `security-headers-production.txt` no host final.
- Monitorar logs de erro e limite de requisicoes.
- Fazer backup dos arquivos e variaveis de ambiente.

## 7. Arquivos que precisam de atencao

- `server/server.js`: principal arquivo de seguranca de API, Pix, CORS, rate limit e webhook.
- `server/.env`: manter fora do Git e fora do diretorio publico.
- `server/.env.example`: modelo de variaveis sem segredos reais.
- `server/README.md`: instrucoes de producao e operacao.
- `security-headers-production.txt`: headers que devem existir no provedor/CDN.
- `wario_sushi_v2_16.html`: CSP meta, SEO, imagens e estrutura publica.
- `wario_sushi_v2_16.js`: validacao de frontend, renderizacao do cardapio e chamadas de API.
- `.gitignore`: impede vazamento acidental de `.env` e logs.
