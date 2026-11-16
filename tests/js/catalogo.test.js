// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const snackbarMock = vi.hoisted(() => ({ showSnackbar: vi.fn() }));
vi.mock("/js/global/snackbar.js", () => snackbarMock);

const TAMANHOS_API = [
  { id: 1, nome: "P", ordem: 1 },
  { id: 2, nome: "M", ordem: 2 },
  { id: 3, nome: "G", ordem: 3 },
];

// Cada teste re-importa o módulo (resetModules), que registra um listener NOVO de
// DOMContentLoaded em `document`. Sem limpeza, o dispatch do teste seguinte
// re-executaria os listeners antigos — e o clique de edição dispararia N chamadas
// de abrirEdicao. Guardamos os listeners do teste corrente e os removemos no
// afterEach, mantendo o padrão document.dispatchEvent(new Event("DOMContentLoaded")).
let handlersDesteTeste = [];
const addEventListenerReal = document.addEventListener.bind(document);
document.addEventListener = (tipo, listener, options) => {
  if (tipo === "DOMContentLoaded") {
    handlersDesteTeste.push({ listener, options });
  }
  return addEventListenerReal(tipo, listener, options);
};

// --- Helpers de montagem da página (HTML server-rendered do catálogo) ---

function linhaProduto(id, busca) {
  return `<tr data-id="${id}" data-busca="${busca}">
    <td>#${id}</td>
    <td>Look ${id}</td>
    <td>
      <button class="btn-action-edit" data-id="${id}" title="Editar Look">editar</button>
      <button class="btn-action-delete" data-id="${id}" title="Excluir Look">excluir</button>
    </td>
  </tr>`;
}

function categoriaItem(id, nome, descricao) {
  return `<div class="categoria-item" data-id="${id}" data-nome="${nome}" data-descricao="${descricao}">
    <strong>${nome}</strong>
    <button class="btn-action-edit btn-categoria-edit" data-id="${id}">editar</button>
  </div>`;
}

function montarPagina({ linhas = "", categorias = "", tamanhos = "" } = {}) {
  document.body.innerHTML = `
    <button id="btn-open-create-modal">Novo Produto</button>
    <button id="btn-open-categorias-modal">Categorias</button>
    <button id="btn-open-tamanhos-modal">Tamanhos</button>
    <input type="text" id="crud-search-input" />
    <table>
      <tbody id="crud-products-tbody">${linhas}</tbody>
    </table>

    <div id="product-crud-modal" style="display: none">
      <div class="modal-card modal-card--wide">
        <h2 id="modal-title-context">Cadastrar Novo Look</h2>
        <button id="btn-close-modal">&times;</button>
        <form id="product-crud-form">
          <input type="hidden" id="form-product-id" />
          <input type="text" id="form-nome" />
          <textarea id="form-descricao"></textarea>
          <input type="number" id="form-preco" />
          <select id="form-categoria">
            <option value="1">Vestidos</option>
            <option value="2">Bolsas</option>
          </select>
          <button type="button" id="btn-add-variant-row">Adicionar Variante</button>
          <div id="form-variants-container"></div>
          <button type="button" id="btn-cancel-form">Cancelar</button>
        </form>
      </div>
    </div>

    <div id="categorias-modal" style="display: none">
      <div class="modal-card">
        <h2 id="categorias-modal-titulo"
          data-titulo-criacao="Gerenciar Categorias"
          data-titulo-edicao="Editando Categoria">Gerenciar Categorias</h2>
        <button id="btn-close-categorias-modal">&times;</button>
        <form id="categoria-form">
          <input type="hidden" id="categoria-id" />
          <input type="text" id="categoria-nome" />
          <input type="text" id="categoria-descricao" />
          <button type="button" id="btn-reset-categoria"
            data-label-criacao="Novo" data-label-edicao="Cancelar">Novo</button>
          <button type="submit" id="btn-salvar-categoria"
            data-label-criacao="Salvar Categoria" data-label-edicao="Editar">Salvar Categoria</button>
        </form>
        <div class="categorias-list">${categorias}</div>
      </div>
    </div>

    <div id="tamanhos-modal" style="display: none">
      <div class="modal-card">
        <h2 id="tamanhos-modal-titulo"
          data-titulo-criacao="Gerenciar Tamanhos"
          data-titulo-edicao="Editando Tamanho">Gerenciar Tamanhos</h2>
        <button id="btn-close-tamanhos-modal">&times;</button>
        <form id="tamanho-form">
          <input type="hidden" id="tamanho-id" />
          <input type="text" id="tamanho-nome" />
          <input type="number" id="tamanho-ordem" />
          <button type="button" id="btn-reset-tamanho"
            data-label-criacao="Novo" data-label-edicao="Cancelar">Novo</button>
          <button type="submit" id="btn-salvar-tamanho"
            data-label-criacao="Salvar Tamanho" data-label-edicao="Editar">Salvar Tamanho</button>
        </form>
        <div class="tamanhos-list">${tamanhos}</div>
      </div>
    </div>

    <div id="delete-confirm-modal" style="display: none">
      <div class="modal-card">
        <h2>Excluir Look</h2>
        <button id="btn-close-delete-modal">&times;</button>
        <button type="button" id="btn-cancel-delete">Cancelar</button>
        <button type="button" id="btn-confirm-delete">Excluir Permanentemente</button>
      </div>
    </div>
  `;
}

