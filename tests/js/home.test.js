// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("/js/global/product-modal.js", () => ({ openProductModal: vi.fn() }));
vi.mock("/js/global/snackbar.js", () => ({ showSnackbar: vi.fn() }));

// Capturado no topo (reino do jsdom do ambiente) antes de qualquer reassign de document.
const envImplementation = document.implementation;

function montarPagina(html) {
  const doc = envImplementation.createHTMLDocument();
  doc.body.innerHTML = html;
  // Redefine (não atribui) para não cair no setter do populateGlobal, que tenta
  // propagar para window.document (getter-only no jsdom) e lança.
  Object.defineProperty(globalThis, "document", {
    value: doc,
    configurable: true,
    writable: true,
    enumerable: true,
  });
  return doc;
}

function cardsHtml() {
  return `
    <div class="product-card-component" data-id="7">Vestido Floral</div>
    <div class="product-card-component" data-id="8">Calça Jeans</div>
    <div class="product-card-component" data-id="x">Card sem id válido</div>
  `;
}

const produto = {
  id: 7,
  nome: "Vestido Floral",
  preco: 129.9,
  categoria: { id: 3, nome: "Vestidos" },
};

const produtoSemCategoria = {
  id: 8,
  nome: "Calça Jeans",
  preco: 199.9,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("home.js — interações dos cards de produto", () => {
  it("clique em um card busca o produto na API e abre o modal com a categoria como string", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ...produto }) }))
    );

    const doc = montarPagina(cardsHtml());
    const modalUrl = "/js/global/product-modal.js";
    const { openProductModal } = await import(/* @vite-ignore */ modalUrl);
    const homeUrl = "/js/home.js";
    await import(/* @vite-ignore */ homeUrl);

    doc.dispatchEvent(new Event("DOMContentLoaded"));
    doc.querySelector('[data-id="7"]').click();

    await vi.waitFor(() => expect(openProductModal).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/produtos/7");
    expect(openProductModal).toHaveBeenCalledWith({
      ...produto,
      categoria: "Vestidos",
    });
  });

  it("segundo clique no mesmo card reutiliza o cache e não refaz o fetch", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ...produto }) }))
    );

    const doc = montarPagina(cardsHtml());
    const modalUrl = "/js/global/product-modal.js";
    const { openProductModal } = await import(/* @vite-ignore */ modalUrl);
    const homeUrl = "/js/home.js";
    await import(/* @vite-ignore */ homeUrl);

    doc.dispatchEvent(new Event("DOMContentLoaded"));
    const card = doc.querySelector('[data-id="7"]');

    card.click();
    await vi.waitFor(() => expect(openProductModal).toHaveBeenCalledTimes(1));

    card.click();
    await vi.waitFor(() => expect(openProductModal).toHaveBeenCalledTimes(2));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(openProductModal).toHaveBeenNthCalledWith(1, {
      ...produto,
      categoria: "Vestidos",
    });
    expect(openProductModal).toHaveBeenNthCalledWith(2, {
      ...produto,
      categoria: "Vestidos",
    });
  });

  it("produto sem categoria abre o modal com categoria null", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ ...produtoSemCategoria }),
      }))
    );

    const doc = montarPagina(cardsHtml());
    const modalUrl = "/js/global/product-modal.js";
    const { openProductModal } = await import(/* @vite-ignore */ modalUrl);
    const homeUrl = "/js/home.js";
    await import(/* @vite-ignore */ homeUrl);

    doc.dispatchEvent(new Event("DOMContentLoaded"));
    doc.querySelector('[data-id="8"]').click();

    await vi.waitFor(() => expect(openProductModal).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/produtos/8");
    expect(openProductModal).toHaveBeenCalledWith({
      ...produtoSemCategoria,
      categoria: null,
    });
  });

  it("resposta HTTP com erro exibe snackbar de erro e não abre o modal", async () => {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    );

    const doc = montarPagina(cardsHtml());
    const modalUrl = "/js/global/product-modal.js";
    const { openProductModal } = await import(/* @vite-ignore */ modalUrl);
    const snackbarUrl = "/js/global/snackbar.js";
    const { showSnackbar } = await import(/* @vite-ignore */ snackbarUrl);
    const homeUrl = "/js/home.js";
    await import(/* @vite-ignore */ homeUrl);

    doc.dispatchEvent(new Event("DOMContentLoaded"));
    doc.querySelector('[data-id="7"]').click();

    await vi.waitFor(() => expect(showSnackbar).toHaveBeenCalledTimes(1));
    expect(showSnackbar).toHaveBeenCalledWith("Erro ao carregar o produto.", "error");
    expect(openProductModal).not.toHaveBeenCalled();
  });

  it("falha de rede no fetch exibe snackbar de erro e não abre o modal", async () => {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("rede indisponível");
      })
    );

    const doc = montarPagina(cardsHtml());
    const modalUrl = "/js/global/product-modal.js";
    const { openProductModal } = await import(/* @vite-ignore */ modalUrl);
    const snackbarUrl = "/js/global/snackbar.js";
    const { showSnackbar } = await import(/* @vite-ignore */ snackbarUrl);
    const homeUrl = "/js/home.js";
    await import(/* @vite-ignore */ homeUrl);

    doc.dispatchEvent(new Event("DOMContentLoaded"));
    doc.querySelector('[data-id="7"]').click();

    await vi.waitFor(() => expect(showSnackbar).toHaveBeenCalledTimes(1));
    expect(showSnackbar).toHaveBeenCalledWith("Erro ao carregar o produto.", "error");
    expect(openProductModal).not.toHaveBeenCalled();
  });

  it("clique em card sem data-id válido não dispara busca na API", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());

    const doc = montarPagina(cardsHtml());
    const homeUrl = "/js/home.js";
    await import(/* @vite-ignore */ homeUrl);

    doc.dispatchEvent(new Event("DOMContentLoaded"));
    doc.querySelector('[data-id="x"]').click();

    expect(fetch).not.toHaveBeenCalled();
  });
});
