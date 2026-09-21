import { database } from "../../utils/firebase-config.js";
import {
  buscarProdutosEstruturados,
  renderizarComponenteCards,
} from "../../utils/product-helpers.js";
import { query } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  await inicializarPaginaHome();
});

async function inicializarPaginaHome() {
  try {
    // 1. Consome a função utilitária global para trazer os dados totalmente mapeados (O(1))
    const todosProdutos = await buscarProdutosEstruturados();

    if (todosProdutos.length === 0) return;

    // 2. LÓGICA DE NEGÓCIO EXCLUSIVA DA HOME: TOP 5 e BOTTOM 5
    // Criamos clones isolados na memória usando o operador spread antes de ordenar
    const top5Destaques = [...todosProdutos]
      .sort((a, b) => b.preco - a.preco)
      .slice(0, 5);

    const bottom5Ofertas = [...todosProdutos]
      .sort((a, b) => a.preco - b.preco)
      .slice(0, 5);

    // 4. Invoca o renderizador genérico do utils passando as listas e os IDs dos containers
    renderizarComponenteCards(top5Destaques, "product-best-seller");
    renderizarComponenteCards(bottom5Ofertas, "product-offer");
  } catch (error) {
    console.error("❌ Erro ao inicializar inteligência da Home:", error);
  }
}

// Mantém a injeção dos chips de busca rápida (Lógica específica da tela Home)
function renderizarChipsCategorias(categorias) {
  const container = document.querySelector(".quick-search");
  if (!container) return;

  container.innerHTML = "";

  categorias.forEach((categoria, index) => {
    const btn = document.createElement("button");
    btn.className = `chip ${index === 0 ? "active" : ""}`;
    btn.textContent = categoria;

    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".quick-search .chip")
        .forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      window.location.href = `../produtos/produtos.html?categoria=${encodeURIComponent(categoria.toLowerCase())}`;
    });

    container.appendChild(btn);
  });
}
