// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// O alias /js → public/js do vitest.config.js resolve o caminho, mas o Vite 7
// bloqueia import estático de arquivos dentro de /public ("Cannot import
// non-asset file ..."). Como esta tarefa só permite criar este arquivo de
// teste, o cart.js é carregado como módulo ESM nativo (data: URL) com o import
// absoluto do snackbar substituído por um módulo-mock (também data: URL) que
// expõe o mesmo vi.fn usado nas asserções — preservando o comportamento real
// do módulo (listener de DOMContentLoaded, estado e funções exportadas).
function resolverCaminhoPublicJs(arquivo) {
  const candidatos = [];
  try {
    const urlBase = new URL(`../../public/${arquivo}`, import.meta.url);
    candidatos.push(
      urlBase.protocol === "file:"
        ? fileURLToPath(urlBase)
        : decodeURIComponent(urlBase.pathname)
    );
  } catch {
    // import.meta.url pode não ser resolvível sob o runner do vitest
  }
  candidatos.push(path.resolve(process.cwd(), "public", arquivo));
  for (const candidato of candidatos) {
    if (fs.existsSync(candidato)) return candidato;
  }
  throw new Error(`Não encontrei public/${arquivo} (candidatos: ${candidatos.join(", ")})`);
}

const caminhoCartJs = resolverCaminhoPublicJs("js/cart.js");
const fonteCartJs = fs.readFileSync(caminhoCartJs, "utf8");

globalThis.__showSnackbarMock = vi.fn();
const urlMockSnackbar =
  "data:text/javascript," +
  encodeURIComponent("export const showSnackbar = globalThis.__showSnackbarMock;");

const fonteCartJsAdaptada = fonteCartJs.replace(
  'import { showSnackbar } from "/js/global/snackbar.js";',
  `import { showSnackbar } from "${urlMockSnackbar}";`
);

const urlCartJs =
  "data:text/javascript;base64," +
  Buffer.from(fonteCartJsAdaptada, "utf8").toString("base64");

const { adicionarAoCarrinho } = await import(urlCartJs);
const showSnackbar = globalThis.__showSnackbarMock;

const CART_STORAGE_KEY = "carrinho";

const PAGINA_CARRINHO = `
<main class="cart-wrapper">
  <section class="cart-items-section">
    <div id="cart-items-container" class="cart-items-list"></div>
    <div id="empty-cart-message" class="empty-cart-box" style="display: none">
      <h2>Seu carrinho está vazio</h2>
    </div>
    <template id="template-cart-item">
      <div class="cart-item-card">
        <div class="item-main-info">
          <div class="item-image">
            <img class="cart-img" src="" alt="Produto" />
          </div>
          <div class="item-details">
            <h3 class="cart-nome"></h3>
            <div class="item-specs">
              <span>Cor: <strong class="cart-cor"></strong></span>
              <span>Tamanho: <strong class="cart-tamanho"></strong></span>
            </div>
            <p class="cart-preco-unitario"></p>
          </div>
        </div>
        <div class="item-actions">
          <div class="quantity-selector">
            <button class="btn-qty-minus">-</button>
            <input type="number" class="cart-qty-input" value="1" readonly />
            <button class="btn-qty-plus">+</button>
          </div>
          <div class="price-remove-block">
            <span class="cart-subtotal-item"></span>
            <button class="btn-remove-item" title="Remover item">
              <i class="far fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </template>
  </section>
  <aside class="cart-summary-sidebar">
    <div class="summary-card">
      <h2>Resumo do Pedido</h2>
      <span id="summary-subtotal">R$ 0,00</span>
      <span id="summary-total">R$ 0,00</span>
      <button id="btn-checkout" class="btn-primary checkout-btn">
        Finalizar Compra
      </button>
    </div>
  </aside>
</main>
<div id="checkout-instructions-modal" class="checkout-modal-overlay" style="display: none">
  <div class="checkout-modal-card">
    <header class="checkout-modal-header">
      <h2>Pedido Pré-Reservado!</h2>
      <button id="btn-close-checkout-modal" class="checkout-close-x">&times;</button>
    </header>
    <div class="checkout-modal-body">
      <p>
        Seu pedido <strong id="modal-txt-id">#0000</strong> de
        <strong id="modal-txt-total">R$ 0,00</strong> foi gerado com sucesso.
      </p>
    </div>
    <footer class="checkout-modal-footer">
      <button type="button" id="btn-modal-whatsapp-redirect" class="checkout-btn-submit-modal">
        Ir para o WhatsApp e Chamar Equipe
      </button>
    </footer>
  </div>
</div>
`;

