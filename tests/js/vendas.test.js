// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showSnackbar } from "/js/global/snackbar.js";
import "/js/vendas.js";

vi.mock("/js/global/snackbar.js", () => ({ showSnackbar: vi.fn() }));

const flushPromises = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

function resJson(data, ok = true) {
  return { ok, status: ok ? 200 : 400, json: async () => data };
}

// Mock de fetch: objeto simples roteado por "MÉTODO url"
function stubFetch(handlers) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const key = `${options.method || "GET"} ${url}`;
    if (handlers[key]) return handlers[key]();
    return resJson({ error: "rota não mapeada no mock" }, false);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function criarTemplateCard() {
  const tpl = document.createElement("template");
  tpl.id = "template-admin-order-card";
  const div = document.createElement("div");
  div.className = "order-container-card";
  div.innerHTML = `
    <div class="order-card-header admin-header">
      <div class="order-meta-info">
        <span>Pedido: <strong class="order-id">#0000</strong></span>
        <span>Cliente: <strong class="order-client-name">Carregando...</strong></span>
      </div>
      <span class="order-status-badge">Pendente</span>
    </div>
    <div class="order-products-rows-list"></div>
    <div class="order-card-footer admin-footer">
      <div class="total-block">
        <span>Total do Pedido:</span>
        <strong class="order-total-price">R$ 0,00</strong>
      </div>
      <div class="admin-status-control-block">
        <label for="status-change-select">Alterar Status:</label>
        <select class="status-change-select">
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="enviado">Enviado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div class="admin-comprovante-block">
        <a class="comprovante-link" href="#" target="_blank" style="display: none">
          <i class="fas fa-receipt"></i> Ver comprovante
        </a>
        <button
          type="button"
          class="comprovante-remove-btn"
          title="Remover comprovante"
          style="display: none"
        >
          <i class="fas fa-trash-alt"></i>
        </button>
        <label class="comprovante-upload-label">
          <i class="fas fa-paperclip"></i> Anexar comprovante
          <input type="file" class="comprovante-input" accept="image/jpeg,image/png,image/webp" />
        </label>
      </div>
    </div>
  `;
  tpl.content.appendChild(div);
  return tpl;
}

function criarTemplateItem() {
  const tpl = document.createElement("template");
  tpl.id = "template-admin-order-item";
  const div = document.createElement("div");
  div.className = "order-product-item-row";
  div.innerHTML = `
    <div class="product-item-main">
      <div class="product-item-image-box">
        <img class="cart-img" src="" alt="Produto" />
      </div>
      <div class="product-item-details">
        <h3 class="cart-nome"></h3>
        <div class="item-specs">
          <span>Cor: <strong class="cart-cor"></strong></span>
          <span>Tamanho: <strong class="cart-tamanho"></strong></span>
        </div>
      </div>
    </div>
    <div class="product-item-pricing-box">
      <span class="order-item-qty">Qtd: <strong class="qty-count">1</strong></span>
      <span class="cart-subtotal-item">R$ 0,00</span>
    </div>
  `;
  tpl.content.appendChild(div);
  return tpl;
}

function montarPainel({ comTemplates = true } = {}) {
  document.body.innerHTML = `
    <div class="admin-filter-bar">
      <button class="status-tab active" data-status="todos">Todos</button>
      <button class="status-tab" data-status="pendente">Pendentes</button>
      <button class="status-tab" data-status="pago">Pagos</button>
      <button class="status-tab" data-status="enviado">Enviados</button>
      <button class="status-tab" data-status="cancelado">Cancelados</button>
    </div>
    <div class="catalog-controls">
      <p class="products-count">Listando <strong id="orders-count">0</strong> pedidos</p>
    </div>
    <section id="admin-orders-container" class="orders-list-section"></section>
    <div id="no-orders-message" class="empty-history-card" style="display: none"></div>
  `;
  if (comTemplates) {
    document.body.appendChild(criarTemplateCard());
    document.body.appendChild(criarTemplateItem());
  }
}

// Stuba o fetch, dispara o DOMContentLoaded e normaliza o filtro para "todos"
// (o módulo mantém estado entre testes; o click só funciona após o setup).
async function carregarPainel(handlers) {
  const fetchMock = stubFetch(handlers);
  document.dispatchEvent(new Event("DOMContentLoaded"));
  document.querySelector('[data-status="todos"]').click();
  await flushPromises();
  return fetchMock;
}

function vendaFixtures() {
  return [
    {
      id: 1,
      status: "pendente",
      valor_total: 199.9,
      usuario: { nome: "Maria Silva" },
      itens: [
        {
          quantidade: 2,
          valor: 99.95,
          produto_variante: {
            cor: "Azul",
            tamanho: "M",
            imagem_url: "/assets/img/vestido.png",
            produto: { nome: "Vestido Flor" },
          },
        },
      ],
    },
    {
      id: 2,
      status: "pago",
      valor_total: 89.9,
      usuario: { nome: "João Souza" },
      itens: [],
      comprovante_url: "/comprovantes/pedido-2.png",
    },
  ];
}

