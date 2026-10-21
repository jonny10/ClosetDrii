import { openProductModal } from "/js/global/product-modal.js";
import { showSnackbar } from "/js/global/snackbar.js";

// Home — cards renderizados no servidor (Handlebars).
// No clique, buscamos o produto completo na API (GET /api/produtos/:id) e abrimos o modal.
// Cache simples: cada produto é buscado uma única vez por sessão de página.

const cache = new Map();

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".product-card-component").forEach((card) => {
    const id = Number(card.dataset.id);
    if (!id) return;

    card.addEventListener("click", () => abrirProduto(id));
  });
});

async function abrirProduto(id) {
  if (cache.has(id)) {
    openProductModal(cache.get(id));
    return;
  }

  try {
    const resp = await fetch(`/api/produtos/${id}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();

    const produto = {
      ...data,
      categoria: data.categoria ? data.categoria.nome : null,
    };

    cache.set(id, produto);
    openProductModal(produto);
  } catch (err) {
    console.error("Erro ao abrir produto:", err);
    showSnackbar("Erro ao carregar o produto.", "error");
  }
}
