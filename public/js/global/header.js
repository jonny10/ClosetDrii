/**
 * Header — interatividade de front-end.
 *
 * Autenticação/RBAC: a decisão de quais itens do menu exibir
 * (visitante x cliente x admin) agora é feita no SERVIDOR, na view (Handlebars),
 * via `{{#if user}}` / `{{#if user.isAdmin}}`. Este arquivo cuida apenas do
 * comportamento visual: link ativo e menu mobile (hambúrguer).
 */
export function inicializarHeader() {
  const container = document.querySelector(".nav-container");
  if (!container) return;

  const caminhoAtual = window.location.pathname.toLowerCase();
  const linksMenu = container.querySelectorAll(".nav-link");

  // 1. Gerenciamento de Classe Ativa no link corrente do menu
  linksMenu.forEach((link) => {
    const hrefLink = link.getAttribute("href")?.toLowerCase() || "";
    const nomeArquivo = hrefLink.substring(hrefLink.lastIndexOf("/") + 1);
    if (caminhoAtual.includes(nomeArquivo) && nomeArquivo !== "") {
      link.classList.add("active");
    }
  });

  if (caminhoAtual === "/") {
    const homeLink = container.querySelector('.nav-link[href="/"]');
    if (homeLink) homeLink.classList.add("active");
  }

  // 2. Controle do Menu Mobile e Interceptação de Cliques Externos
  const menuToggle = document.getElementById("menuToggle");
  const navMenu = document.getElementById("navMenu");

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      navMenu.classList.toggle("open");
      const icone = menuToggle.querySelector("i");
      if (icone)
        icone.className = navMenu.classList.contains("open")
          ? "fas fa-times"
          : "fas fa-bars";
    });

    container.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
        const icone = menuToggle.querySelector("i");
        if (icone) icone.className = "fas fa-bars";
      });
    });

    document.addEventListener("click", (e) => {
      if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        navMenu.classList.remove("open");
        const icone = menuToggle.querySelector("i");
        if (icone) icone.className = "fas fa-bars";
      }
    });
  }
}

// O header é global (carregado no layout em todas as páginas), então auto-inicializa.
document.addEventListener("DOMContentLoaded", inicializarHeader);
