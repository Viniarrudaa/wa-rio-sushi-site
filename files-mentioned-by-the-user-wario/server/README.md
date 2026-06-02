# WA RIO Pix com confirmacao automatica

Este backend cria orders Pix no Mercado Pago, consulta status e recebe webhooks. O site so libera o WhatsApp quando o pagamento da order voltar como `approved`.

## Configuracao

1. Crie uma conta Mercado Pago e gere o Access Token de producao.
2. Copie `.env.example` para `.env`.
3. Preencha:
   - `MP_ACCESS_TOKEN`: token privado do Mercado Pago.
   - `MP_WEBHOOK_SECRET`: segredo de notificacoes/webhook do Mercado Pago.
   - `DEFAULT_PAYER_EMAIL`: e-mail usado no pagador da cobranca.
   - `MP_PAYER_FIRST_NAME`: opcional. Em testes Pix do Mercado Pago, use `APRO`.
   - `MP_WEBHOOK_URL`: URL publica deste backend em producao, terminando em `/api/pix/webhook`.
   - `APP_ORIGIN`: dominio publico do site, exemplo `https://wariosushi.com.br`.
   - `TRUST_PROXY`: use `true` somente se o servidor estiver atras de um proxy/CDN confiavel que controla `X-Forwarded-For`.
   - `TURNSTILE_REQUIRED`: use `true` em producao para exigir anti-bot antes de criar Pix.
   - `TURNSTILE_SITE_KEY`: chave publica do Cloudflare Turnstile.
   - `TURNSTILE_SECRET_KEY`: chave secreta do Cloudflare Turnstile.
   - `ORDER_STORE`: use `file` para persistir pedidos localmente ou `memory` apenas para teste.
   - `ORDER_STORE_FILE`: caminho do arquivo local de pedidos, padrao `data/orders.json`.
   - `ORDER_STORE_TTL_HOURS`: tempo para manter pedidos no arquivo local.
   - `PIX_EXPIRATION`: opcional. Validade do Pix em duracao ISO 8601. Exemplo: `PT30M`.
   - `MP_TIMEOUT_MS`: opcional. Timeout de chamadas ao Mercado Pago em milissegundos.

Para teste local, use `DEFAULT_PAYER_EMAIL=test_user_br@testuser.com` e `MP_PAYER_FIRST_NAME=APRO`. Em producao, limpe `MP_PAYER_FIRST_NAME` para usar o nome real do cliente.

Nunca coloque `MP_ACCESS_TOKEN` no HTML, CSS ou JS publico.

## Rodar localmente

```bash
cd server
node server.js
```

Nao ha dependencias externas neste servidor local.

Depois abra:

```text
http://localhost:3000/wario_sushi_v2_16.html
```

## Observacoes de producao

- No Railway, prefira iniciar pela raiz do projeto com `npm start`.
- Se usar persistencia por arquivo, monte um Volume no Railway em `/data` e configure `ORDER_STORE_FILE=/data/orders.json`.
- Use HTTPS.
- Configure os headers de `security-headers-production.txt`.
- Em producao, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_ORIGIN` e HTTPS sao obrigatorios para o servidor iniciar.
- Use uma camada de protecao na frente do servidor, como Cloudflare/WAF, com bloqueio de bots e rate limit por rota.
- Crie um widget Cloudflare Turnstile e preencha `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`.
- O servidor salva pedidos pendentes em `server/data/orders.json` por padrao. Esse arquivo fica fora do Git e nao deve ser servido publicamente.
- Troque o armazenamento em memoria por banco de dados se quiser historico de pedidos.
- Configure o webhook no painel do Mercado Pago apontando para `/api/pix/webhook`.
- Em producao, deixe `NODE_ENV=production` e preencha `APP_ORIGIN`.
- O servidor recalcula o valor do pedido com uma tabela de produtos interna. Sempre atualize essa tabela quando mudar preco no cardapio.
- A integracao usa Mercado Pago Orders API (`/v1/orders`) para Pix.
