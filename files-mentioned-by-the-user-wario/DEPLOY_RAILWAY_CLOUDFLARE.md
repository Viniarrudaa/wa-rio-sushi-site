# Deploy WA RIO - Railway + Cloudflare

## 1. Railway

1. Suba este projeto para um repositorio privado no GitHub.
2. No Railway, crie um novo projeto a partir desse repositorio.
3. O Railway deve usar:
   - Build: Nixpacks
   - Start command: `npm start`
4. Em `Variables`, configure:

```text
NODE_ENV=production
APP_ORIGIN=https://seudominio.com
TRUST_PROXY=true
MP_ACCESS_TOKEN=APP_USR_SEU_TOKEN_REAL
MP_WEBHOOK_SECRET=SEU_SEGREDO_DE_WEBHOOK
DEFAULT_PAYER_EMAIL=pedido@wariosushi.com.br
MP_PAYER_FIRST_NAME=
MP_WEBHOOK_URL=https://seudominio.com/api/pix/webhook
PIX_EXPIRATION=PT30M
MP_TIMEOUT_MS=20000
TURNSTILE_REQUIRED=true
TURNSTILE_SITE_KEY=SUA_SITE_KEY
TURNSTILE_SECRET_KEY=SUA_SECRET_KEY
ORDER_STORE=file
ORDER_STORE_FILE=/data/orders.json
ORDER_STORE_TTL_HOURS=72
```

5. Crie um Volume no Railway e monte em `/data`.
   - Sem volume, o arquivo de pedidos pode ser perdido em redeploy/restart.
   - Para comecar com mais seguranca, use o volume.

## 2. Cloudflare

1. Adicione seu dominio no Cloudflare.
2. Aponte o DNS para o dominio publico gerado pelo Railway.
3. Ative HTTPS.
4. Crie um Turnstile para o dominio oficial.
5. Copie `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` para o Railway.
6. Configure regras de WAF/rate limit:
   - `/api/pix/create`: proteger contra bots e limitar tentativas.
   - `/api/pix/status/*`: limite moderado.
   - `/api/pix/webhook`: permitir Mercado Pago e manter assinatura obrigatoria.

## 3. Mercado Pago

1. Configure o webhook para:

```text
https://seudominio.com/api/pix/webhook
```

2. Use o mesmo segredo em `MP_WEBHOOK_SECRET`.
3. Faca um pedido Pix de teste com valor baixo.
4. Confira:
   - Pix gerado.
   - Pagamento aprovado.
   - WhatsApp liberado.
   - Pedido salvo no Railway volume.

## 4. Checklist antes de divulgar

- Dominio final em `APP_ORIGIN`.
- `NODE_ENV=production`.
- `TURNSTILE_REQUIRED=true`.
- `TRUST_PROXY=true` somente com Cloudflare/Railway na frente.
- Volume montado em `/data`.
- Webhook do Mercado Pago funcionando.
- Site acessando por HTTPS.
- Teste real de Pix concluido.
