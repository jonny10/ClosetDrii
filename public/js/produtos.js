import { showSnackbar } from "/js/global/snackbar.js";

// Catálogo (produtos) — motor de filtros/ordenação no cliente.
//
// Os dados (produtos e categorias) agora vêm do back-end (Node/Express + Sequelize).
// TODO (nova stack): carregar `produtos` e as categorias do servidor
//   (renderizados via Handlebars OU por uma API: GET /produtos, GET /categorias).
// A renderização dos cards também deve ser server-side ({{#each}}) ou por um
// renderizador de front dedicado — ver `renderizarComponenteCards` abaixo.

// Estados globais em memória para filtragem dinâmica
let produtos = [];
let buscaDebounceTimer;

document.addEventListener("DOMContentLoaded", async () => {
  // TODO (nova stack): popular `produtos` e `listaCategorias` a partir do back-end.
  const listaCategorias = [];
  produtos = [];

  renderizarCheckboxesCategorias(listaCategorias);
  inicializarOuvintesFiltros();
  checarFiltrosIniciaisURL();
  aplicarFiltrosEOrdenacao();
});

// Placeholder de renderização (antes vinha do util com Firebase).
// TODO (nova stack): renderizar os cards no servidor (Handlebars {{#each}})
// ou implementar aqui um renderizador de front puro.
function renderizarComponenteCards(lista, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  console.log(`Renderizar ${lista.length} produto(s) em #${containerId} (pendente).`);
}

