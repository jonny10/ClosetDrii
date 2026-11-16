// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";

const { openProductModal, showSnackbar } = vi.hoisted(() => ({
  openProductModal: vi.fn(),
  showSnackbar: vi.fn(),
}));

// O script alvo importa "/js/global/..." (arquivos dentro de /public): o guard
// do Vite ("Cannot import non-asset file ... inside /public") impede que ESTE
// arquivo de teste importe esses caminhos diretamente. O import relativo do
// produtos.js contorna a checagem no importer, e os vi.mock abaixo substituem
// as dependências internas do script pelos mocks acima.
vi.mock("/js/global/product-modal.js", () => ({ openProductModal }));
vi.mock("/js/global/snackbar.js", () => ({ showSnackbar }));

// Cada import do produtos.js registra um novo listener de DOMContentLoaded no
// document. Para que cada teste execute APENAS o handler do módulo recém-
// importado (sem handlers de testes anteriores acumulando listeners duplicados
// nos elementos — ex.: toggle de chip executado N vezes), capturamos os
// callbacks e invocamos somente o mais recente.
const ouvintesDOMContentLoaded = [];
beforeAll(() => {
  const originalAddEventListener = document.addEventListener.bind(document);
  vi.spyOn(document, "addEventListener").mockImplementation(function (tipo, cb, ...args) {
    if (tipo === "DOMContentLoaded") ouvintesDOMContentLoaded.push(cb);
    return originalAddEventListener(tipo, cb, ...args);
  });
});
afterAll(() => {
  vi.restoreAllMocks();
});

// Spies criados dentro de cada teste, restaurados no afterEach
let spiesDoTeste = [];
function espionar(objeto, metodo) {
  const spy = vi.spyOn(objeto, metodo);
  spiesDoTeste.push(spy);
  return spy;
}

// ---------------------------------------------------------------------------
// Fixtures — reproduz o HTML server-rendered da página /produtos (Handlebars)
// ---------------------------------------------------------------------------

function criarCard({ id, busca, preco, categoria, tamanhos }) {
  const card = document.createElement("article");
  card.className = "product-card-component";
  card.dataset.id = String(id);
  card.dataset.busca = busca;
  card.dataset.preco = String(preco);
  card.dataset.categoria = categoria;
  card.dataset.tamanhos = tamanhos;
  return card;
}

// Cards padrão usados na maioria dos testes
function cardsPadrao() {
  return [
    criarCard({ id: 1, busca: "vestido floral", preco: 199.9, categoria: "vestidos", tamanhos: "P,M" }),
    criarCard({ id: 2, busca: "blusa listrada", preco: 89.9, categoria: "camisas", tamanhos: "M,G" }),
    criarCard({ id: 3, busca: "calca jeans", preco: 299.9, categoria: "calcas", tamanhos: "G" }),
  ];
}

function montarPagina(cards = cardsPadrao()) {
  document.body.innerHTML = `
    <input id="search-input" type="text" />
    <input id="price-slider" type="range" min="0" max="500" value="500" />
    <span id="price-value"></span>
    <input type="checkbox" id="check-todos-categorias" checked />
    <div id="categories-filter-list">
      <input type="checkbox" class="category-checkbox" data-name="vestidos" />
      <input type="checkbox" class="category-checkbox" data-name="camisas" />
      <input type="checkbox" class="category-checkbox" data-name="calcas" />
    </div>
    <div class="size-chip">P</div>
    <div class="size-chip">M</div>
    <div class="size-chip">G</div>
    <select id="sort-select">
      <option value="news">Novidades</option>
      <option value="price-asc">Menor preço</option>
      <option value="price-desc">Maior preço</option>
    </select>
    <span id="products-count-txt"></span>
    <div id="applied-filters-container" style="display: none;"></div>
    <div id="filters-badges-list"></div>
    <button id="btn-clear-all-filters">Limpar filtros</button>
    <div id="product-catalog-grid"></div>
  `;
  const grid = document.getElementById("product-catalog-grid");
  cards.forEach((card) => grid.appendChild(card));
}

// Importa o módulo "fresco" e dispara o DOMContentLoaded que ele escuta
async function importarProdutos() {
  vi.resetModules();
  await import("../../public/js/produtos.js");
  ouvintesDOMContentLoaded[ouvintesDOMContentLoaded.length - 1]();
}

// Despeja a fila de microtarefas (resolução de fetch().then(json).then(...))
async function aguardarMicrotarefas() {
  for (let i = 0; i < 15; i += 1) await Promise.resolve();
}

