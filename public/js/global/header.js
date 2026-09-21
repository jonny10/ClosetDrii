import { auth } from "../../../utils/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

/**
 * Inicializa o Header orquestrando classes ativas, delegação de acessos baseada
 * no Firebase Auth e controle do menu responsivo (hambúrguer).
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

  if (
    caminhoAtual === "/" ||
    caminhoAtual.endsWith("/index.html") ||
    caminhoAtual.includes("/home/")
  ) {
    const homeLink = container.querySelector('.nav-link[href*="home.html"]');
    if (homeLink) homeLink.classList.add("active");
  }

  // 2. Elementos de Controle de Estado e Nível de Acesso (RBAC)
  const userNameSpan = container.querySelector(".user-name");
  const guestElems = container.querySelectorAll('[data-auth="guest"]');
  const userElems = container.querySelectorAll('[data-auth="user"]');

  // Seletores mapeados com base nos novos escopos de páginas (Admin vs Cliente)
  const clientLinks = container.querySelectorAll(
    '.nav-link[data-role="cliente"]',
  );
  const adminLinks = container.querySelectorAll('.nav-link[data-role="admin"]');

  // 3. Observer Assíncrono do Firebase Auth para chaveamento de links do Menu
  onAuthStateChanged(auth, (user) => {
    const isLoggedIn = !!user;

    // Altera blocos de login/logout genéricos
    guestElems.forEach(
      (el) => (el.style.display = isLoggedIn ? "none" : "flex"),
    );
    userElems.forEach(
      (el) => (el.style.display = isLoggedIn ? "flex" : "none"),
    );

    if (isLoggedIn) {
      const loggedUserRaw = localStorage.getItem("loggedUser");

      if (loggedUserRaw) {
        const dadosUsuario = JSON.parse(loggedUserRaw);
        const isAdmin = dadosUsuario.perfil === "admin";

        // Exibe estritamente o menu correspondente ao nível de privilégio
        clientLinks.forEach(
          (el) => (el.style.display = isAdmin ? "none" : "flex"),
        );
        adminLinks.forEach(
          (el) => (el.style.display = isAdmin ? "flex" : "none"),
        );
      }

      if (userNameSpan && user) {
        userNameSpan.textContent = user.displayName || user.email.split("@")[0];
      }
    } else {
      // Fallback de Segurança: Deslogado força a visualização apenas do menu institucional de cliente
      clientLinks.forEach((el) => (el.style.display = "flex"));
      adminLinks.forEach((el) => (el.style.display = "none"));
      if (userNameSpan) userNameSpan.textContent = "Perfil";
    }
  });

  // 4. Controle do Menu Mobile e Interceptação de Cliques Externos
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