// Importa o módulo com estado limpo (resetModules) e dispara o DOMContentLoaded
// que o script escuta para registrar os ouvintes.
// Obs.: import RELATIVO do script — o vite:import-analysis rejeita specifiers
// "/js/..." que apontam para arquivos reais dentro de /public (o alias não
// contorna essa checagem). Os imports internos do script ("/js/global/...")
// são resolvidos pelo alias e substituídos pelo vi.mock acima.
async function iniciarPagina(opcoes = {}) {
  vi.resetModules();
  handlersDesteTeste = [];
  sessionStorage.clear();
  snackbarMock.showSnackbar.mockClear();
  // jsdom não navega: trocamos location por um objeto simples para observar
  // o reload (mesmo padrão do login.test.js — o acesso de `location` no global
  // do vitest é configurable, diferente do Location real do jsdom).
  delete window.location;
  window.location = { href: "http://localhost:3000/catalogo", reload: vi.fn() };
  montarPagina(opcoes);
  await import("../../public/js/catalogo.js");
  document.dispatchEvent(new Event("DOMContentLoaded"));
}

// fetch mockado com rotas por "MÉTODO url" — resposta é um objeto simples
// (o script só usa .ok, .status e .json()).
function mockFetch(rotas) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const key = `${method} ${url}`;
    const rota = rotas[key];
    if (!rota) {
      throw new Error(`fetch não mocado para ${key}`);
    }
    const resposta = rota();
    return {
      ok: resposta.ok ?? true,
      status: resposta.status ?? 200,
      json: async () => resposta.json ?? {},
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function abrirEdicaoProduto5() {
  document.querySelector("#crud-products-tbody .btn-action-edit").click();
}

afterEach(() => {
  handlersDesteTeste.forEach(({ listener, options }) => {
    document.removeEventListener("DOMContentLoaded", listener, options);
  });
  handlersDesteTeste = [];
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("catálogo (admin) — interações da página", () => {
  it("abrir modal de edição busca o produto na API e preenche o formulário com suas variantes", async () => {
    const fetchMock = mockFetch({
      "GET /api/produtos/5": () => ({
        ok: true,
        status: 200,
        json: {
          id: 5,
          nome: "Vestido Aurora",
          descricao: "Midi de cetim com estampa floral",
          preco: 199.9,
          categoria: { id: 2 },
          variantes: [
            { id: 7, tamanho: "P", cor: "Rosa", estoque: 3, imagem_url: "" },
            { id: 8, tamanho: "M", cor: "Azul", estoque: 5, imagem_url: "" },
          ],
        },
      }),
      "GET /api/tamanhos": () => ({ ok: true, status: 200, json: TAMANHOS_API }),
    });
    await iniciarPagina({ linhas: linhaProduto(5, "vestido aurora cetim floral") });

    abrirEdicaoProduto5();

    await vi.waitFor(() => {
      expect(document.getElementById("form-product-id").value).toBe("5");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/produtos/5");
    expect(document.getElementById("form-nome").value).toBe("Vestido Aurora");
    expect(document.getElementById("form-descricao").value).toBe(
      "Midi de cetim com estampa floral",
    );
    expect(document.getElementById("form-preco").value).toBe("199.9");
    expect(document.getElementById("form-categoria").value).toBe("2");
    expect(document.getElementById("modal-title-context").textContent).toBe("Editando Look #5");
    expect(document.getElementById("product-crud-modal").style.display).toBe("flex");

    const linhasVariantes = document.querySelectorAll(
      "#form-variants-container .variant-form-row",
    );
    expect(linhasVariantes).toHaveLength(2);
    // PITFALL: data-row-id é string, mas os ids das variantes vindas da API são Number
    expect(linhasVariantes[0].querySelector("[data-field='tamanho']").dataset.rowId).toBe("7");
    expect(linhasVariantes[1].querySelector("[data-field='tamanho']").dataset.rowId).toBe("8");
    expect(linhasVariantes[0].querySelector("[data-field='cor']").value).toBe("Rosa");
    expect(linhasVariantes[1].querySelector("[data-field='estoque']").value).toBe("5");
  });

  it("criar look envia POST com os dados do formulário e as variantes digitadas", async () => {
    const fetchMock = mockFetch({
      "GET /api/tamanhos": () => ({ ok: true, status: 200, json: TAMANHOS_API }),
      "POST /api/admin/produtos": () => ({ ok: true, status: 200, json: {} }),
    });
    await iniciarPagina();

    document.getElementById("btn-open-create-modal").click();

    await vi.waitFor(() => {
      expect(document.getElementById("product-crud-modal").style.display).toBe("flex");
    });
    expect(document.getElementById("modal-title-context").textContent).toBe(
      "Cadastrar Novo Look",
    );

    document.getElementById("form-nome").value = "Vestido Midi Satin";
    document.getElementById("form-descricao").value = "Cetim com forro";
    document.getElementById("form-preco").value = "199.90";
    document.getElementById("form-categoria").value = "2";

    // inputs de variante só atualizam o estado via evento de input
    const linha = document.querySelector("#form-variants-container .variant-form-row");
    const inputCor = linha.querySelector("[data-field='cor']");
    inputCor.value = "Rosa Fúcsia";
    inputCor.dispatchEvent(new Event("input", { bubbles: true }));
    const inputEstoque = linha.querySelector("[data-field='estoque']");
    inputEstoque.value = "4";
    inputEstoque.dispatchEvent(new Event("input", { bubbles: true }));

    document
      .getElementById("product-crud-form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(sessionStorage.getItem("catalogoSnackbar")).toBe(
        "Look e variantes salvos com sucesso!",
      );
    });

    const chamadaPost = fetchMock.mock.calls.find(([url]) => url === "/api/admin/produtos");
    expect(chamadaPost).toBeTruthy();
    expect(chamadaPost[1].method).toBe("POST");
    const payload = JSON.parse(chamadaPost[1].body);
    expect(payload.nome).toBe("Vestido Midi Satin");
    expect(payload.preco).toBe(199.9);
    expect(payload.categoria_id).toBe(2);
    expect(payload.variantes).toHaveLength(1);
    expect(payload.variantes[0]).toMatchObject({
      cor: "Rosa Fúcsia",
      tamanho: "P",
      estoque: 4,
    });

    expect(snackbarMock.showSnackbar).toHaveBeenCalledWith(
      "Processando inserção relacional...",
      "info",
    );
    expect(window.location.reload).toHaveBeenCalled();
    expect(document.getElementById("product-crud-modal").style.display).toBe("none");
  });

  it("adicionar variante em modo edição envia PATCH para a existente e POST para a nova", async () => {
    const fetchMock = mockFetch({
      "GET /api/produtos/5": () => ({
        ok: true,
        status: 200,
        json: {
          id: 5,
          nome: "Vestido Aurora",
          descricao: "Midi de cetim",
          preco: 199.9,
          categoria: { id: 2 },
          variantes: [{ id: 7, tamanho: "P", cor: "Rosa", estoque: 3, imagem_url: "" }],
        },
      }),
      "GET /api/tamanhos": () => ({ ok: true, status: 200, json: TAMANHOS_API }),
      "PATCH /api/admin/produtos/5": () => ({ ok: true, status: 200, json: {} }),
      "PATCH /api/admin/variantes/7": () => ({ ok: true, status: 200, json: {} }),
      "POST /api/admin/produtos/5/variantes": () => ({ ok: true, status: 200, json: {} }),
    });
    await iniciarPagina({ linhas: linhaProduto(5, "vestido aurora cetim") });

    abrirEdicaoProduto5();
    await vi.waitFor(() => {
      expect(document.querySelectorAll("#form-variants-container .variant-form-row")).toHaveLength(1);
    });

    document.getElementById("btn-add-variant-row").click();
    await vi.waitFor(() => {
      expect(document.querySelectorAll("#form-variants-container .variant-form-row")).toHaveLength(2);
    });

    const novaLinha = document.querySelectorAll("#form-variants-container .variant-form-row")[1];
    const inputCor = novaLinha.querySelector("[data-field='cor']");
    inputCor.value = "Verde";
    inputCor.dispatchEvent(new Event("input", { bubbles: true }));
    const inputEstoque = novaLinha.querySelector("[data-field='estoque']");
    inputEstoque.value = "6";
    inputEstoque.dispatchEvent(new Event("input", { bubbles: true }));

    document
      .getElementById("product-crud-form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(sessionStorage.getItem("catalogoSnackbar")).toBe("Catálogo atualizado com sucesso!");
    });

    const chamadas = fetchMock.mock.calls.map(
      ([url, opts]) => `${(opts?.method || "GET").toUpperCase()} ${url}`,
    );
    expect(chamadas).toEqual([
      "GET /api/produtos/5",
      "GET /api/tamanhos",
      "PATCH /api/admin/produtos/5",
      "PATCH /api/admin/variantes/7",
      "POST /api/admin/produtos/5/variantes",
    ]);

    const chamadaPostVariante = fetchMock.mock.calls.find(
      ([url]) => url === "/api/admin/produtos/5/variantes",
    );
    expect(JSON.parse(chamadaPostVariante[1].body)).toMatchObject({
      cor: "Verde",
      tamanho: "P",
      estoque: 6,
    });
  });

  it("remover variante existente envia DELETE para ela e atualiza as demais via PATCH", async () => {
    const fetchMock = mockFetch({
      "GET /api/produtos/5": () => ({
        ok: true,
        status: 200,
        json: {
          id: 5,
          nome: "Vestido Aurora",
          descricao: "Midi de cetim",
          preco: 199.9,
          categoria: { id: 2 },
          variantes: [
            { id: 7, tamanho: "P", cor: "Rosa", estoque: 3, imagem_url: "" },
            { id: 8, tamanho: "M", cor: "Azul", estoque: 5, imagem_url: "" },
          ],
        },
      }),
      "GET /api/tamanhos": () => ({ ok: true, status: 200, json: TAMANHOS_API }),
      "PATCH /api/admin/produtos/5": () => ({ ok: true, status: 200, json: {} }),
      "DELETE /api/admin/variantes/7": () => ({ ok: true, status: 200, json: {} }),
      "PATCH /api/admin/variantes/8": () => ({ ok: true, status: 200, json: {} }),
    });
    await iniciarPagina({ linhas: linhaProduto(5, "vestido aurora cetim") });

    abrirEdicaoProduto5();
    await vi.waitFor(() => {
      expect(document.querySelectorAll("#form-variants-container .variant-form-row")).toHaveLength(2);
    });

    // data-row-id é string "7"; o id da variante no estado é Number — a remoção usa String(v.id)
    document.querySelector(".btn-remove-variant-row[data-row-id='7']").click();

    const linhas = document.querySelectorAll("#form-variants-container .variant-form-row");
    expect(linhas).toHaveLength(1);
    expect(linhas[0].querySelector("[data-field='tamanho']").dataset.rowId).toBe("8");

    document
      .getElementById("product-crud-form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(sessionStorage.getItem("catalogoSnackbar")).toBe("Catálogo atualizado com sucesso!");
    });

    const chamadas = fetchMock.mock.calls.map(
      ([url, opts]) => `${(opts?.method || "GET").toUpperCase()} ${url}`,
    );
    expect(chamadas).toEqual([
      "GET /api/produtos/5",
      "GET /api/tamanhos",
      "PATCH /api/admin/produtos/5",
      "DELETE /api/admin/variantes/7",
      "PATCH /api/admin/variantes/8",
    ]);
  });

  it("erro 409 ao remover variante aborta a sincronização e mostra snackbar de erro", async () => {
    const fetchMock = mockFetch({
      "GET /api/produtos/5": () => ({
        ok: true,
        status: 200,
        json: {
          id: 5,
          nome: "Vestido Aurora",
          descricao: "Midi de cetim",
          preco: 199.9,
          categoria: { id: 2 },
          variantes: [
            { id: 7, tamanho: "P", cor: "Rosa", estoque: 3, imagem_url: "" },
            { id: 8, tamanho: "M", cor: "Azul", estoque: 5, imagem_url: "" },
          ],
        },
      }),
      "GET /api/tamanhos": () => ({ ok: true, status: 200, json: TAMANHOS_API }),
      "PATCH /api/admin/produtos/5": () => ({ ok: true, status: 200, json: {} }),
      "DELETE /api/admin/variantes/7": () => ({
        ok: false,
        status: 409,
        json: { error: "Não é possível remover: variante possui vendas associadas." },
      }),
    });
    await iniciarPagina({ linhas: linhaProduto(5, "vestido aurora cetim") });

    abrirEdicaoProduto5();
    await vi.waitFor(() => {
      expect(document.querySelectorAll("#form-variants-container .variant-form-row")).toHaveLength(2);
    });

    document.querySelector(".btn-remove-variant-row[data-row-id='7']").click();
    document
      .getElementById("product-crud-form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(snackbarMock.showSnackbar).toHaveBeenCalledWith(
        "Não é possível remover: variante possui vendas associadas.",
        "error",
      );
    });

    // aborta antes de atualizar as variantes restantes e não dispara reload
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/variantes/8",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(sessionStorage.getItem("catalogoSnackbar")).toBeNull();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it("modo edição de categoria alterna rótulos e título via data-label-* e data-titulo-*", async () => {
    await iniciarPagina({
      categorias: categoriaItem(3, "Bolsas", "Bolsas e carteiras"),
    });

    const btnSalvar = document.getElementById("btn-salvar-categoria");
    const btnReset = document.getElementById("btn-reset-categoria");
    const titulo = document.getElementById("categorias-modal-titulo");

    expect(btnSalvar.textContent).toBe("Salvar Categoria");
    expect(btnReset.textContent).toBe("Novo");
    expect(titulo.textContent).toBe("Gerenciar Categorias");

    document.querySelector(".categorias-list .btn-categoria-edit").click();

    expect(document.getElementById("categoria-id").value).toBe("3");
    expect(document.getElementById("categoria-nome").value).toBe("Bolsas");
    expect(document.getElementById("categoria-descricao").value).toBe("Bolsas e carteiras");
    expect(btnSalvar.textContent).toBe("Editar");
    expect(btnReset.textContent).toBe("Cancelar");
    expect(titulo.textContent).toBe("Editando Categoria");

    // o "Cancelar" (btn-reset) sai do modo edição e volta aos rótulos de criação
    btnReset.click();

    expect(document.getElementById("categoria-id").value).toBe("");
    expect(btnSalvar.textContent).toBe("Salvar Categoria");
    expect(btnReset.textContent).toBe("Novo");
    expect(titulo.textContent).toBe("Gerenciar Categorias");
  });

  it("excluir produto passa pelo modal de confirmação e só envia DELETE ao confirmar", async () => {
    const fetchMock = mockFetch({
      "DELETE /api/admin/produtos/9": () => ({ ok: true, status: 200, json: {} }),
    });
    await iniciarPagina({ linhas: linhaProduto(9, "blusa linho bege") });

    const deleteModal = document.getElementById("delete-confirm-modal");
    const btnDelete = document.querySelector("#crud-products-tbody .btn-action-delete");

    btnDelete.click();
    expect(deleteModal.style.display).toBe("flex");
    expect(fetchMock).not.toHaveBeenCalled();

    // cancelar fecha sem chamar a API
    document.getElementById("btn-cancel-delete").click();
    expect(deleteModal.style.display).toBe("none");
    expect(fetchMock).not.toHaveBeenCalled();

    btnDelete.click();
    document.getElementById("btn-confirm-delete").click();

    await vi.waitFor(() => {
      expect(sessionStorage.getItem("catalogoSnackbar")).toBe(
        "Produto e suas variantes removidos da base.",
      );
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/produtos/9", { method: "DELETE" });
    expect(snackbarMock.showSnackbar).toHaveBeenCalledWith(
      "Limpando registros em cascata...",
      "info",
    );
    expect(window.location.reload).toHaveBeenCalled();
    expect(deleteModal.style.display).toBe("none");
  });

  it("busca filtra as linhas da tabela conforme o termo digitado", async () => {
    await iniciarPagina({
      linhas: [
        linhaProduto(1, "vestido midi satin rosa flores"),
        linhaProduto(2, "calça jeans reta azul"),
      ].join(""),
    });

    const tbody = document.getElementById("crud-products-tbody");
    const inputBusca = document.getElementById("crud-search-input");
    const linhas = [...tbody.querySelectorAll("tr[data-id]")];

    vi.useFakeTimers();

    inputBusca.value = "calça";
    inputBusca.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(250);

    expect(linhas[0].style.display).toBe("none");
    expect(linhas[1].style.display).toBe("");
    expect(tbody.querySelector(".table-empty-row")).toBeNull();

    inputBusca.value = "inexistente";
    inputBusca.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(250);

    expect(linhas[0].style.display).toBe("none");
    expect(linhas[1].style.display).toBe("none");
    expect(tbody.querySelector(".table-empty-row")).not.toBeNull();

    inputBusca.value = "";
    inputBusca.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(250);

    expect(linhas[0].style.display).toBe("");
    expect(linhas[1].style.display).toBe("");
    expect(tbody.querySelector(".table-empty-row")).toBeNull();
  });
});