const ITEM_VESTIDO = {
  id_variante: 101,
  nome: "Vestido Floral Midi",
  cor: "Rosa",
  tamanho: "M",
  preco: 89.9,
  quantidade: 2,
  imagem_url: "",
};

const ITEM_SAIA = {
  id_variante: 202,
  nome: "Saia Jeans",
  cor: "Azul",
  tamanho: "P",
  preco: 59.9,
  quantidade: 1,
  imagem_url: "/img/saia.png",
};

function carrinhoDoStorage() {
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function montarPaginaCarrinho() {
  document.body.innerHTML = PAGINA_CARRINHO;
  document.dispatchEvent(new Event("DOMContentLoaded"));
}

function prepararCarrinho(itens) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itens));
  montarPaginaCarrinho();
}

function clicar(seletor) {
  document.querySelector(seletor).click();
}

// toLocaleString("pt-BR") usa espaço não separável (U+00A0) em valores
// monetários ("R$\u00A0129,90") — normaliza para espaço comum nas asserções.
function normalizarTexto(texto) {
  return texto.replace(/\u00A0/g, " ");
}

async function aguardarAssincrono() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  document.body.innerHTML = "";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("adicionarAoCarrinho", () => {
  it("adiciona um item novo ao localStorage e mostra snackbar de sucesso", () => {
    adicionarAoCarrinho(ITEM_VESTIDO);

    expect(carrinhoDoStorage()).toEqual([ITEM_VESTIDO]);
    expect(showSnackbar).toHaveBeenCalledWith(
      "Vestido Floral Midi adicionado ao carrinho!",
      "success"
    );
  });

  it("soma a quantidade quando a mesma variante já está no carrinho (dedupe por id_variante)", () => {
    adicionarAoCarrinho(ITEM_VESTIDO);
    adicionarAoCarrinho({ ...ITEM_VESTIDO, quantidade: 1 });

    const itens = carrinhoDoStorage();
    expect(itens).toHaveLength(1);
    expect(itens[0].id_variante).toBe(101);
    expect(itens[0].quantidade).toBe(3);
  });

  it("mantém variantes diferentes como itens separados", () => {
    adicionarAoCarrinho(ITEM_VESTIDO);
    adicionarAoCarrinho(ITEM_SAIA);

    expect(carrinhoDoStorage()).toHaveLength(2);
  });
});

describe("renderização do carrinho", () => {
  it("carrinho vazio esconde a lista, mostra a mensagem de vazio e desabilita o checkout", () => {
    montarPaginaCarrinho();

    const container = document.getElementById("cart-items-container");
    expect(container.style.display).toBe("none");
    expect(container.children).toHaveLength(0);
    expect(document.getElementById("empty-cart-message").style.display).toBe("block");
    expect(document.getElementById("btn-checkout").disabled).toBe(true);
    expect(normalizarTexto(document.getElementById("summary-total").textContent)).toBe("R$ 0,00");
  });

  it("renderiza os itens salvos com dados, imagem, subtotal e total do resumo", () => {
    prepararCarrinho([ITEM_VESTIDO, ITEM_SAIA]);

    const container = document.getElementById("cart-items-container");
    expect(container.style.display).toBe("flex");
    expect(container.querySelectorAll(".cart-item-card")).toHaveLength(2);

    const cardVestido = container.querySelector(
      '.cart-item-card[data-id-variante="101"]'
    );
    expect(cardVestido.dataset.idVariante).toBe("101");
    expect(cardVestido.querySelector(".cart-nome").textContent).toBe(
      "Vestido Floral Midi"
    );
    expect(cardVestido.querySelector(".cart-cor").textContent).toBe("Rosa");
    expect(cardVestido.querySelector(".cart-tamanho").textContent).toBe("M");
    expect(cardVestido.querySelector(".cart-qty-input").value).toBe("2");
    expect(normalizarTexto(cardVestido.querySelector(".cart-preco-unitario").textContent)).toBe(
      "Unid: R$ 89,90"
    );
    expect(normalizarTexto(cardVestido.querySelector(".cart-subtotal-item").textContent)).toBe(
      "R$ 179,80"
    );
    expect(cardVestido.querySelector(".cart-img").getAttribute("src")).toBe(
      "/assets/img/logo.png"
    );

    const cardSaia = container.querySelector('.cart-item-card[data-id-variante="202"]');
    expect(cardSaia.querySelector(".cart-img").getAttribute("src")).toBe("/img/saia.png");

    expect(normalizarTexto(document.getElementById("summary-total").textContent)).toBe("R$ 239,70");
    expect(normalizarTexto(document.getElementById("summary-subtotal").textContent)).toBe("R$ 239,70");
    expect(document.getElementById("btn-checkout").disabled).toBe(false);
  });

  it("trata JSON corrompido no localStorage como carrinho vazio", () => {
    localStorage.setItem(CART_STORAGE_KEY, "{json quebrado");
    montarPaginaCarrinho();

    expect(document.getElementById("cart-items-container").style.display).toBe("none");
    expect(document.getElementById("empty-cart-message").style.display).toBe("block");
  });
});