function buscarPor(texto) {
  const input = document.getElementById("search-input");
  input.value = texto;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function cardsVisiveis() {
  return [...document.querySelectorAll(".product-card-component")].filter(
    (card) => card.style.display !== "none",
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/produtos");
  vi.clearAllMocks();
});

afterEach(() => {
  spiesDoTeste.forEach((spy) => spy.mockRestore());
  spiesDoTeste = [];
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Clique nos cards (abertura do modal)
// ---------------------------------------------------------------------------

describe("produtos.js — clique nos cards", () => {
  it("abre o modal com o produto vindo do fetch ao clicar no card", async () => {
    const produto = { id: 1, nome: "Vestido Floral Midi", categoria: { nome: "vestidos" } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(produto) }),
    );
    montarPagina();
    await importarProdutos();

    document.querySelector(".product-card-component").click();
    await aguardarMicrotarefas();

    expect(fetch).toHaveBeenCalledWith("/api/produtos/1");
    // categoria resolvida de objeto para nome no formato esperado pelo modal
    expect(openProductModal).toHaveBeenCalledWith({
      id: 1,
      nome: "Vestido Floral Midi",
      categoria: "vestidos",
    });
  });

  it("usa o cache e não refaz o fetch no segundo clique do mesmo card", async () => {
    const produto = { id: 1, nome: "Vestido Floral Midi", categoria: { nome: "vestidos" } };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(produto) });
    vi.stubGlobal("fetch", fetchMock);
    montarPagina();
    await importarProdutos();

    const card = document.querySelector(".product-card-component");
    card.click();
    await aguardarMicrotarefas();

    fetchMock.mockClear();
    openProductModal.mockClear();

    card.click();
    await aguardarMicrotarefas();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(openProductModal).toHaveBeenCalled();
  });

  it("mostra snackbar de erro quando o fetch do produto falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );
    espionar(console, "error").mockImplementation(() => {});
    montarPagina();
    await importarProdutos();

    document.querySelector(".product-card-component").click();
    await aguardarMicrotarefas();

    expect(showSnackbar).toHaveBeenCalledWith("Erro ao carregar o produto.", "error");
  });
});

// ---------------------------------------------------------------------------
// Filtros e ordenação (efeitos observáveis no DOM)
// ---------------------------------------------------------------------------

