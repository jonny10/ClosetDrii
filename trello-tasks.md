# ClosetDrii — Mapeamento de Tasks para o Trello

> Migração: `closet-drii-web` (Vanilla JS + Firebase Auth/Firestore/Hosting) → **ClosetDrii** (Node.js + Express 5 + EJS + endpoints internos).
> Foco da primeira fase: **endpoints internos para buscar dados**, com frontend servido pelo próprio Express.
> Fora de escopo: banco de dados SQL (schema/views/triggers/procedures) — foi feito para outra matéria.
>
> **Como usar:** cada seção abaixo = uma lista (coluna) do Trello. Cada item = um card com título + descrição do que precisa ser feito. A ordem dentro de cada lista é a ordem sugerida de execução.

---



## Lista 1 — Setup e Fundação



### T01 — Instalar dependências do projeto

Instalar no `ClosetDrii` as dependências do novo stack: `express` (já existe), `ejs`, driver/ORM do banco relacional, `dotenv`, `express-session`, `bcrypt`, `multer` (upload de comprovante) e `nodemon` como devDependency.

### T02 — Configurar EJS como view engine

Registrar o EJS no app Express (`app.set("view engine", "ejs")`), criar a pasta `views/` e configurar o diretório de views para o padrão de partials + páginas.

### T03 — Criar .env e .env.example

Criar os arquivos de variáveis de ambiente (porta, credenciais do banco, segredo de sessão). Garantir que `.env` nunca entre no versionamento.

### T04 — Finalizar estrutura de pastas

Ajustar a árvore do projeto conforme o README: `src/routes`, `src/controllers`, `src/services`, `src/middlewares`, `views/` e `public/` (css, js, assets). Criar os diretórios que ainda não existem.

### T05 — Camada de acesso a dados (src/config/db.js)

Implementar a conexão/pool centralizada com o banco em `db.js` (hoje o arquivo está vazio). Trocar de driver/ORM deve afetar só esse ponto, conforme convenção do README.

### T06 — Scripts npm (dev e start)

Criar script `dev` com nodemon e script `start` de produção no `package.json`, removendo o placeholder `test`.

### T07 — Middleware de tratamento de erros centralizado

Criar handler de erros: respostas JSON padronizadas para rotas `/api/*` e página de erro para as views.

### T08 — Tratamento de 404 (API e páginas)

Rotas `/api/*` inexistentes retornam JSON 404; demais rotas caem na página 404 renderizada em EJS.

---



## Lista 2 — API: Endpoints de dados (fase 1 — buscar dados)



### T09 — GET /api/produtos (listagem estruturada)

Portar a lógica de `buscarProdutosEstruturados()` do `product-helpers.js` para um endpoint: devolver produtos com categoria e variantes mescladas. Suportar query params de filtro por categoria, busca por nome e ordenação por preço (usados hoje no catálogo).

### T10 — GET /api/produtos/:id (detalhe)

Retornar um produto específico com sua categoria e lista de variantes (cor, tamanho, estoque, imagem).

### T11 — GET /api/categorias

Retornar a lista de categorias (usada nos filtros do catálogo e menus). Hoje vem de `getDocs(collection("categorias"))`.

### T12 — GET /api/produtos/:id/variantes

Retornar apenas as variantes de um produto, com estoque disponível (base para o modal de produto e adição ao carrinho).

---



## Lista 3 — API: Autenticação (substitui o Firebase Auth)



### T13 — POST /api/auth/signup

Criar usuário cliente: validar campos obrigatórios, email único e gravar senha com hash (bcrypt). Portar as validações do `signup.js` para o servidor.

### T14 — POST /api/auth/login

Autenticar email + senha, criar a sessão e devolver os dados do usuário (nome, perfil `cliente`/`admin`). Substitui o `signInWithEmailAndPassword` + busca no Firestore do `login.js`.

### T15 — POST /api/auth/logout

Destruir a sessão do usuário.

### T16 — GET /api/auth/me

Retornar o usuário logado a partir da sessão do servidor (substitui o `localStorage "loggedUser"`).

### T17 — Middleware de autenticação (requireAuth)

Portar o comportamento de `protegerRota()` do `auth-helpers.js` para o servidor: sem sessão válida, bloquear a rota (JSON 401 para API, redirect para /login nas views).

### T18 — Middleware de autorização admin (requireAdmin)

Validar `perfil === "admin"` **no servidor** — hoje essa checagem é feita só no JS do cliente (`vendas.js`, `contact_adm.js`), o que é inseguro.

---



## Lista 4 — API: Carrinho, Checkout e Pedidos



