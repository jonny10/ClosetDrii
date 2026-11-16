# Closet Drii

E-commerce da loja **Closet Drii**, reescrito com stack Node.js. A plataforma permite
visualizar produtos, gerenciar o carrinho e finalizar pedidos, além de um painel
administrativo para gestão de catálogo, vendas, contatos e análise de dados.

> Reescrita da versão anterior (Vanilla JS + Firebase) usando **Node.js + Express + Sequelize**,
> com frontend renderizado no servidor via **Handlebars**.

---

## Stack

- **Node.js** + **Express 5** (servidor HTTP e rotas)
- **Handlebars** (`express-handlebars`) — renderização de views no servidor
- **Sequelize** (ORM) + **MySQL** (`mysql2`)
- **Vitest** + **Supertest** + **jsdom** — testes de API, render de páginas e interação no cliente

---

## Infraestrutura e deploy

A aplicação está publicada na Render e utiliza um banco de dados MySQL hospedado na Aiven.

- **Aplicação:** [https://closetdrii.onrender.com](https://closetdrii.onrender.com)
- **Repositório:** [https://github.com/jonny10/ClosetDrii](https://github.com/jonny10/ClosetDrii)
- **Hospedagem da aplicação:** Render (Web Service com Node.js)
- **Hospedagem do banco de dados:** Aiven (MySQL)

### Configuração da Render

| Configuração | Valor |
|---|---|
| Serviço | Web Service |
| Runtime | Node |
| Branch | `main` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Root Directory | Raiz do repositório |

A Render está conectada ao repositório do GitHub. Novos commits enviados para a branch `main` podem iniciar automaticamente um novo deploy.

### Conexão com o banco MySQL

O banco MySQL é hospedado na Aiven, separadamente da aplicação. A aplicação Node.js conecta ao banco utilizando as variáveis de ambiente cadastradas nas configurações do serviço na Render.

Configure na seção **Environment** da Render:

- `DB_HOST` — host fornecido pela Aiven
- `DB_PORT` — porta fornecida pela Aiven
- `DB_USER` — usuário do banco
- `DB_PASSWORD` — senha do banco
- `DB_NAME` — nome do banco (`closetDrii`)
- `SESSION_SECRET` — chave secreta utilizada para as sessões

A porta `PORT` é disponibilizada pela Render para a aplicação. Utilize os dados de conexão apresentados no painel da Aiven. Não coloque senhas ou credenciais diretamente no código ou no repositório.

> **Atenção:** os arquivos enviados pela aplicação (imagens de produto e comprovantes de
> pagamento) são gravados no disco do serviço, na pasta `uploads/`. Na Render o disco é
> **efêmero** — esses arquivos são perdidos a cada deploy/restart. Ainda não há storage
> externo; manter isso em mente ao decidir sobre persistência de imagens.

---

## Estrutura do projeto

Organização em camadas (routes -> controllers -> services -> models), simples no início
e pronta para evoluir para módulos por domínio conforme o projeto cresce.

```text
ClosetDrii/
├── src/
│   ├── server.js            # sobe o servidor HTTP
│   ├── app.js               # cria o app Express: Handlebars, estáticos, rotas, 404/erros
│   ├── config/
│   │   └── database.js      # instância do Sequelize (dialeto via DB_DIALECT, lê do .env)
│   ├── models/              # models Sequelize (index.js agrega e associa)
│   ├── routes/
│   │   ├── index.js         # agrega páginas + API
│   │   ├── pages/           # uma rota por página (home, produtos, perfil, ...)
│   │   └── api/             # uma rota por entidade (produto, venda, usuario, ...)
│   ├── controllers/
│   │   ├── pages/           # controllers de página — falam direto com os models
│   │   └── api/             # controllers da API — usam services
│   ├── services/            # regra de negócio da API (só a API usa)
│   ├── middlewares/         # auth, admin, logger, uploads
│   ├── seed.js              # seed dos mocks (dev offline e testes)
│   └── views/               # templates Handlebars
│       ├── layouts/         # main.handlebars (layout base)
│       ├── partials/        # header, footer, sidebar de conta, componentes
│       └── pages/           # uma view por página
│
├── public/                  # assets estáticos servidos pelo Express
│   ├── css/                 # global/ (compartilhado) + um arquivo por página
│   ├── js/                  # global/ (componentes) + um script por página
│   └── assets/              # imagens, fontes
│
├── tests/                   # suíte vitest
│   ├── api/                 # endpoints (supertest contra o app real)
│   ├── pages/               # render de cada página (proteção + conteúdo do seed)
│   ├── js/                  # interação dos scripts de página (jsdom)
│   ├── setup.js             # DB_DIALECT=sqlite nos testes
│   └── middlewares.test.js  # requireAuth / requireAdmin
│
├── mocks/                   # dados de seed (um JSON por tabela)
├── scripts/
│   └── dev-offline.js       # sobe o app com SQLite em memória + seed (sem MySQL)
├── uploads/                 # imagens e comprovantes enviados (fora do git)
├── database/                # dump SQL versionado (schema, inserts, triggers, views, ...)
├── .env                     # segredos (fora do versionamento)
├── .env.example             # template das variáveis de ambiente
├── .gitignore
└── package.json
```

---

## Como rodar

### Pré-requisitos

- Node.js 18+
- MySQL em execução com o banco `closetDrii`

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com as credenciais do seu MySQL

# 3. Criar e popular o banco (dump versionado no repositório)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS closetDrii;"
mysql -u root -p closetDrii < database/closetDrii.sql
mysql -u root -p closetDrii < database/closetDrii_inserts.sql

# 4. Subir em modo desenvolvimento
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

### Modo offline (sem MySQL)

Para rodar sem um MySQL local, use o modo offline — sobe a aplicação com **SQLite em
memória** e o seed carregado automaticamente:

```bash
npm run dev:offline
```

O banco é recriado a cada restart (normal, é em memória). Logins disponíveis no seed:

| E-mail | Senha | Perfil |
|---|---|---|
| `fabricio@email.com` | `123456` | admin |
| `ana.paula@email.com` | `123456` | cliente |

---

## Scripts

| Comando                  | Descrição                                       |
| ------------------------ | ----------------------------------------------- |
| `npm run dev`            | Sobe o servidor com reload automático (`node --watch`) |
| `npm run dev:offline`    | Sobe com SQLite em memória + seed (sem MySQL)   |
| `npm start`              | Sobe o servidor em modo produção                |
| `npm test`               | Roda a suíte completa (vitest)                  |
| `npm run test:watch`     | Roda a suíte em modo watch                      |

---

## Variáveis de ambiente

Veja `.env.example` para a lista completa. Principais:

| Variável        | Descrição                         |
| --------------- | --------------------------------- |
| `PORT`          | Porta do servidor (padrão 3000)   |
| `DB_HOST`       | Host do banco                     |
| `DB_PORT`       | Porta do banco (padrão 3307)      |
| `DB_USER`       | Usuário do banco                  |
| `DB_PASSWORD`   | Senha do banco                    |
| `DB_NAME`       | Nome do banco                     |
| `SESSION_SECRET`| Segredo das sessões               |

---

## Banco de dados

O modelo relacional cobre usuários, endereços, categorias, produtos, variantes de produto
(com tamanho como FK), vendas, itens de venda, contatos, avaliações e log de vendas.
O schema e os dados iniciais estão versionados em `database/` (`closetDrii.sql`,
`closetDrii_inserts.sql` + selects, triggers, views e procedures).

O schema **não** é gerenciado por migrations no momento: os models do Sequelize apenas
**espelham** as tabelas do dump. Por isso, **não** rode `sequelize.sync({ force: true })`
nem `{ alter: true }` contra o banco populado — isso pode apagar ou alterar dados. A criação
das tabelas é feita importando o dump (ver "Como rodar").

---

## Arquitetura em camadas

Cada requisição percorre uma cadeia com responsabilidades bem definidas:

```text
requisição → middleware → controller → (service) → (model/banco) → view/JSON
```

- **middleware** (`src/middlewares/`): roda antes do controller — log, autenticação,
  autorização de admin, uploads. Deve chamar `next()` para seguir o fluxo.
- **controller de página** (`src/controllers/pages/`): busca os dados direto nos **models**
  e renderiza a view server-side ({{#each}} no Handlebars, sem clonar `<template>` no cliente).
- **controller de API** (`src/controllers/api/`): valida o payload e responde JSON,
  delegando a regra de negócio ao service.
- **service** (`src/services/`): regra de negócio e obtenção de dados da **API**
  (páginas não usam services).
- **view** (`src/views/`): template Handlebars que monta o HTML final.

### Convenção de nomes

Arquivos seguem o sufixo do seu papel, padrão comum em arquitetura em camadas (NestJS/Angular)
e alinhado aos demais repositórios da equipe:

- `*.controller.js` — ex.: `produtos.api.controller.js`, `perfil.controller.js`
- `*.service.js` — ex.: `produto.service.js` (só para a API)
- `*.middleware.js` — ex.: `logger.middleware.js`, `require-admin.middleware.js`
- `*.routes.js` — um arquivo de rotas por página/entidade em `routes/pages` e `routes/api`

> O Express não exige essa nomenclatura (ele é unopinionated); é uma convenção do time
> para deixar o papel de cada arquivo explícito e manter consistência entre os projetos.

### Recarregar x reiniciar (dev)

- Editou **view** (`.handlebars`) ou **CSS/JS** de `public/` → só recarregar o navegador.
- Editou **`.js` do servidor** (`app.js`, controllers, services, rotas, middlewares) →
  reinicie o servidor (o `npm run dev` usa `node --watch` e reinicia sozinho).

---

## Páginas

| Rota            | Proteção      | Descrição                                      |
| --------------- | ------------- | ---------------------------------------------- |
| `/`             | pública       | Vitrine (destaques e ofertas)                  |
| `/produtos`     | pública       | Catálogo com filtros, busca e ordenação        |
| `/cart`         | pública       | Carrinho (localStorage) e checkout             |
| `/about`        | pública       | Sobre a loja                                   |
| `/contact`      | pública       | Formulário de contato                          |
| `/login`        | pública       | Entrar                                         |
| `/signup`       | pública       | Criar conta                                    |
| `/profile`      | autenticado   | Perfil do usuário (dados + foto)               |
| `/historico`    | autenticado   | Pedidos do usuário logado                      |
| `/dados`        | admin         | Dashboard de vendas (KPIs + ranking)           |
| `/catalogo`     | admin         | CRUD de produtos, variantes, categorias e tamanhos |
| `/vendas`       | admin         | Painel de vendas (status + comprovante)        |
| `/contact_adm`  | admin         | Mensagens de contato (marcar como respondida)  |

---

## Endpoints da API

Todas as rotas ficam sob `/api`. Rotas protegidas devolvem 401 JSON sem sessão
(ou 403 para usuário sem perfil de admin).

### Autenticação e usuário

| Método | Rota                  | Proteção | Descrição                              |
| ------ | --------------------- | -------- | -------------------------------------- |
| POST   | `/api/auth/signup`    | pública  | Criar conta (auto-loga no sucesso)     |
| POST   | `/api/auth/login`     | pública  | Entrar (cria a sessão)                 |
| POST   | `/api/auth/logout`    | pública  | Encerrar a sessão (idempotente)        |
| PATCH  | `/api/usuarios/me`    | auth     | Atualizar dados do usuário logado      |

### Catálogo

| Método | Rota                                   | Proteção | Descrição                            |
| ------ | -------------------------------------- | -------- | ------------------------------------ |
| GET    | `/api/produtos`                        | pública  | Listar com filtros (`categoria`, `busca`, `orderBy`, `dir`) |
| GET    | `/api/produtos/:id`                    | pública  | Detalhe com categoria e variantes    |
| GET    | `/api/produtos/:id/variantes`          | pública  | Variantes de um produto              |
| GET    | `/api/categorias`                      | pública  | Listar categorias                    |
| GET    | `/api/categorias/:id`                  | pública  | Categoria por id                     |
| GET    | `/api/tamanhos`                        | pública  | Listar tamanhos (sigla + ordem)      |
| POST   | `/api/admin/produtos`                  | admin    | Criar produto (+ variantes, transacional) |
| PATCH  | `/api/admin/produtos/:id`              | admin    | Atualizar produto                    |
| DELETE | `/api/admin/produtos/:id`              | admin    | Excluir produto (cascata)            |
| POST   | `/api/admin/produtos/:id/variantes`    | admin    | Criar variante (tamanho por sigla)   |
| PATCH  | `/api/admin/variantes/:id`             | admin    | Atualizar variante                   |
| DELETE | `/api/admin/variantes/:id`             | admin    | Excluir variante                     |
| POST   | `/api/admin/produtos/upload-imagem`    | admin    | Upload da imagem (JPG/PNG/WebP, 5MB) → `{ url }` |
| POST   | `/api/admin/categorias`                | admin    | Criar categoria                      |
| PATCH  | `/api/admin/categorias/:id`            | admin    | Atualizar categoria                  |
| DELETE | `/api/admin/categorias/:id`            | admin    | Excluir categoria                    |
| POST   | `/api/admin/tamanhos`                  | admin    | Criar tamanho                        |
| PATCH  | `/api/admin/tamanhos/:id`              | admin    | Atualizar tamanho                    |
| DELETE | `/api/admin/tamanhos/:id`              | admin    | Excluir tamanho                      |

### Checkout e pedidos

| Método | Rota                                     | Proteção | Descrição                           |
| ------ | ---------------------------------------- | -------- | ----------------------------------- |
| POST   | `/api/vendas`                            | auth     | Fechar pedido (valida estoque, transacional) |
| GET    | `/api/vendas/minhas`                     | auth     | Pedidos do usuário logado           |
| GET    | `/api/enderecos`                         | auth     | Endereços do usuário                |
| POST   | `/api/enderecos`                         | auth     | Cadastrar endereço                  |
| GET    | `/api/admin/vendas`                      | admin    | Todas as vendas (cliente + itens)   |
| PATCH  | `/api/admin/vendas/:id/status`           | admin    | Alterar status (pendente/pago/enviado/cancelado) |
| POST   | `/api/admin/vendas/:id/comprovante`      | admin    | Anexar comprovante (upload)         |
| DELETE | `/api/admin/vendas/:id/comprovante`      | admin    | Remover comprovante                 |

### Contatos e dashboard

| Método | Rota                            | Proteção | Descrição                          |
| ------ | ------------------------------- | -------- | ---------------------------------- |
| POST   | `/api/contatos`                 | pública  | Enviar mensagem do formulário      |
| GET    | `/api/admin/contatos`           | admin    | Listar mensagens                   |
| PATCH  | `/api/admin/contatos/:id`       | admin    | Marcar como respondida             |
| GET    | `/api/admin/dashboard`          | admin    | KPIs + ranking (faturamento, pedidos, ticket médio, peças vendidas, top looks) |

> Erros de API seguem o formato `{ "error": "mensagem" }`. Vendas canceladas ficam fora
> das métricas do dashboard.

---

## Testes

A suíte usa **Vitest** e roda completa com `npm test` (~370 testes, sem dependência de MySQL
— os testes usam SQLite em memória com o seed dos mocks).

- `tests/api/` — endpoints: contratos, validações, proteção (401/403) e status codes
- `tests/pages/` — render server-side de cada página: proteção de rota por perfil,
  conteúdo do seed (cards, máscaras, KPIs, empty-states) e 404
- `tests/js/` — interação dos scripts de página no **jsdom**: cliques, submits, fetch,
  localStorage e manipulação de DOM (um arquivo por script)
- `tests/middlewares.test.js` — matriz do `requireAuth`/`requireAdmin`

---

## Convenções

- Acesso ao banco via models do Sequelize; configuração da conexão isolada em `src/config/database.js`.
- Variáveis de ambiente sempre via `.env`, nunca hardcoded.
- Páginas renderizam no servidor: listas via `{{#each}}` no Handlebars, sem clonar `<template>` no cliente; o JS de página só cuida da interatividade (e do refresh via fetch quando existir).
- Controllers de API finos: validam o payload, delegam a regra de negócio e respondem JSON.
- Controle de acesso (admin) sempre validado no servidor — nunca só no cliente.
- Carrinho no `localStorage` (estado de UI): o servidor valida estoque e recalcula preços apenas no checkout (`POST /api/vendas`).
- Preços formatados como `R$ X,XX` (padrão do app, sem separador de milhar).
- Uploads de imagem (produto e comprovante) limitados a 5MB, JPG/PNG/WebP, gravados em `uploads/` (fora do git).

---

## Equipe

- Fabricio Onofre
- Jedson Henrique
- Jonathan Araujo
