# Security

## Protecoes implementadas

- Headers de seguranca e CSP.
- CORS com lista de origens permitidas.
- Rate limit por rota de API.
- Validacao de assinatura do webhook Mercado Pago.
- Recalculo de valores do pedido no backend.
- Validacao de payload JSON e limite de tamanho.
- Cloudflare Turnstile opcional/obrigatorio em producao.
- `.env`, logs e pedidos persistidos fora do Git.

## Requisitos de producao

- Usar HTTPS.
- Configurar `NODE_ENV=production`.
- Definir `APP_ORIGIN` com o dominio oficial.
- Definir `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`.
- Definir `TURNSTILE_REQUIRED=true` com chaves reais.
- Usar Cloudflare/WAF na frente do Railway.
- Montar volume persistente em `/data` no Railway.

## Dados sensiveis

Nao colocar tokens, chaves, webhooks secretos ou dados de clientes no repositorio.