describe("produtos.js — filtros e ordenação", () => {
  it("exibe todos os cards no carregamento com contador, preço padrão e sem badges", async () => {
    montarPagina();
    await importarProdutos();

    expect(cardsVisiveis()).toHaveLength(3);
    expect(document.getElementById("products-count-txt").textContent).toBe("3");
    expect(document.getElementById("price-value").textContent).toBe("Até R$ 500,00");
    expect(document.getElementById("applied-filters-container").style.display).toBe("none");
  });

  it("filtra os cards ao marcar um checkbox de categoria e desmarca 'Todos'", async () => {
    montarPagina();
    await importarProdutos();

    const checkboxVestidos = document.querySelector('.category-checkbox[data-name="vestidos"]');
    checkboxVestidos.click();

    expect(checkboxVestidos.checked).toBe(true);
    expect(document.getElementById("check-todos-categorias").checked).toBe(false);
    expect(cardsVisiveis()).toHaveLength(1);
    expect(cardsVisiveis()[0].dataset.id).toBe("1");
    expect(document.getElementById("products-count-txt").textContent).toBe("1");
  });

  it("marcar 'Todos' limpa as categorias selecionadas e reexibe todos os cards", async () => {
    montarPagina();
    await importarProdutos();

    document.querySelector('.category-checkbox[data-name="vestidos"]').click();
    expect(cardsVisiveis()).toHaveLength(1);

    const checkTodos = document.getElementById("check-todos-categorias");
    checkTodos.click();

    expect(checkTodos.checked).toBe(true);
    expect(document.querySelector('.category-checkbox[data-name="vestidos"]').checked).toBe(false);
    expect(cardsVisiveis()).toHaveLength(3);
    expect(document.getElementById("products-count-txt").textContent).toBe("3");
  });

  it("filtra por texto da busca com debounce de 300ms", async () => {
    montarPagina();
    await importarProdutos();

    buscarPor("floral");
    vi.advanceTimersByTime(300);

    expect(cardsVisiveis()).toHaveLength(1);
    expect(cardsVisiveis()[0].dataset.id).toBe("1");
    expect(document.getElementById("products-count-txt").textContent).toBe("1");
  });

  it("não aplica a busca antes de o debounce de 300ms terminar", async () => {
    montarPagina();
    await importarProdutos();

    buscarPor("floral");
    vi.advanceTimersByTime(299);

    expect(cardsVisiveis()).toHaveLength(3);

    vi.advanceTimersByTime(1);
    expect(cardsVisiveis()).toHaveLength(1);
  });

  it("filtra pelo preço máximo do slider e atualiza o rótulo de preço", async () => {
    montarPagina();
    await importarProdutos();

    const slider = document.getElementById("price-slider");
    slider.value = "150";
    slider.dispatchEvent(new Event("input", { bubbles: true }));

    expect(document.getElementById("price-value").textContent).toBe("Até R$ 150,00");
    expect(cardsVisiveis()).toHaveLength(1);
    expect(cardsVisiveis()[0].dataset.id).toBe("2");
    expect(document.getElementById("products-count-txt").textContent).toBe("1");
  });

  it("filtra pelos chips de tamanho ativos (qualquer tamanho do card)", async () => {
    montarPagina();
    await importarProdutos();

    const chipM = [...document.querySelectorAll(".size-chip")].find(
      (chip) => chip.textContent.trim() === "M",
    );
    chipM.click();

    expect(chipM.classList.contains("active")).toBe(true);
    expect(cardsVisiveis()).toHaveLength(2);
    expect(cardsVisiveis().map((card) => card.dataset.id)).toEqual(["1", "2"]);
    expect(document.getElementById("products-count-txt").textContent).toBe("2");
  });

  it("ordena os cards por menor preço (price-asc)", async () => {
    montarPagina();
    await importarProdutos();

    const select = document.getElementById("sort-select");
    select.value = "price-asc";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    const ordem = [...document.querySelectorAll(".product-card-component")].map(
      (card) => card.dataset.preco,
    );
    expect(ordem).toEqual(["89.9", "199.9", "299.9"]);
  });

  it("ordena os cards por maior preço (price-desc)", async () => {
    montarPagina();
    await importarProdutos();

    const select = document.getElementById("sort-select");
    select.value = "price-desc";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    const ordem = [...document.querySelectorAll(".product-card-component")].map(
      (card) => card.dataset.preco,
    );
    expect(ordem).toEqual(["299.9", "199.9", "89.9"]);
  });

  it("mostra o estado vazio quando nenhum card corresponde aos filtros", async () => {
    montarPagina();
    await importarProdutos();

    buscarPor("inexistente");
    vi.advanceTimersByTime(300);

    expect(cardsVisiveis()).toHaveLength(0);
    expect(document.getElementById("products-count-txt").textContent).toBe("0");
    const mensagem = document.querySelector("#product-catalog-grid .no-products");
    expect(mensagem).not.toBeNull();
    expect(mensagem.textContent).toBe("Nenhum look encontrado para os filtros selecionados.");
  });

  it("remove o estado vazio quando volta a haver resultados", async () => {
    montarPagina();
    await importarProdutos();

    buscarPor("inexistente");
    vi.advanceTimersByTime(300);
    expect(document.querySelector("#product-catalog-grid .no-products")).not.toBeNull();

    buscarPor("");
    vi.advanceTimersByTime(300);

    expect(document.querySelector("#product-catalog-grid .no-products")).toBeNull();
    expect(cardsVisiveis()).toHaveLength(3);
  });

  it("exibe os badges dos filtros ativos e esconde a área sem filtros", async () => {
    montarPagina();
    await importarProdutos();

    document.querySelector('.category-checkbox[data-name="vestidos"]').click();

    const container = document.getElementById("applied-filters-container");
    expect(container.style.display).toBe("flex");
    const badges = [...document.querySelectorAll("#filters-badges-list .filter-badge-item")];
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent).toContain("vestidos");

    document.getElementById("check-todos-categorias").click();
    expect(container.style.display).toBe("none");
  });

  it("remove o filtro individual ao clicar no badge e reaplica a filtragem", async () => {
    montarPagina();
    await importarProdutos();

    document.querySelector('.category-checkbox[data-name="vestidos"]').click();
    expect(cardsVisiveis()).toHaveLength(1);

    document.querySelector("#filters-badges-list .filter-badge-item i").click();

    expect(document.querySelector('.category-checkbox[data-name="vestidos"]').checked).toBe(false);
    expect(document.getElementById("check-todos-categorias").checked).toBe(true);
    expect(cardsVisiveis()).toHaveLength(3);
    expect(document.getElementById("applied-filters-container").style.display).toBe("none");
  });

  it("limpa todos os filtros com o botão limpar", async () => {
    montarPagina();
    await importarProdutos();

    // aplica busca + categoria + tamanho + preço + ordenação
    buscarPor("floral");
    vi.advanceTimersByTime(300);
    document.querySelector('.category-checkbox[data-name="vestidos"]').click();
    const chipM = [...document.querySelectorAll(".size-chip")].find(
      (chip) => chip.textContent.trim() === "M",
    );
    chipM.click();
    const slider = document.getElementById("price-slider");
    slider.value = "150";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    const select = document.getElementById("sort-select");
    select.value = "price-asc";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    document.getElementById("btn-clear-all-filters").click();

    expect(document.getElementById("search-input").value).toBe("");
    expect(slider.value).toBe("500");
    expect(document.getElementById("check-todos-categorias").checked).toBe(true);
    expect(document.querySelectorAll(".category-checkbox:checked")).toHaveLength(0);
    expect(document.querySelectorAll(".size-chip.active")).toHaveLength(0);
    expect(select.value).toBe("news");
    expect(cardsVisiveis()).toHaveLength(3);
    expect(document.getElementById("products-count-txt").textContent).toBe("3");
    expect(document.getElementById("applied-filters-container").style.display).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// Sincronização da query string (window.history) e leitura dos parâmetros
// ---------------------------------------------------------------------------

describe("produtos.js — sincronização com a URL", () => {
  it("sincroniza ?busca= na query string ao buscar", async () => {
    montarPagina();
    await importarProdutos();

    const spy = espionar(window.history, "replaceState");
    buscarPor("floral");
    vi.advanceTimersByTime(300);

    expect(spy).toHaveBeenLastCalledWith(null, "", "/produtos?busca=floral");
  });

  it("sincroniza ?categoria= e ?tamanho= na query string", async () => {
    montarPagina();
    await importarProdutos();

    const spy = espionar(window.history, "replaceState");

    document.querySelector('.category-checkbox[data-name="vestidos"]').click();
    expect(spy).toHaveBeenLastCalledWith(null, "", "/produtos?categoria=vestidos");

    const chipM = [...document.querySelectorAll(".size-chip")].find(
      (chip) => chip.textContent.trim() === "M",
    );
    chipM.click();
    expect(spy).toHaveBeenLastCalledWith(null, "", "/produtos?categoria=vestidos&tamanho=M");
  });

  it("sincroniza ?orderBy=preco&dir= na query string ao ordenar por preço", async () => {
    montarPagina();
    await importarProdutos();

    const spy = espionar(window.history, "replaceState");
    const select = document.getElementById("sort-select");

    select.value = "price-asc";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(spy).toHaveBeenLastCalledWith(null, "", "/produtos?orderBy=preco&dir=asc");

    select.value = "price-desc";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(spy).toHaveBeenLastCalledWith(null, "", "/produtos?orderBy=preco&dir=desc");
  });

  it("aplica filtros iniciais vindos da URL (chips de categoria da home)", async () => {
    const cards = [
      criarCard({ id: 1, busca: "vestido floral", preco: 199.9, categoria: "vestidos", tamanhos: "P,M" }),
      criarCard({ id: 2, busca: "vestido floral longo", preco: 99.9, categoria: "vestidos", tamanhos: "M" }),
      criarCard({ id: 3, busca: "blusa listrada", preco: 79.9, categoria: "camisas", tamanhos: "M,G" }),
    ];
    montarPagina(cards);
    window.history.replaceState(
      null,
      "",
      "/produtos?categoria=vestidos&busca=floral&orderBy=preco&dir=asc",
    );
    await importarProdutos();

    expect(document.querySelector('.category-checkbox[data-name="vestidos"]').checked).toBe(true);
    expect(document.getElementById("check-todos-categorias").checked).toBe(false);
    expect(document.getElementById("search-input").value).toBe("floral");
    expect(document.getElementById("sort-select").value).toBe("price-asc");

    // categoria + busca aplicadas e ordenação por preço sobre os visíveis
    expect(cardsVisiveis()).toHaveLength(2);
    expect(cardsVisiveis().map((card) => card.dataset.preco)).toEqual(["99.9", "199.9"]);
    expect(document.getElementById("products-count-txt").textContent).toBe("2");
  });
});
