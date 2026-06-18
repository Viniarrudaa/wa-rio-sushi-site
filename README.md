# 🍣 WA RIO Sushi - Site e Sistema de Pedidos

> 🔗 [Clique aqui para acessar o site oficial](https://wariosushi.com.br/)

Este é um projeto real desenvolvido para aprimorar a experiência de pedidos online do restaurante WA RIO Sushi. A aplicação funciona como um cardápio digital interativo onde o cliente pode navegar pelas categorias, montar seu carrinho de compras e simular/finalizar pedidos.

## 🚀 Funcionalidades Principais
- 📱 **Interface Mobile-First:** Totalmente responsiva e otimizada para smartphones (onde ocorrem 90% dos pedidos de delivery).
- 🛒 **Carrinho Dinâmico:** Adição, remoção e atualização de quantidade de itens em tempo real.
- 💵 **Módulo de Pagamento/Validação:** Integração lógica para geração de QR Code Pix após a verificação do pedido.
- 🕒 **Agendamento e Ajustes de Cartão:** Funcionalidades customizadas para controle de horário de funcionamento e entrega.

## 🛠️ Tecnologias Utilizadas
- **React.js** / **Next.js** (remova o que não se aplicar)
- **Tailwind CSS** (Para estilização fluida e rápida)
- **JavaScript (ES6+)** / **TypeScript**

## 🔧 Como rodar o projeto localmente

```bash
# Clonar o repositório
git clone [https://github.com/Viniarrudaa/site-wa-rio-sushi.git](https://github.com/Viniarrudaa/site-wa-rio-sushi.git)

# Instalar as dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run de
---

## 2. Limpeza de "Lixo" no Repositório (Super Importante!)
Quando um avaliador técnico abre o seu GitHub, ele olha a lista de arquivos. No seu print, há vários arquivos de log e arquivos do servidor local que **nunca** devem ser enviados para o GitHub público, pois deixam o repositório poluído e podem vazar informações.

### Arquivos para apagar ou colocar no `.gitignore`:
* `server-wario.err.log` (Arquivo de log de erro)
* `server-wario.out.log`
* `servidor-wario.saída`
* `servidor-wario.pid`

**Como resolver:**
1. Delete esses arquivos diretamente na sua máquina.
2. Crie (ou abra) um arquivo na raiz do seu projeto chamado `.gitignore` e adicione essas linhas dentro dele para que o Git nunca mais tente subir esses arquivos:
   ```text
   *.log
   *.pid
   servidor-wario.*
