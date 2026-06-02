# WA RIO Sushi

Site oficial do WA RIO Sushi com cardapio, pedidos pelo WhatsApp, buffet para eventos e integracao Pix via Mercado Pago.

## Stack

- Frontend estatico em HTML, CSS e JavaScript.
- Backend Node.js nativo para Pix, webhooks e arquivos estaticos.
- Deploy preparado para Railway.
- Protecao recomendada com Cloudflare e Turnstile.

## Rodar localmente

```bash
npm start
```

Depois acesse:

```text
http://localhost:3000
```

## Variaveis de ambiente

Use `server/.env.example` como referencia. Nunca publique `server/.env`.

## Deploy

O projeto inclui `railway.toml` e pode ser publicado no Railway com:

```bash
npm start
```

Para producao, configure HTTPS, Cloudflare Turnstile, Mercado Pago e webhook em `/api/pix/webhook`.
