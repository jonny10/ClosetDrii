import { openProductModal } from "/js/global/product-modal.js";
import { showSnackbar } from "/js/global/snackbar.js";

// Catálogo (produtos) — os cards e os checkboxes de categoria são renderizados
// no SERVIDOR (Handlebars). Aqui fica o motor de filtros/ordenação: mostra/esconde
// e reordena os cards já no DOM (sem <template>) e sincroniza a query string
// (?busca=&categoria=&orderBy=&dir=&tamanho=). O modal de detalhe faz fetch
// on-click com cache — mesmo padrão da home.

let buscaDebounceTimer;
const cacheProduto = new Map();

document.addEventListener("DOMContentLoaded", () => {
  configurarCliquesNosCards();
  inicializarOuvintesFiltros();
  aplicarFiltrosIniciaisDaURL();
  aplicarFiltrosEOrdenacao();
});

// Abre o modal de detalhe ao clicar no card (fetch + cache, padrão da home)
function configurarCliquesNosCards() {
  document.querySelectorAll(".product-card-component").forEach((card) => {
    const id = Number(card.dataset.id);
    if (!id) return;
    card.addEventListener("click", () => abrirProduto(id));
  });
}

async function abrirProduto(id) {
  if (cacheProduto.has(id)) {
    openProductModal(cacheProduto.get(id));
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

    cacheProduto.set(id, produto);
    openProductModal(produto);
  } catch (err) {
    console.error("Erro ao abrir produto:", err);
    showSnackbar("Erro ao carregar o produto.", "error");
  }
}

function obterCards() {
  return [...document.querySelectorAll("#product-catalog-grid .product-card-component")];
}

// MOTOR DE FILTRAGEM E ORDENAÇÃO (sobre os cards server-rendered)
function aplicarFiltrosEOrdenacao() {
  const cards = obterCards();
  const activeFilters = [];

  // 1. Busca por texto (nome + descricao, via data-busca)
  const termoBusca = document.getElementById("search-input")?.value.trim().toLowerCase() || "";

  // 2. Categorias selecionadas (multi-seleção; "Todos" desmarca as demais)
  const checkTodos = document.getElementById("check-todos-categorias");
  const categoriasSelecionadas = checkTodos?.checked
    ? []
    : [...document.querySelectorAll(".category-checkbox:checked")].map((cb) => cb.dataset.name);

  // 3. Preço máximo (slider)
  const sliderPreco = document.getElementById("price-slider");
  const precoMaximo = sliderPreco ? Number(sliderPreco.value) : 500;
  if (sliderPreco) {
    const txtPreco = document.getElementById("price-value");
    if (txtPreco) txtPreco.textContent = `Até R$ ${precoMaximo.toFixed(2).replace(".", ",")}`;
  }

  // 4. Tamanhos ativos nos chips
  const tamanhosAtivos = [...document.querySelectorAll(".size-chip.active")].map((chip) =>
    chip.textContent.trim(),
  );

  cards.forEach((card) => {
    let visivel = true;

    if (visivel && termoBusca && !card.dataset.busca.includes(termoBusca)) visivel = false;

    if (visivel && categoriasSelecionadas.length > 0) {
      const categoriaCard = (card.dataset.categoria || "").toLowerCase();
      if (!categoriasSelecionadas.includes(categoriaCard)) visivel = false;
    }

    if (visivel && precoMaximo < 500 && Number(card.dataset.preco) > precoMaximo) {
      visivel = false;
    }

    if (visivel && tamanhosAtivos.length > 0) {
      const tamanhosCard = (card.dataset.tamanhos || "").split(",");
      if (!tamanhosAtivos.some((t) => tamanhosCard.includes(t))) visivel = false;
    }

    card.style.display = visivel ? "" : "none";
  });

  // 5. Ordenação (preço); novidades/mais vendidos mantêm a ordem do servidor
  const ordenacao = document.getElementById("sort-select")?.value;
  const grid = document.getElementById("product-catalog-grid");
  if ((ordenacao === "price-asc" || ordenacao === "price-desc") && grid) {
    const fator = ordenacao === "price-asc" ? 1 : -1;
    [...cards]
      .sort((a, b) => fator * (Number(a.dataset.preco) - Number(b.dataset.preco)))
      .forEach((card) => grid.appendChild(card));
  }

  // 6. Contador + badges + estado vazio + query string
  const visiveis = cards.filter((card) => card.style.display !== "none");

  const contador = document.getElementById("products-count-txt");
  if (contador) contador.textContent = String(visiveis.length);

  if (termoBusca) activeFilters.push({ type: "text", label: `Busca: "${termoBusca}"` });
  categoriasSelecionadas.forEach((cat) => activeFilters.push({ type: "category", label: cat }));
  if (precoMaximo < 500) activeFilters.push({ type: "price", label: `Até R$ ${precoMaximo}` });
  tamanhosAtivos.forEach((tam) => activeFilters.push({ type: "size", label: `Tam: ${tam}`, rawValue: tam }));

  atualizarAreaBadgesFiltros(activeFilters);
  atualizarEstadoVazio(visiveis.length);
  sincronizarURL({ termoBusca, categoriasSelecionadas, ordenacao, tamanhosAtivos });
}

// Estado vazio: injeta/remove a mensagem dentro do grid (classe estilizada no produtos.css)
function atualizarEstadoVazio(total) {
  const grid = document.getElementById("product-catalog-grid");
  if (!grid) return;

  let mensagem = grid.querySelector(".no-products");
  if (total === 0) {
    if (!mensagem) {
      mensagem = document.createElement("p");
      mensagem.className = "no-products";
      mensagem.textContent = "Nenhum look encontrado para os filtros selecionados.";
      grid.appendChild(mensagem);
    }
  } else if (mensagem) {
    mensagem.remove();
  }
}

