// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O script alvo importa "/js/global/snackbar.js" (arquivo dentro de /public):
// o guard do Vite impede que o caminho absoluto seja importado direto, então
// mockamos pelo MESMO especificador e importamos o contact_adm.js por caminho
// relativo (padrão validado em produtos.test.js). O showSnackbar importado
// abaixo é o vi.fn do mock — usado nas asserções.
vi.mock("/js/global/snackbar.js", () => ({ showSnackbar: vi.fn() }));

import { showSnackbar } from "/js/global/snackbar.js";

// PITFALL: o document do jsdom é compartilhado entre os testes do arquivo.
// Importamos o módulo UMA vez no topo (registra UM listener de DOMContentLoaded
// no document) e re-dispare o evento por teste; nunca usar vi.resetModules +
// re-import por teste (acumularia listeners duplicados no document).
await import("../../public/js/contact_adm.js");

// ---------------------------------------------------------------------------
// Fixtures — reproduz o HTML server-rendered de /admin/contatos (Handlebars)
// ---------------------------------------------------------------------------

const CARDS_PADRAO = [
  { id: 1, respondida: "false", nome: "Ana Souza", mensagem: "Quero saber sobre a troca." },
  { id: 2, respondida: "true", nome: "Bia Lima", mensagem: "Amei a loja!" },
  { id: 3, respondida: "false", nome: "Carla Dias", mensagem: "Sugiro mais tamanhos." },
];

function htmlCard({ id, respondida, nome, mensagem }) {
  // O servidor só renderiza o footer (botão de marcar) quando !respondida
  const footer = respondida === "true"
    ? ""
    : `
      <footer class="message-footer">
        <button type="button" class="btn-read-action">Marcar como Respondida</button>
      </footer>`;
  return `
    <section class="message-card" data-id="${id}" data-respondida="${respondida}">
      <header class="message-header">
        <div>
          <h2 class="client-name">${nome}</h2>
          <h3 class="client-email">${nome.toLowerCase().replace(" ", ".")}@exemplo.com</h3>
        </div>
        <span class="badge-subject">Dúvida</span>
      </header>
      <div class="message-body">
        <p class="message-text">${mensagem}</p>
      </div>
      ${footer}
    </section>`;
}

function montarPagina(cards = CARDS_PADRAO) {
  document.body.innerHTML = `
<main class="admin-crud-layout">
  <header class="admin-dashboard-header">
    <div class="counter-badge-wrapper">
      Mensagens na Aba: <span id="pending-count">0</span>
    </div>
  </header>
  <section class="admin-filters-wrapper">
    <button type="button" class="status-tab active" data-status="pendentes">Pendentes</button>
    <button type="button" class="status-tab" data-status="respondidas">Respondidas</button>
  </section>
  <div id="messages-grid-container" class="messages-grid">
    ${cards.map(htmlCard).join("\n")}
  </div>
  <div id="empty-messages-alert" class="empty-dashboard-state" style="display: none">
    <i class="fas fa-check-circle"></i>
    <h3>Caixa de entrada limpa!</h3>
    <p>Nenhuma mensagem pendente de resposta no momento.</p>
  </div>
</main>`;
}

function carregarPagina(cards = CARDS_PADRAO) {
  montarPagina(cards);
  document.dispatchEvent(new Event("DOMContentLoaded"));
}

function card(id) {
  return document.querySelector(`.message-card[data-id="${id}"]`);
}

function botaoDoCard(id) {
  return card(id)?.querySelector(".btn-read-action");
}

function clicarAba(status) {
  document.querySelector(`.status-tab[data-status="${status}"]`).click();
}

function contador() {
  return document.getElementById("pending-count").textContent;
}

function estadoVazio() {
  return document.getElementById("empty-messages-alert");
}

async function aguardarAsync() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

