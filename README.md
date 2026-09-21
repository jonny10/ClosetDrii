# Closet Drii

E-commerce da loja **Closet Drii**, reescrito com stack Node.js. A plataforma permite
visualizar produtos, gerenciar o carrinho e finalizar pedidos, além de um painel
administrativo para gestão de catálogo e vendas.

> Reescrita da versão anterior (Vanilla JS + Firebase) usando **Node.js + Express + Sequelize**,
> com frontend renderizado no servidor via **Handlebars**.

---

## Stack

- **Node.js** + **Express 5** (servidor HTTP e rotas)
- **Handlebars** (`express-handlebars`) — renderização de views no servidor
- **Sequelize** (ORM) + **MySQL** (`mysql2`)

---

## Estrutura do projeto

Organização em camadas (routes -> controllers -> services -> models), simples no início
e pronta para evoluir para módulos por domínio conforme o projeto cresce.

```text
ClosetDrii/
├── src/
│   ├── server.js            # sobe o servidor HTTP
│   ├── app.js               # cria o app Express: Handlebars, estáticos, rotas
│   ├── config/
│   │   └── database.js      # instância do Sequelize (lê do .env)
│   ├── models/              # models Sequelize (index.js agrega e associa)
│   ├── routes/
│   │   └── index.js         # agrega as rotas da aplicação
│   ├── controllers/         # recebem a requisição e renderizam a view / respondem
│   ├── services/            # regra de negócio (conforme necessário)
│   ├── middlewares/         # auth, tratamento de erros, etc.
│   └── views/               # templates Handlebars
│       ├── layouts/
│       │   └── main.handlebars   # layout base
│       ├── partials/        # header, footer, componentes reutilizáveis
│       └── pages/           # home, catalogo, login, ...
│
├── public/                  # assets estáticos servidos pelo Express
│   ├── css/
│   ├── js/                  # JS de cliente (interatividade no browser)
│   └── assets/              # imagens, fontes
│
├── database/
│   ├── migrations/          # migrations do Sequelize
│   ├── seeders/             # dados iniciais (admin, categorias, produtos)
│   └── schema.sql           # schema de referência (modelo relacional)
│
├── .sequelizerc             # aponta os caminhos usados pelo sequelize-cli
├── .env                     # segredos (fora do versionamento)
├── .env.example             # template das variáveis de ambiente
├── .gitignore
└── package.json
```

---

## Como rodar

### Pré-requisitos

- Node.js 18+
- MySQL em execução

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com as credenciais do banco

# 3. Criar o banco e rodar as migrations/seeders
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

# 4. Subir em modo desenvolvimento
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

---

## Scripts

| Comando           | Descrição                             |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Sobe o servidor com reload automático |
| `npm start`       | Sobe o servidor em modo produção      |
| `npm run migrate` | Roda as migrations pendentes          |
| `npm run seed`    | Popula o banco com dados iniciais     |

---

## Variáveis de ambiente

Veja `.env.example` para a lista completa. Principais:

| Variável      | Descrição                       |
| ------------- | ------------------------------- |
| `PORT`        | Porta do servidor (padrão 3000) |
| `DB_HOST`     | Host do banco                   |
| `DB_PORT`     | Porta do banco (padrão 3306)    |
| `DB_USER`     | Usuário do banco                |
| `DB_PASSWORD` | Senha do banco                  |
| `DB_NAME`     | Nome do banco                   |

---

## Banco de dados

O modelo relacional cobre usuários, endereços, categorias, produtos, variantes de produto,
vendas e itens de venda. A evolução do schema é feita por **migrations** do Sequelize
(`database/migrations/`); o `schema.sql` serve como referência do modelo.

---

## Arquitetura em camadas

Cada requisição percorre uma cadeia com responsabilidades bem definidas:

```text
requisição → middleware → controller → service → (model/banco) → view
```

- **middleware** (`src/middlewares/`): roda antes do controller — log, autenticação,
  validação. Deve chamar `next()` para seguir o fluxo.
- **controller** (`src/controllers/`): recebe `req`/`res`, chama o service e renderiza a
  view. Fino, sem regra de negócio.
- **service** (`src/services/`): regra de negócio e obtenção de dados (via models Sequelize).
- **view** (`src/views/`): template Handlebars que monta o HTML final.

### Convenção de nomes

Arquivos seguem o sufixo do seu papel, padrão comum em arquitetura em camadas (NestJS/Angular)
e alinhado aos demais repositórios da equipe:

- `*.controller.js` — ex.: `home.controller.js`
- `*.service.js` — ex.: `home.service.js`
- `*.middleware.js` — ex.: `logger.middleware.js`

> O Express não exige essa nomenclatura (ele é unopinionated); é uma convenção do time
> para deixar o papel de cada arquivo explícito e manter consistência entre os projetos.

### Recarregar x reiniciar (dev)

- Editou **view** (`.handlebars`) ou **CSS/JS** de `public/` → só recarregar o navegador.
- Editou **`.js` do servidor** (`app.js`, controllers, services, rotas, middlewares) →
  reinicie o servidor (ou rode com `node --watch src/server.js`, que reinicia sozinho).

---

## Convenções

- Acesso ao banco via models do Sequelize; configuração da conexão isolada em `src/config/database.js`.
- Variáveis de ambiente sempre via `.env`, nunca hardcoded.
- Controllers finos: orquestram a requisição, delegam a regra de negócio e renderizam a view.
- Views em Handlebars: layout base em `layouts/main.handlebars`, trechos reutilizáveis em `partials/`.
- Controle de acesso (admin) sempre validado no servidor.

---

## Equipe

- Fabricio Onofre
- Jedson Henrique
- Jonathan Araujo