### T19 — Decidir estratégia do carrinho

Decidir e documentar se o carrinho continua no `localStorage` (como hoje) ou passa para a sessão do servidor. Manter a regra atual de dedupe por variante e acúmulo de quantidade.

### T20 — POST /api/vendas (fechar pedido)

Criar a venda a partir dos itens do carrinho: validar estoque de cada variante, calcular valor total, gravar venda com status inicial `pendente` e dar baixa no estoque.

### T21 — POST /api/vendas/:id/comprovante (upload)

Endpoint com `multer` para upload da imagem do comprovante de pagamento e vínculo com a venda (fluxo de checkout atual envia comprovante).

### T22 — GET /api/vendas/minhas (histórico do cliente)

Listar as vendas do usuário logado com seus itens — base para a página `historico`.

### T23 — GET e POST /api/enderecos (checkout)

Listar e cadastrar endereços de entrega do usuário — base para a página `dados` (checkout).

---



## Lista 5 — API: Administração



### T24 — GET /api/admin/vendas

Painel de vendas: listar vendas com cliente e itens (hoje é o cruzamento manual de 4 coleções no `inicializarDadosPainel()` do `vendas.js`).

### T25 — PATCH /api/admin/vendas/:id/status

Atualizar o status da venda (`pendente` → `pago`/`enviado`/`cancelado`) — substitui o `updateDoc` do `vendas.js`.

### T26 — GET /api/admin/contatos e PATCH /api/admin/contatos/:id

Listar mensagens do formulário de contato e marcar como respondida — substitui a leitura/update do Firestore no `contact_adm.js`.

### T27 — POST /api/contatos (formulário público)

Gravar mensagem enviada pelo formulário de contato (hoje vai direto para a coleção `contatos` do Firestore).

### T28 — CRUD /api/admin/produtos e variantes

Criar, editar e excluir produtos e variantes (hoje o front só consome; não há tela de cadastro — endpoint fica pronto para quando a tela existir).

### T29 — CRUD /api/admin/categorias

Gerenciar categorias do catálogo.

---



## Lista 6 — Frontend EJS: base



### T30 — Converter páginas .html em views EJS

Migrar as páginas estáticas do projeto antigo para `.ejs` dentro de `views/`, usando layout compartilhado e partials em vez de páginas duplicadas.

### T31 — Partials: header com usuário logado

Portar `header.html`/`header.js` para partial EJS usando a sessão do servidor: exibir nome do usuário, link condicional de admin e logout (substitui a leitura de `loggedUser` do localStorage).

### T32 — Partials: footer, snackbar e product-modal

Portar os componentes compartilhados (`footer`, `snackbar`, `product-modal`) para partials, mantendo o mesmo CSS/JS de comportamento (ex.: snackbar de sucesso/erro).

### T33 — Mover CSS para public/css

Copiar `global.css` e os CSS de cada página para `public/css`, corrigindo caminhos de assets e removendo duplicação entre páginas.

### T34 — Mover imagens para public/assets

Copiar os assets de `src/assets/img` para `public/assets` e ajustar as referências nas views (logo, imagem padrão de produto).

### *T35* — Rotas de renderização das páginas

Criar as rotas GET que renderizam as views: `/login`, `/signup`, `/home`, `/catalogo`, `/produtos`, `/carrinho`, `/dados`, `/historico`, `/perfil`, `/contato`, `/admin/vendas`, `/admin/contatos`, `/sobre`. Páginas com dados renderizam no servidor com EJS (sem esperar fetch no load).

### T36 — Substituir navegação .html por rotas Express

Trocar todos os `window.location.href`/links que apontam para `.html` por URLs das rotas novas (ex.: redirect do index e do login apontavam para `./src/pages/...`).

### T37 — Remover ES modules e imports de CDN

Os scripts de página deixam de ser `type="module"` com imports do gstatic; viram arquivos servidos pelo Express em `public/js`, e as chamadas de dados passam a ser `fetch()` nos endpoints internos.

---



## Lista 7 — Frontend EJS: páginas (1 card por página)



### T38 — Página: Login

Formulário EJS → `POST /api/auth/login`; em erro, mostrar snackbar; em sucesso, redirecionar por perfil (admin → painel de vendas, cliente → home). Portar `login.js` removendo Firebase.

### T39 — Página: Cadastro (signup)

Formulário EJS → `POST /api/auth/signup` com validações no cliente e no servidor; sucesso → login automático ou redirect para /login.

### T40 — Página: Home

Vitrine da loja renderizada no servidor com produtos em destaque via `GET /api/produtos`.

