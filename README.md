# Closet Drii

E-commerce da loja **Closet Drii**, com stack Node.js. A plataforma permite
visualizar produtos, gerenciar o carrinho e finalizar pedidos, além de um painel
administrativo para gestão de catálogo e vendas.

> Reescrita da versão anterior (Vanilla JS + Firebase) usando **Node.js + Express + SQL**.
> O frontend é servido pelo próprio Express.

---

## Stack

- **Node.js** + **Express 5** (servidor HTTP e API REST)
- **SQL** (banco relacional — driver/ORM a definir)
- **Frontend** estático servido pelo Express (`public/`)

---

## Estrutura do projeto

Organização em camadas (routes -> controllers -> services -> banco), simples no início
e pronta para evoluir para módulos por domínio conforme o projeto cresce.

```text
ClosetDrii/
├── src/
│   ├── server.js          # cria o app Express, serve o front + /api e sobe o servidor
│   ├── config/
│   │   └── db.js          # ponto único de conexão com o banco (SQL)
│   ├── routes/
│   │   └── index.js       # agrega as rotas de API sob /api
│   ├── controllers/       # recebem a requisição e devolvem a resposta
│   ├── services/          # regra de negócio (conforme necessário)
│   └── middlewares/       # auth, tratamento de erros, etc.
│
├── public/                # frontend servido pelo Express
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── database/
│   └── schema.sql         # schema do banco
│
├── .env                   # segredos (fora do versionamento)
├── .env.example           # template das variáveis de ambiente
└── package.json
```

---


## Banco de dados

O schema fica em `database/schema.sql`. O modelo relacional cobre usuários, endereços,
categorias, produtos, variantes de produto, vendas e itens de venda.

---

## Convenções

- Acesso ao banco isolado em `src/config/db.js` — trocar de driver/ORM afeta só esse ponto.
- Variáveis de ambiente sempre via `.env`, nunca hardcoded.
- Controllers finos: apenas orquestram a requisição e delegam a regra de negócio.
- Controle de acesso (admin) sempre validado no servidor.

---

## Equipe

- Fabricio Onofre
- Jedson Henrique
- Jonathan Araujo
- João Pedro
