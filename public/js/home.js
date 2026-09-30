// Home — interatividade de front-end (client-side).
//
// IMPORTANTE: os produtos em destaque/ofertas NÃO são mais buscados aqui.
// Com a nova stack (Node + Express + Sequelize + Handlebars), o fluxo é server-side:
//
//   1. Rota `/`  ->  home.controller  ->  home.service (consulta via Sequelize/models)
//   2. O controller passa { destaques, ofertas } para a view
//   3. A view `pages/home.handlebars` renderiza os cards no servidor com {{#each}}
//
// Ou seja, o HTML já chega pronto do servidor. Este arquivo fica reservado apenas
// para interações no navegador (ex.: chips de busca rápida, animações, filtros).

document.addEventListener("DOMContentLoaded", () => {
  // TODO: interatividade específica da Home (client-side), se necessário.
});