### T41 — Página: Catálogo

Portar os filtros do `catalogo.js` (checkboxes de categoria, busca com debounce, ordenação e filtros via query string da URL). Dados via endpoint interno.

### T42 — Página: Produtos

Grid de cards com modal de produto e botão de adicionar ao carrinho — portar `renderizarComponenteCards()` e o modal para o novo fluxo (fetch + template EJS/JS).

### T43 — Página: Carrinho

Portar `cart.js`: carrinho no localStorage com dedupe por variante, controle de quantidade, total e botão de finalizar → `/dados`.

### T44 — Página: Dados (checkout)

Formulário de dados de entrega e resumo do pedido — portar `dados.js`; salvar endereço via `POST /api/enderecos` e finalizar com `POST /api/vendas` + upload de comprovante.

### T45 — Página: Histórico

Listar pedidos do cliente logado via `GET /api/vendas/minhas` — portar `historico.js`.

### T46 — Página: Perfil

Exibir e permitir editar os dados do usuário logado (novo endpoint PATCH em `/api/usuarios/me`) — portar `profile.js`.

### T47 — Página: Contato

Formulário → `POST /api/contatos` com feedback de envio — portar `contact.js`.

### T48 — Página: Contato (admin)

Listar mensagens e marcar como respondida usando `GET/PATCH /api/admin/contatos` — portar `contact_adm.js` com a checagem de admin agora no servidor.

### T49 — Página: Vendas (admin)

Painel de vendas com filtros por status e ação de mudança de status via `GET/PATCH /api/admin/vendas` — portar `vendas.js`.

### T50 — Páginas: Sobre e 404

Converter as páginas estáticas `about` e `404` para EJS; a 404 passa a ser usada também no fallback de rota do Express.

---



## Lista 8 — Remoção do Firebase



### T51 — Remover imports e SDK do Firebase

Limpar o `index.html` antigo (scripts `/__/firebase/*`), excluir `firebase-config.js` e todos os imports de CDN (gstatic) dos JS de página.

### T52 — Remover arquivos de infraestrutura Firebase

Remover/ignorar `firebase.json`, `.firebaserc` e `storage.rules` do novo projeto; o hosting deixa de ser Firebase e passa a ser o próprio Node.

### T53 — Migrar sessão para o servidor

Eliminar o padrão `localStorage "loggedUser"` e o `protegerRota()` do cliente; sessão passa a ser única fonte de verdade via `GET /api/auth/me` + middlewares.

### T54 — Remover emuladores do fluxo de dev

O ambiente de desenvolvimento deixa de depender de emuladores de Auth/Firestore/Storage; rodar passa a ser apenas `npm run dev` (+ banco).

---



## Lista 9 — Qualidade, testes e documentação



### T55 — Validação de payloads nas rotas de escrita

Validar entradas em todos os POST/PATCH (campos obrigatórios, tipos, tamanhos) — manualmente ou com biblioteca de validação.

### T56 — Teste manual do fluxo ponta a ponta

Roteiro completo: cadastro → login → catálogo (filtros/busca) → carrinho → checkout com comprovante → pedido no histórico → admin altera status.

### T57 — Testar proteção das rotas

Validar que rotas admin respondem 403/redirect para usuário comum ou deslogado, e que `/api/*` protegidas retornam 401 sem sessão.

### T58 — Atualizar README

Documentar o stack final, a estrutura real do projeto, a lista de endpoints e o passo a passo para rodar em dev.

### T59 — .gitignore

Garantir `node_modules/`, `.env` e `uploads/` (comprovantes) fora do versionamento.

### T60 — (Opcional) ESLint/Prettier

Padronizar estilo do código novo.

---



## Lista 10 — Deploy e infra (fase final)



### T61 — Deploy do Express

Escolher o host (Railway, Render, VPS, etc.), configurar o build/start e publicar o projeto — substitui o deploy do Firebase Hosting.

### T62 — Ambiente de produção

Configurar variáveis de ambiente de produção, HTTPS/domínio e verificação do fluxo completo no ambiente publicado.

---



## Resumo

- **62 tasks** em **10 listas**
- Ordem sugerida de execução: Lista 1 → Lista 2 (endpoints de busca de dados, prioridade da fase 1) → Lista 3 (auth) → Lista 4 e 5 (checkout/admin) → Lista 6 e 7 (EJS) → Lista 8 (remover Firebase) → Lista 9 → Lista 10
- Sugestão de labels no Trello: `setup`, `api`, `auth`, `checkout`, `admin`, `ejs`, `firebase-removal`, `qa`, `deploy`

