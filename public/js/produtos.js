import { database } from "../../utils/firebase-config.js";
import {
  buscarProdutosEstruturados,
  renderizarComponenteCards,
} from "../../utils/product-helpers.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Estados globais em memória para filtragem dinâmica e rápida
let produtos = [];
let buscaDebounceTimer;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Carga inicial síncrona/paralela de dados do Firestore
    const [dadosProdutos, categoriasSnapshot] = await Promise.all([
      buscarProdutosEstruturados(),
      getDocs(collection(database, "categorias")),
    ]);

    produtos = dadosProdutos;

    // 2. Extrai e monta a lista de categorias direto do snapshot
    const listaCategorias = [];
    categoriasSnapshot.forEach((docSnap) => {
      listaCategorias.push(docSnap.data().nome);
    });

    // 3. Renderiza os componentes de interface dependentes dos dados do banco
    renderizarCheckboxesCategorias(listaCategorias);

    // 4. Configura as escutas de eventos e verifica parâmetros de navegação (Query String)
    inicializarOuvintesFiltros();
    checarFiltrosIniciaisURL();

    // 5. Executa a primeira passada de renderização do catálogo
    aplicarFiltrosEOrdenacao();
  } catch (error) {
    console.error("❌ Erro ao inicializar catálogo:", error);
  }
});

// Injeta os inputs de categoria baseados na coleção real do banco plano
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

// Intercepta parâmetros vindos de redirecionamentos (Ex: Chips de Categoria da Home)
function checarFiltrosIniciaisURL() {
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get("categoria");

  if (catParam) {
    const checkTodos = document.getElementById("check-todos-categorias");
    if (checkTodos) checkTodos.checked = false;

    // Aguarda sutilmente a renderização síncrona dos nós filhos no DOM
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
  // Input de Texto com tratamento Debounce para poupar processamento de renderização
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(buscaDebounceTimer);
      buscaDebounceTimer = setTimeout(() => aplicarFiltrosEOrdenacao(), 300);
    });
  }

  // Ouvinte do Slider de Preço
  const sliderPreco = document.getElementById("price-slider");
  if (sliderPreco) {
    sliderPreco.addEventListener("input", () => aplicarFiltrosEOrdenacao());
  }

  // Comportamento do Checkbox mestre 'Todos'
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

  // Delegação de eventos para escutar mudanças nas categorias injetadas dinamicamente
  const catListContainer = document.getElementById("categories-filter-list");
  if (catListContainer) {
    catListContainer.addEventListener("change", (e) => {
      if (e.target.classList.contains("category-checkbox")) {
        if (e.target.checked && checkTodos) checkTodos.checked = false;
        aplicarFiltrosEOrdenacao();
      }
    });
  }

  // Toggle individual multi-seleção de Chips de Tamanho (Nenhum = Todos valem)
  const chipsTamanho = document.querySelectorAll(".size-chip");
  chipsTamanho.forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      aplicarFiltrosEOrdenacao();
    });
  });

  // Select de Ordenação
  const selectOrdenacao = document.getElementById("sort-select");
  if (selectOrdenacao) {
    selectOrdenacao.addEventListener("change", () =>
      aplicarFiltrosEOrdenacao(),
    );
  }

  // Botão 'Limpar Tudo' da barra de controle de badges
  const btnClearAll = document.getElementById("btn-clear-all-filters");
  if (btnClearAll) {
    btnClearAll.addEventListener("click", resetarTodosOsFiltros);
  }
}

// LÓGICA PRINCIPAL: MOTOR DE FILTRAGEM E CORTE EM MEMÓRIA (MÁXIMA PERFORMANCE)
function aplicarFiltrosEOrdenacao() {
  let resultado = [...produtos];
  const activeFilters = [];

  // 1. Filtro Condicional por Texto
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

  // 2. Filtro Condicional por Categorias Multi-seleção
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
      resultado = []; // Caso nenhuma caixinha esteja marcada e não haja texto digitado
    }
  }

  // 3. Filtro Condicional por Preço Limite
  const sliderPreco = document.getElementById("price-slider");
  const txtPrecoValue = document.getElementById("price-value");
  if (sliderPreco) {
    const precoMaximo = Number(sliderPreco.value);
    if (txtPrecoValue)
      txtPrecoValue.textContent = `Até R$ ${precoMaximo.toFixed(2).replace(".", ",")}`;

    // Gera badge apenas se o usuário reduziu abaixo do teto padrão de R$ 500
    if (precoMaximo < 500) {
      resultado = resultado.filter((p) => p.preco <= precoMaximo);
      activeFilters.push({ type: "price", label: `Até R$ ${precoMaximo}` });
    }
  }

  // 4. Filtro Condicional por Tamanhos Multi-seleção (Regra: Nenhum = Todos Valem)
  const chipsAtivos = document.querySelectorAll(".size-chip.active");
  if (chipsAtivos.length > 0) {
    const tamanhosSelecionados = Array.from(chipsAtivos).map((chip) =>
      chip.textContent.trim(),
    );

    // O look passa se houver correspondência com qualquer um dos tamanhos ativos (Operação IN)
    resultado = resultado.filter((produto) =>
      produto.variantes.some((variante) =>
        tamanhosSelecionados.includes(variante.tamanho),
      ),
    );

    tamanhosSelecionados.forEach((tam) => {
      activeFilters.push({ type: "size", label: `Tam: ${tam}`, rawValue: tam });
    });
  }

  // 5. Ordenação Matemática Estrita por Preço
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

  // 6. Atualiza contador e badges na UI
  const txtContador = document.getElementById("products-count-txt");
  if (txtContador) txtContador.textContent = resultado.length;

  atualizarAreaBadgesFiltros(activeFilters);

  // 7. Renderização final através do componente utilitário modular
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
