// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("/js/global/snackbar.js", () => ({ showSnackbar: vi.fn() }));
import { showSnackbar } from "/js/global/snackbar.js";
import "../../public/js/contact.js";

// O contact.js registra o listener de DOMContentLoaded uma única vez no import.
// O document do jsdom é compartilhado entre os testes, então o módulo NÃO é
// re-importado por teste (evita acúmulo de listeners e fetch disparado N vezes):
// cada teste remonta o HTML e re-dispare o DOMContentLoaded para reconfigurar o
// formulário recém-criado.
const FORM_HTML = `
  <form id="contact-store-form">
    <input type="text" id="contact-nome" />
    <input type="email" id="contact-email" />
    <input type="text" id="contact-assunto" />
    <textarea id="contact-mensagem"></textarea>
    <button type="submit">Enviar mensagem</button>
  </form>
`;

function montarPagina({ comFormulario = true } = {}) {
  document.body.innerHTML = comFormulario ? FORM_HTML : "<main></main>";
  document.dispatchEvent(new Event("DOMContentLoaded"));
}

function preencherForm({ nome, email, assunto, mensagem }) {
  document.getElementById("contact-nome").value = nome;
  document.getElementById("contact-email").value = email;
  document.getElementById("contact-assunto").value = assunto;
  document.getElementById("contact-mensagem").value = mensagem;
}

function enviarFormulario() {
  document
    .getElementById("contact-store-form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function mockarFetch({
  ok = true,
  status = 201,
  json = {},
  jsonLancaErro = false,
  rejeitar = false,
} = {}) {
  const fetchMock = vi.fn(async () => {
    if (rejeitar) throw new Error("rede fora do ar");
    return {
      ok,
      status,
      json: async () => {
        if (jsonLancaErro) throw new Error("resposta não é JSON válido");
        return json;
      },
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function aguardarAsync() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

let consoleErrorSpy;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  showSnackbar.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  consoleErrorSpy.mockRestore();
  document.body.innerHTML = "";
});

describe("contact.js — formulário público de contato", () => {
  it("não faz nada quando o formulário de contato não existe na página", async () => {
    const fetchMock = mockarFetch();
    montarPagina({ comFormulario: false });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(showSnackbar).not.toHaveBeenCalled();
  });

  it("envia POST para /api/contatos com nome, email, assunto e mensagem sem espaços extras", async () => {
    const fetchMock = mockarFetch();
    montarPagina();

    preencherForm({
      nome: "  Maria Silva  ",
      email: " maria@exemplo.com ",
      assunto: "  Dúvida sobre pedido  ",
      mensagem: "  Olá! Gostaria de saber o prazo de entrega.  ",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith("Enviando sua mensagem...", "info");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contatos");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(opts.body)).toEqual({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      assunto: "Dúvida sobre pedido",
      mensagem: "Olá! Gostaria de saber o prazo de entrega.",
    });
  });

  it("mostra snackbar de sucesso e limpa o formulário quando a API responde ok", async () => {
    mockarFetch();
    montarPagina();

    preencherForm({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      assunto: "Dúvida sobre pedido",
      mensagem: "Olá! Gostaria de saber o prazo de entrega.",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith(
      "Mensagem enviada com sucesso! Breve entraremos em contato.",
      "success",
    );
    expect(document.getElementById("contact-nome").value).toBe("");
    expect(document.getElementById("contact-email").value).toBe("");
    expect(document.getElementById("contact-assunto").value).toBe("");
    expect(document.getElementById("contact-mensagem").value).toBe("");
  });

  it("mostra a mensagem vinda do servidor e mantém os dados quando a API responde erro", async () => {
    mockarFetch({ ok: false, status: 400, json: { error: "Assunto muito curto." } });
    montarPagina();

    preencherForm({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      assunto: "Oi",
      mensagem: "Quero falar com vocês.",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith("Assunto muito curto.", "error");
    expect(document.getElementById("contact-nome").value).toBe("Maria Silva");
    expect(document.getElementById("contact-assunto").value).toBe("Oi");
  });

  it("usa mensagem padrão quando o servidor responde erro sem campo de mensagem", async () => {
    mockarFetch({ ok: false, status: 500, json: {} });
    montarPagina();

    preencherForm({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      assunto: "Dúvida",
      mensagem: "Olá!",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith("Falha ao enviar a mensagem.", "error");
  });

  it("usa mensagem padrão quando a resposta de erro não é um JSON válido", async () => {
    mockarFetch({ ok: false, status: 500, jsonLancaErro: true });
    montarPagina();

    preencherForm({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      assunto: "Dúvida",
      mensagem: "Olá!",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith("Falha ao enviar a mensagem.", "error");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("mostra erro de conexão quando o fetch rejeita", async () => {
    mockarFetch({ rejeitar: true });
    montarPagina();

    preencherForm({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      assunto: "Dúvida",
      mensagem: "Olá!",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith("Erro ao conectar com o servidor.", "error");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("desabilita o botão de enviar durante a requisição e o reabilita ao terminar", async () => {
    let resolver;
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    montarPagina();

    const botao = document.querySelector('button[type="submit"]');
    preencherForm({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      assunto: "Dúvida",
      mensagem: "Olá!",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(botao.disabled).toBe(true);

    resolver({ ok: true, status: 201, json: async () => ({}) });
    await aguardarAsync();

    expect(botao.disabled).toBe(false);
    expect(showSnackbar).toHaveBeenCalledWith(
      "Mensagem enviada com sucesso! Breve entraremos em contato.",
      "success",
    );
  });
});