describe("botões de quantidade e remoção", () => {
  it("botão + incrementa a quantidade no storage, no input, no subtotal e no total", () => {
    prepararCarrinho([ITEM_VESTIDO]);
    clicar('.cart-item-card[data-id-variante="101"] .btn-qty-plus');

    expect(carrinhoDoStorage()[0].quantidade).toBe(3);
    const card = document.querySelector('.cart-item-card[data-id-variante="101"]');
    expect(card.querySelector(".cart-qty-input").value).toBe("3");
    expect(normalizarTexto(card.querySelector(".cart-subtotal-item").textContent)).toBe("R$ 269,70");
    expect(normalizarTexto(document.getElementById("summary-total").textContent)).toBe("R$ 269,70");
  });

  it("botão − decrementa a quantidade mas nunca fica abaixo de 1", () => {
    prepararCarrinho([ITEM_VESTIDO]);
    clicar('.cart-item-card[data-id-variante="101"] .btn-qty-minus');
    expect(carrinhoDoStorage()[0].quantidade).toBe(1);

    clicar('.cart-item-card[data-id-variante="101"] .btn-qty-minus');
    expect(carrinhoDoStorage()[0].quantidade).toBe(1);
    expect(
      document.querySelector('.cart-item-card[data-id-variante="101"] .cart-qty-input').value
    ).toBe("1");
  });

  it("remover um item mantém os demais e recalcula o total", () => {
    prepararCarrinho([ITEM_VESTIDO, ITEM_SAIA]);
    clicar('.cart-item-card[data-id-variante="101"] .btn-remove-item');

    const itens = carrinhoDoStorage();
    expect(itens).toHaveLength(1);
    expect(itens[0].id_variante).toBe(202);
    expect(document.querySelectorAll(".cart-item-card")).toHaveLength(1);
    expect(normalizarTexto(document.getElementById("summary-total").textContent)).toBe("R$ 59,90");
    expect(showSnackbar).toHaveBeenCalledWith(
      "Vestido Floral Midi removido do carrinho.",
      "info"
    );
  });

  it("remover o último item volta ao estado vazio e desabilita o checkout", () => {
    prepararCarrinho([ITEM_VESTIDO]);
    clicar('.cart-item-card[data-id-variante="101"] .btn-remove-item');

    expect(carrinhoDoStorage()).toHaveLength(0);
    expect(document.getElementById("cart-items-container").style.display).toBe("none");
    expect(document.getElementById("empty-cart-message").style.display).toBe("block");
    expect(document.getElementById("btn-checkout").disabled).toBe(true);
  });
});