// Injeta os inputs de categoria
function renderizarCheckboxesCategorias(lista) {
  const container = document.getElementById("categories-filter-list");
  if (!container) return;

  lista.forEach((categoria) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <label>
        <input type="checkbox" class="category-checkbox" data-name="${categoria.toLowerCase()}" />
        ${categoria}
      </label>
    `;
    container.appendChild(li);
  });
}

// Intercepta parâmetros vindos de redirecionamentos (ex.: chips de categoria da Home)
function checarFiltrosIniciaisURL() {
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get("categoria");

  if (catParam) {
    const checkTodos = document.getElementById("check-todos-categorias");
    if (checkTodos) checkTodos.checked = false;

    setTimeout(() => {
      const targetCheckbox = document.querySelector(
        `.category-checkbox[data-name="${catParam.toLowerCase()}"]`,
      );
      if (targetCheckbox) {
        targetCheckbox.checked = true;
        aplicarFiltrosEOrdenacao();
      }
    }, 50);
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
  if (sliderPreco) {
    sliderPreco.addEventListener("input", () => aplicarFiltrosEOrdenacao());
  }

  const checkTodos = document.getElementById("check-todos-categorias");
  if (checkTodos) {
    checkTodos.addEventListener("change", () => {
      if (checkTodos.checked) {
        document
          .querySelectorAll(".category-checkbox")
          .forEach((cb) => (cb.checked = false));
      }
      aplicarFiltrosEOrdenacao();
    });
  }

  const catListContainer = document.getElementById("categories-filter-list");
  if (catListContainer) {
    catListContainer.addEventListener("change", (e) => {
      if (e.target.classList.contains("category-checkbox")) {
        if (e.target.checked && checkTodos) checkTodos.checked = false;
        aplicarFiltrosEOrdenacao();
      }
    });
  }

  const chipsTamanho = document.querySelectorAll(".size-chip");
  chipsTamanho.forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      aplicarFiltrosEOrdenacao();
    });
  });

  const selectOrdenacao = document.getElementById("sort-select");
  if (selectOrdenacao) {
    selectOrdenacao.addEventListener("change", () => aplicarFiltrosEOrdenacao());
  }

  const btnClearAll = document.getElementById("btn-clear-all-filters");
  if (btnClearAll) {
    btnClearAll.addEventListener("click", resetarTodosOsFiltros);
  }
}

// MOTOR DE FILTRAGEM E ORDENAÇÃO EM MEMÓRIA
function aplicarFiltrosEOrdenacao() {
  let resultado = [...produtos];
  const activeFilters = [];

  // 1. Filtro por texto
  const searchInput = document.getElementById("search-input");
  const termoBusca = searchInput?.value.trim().toLowerCase();
  if (termoBusca) {
    resultado = resultado.filter(
      (p) =>
        p.nome.toLowerCase().includes(termoBusca) ||
        p.descricao.toLowerCase().includes(termoBusca),
    );
    activeFilters.push({ type: "text", label: `Busca: "${termoBusca}"` });
  }

  // 2. Filtro por categorias (multi-seleção)
  const checkTodos = document.getElementById("check-todos-categorias");
  const catCheckboxes = document.querySelectorAll(".category-checkbox");

  if (checkTodos && !checkTodos.checked) {
    const selecionadas = Array.from(catCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.parentElement.textContent.trim());

    if (selecionadas.length > 0) {
      resultado = resultado.filter((p) =>
        selecionadas
          .map((s) => s.toLowerCase())
          .includes(p.categoria.toLowerCase()),
      );
      selecionadas.forEach((cat) =>
        activeFilters.push({ type: "category", label: cat }),
      );
    } else if (!termoBusca) {
      resultado = [];
    }
  }

  // 3. Filtro por preço
  const sliderPreco = document.getElementById("price-slider");
  const txtPrecoValue = document.getElementById("price-value");
  if (sliderPreco) {
    const precoMaximo = Number(sliderPreco.value);
    if (txtPrecoValue)
      txtPrecoValue.textContent = `Até R$ ${precoMaximo.toFixed(2).replace(".", ",")}`;

    if (precoMaximo < 500) {
      resultado = resultado.filter((p) => p.preco <= precoMaximo);
      activeFilters.push({ type: "price", label: `Até R$ ${precoMaximo}` });
    }
  }

  // 4. Filtro por tamanhos (multi-seleção; nenhum = todos valem)
  const chipsAtivos = document.querySelectorAll(".size-chip.active");
  if (chipsAtivos.length > 0) {
    const tamanhosSelecionados = Array.from(chipsAtivos).map((chip) =>
      chip.textContent.trim(),
    );

    resultado = resultado.filter((produto) =>
      produto.variantes.some((variante) =>
        tamanhosSelecionados.includes(variante.tamanho),
      ),
    );

    tamanhosSelecionados.forEach((tam) => {
      activeFilters.push({ type: "size", label: `Tam: ${tam}`, rawValue: tam });
    });
  }

  // 5. Ordenação por preço
  const selectOrdenacao = document.getElementById("sort-select");
  if (selectOrdenacao) {
    switch (selectOrdenacao.value) {
      case "price-asc":
        resultado.sort((a, b) => a.preco - b.preco);
        break;
      case "price-desc":
        resultado.sort((a, b) => b.preco - a.preco);
        break;
    }
  }

  // 6. Contador + badges
  const txtContador = document.getElementById("products-count-txt");
  if (txtContador) txtContador.textContent = resultado.length;

  atualizarAreaBadgesFiltros(activeFilters);

  // 7. Renderização final
  const container = document.getElementById("product-catalog-grid");
  if (resultado.length === 0) {
    if (container) {
      container.innerHTML = `<p class="no-products">Nenhum look encontrado para os filtros selecionados.</p>`;
    }
    return;
  }

  renderizarComponenteCards(resultado, "product-catalog-grid");
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
    const labelLower = filtro.label.toLowerCase();
    const target = document.querySelector(
      `.category-checkbox[data-name="${labelLower}"]`,
    );
    if (target) target.checked = false;

    const aindaTemSelecionado = Array.from(
      document.querySelectorAll(".category-checkbox"),
    ).some((cb) => cb.checked);
    if (!aindaTemSelecionado) {
      const checkTodos = document.getElementById("check-todos-categorias");
      if (checkTodos) checkTodos.checked = true;
    }
  } else if (filtro.type === "price") {
    const slider = document.getElementById("price-slider");
    if (slider) slider.value = 500;
  } else if (filtro.type === "size") {
    const targetChip = Array.from(document.querySelectorAll(".size-chip")).find(
      (c) => c.textContent.trim() === filtro.rawValue,
    );
    if (targetChip) targetChip.classList.remove("active");
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

  document
    .querySelectorAll(".category-checkbox")
    .forEach((cb) => (cb.checked = false));
  document
    .querySelectorAll(".size-chip")
    .forEach((c) => c.classList.remove("active"));

  aplicarFiltrosEOrdenacao();
}