let fetchMock;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  // jsdom não tem Response nativo: stub de fetch devolve objeto simples
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("contact_adm.js — painel de mensagens de contato (admin)", () => {
  describe("filtro por aba", () => {
    it("na carga inicial, mostra apenas os cards pendentes, esconde os respondidos e atualiza o contador", () => {
      carregarPagina();

      expect(card(1).style.display).toBe("");
      expect(card(2).style.display).toBe("none");
      expect(card(3).style.display).toBe("");
      expect(contador()).toBe("2");
      expect(estadoVazio().style.display).toBe("none");
    });

    it("ao clicar na aba Respondidas, mostra só os cards respondidos, esconde os botões de marcar e move a classe active", () => {
      carregarPagina();
      clicarAba("respondidas");

      expect(card(1).style.display).toBe("none");
      expect(card(2).style.display).toBe("");
      expect(card(3).style.display).toBe("none");
      expect(contador()).toBe("1");
      expect(estadoVazio().style.display).toBe("none");

      // Na aba respondidas os rodapés (botões de marcar) ficam ocultos
      expect(card(1).querySelector(".message-footer").style.display).toBe("none");
      expect(card(3).querySelector(".message-footer").style.display).toBe("none");

      expect(
        document.querySelector('.status-tab[data-status="respondidas"]').classList.contains("active")
      ).toBe(true);
      expect(
        document.querySelector('.status-tab[data-status="pendentes"]').classList.contains("active")
      ).toBe(false);
    });

    it("volta a mostrar os pendentes (com os botões) ao clicar de novo na aba Pendentes", () => {
      carregarPagina();
      clicarAba("respondidas");
      clicarAba("pendentes");

      expect(card(1).style.display).toBe("");
      expect(card(2).style.display).toBe("none");
      expect(card(3).style.display).toBe("");
      expect(card(1).querySelector(".message-footer").style.display).toBe("");
      expect(card(3).querySelector(".message-footer").style.display).toBe("");
      expect(contador()).toBe("2");
      expect(estadoVazio().style.display).toBe("none");
      expect(
        document.querySelector('.status-tab[data-status="pendentes"]').classList.contains("active")
      ).toBe(true);
    });

    it("mostra o estado vazio de pendentes quando não há cards pendentes", () => {
      const soRespondidos = CARDS_PADRAO.filter((c) => c.respondida === "true");
      carregarPagina(soRespondidos);

      expect(contador()).toBe("0");
      expect(estadoVazio().style.display).toBe("flex");
      expect(estadoVazio().querySelector("p").textContent).toBe(
        "Nenhuma mensagem pendente de resposta no momento."
      );
    });

    it("mostra o estado vazio de respondidas com a mensagem específica da aba", () => {
      const soPendentes = CARDS_PADRAO.filter((c) => c.respondida === "false");
      carregarPagina(soPendentes);
      clicarAba("respondidas");

      expect(contador()).toBe("0");
      expect(estadoVazio().style.display).toBe("flex");
      expect(estadoVazio().querySelector("p").textContent).toBe(
        "Você ainda não respondeu nenhuma mensagem de contato."
      );
    });
  });

  describe("marcar como respondida (PATCH)", () => {
    it("envia PATCH para /api/admin/contatos/:id com cabeçalho JSON ao clicar no botão do card", async () => {
      carregarPagina();
      clicarAba("pendentes");

      botaoDoCard(1).click();
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      expect(fetchMock).toHaveBeenCalledWith("/api/admin/contatos/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    });

    it("sucesso marca o card como respondida, mostra snackbar e esconde o card na aba Pendentes", async () => {
      carregarPagina();
      clicarAba("pendentes");

      botaoDoCard(1).click();

      await vi.waitFor(() =>
        expect(showSnackbar).toHaveBeenCalledWith(
          "Mensagem marcada como respondida.",
          "success"
        )
      );

      expect(card(1).dataset.respondida).toBe("true");
      expect(card(1).style.display).toBe("none");
      expect(contador()).toBe("1");
      expect(botaoDoCard(1).disabled).toBe(false);
    });

    it("desabilita o botão durante a requisição e reabilita ao final", async () => {
      let concluir;
      fetchMock.mockImplementationOnce(
        () => new Promise((resolve) => { concluir = resolve; })
      );
      carregarPagina();
      clicarAba("pendentes");

      const botao = botaoDoCard(3);
      botao.click();

      expect(botao.disabled).toBe(true);

      concluir({ ok: true, status: 200, json: async () => ({}) });
      await vi.waitFor(() => expect(botao.disabled).toBe(false));
      expect(showSnackbar).toHaveBeenCalledWith(
        "Mensagem marcada como respondida.",
        "success"
      );
    });

    it("mostra a mensagem de erro do servidor quando o PATCH falha", async () => {
      fetchMock.mockImplementationOnce(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "Erro interno ao salvar a mensagem." }),
      }));
      carregarPagina();
      clicarAba("pendentes");

      botaoDoCard(1).click();

      await vi.waitFor(() =>
        expect(showSnackbar).toHaveBeenCalledWith(
          "Erro interno ao salvar a mensagem.",
          "error"
        )
      );
      expect(card(1).dataset.respondida).toBe("false");
      expect(botaoDoCard(1).disabled).toBe(false);
    });

    it("usa mensagem padrão quando o servidor responde erro sem mensagem", async () => {
      fetchMock.mockImplementationOnce(async () => ({
        ok: false,
        status: 400,
        json: async () => ({}),
      }));
      carregarPagina();
      clicarAba("pendentes");

      botaoDoCard(3).click();

      await vi.waitFor(() =>
        expect(showSnackbar).toHaveBeenCalledWith(
          "Falha ao atualizar a mensagem.",
          "error"
        )
      );
      expect(card(3).dataset.respondida).toBe("false");
    });

    it("mostra erro de conexão quando o fetch rejeita", async () => {
      fetchMock.mockRejectedValueOnce(new Error("sem conexão"));
      carregarPagina();
      clicarAba("pendentes");

      botaoDoCard(1).click();

      await vi.waitFor(() =>
        expect(showSnackbar).toHaveBeenCalledWith(
          "Erro ao conectar com o servidor.",
          "error"
        )
      );
      expect(console.error).toHaveBeenCalled();
      expect(card(1).dataset.respondida).toBe("false");
      expect(botaoDoCard(1).disabled).toBe(false);
    });

    it("resposta 401 não marca o card como respondida e não mostra snackbar", async () => {
      // jsdom não navega: troca location por objeto simples para o script
      // poder atribuir href = "/login" sem erro de navegação
      Object.defineProperty(window, "location", {
        value: { href: "" },
        writable: true,
        configurable: true,
      });
      fetchMock.mockImplementationOnce(async () => ({
        ok: false,
        status: 401,
        json: async () => ({}),
      }));
      carregarPagina();
      clicarAba("pendentes");

      const botao = botaoDoCard(1);
      botao.click();

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      await aguardarAsync();

      expect(showSnackbar).not.toHaveBeenCalled();
      expect(card(1).dataset.respondida).toBe("false");
      expect(botao.disabled).toBe(false);
    });
  });

  describe("delegação de clique no container", () => {
    it("clique fora dos botões de ação não dispara requisição", () => {
      carregarPagina();

      document.getElementById("messages-grid-container").click();
      card(1).querySelector(".message-header").click();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("usa o data-id do card clicado quando há vários cards pendentes", async () => {
      carregarPagina();
      clicarAba("pendentes");

      botaoDoCard(3).click();

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/contatos/3", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(card(1).dataset.respondida).toBe("false");
    });
  });

  it("executa sem quebrar em página sem o painel de contatos", () => {
    document.body.innerHTML = "<main><h1>Outra página</h1></main>";

    expect(() => {
      document.dispatchEvent(new Event("DOMContentLoaded"));
    }).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