describe("finalização do pedido (checkout)", () => {
  it("não envia requisição quando o carrinho está vazio", () => {
    montarPaginaCarrinho();
    const btn = document.getElementById("btn-checkout");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("envia POST /api/vendas com id_variante e quantidade numéricos", async () => {
    prepararCarrinho([ITEM_VESTIDO]);
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, valor_total: "179.80", usuario: { nome: "Drii" } }),
    });

    document.getElementById("btn-checkout").click();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/vendas");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({
      itens: [{ id_variante: 101, quantidade: 2 }],
    });
  });

  it("sucesso limpa o carrinho, volta ao estado vazio e abre o modal com id, total e cliente", async () => {
    prepararCarrinho([ITEM_VESTIDO]);
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 7, valor_total: "179.80", usuario: { nome: "Drii" } }),
    });

    document.getElementById("btn-checkout").click();

    const modal = document.getElementById("checkout-instructions-modal");
    await vi.waitFor(() => expect(modal.style.display).toBe("flex"));

    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
    expect(document.getElementById("cart-items-container").style.display).toBe("none");
    expect(document.getElementById("empty-cart-message").style.display).toBe("block");
    expect(document.getElementById("modal-txt-id").textContent).toBe("#0007");
    expect(
      normalizarTexto(document.getElementById("modal-txt-total").textContent)
    ).toBe("R$ 179,80");
    expect(document.getElementById("btn-checkout").disabled).toBe(true);
    expect(showSnackbar).toHaveBeenCalledWith("Processando seu pedido, aguarde...", "info");
  });

  it("401 mantém o carrinho salvo no localStorage e não abre o modal", async () => {
    prepararCarrinho([ITEM_VESTIDO]);
    fetch.mockResolvedValueOnce({ status: 401 });

    document.getElementById("btn-checkout").click();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await aguardarAssincrono();

    expect(carrinhoDoStorage()).toHaveLength(1);
    expect(carrinhoDoStorage()[0].id_variante).toBe(101);
    expect(
      document.getElementById("checkout-instructions-modal").style.display
    ).toBe("none");
    expect(showSnackbar).toHaveBeenCalledWith("Processando seu pedido, aguarde...", "info");
  });

  it("erro de validação mostra a mensagem do servidor e reabilita o botão", async () => {
    prepararCarrinho([ITEM_VESTIDO]);
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: "Estoque insuficiente" }),
    });

    document.getElementById("btn-checkout").click();
    await vi.waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith("Estoque insuficiente", "invalid")
    );

    expect(document.getElementById("btn-checkout").disabled).toBe(false);
    expect(carrinhoDoStorage()).toHaveLength(1);
  });

  it("falha de rede mostra mensagem genérica e reabilita o botão", async () => {
    prepararCarrinho([ITEM_VESTIDO]);
    fetch.mockRejectedValueOnce(new Error("sem conexão"));

    document.getElementById("btn-checkout").click();
    await vi.waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith(
        "Falha ao finalizar o pedido. Tente novamente.",
        "invalid"
      )
    );

    expect(document.getElementById("btn-checkout").disabled).toBe(false);
    expect(carrinhoDoStorage()).toHaveLength(1);
  });
});

describe("modal de instruções pós-checkout", () => {
  it("botão do WhatsApp esconde o modal e abre o link com código e total da venda", async () => {
    prepararCarrinho([ITEM_VESTIDO]);
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 7, valor_total: "179.80", usuario: { nome: "Drii" } }),
    });

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    document.getElementById("btn-checkout").click();
    const modal = document.getElementById("checkout-instructions-modal");
    await vi.waitFor(() => expect(modal.style.display).toBe("flex"));

    document.getElementById("btn-modal-whatsapp-redirect").click();

    expect(modal.style.display).toBe("none");
    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, alvo] = openSpy.mock.calls[0];
    expect(alvo).toBe("_blank");
    expect(url).toContain("https://api.whatsapp.com/send?phone=551994974618");
    expect(url).toContain("%230007");
    expect(url).toContain("Drii");
  });

  it("botão fechar esconde o modal sem abrir o WhatsApp", async () => {
    prepararCarrinho([ITEM_VESTIDO]);
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 7, valor_total: "179.80", usuario: { nome: "Drii" } }),
    });

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    document.getElementById("btn-checkout").click();
    const modal = document.getElementById("checkout-instructions-modal");
    await vi.waitFor(() => expect(modal.style.display).toBe("flex"));

    document.getElementById("btn-close-checkout-modal").click();

    expect(modal.style.display).toBe("none");
    expect(openSpy).not.toHaveBeenCalled();
  });
});

describe("guarda para páginas sem os elementos do carrinho", () => {
  it("executa sem quebrar em página sem os elementos do carrinho", () => {
    document.body.innerHTML = "<main><h1>Outra página</h1></main>";

    expect(() => {
      document.dispatchEvent(new Event("DOMContentLoaded"));
    }).not.toThrow();
  });
});