// Mantém a query string refletindo os filtros ativos (voltar/avançar preserva o estado)
function sincronizarURL({ termoBusca, categoriasSelecionadas, ordenacao, tamanhosAtivos }) {
  const params = new URLSearchParams();

  if (termoBusca) params.set("busca", termoBusca);
  if (categoriasSelecionadas.length === 1) params.set("categoria", categoriasSelecionadas[0]);
  if (ordenacao === "price-asc") {
    params.set("orderBy", "preco");
    params.set("dir", "asc");
  } else if (ordenacao === "price-desc") {
    params.set("orderBy", "preco");
    params.set("dir", "desc");
  }
  if (tamanhosAtivos.length > 0) params.set("tamanho", tamanhosAtivos.join(","));

  const query = params.toString();
  const novaURL = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", novaURL);
}

// Lê filtros vindos de links (ex.: chips de categoria da home → /produtos?categoria=vestidos)
function aplicarFiltrosIniciaisDaURL() {
  const params = new URLSearchParams(window.location.search);

  const catParam = params.get("categoria")?.toLowerCase();
  if (catParam) {
    const checkTodos = document.getElementById("check-todos-categorias");
    if (checkTodos) checkTodos.checked = false;

    const alvo = document.querySelector(`.category-checkbox[data-name="${catParam}"]`);
    if (alvo) alvo.checked = true;
  }

  const buscaParam = params.get("busca");
  if (buscaParam) {
    const input = document.getElementById("search-input");
    if (input) input.value = buscaParam;
  }

  const orderBy = params.get("orderBy");
  const dir = params.get("dir");
  const select = document.getElementById("sort-select");
  if (select && orderBy === "preco") {
    select.value = dir === "asc" ? "price-asc" : "price-desc";
  }
}

function inicializarOuvintesFiltros() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(buscaDebounceTimer);
      buscaDebounceTimer = setTimeout(() => aplicarFiltrosEOrdenacao(), 300);
    });
  }

  const sliderPreco = document.getElementById("price-slider");
  if (sliderPreco) sliderPreco.addEventListener("input", () => aplicarFiltrosEOrdenacao());

  const checkTodos = document.getElementById("check-todos-categorias");
  if (checkTodos) {
    checkTodos.addEventListener("change", () => {
      if (checkTodos.checked) {
        document.querySelectorAll(".category-checkbox").forEach((cb) => (cb.checked = false));
      }
      aplicarFiltrosEOrdenacao();
    });
  }

  const listaCategorias = document.getElementById("categories-filter-list");
  if (listaCategorias) {
    listaCategorias.addEventListener("change", (e) => {
      if (!e.target.classList.contains("category-checkbox")) return;
      if (e.target.checked && checkTodos) checkTodos.checked = false;
      aplicarFiltrosEOrdenacao();
    });
  }

  document.querySelectorAll(".size-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      aplicarFiltrosEOrdenacao();
    });
  });

  const selectOrdenacao = document.getElementById("sort-select");
  if (selectOrdenacao) selectOrdenacao.addEventListener("change", () => aplicarFiltrosEOrdenacao());

  const btnClearAll = document.getElementById("btn-clear-all-filters");
  if (btnClearAll) btnClearAll.addEventListener("click", resetarTodosOsFiltros);
}

function atualizarAreaBadgesFiltros(filtros) {
  const containerWrapper = document.getElementById("applied-filters-container");
  const badgesList = document.getElementById("filters-badges-list");

  if (!containerWrapper || !badgesList) return;

  if (filtros.length === 0) {
    containerWrapper.style.display = "none";
    return;
  }

  containerWrapper.style.display = "flex";
  badgesList.innerHTML = "";

  filtros.forEach((filtro) => {
    const badge = document.createElement("span");
    badge.className = "filter-badge-item";
    badge.innerHTML = `${filtro.label} <i class="fas fa-times-circle"></i>`;

    badge.querySelector("i").addEventListener("click", () => {
      removerFiltroIndividual(filtro);
    });

    badgesList.appendChild(badge);
  });
}

function removerFiltroIndividual(filtro) {
  if (filtro.type === "text") {
    const input = document.getElementById("search-input");
    if (input) input.value = "";
  } else if (filtro.type === "category") {
    const alvo = document.querySelector(`.category-checkbox[data-name="${filtro.label.toLowerCase()}"]`);
    if (alvo) alvo.checked = false;

    const aindaTemSelecionado = [...document.querySelectorAll(".category-checkbox")].some(
      (cb) => cb.checked,
    );
    if (!aindaTemSelecionado) {
      const checkTodos = document.getElementById("check-todos-categorias");
      if (checkTodos) checkTodos.checked = true;
    }
  } else if (filtro.type === "price") {
    const slider = document.getElementById("price-slider");
    if (slider) slider.value = 500;
  } else if (filtro.type === "size") {
    const chip = [...document.querySelectorAll(".size-chip")].find(
      (c) => c.textContent.trim() === filtro.rawValue,
    );
    if (chip) chip.classList.remove("active");
  }

  aplicarFiltrosEOrdenacao();
}

function resetarTodosOsFiltros() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";

  const slider = document.getElementById("price-slider");
  if (slider) slider.value = 500;

  const checkTodos = document.getElementById("check-todos-categorias");
  if (checkTodos) checkTodos.checked = true;

  document.querySelectorAll(".category-checkbox").forEach((cb) => (cb.checked = false));
  document.querySelectorAll(".size-chip").forEach((c) => c.classList.remove("active"));

  const select = document.getElementById("sort-select");
  if (select) select.value = "news";

  aplicarFiltrosEOrdenacao();
}
