# WA RIO Sushi — Site + Painel Admin

Isso transforma o site estático em um site com backend (Node.js + Express), rodando no
Railway, com um painel de administração em `/admin` para editar itens, preços e
marcar itens como esgotados sem precisar mexer em código.

## O que mudou em relação ao site atual

- `wario_sushi_v2_16.html`: a tag `<script>` agora carrega o JS como `type="module"`
  (necessário para o cardápio ser buscado da API antes de renderizar). Nada de visual
  mudou.
- `wario_sushi_v2_16.js`: os arrays `menuCategories`, `menuProducts` e `promoProducts`
  continuam no arquivo como estavam (servem de "modo offline" caso a API não responda),
  mas agora, ao carregar a página, o site busca `/api/menu` e usa os dados vindos do
  servidor — que são os dados que você edita pelo painel.
- Todo o resto do site (carrinho, WhatsApp, Pix, Cloudflare Turnstile etc.) **não foi
  alterado**.

## Estrutura do projeto

```
wario-admin/
  server.js          -> servidor Express (site + API do admin)
  package.json
  data/
    seed.json         -> dados iniciais extraídos do seu JS (14 produtos + 1 promoção)
    db.json            -> criado automaticamente na primeira execução (não versionar)
  public/
    wario_sushi_v2_16.html
    wario_sushi_v2_16.css
    wario_sushi_v2_16.js
    admin/
      index.html       -> painel /admin
      admin.css
      admin.js
```

**Importante:** as imagens do site (fotos dos pratos, favicon, logo etc.) não foram
enviadas para mim, então não estão nessa pasta. Copie todos os arquivos de imagem que
já estão no seu site hoje para dentro de `public/`, no mesmo nível do HTML.

## Rodando localmente para testar

```bash
cd wario-admin
npm install
ADMIN_PASSWORD=escolha-uma-senha-forte npm start
```

Abra `http://localhost:3000` para o site e `http://localhost:3000/admin` para o painel.

## Deploy no Railway

1. Suba essa pasta inteira (com as imagens do site coladas dentro de `public/`) para um
   repositório Git conectado ao seu projeto Railway — ou arraste os arquivos direto se
   você usa o deploy manual do Railway.
2. No Railway, em **Variables**, adicione:
   - `ADMIN_PASSWORD` → a senha do painel admin (escolha algo forte, é a única proteção
     de acesso).
   - `SESSION_SECRET` → qualquer texto longo aleatório (ex: gere em
     https://1password.com/password-generator, 40+ caracteres). Se não definir, o
     servidor gera um automaticamente, mas aí todo mundo é deslogado a cada deploy.
3. **Adicione um Volume** (Railway → seu serviço → Settings → Volumes) montado em
   `/data`, e defina a variável `DATA_DIR=/data`. Isso é essencial: sem isso, toda vez
   que você fizer um novo deploy, os itens que você editou no admin voltam ao estado
   original (`seed.json`), porque o sistema de arquivos do Railway não é permanente
   entre deploys sem um Volume.
4. O Railway detecta o `package.json` e roda `npm start` automaticamente. A porta é
   pega de `process.env.PORT`, que o Railway já define sozinho.

## Como usar o painel

- Acesse `wariosushi.com.br/admin` e entre com a senha (`ADMIN_PASSWORD`).
- **Cardápio** e **Promoções**: duas abas separadas.
- Clique em qualquer item para abrir o editor: nome, categoria, descrição, itens
  inclusos, tags, imagem (nome do arquivo que já está hospedado no site) e as
  variantes com preço (ex: 10 un / 20 un / 30 un, cada uma com seu preço).
- Botão **"Marcar como esgotado"** no card: some do site na hora, sem precisar abrir o
  editor. Clique de novo para voltar a aparecer.
- **+ Novo item**: cria um produto novo, que já aparece no site.
- **Excluir item**: remove permanentemente (pede confirmação).

Categorias (Combos, Filadélfia, Hot, Temaki etc.) continuam fixas por enquanto — dá pra
adicionar edição de categorias depois se você precisar.

## Segurança

- O painel é protegido por senha + cookie de sessão (HttpOnly), não por login de
  usuário — é pensado para uso pessoal seu, não para múltiplos administradores.
- A senha padrão embutida no arquivo é `27e30filhos` — ela só é usada se a variável de
  ambiente `ADMIN_PASSWORD` não estiver definida no Railway. O recomendado é sempre
  configurar `ADMIN_PASSWORD` no Railway (Variables), em vez de depender do valor fixo
  no código.
- Tem limite de tentativas de login (8 por 15 min por IP) para dificultar força bruta.
