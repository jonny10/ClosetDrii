/**
 * Header — interatividade de front-end.
 *
 * Autenticação/RBAC: a decisão de quais itens do menu exibir
 * (visitante x cliente x admin) é feita no SERVIDOR, na view (Handlebars),
 * via {{#unless user}} / {{#if user}} / {{#if isAdmin}}. Este arquivo cuida do
 * comportamento visual (link ativo, menu mobile) e do botão Sair (logout).
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

  // 2. Logout: destrói a sessão no servidor e volta pra home
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (err) {
        console.error("Erro ao sair:", err);
      }
      window.location.href = "/";
    });
  }

  // 3. Controle do Menu Mobile e Interceptação de Cliques Externos
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