describe("painel de vendas (vendas.js)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renderiza os cards de venda ao carregar o painel", async () => {
    montarPainel();
    await carregarPainel({ "GET /api/admin/vendas": () => resJson(vendaFixtures()) });

    const cards = document.querySelectorAll(".order-container-card");
    expect(cards).toHaveLength(2);
    expect(document.getElementById("orders-count").textContent).toBe("2");
    expect(document.getElementById("no-orders-message").style.display).toBe("none");

    expect(cards[0].querySelector(".order-id").textContent).toBe("#0001");
    expect(cards[0].querySelector(".order-client-name").textContent).toBe("Maria Silva");
    expect(cards[0].querySelector(".order-status-badge").className).toContain("status-pendente");
    expect(cards[1].querySelector(".order-id").textContent).toBe("#0002");
    expect(cards[1].querySelector(".order-status-badge").className).toContain("status-pago");

    const item = cards[0].querySelector(".order-product-item-row");
    expect(item.querySelector(".cart-nome").textContent).toBe("Vestido Flor");
    expect(item.querySelector(".cart-cor").textContent).toBe("Azul");
    expect(item.querySelector(".cart-tamanho").textContent).toBe("M");
    expect(item.querySelector(".qty-count").textContent).toBe("2");

    // comprovante do segundo card visível; do primeiro, oculto
    expect(cards[1].querySelector(".comprovante-link").style.display).toBe("");
    expect(cards[1].querySelector(".comprovante-link").getAttribute("href")).toBe(
      "/comprovantes/pedido-2.png",
    );
    expect(cards[1].querySelector(".comprovante-remove-btn").style.display).toBe("");
    expect(cards[0].querySelector(".comprovante-link").style.display).toBe("none");
  });

  it("exibe a mensagem de lista vazia quando não há vendas", async () => {
    montarPainel();
    await carregarPainel({ "GET /api/admin/vendas": () => resJson([]) });

    expect(document.querySelectorAll(".order-container-card")).toHaveLength(0);
    expect(document.getElementById("admin-orders-container").innerHTML).toBe("");
    expect(document.getElementById("no-orders-message").style.display).toBe("block");
    expect(document.getElementById("orders-count").textContent).toBe("0");
  });

  it("mostra snackbar de erro quando o carregamento das vendas falha", async () => {
    montarPainel();
    await carregarPainel({
      "GET /api/admin/vendas": () => resJson({ error: "Falha no banco de dados" }, false),
    });

    expect(showSnackbar).toHaveBeenCalledWith("Falha no banco de dados", "invalid");
    expect(document.querySelectorAll(".order-container-card")).toHaveLength(0);
  });

  it("filtra os cards por status ao clicar nas abas", async () => {
    montarPainel();
    await carregarPainel({ "GET /api/admin/vendas": () => resJson(vendaFixtures()) });
    expect(document.querySelectorAll(".order-container-card")).toHaveLength(2);

    document.querySelector('[data-status="pago"]').click();

    const cards = document.querySelectorAll(".order-container-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelector(".order-id").textContent).toBe("#0002");
    expect(document.getElementById("orders-count").textContent).toBe("1");
    expect(document.querySelector('[data-status="pago"]').classList.contains("active")).toBe(true);
    expect(document.querySelector('[data-status="todos"]').classList.contains("active")).toBe(
      false,
    );

    // aba sem resultados reexibe a mensagem de vazio
    document.querySelector('[data-status="enviado"]').click();
    expect(document.querySelectorAll(".order-container-card")).toHaveLength(0);
    expect(document.getElementById("no-orders-message").style.display).toBe("block");
    expect(document.getElementById("orders-count").textContent).toBe("0");
  });

  it("envia PATCH e atualiza o card ao mudar o status no select", async () => {
    montarPainel();
    const fetchMock = await carregarPainel({
      "GET /api/admin/vendas": () => resJson([vendaFixtures()[0]]),
      "PATCH /api/admin/vendas/1/status": () => resJson({ id: 1, status: "enviado" }),
    });

    const select = document.querySelector(".status-change-select");
    expect(select.value).toBe("pendente");
    select.value = "enviado";
    select.dispatchEvent(new Event("change"));
    await flushPromises();

    const patchCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/admin/vendas/1/status",
    );
    expect(patchCall).toBeTruthy();
    expect(patchCall[1]).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    expect(JSON.parse(patchCall[1].body)).toEqual({ status: "enviado" });

    const badge = document.querySelector(".order-status-badge");
    expect(badge.textContent).toBe("enviado");
    expect(badge.className).toContain("status-enviado");
    expect(document.querySelector(".status-change-select").value).toBe("enviado");
    expect(showSnackbar).toHaveBeenCalledWith("Status do pedido #0001 atualizado!", "success");
  });

  it("mostra erro no snackbar e mantém o card quando o PATCH falha", async () => {
    montarPainel();
    await carregarPainel({
      "GET /api/admin/vendas": () => resJson([vendaFixtures()[0]]),
      "PATCH /api/admin/vendas/1/status": () =>
        resJson({ error: "Transição de status inválida" }, false),
    });

    const select = document.querySelector(".status-change-select");
    select.value = "cancelado";
    select.dispatchEvent(new Event("change"));
    await flushPromises();

    expect(showSnackbar).toHaveBeenCalledWith("Transição de status inválida", "invalid");
    expect(document.querySelector(".order-status-badge").textContent).toBe("pendente");
  });

  it("faz upload do comprovante via POST com FormData ao escolher o arquivo", async () => {
    montarPainel();
    const fetchMock = await carregarPainel({
      "GET /api/admin/vendas": () => resJson([vendaFixtures()[0]]),
      "POST /api/admin/vendas/1/comprovante": () =>
        resJson({ id: 1, comprovante_url: "/comprovantes/pedido-1.png" }),
    });

    const input = document.querySelector(".comprovante-input");
    const arquivo = new File(["conteudo-do-arquivo"], "comprovante.png", {
      type: "image/png",
    });
    Object.defineProperty(input, "files", { value: [arquivo], configurable: true });
    input.dispatchEvent(new Event("change"));
    await flushPromises();

    const postCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/admin/vendas/1/comprovante",
    );
    expect(postCall).toBeTruthy();
    expect(postCall[1].method).toBe("POST");
    expect(postCall[1].body).toBeInstanceOf(FormData);
    expect(postCall[1].body.get("comprovante")).toBe(arquivo);

    // link "Ver comprovante" aparece imediatamente, sem recarregar a página
    const link = document.querySelector(".comprovante-link");
    expect(link.style.display).toBe("");
    expect(link.getAttribute("href")).toBe("/comprovantes/pedido-1.png");
    expect(showSnackbar).toHaveBeenCalledWith(
      "Comprovante do pedido #0001 anexado!",
      "success",
    );
  });

  it("remove o comprovante via DELETE ao confirmar na lixeira", async () => {
    montarPainel();
    const fetchMock = await carregarPainel({
      "GET /api/admin/vendas": () => resJson(vendaFixtures()),
      "DELETE /api/admin/vendas/2/comprovante": () => resJson({ ok: true }),
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const btnRemover = document.querySelectorAll(".comprovante-remove-btn")[1];
    expect(btnRemover.style.display).toBe("");
    btnRemover.click();
    await flushPromises();

    const delCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/admin/vendas/2/comprovante",
    );
    expect(delCall).toBeTruthy();
    expect(delCall[1].method).toBe("DELETE");
    expect(confirmSpy).toHaveBeenCalledWith("Remover o comprovante deste pedido?");
    expect(showSnackbar).toHaveBeenCalledWith("Comprovante removido.", "success");

    // link e lixeira voltam a ficar ocultos após o re-render
    expect(document.querySelectorAll(".comprovante-link")[1].style.display).toBe("none");
    expect(document.querySelectorAll(".comprovante-remove-btn")[1].style.display).toBe("none");
  });

  it("não remove o comprovante quando o admin cancela a confirmação", async () => {
    montarPainel();
    const fetchMock = await carregarPainel({
      "GET /api/admin/vendas": () => resJson(vendaFixtures()),
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);

    document.querySelectorAll(".comprovante-remove-btn")[1].click();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1); // somente o GET inicial
    expect(document.querySelectorAll(".comprovante-link")[1].style.display).toBe("");
  });

  it("mostra erro no snackbar e mantém o comprovante quando o DELETE falha", async () => {
    montarPainel();
    await carregarPainel({
      "GET /api/admin/vendas": () => resJson(vendaFixtures()),
      "DELETE /api/admin/vendas/2/comprovante": () =>
        resJson({ error: "Arquivo não encontrado" }, false),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    document.querySelectorAll(".comprovante-remove-btn")[1].click();
    await flushPromises();

    expect(showSnackbar).toHaveBeenCalledWith("Arquivo não encontrado", "invalid");
    expect(document.querySelectorAll(".comprovante-link")[1].style.display).toBe("");
  });

  it("não quebra o painel quando os templates de card não estão no DOM", async () => {
    montarPainel({ comTemplates: false });
    await carregarPainel({ "GET /api/admin/vendas": () => resJson(vendaFixtures()) });

    expect(document.getElementById("orders-count").textContent).toBe("2");
    expect(document.querySelectorAll(".order-container-card")).toHaveLength(0);
  });
});
