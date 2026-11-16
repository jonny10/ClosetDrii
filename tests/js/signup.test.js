// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("/js/global/snackbar.js", () => ({ showSnackbar: vi.fn() }));

const FORM_HTML = `
  <form id="cadastro-form">
    <input type="text" id="name" />
    <input type="email" id="email" />
    <input type="tel" id="phone" />
    <input type="password" id="password" />
    <input type="password" id="confirmPassword" />
    <button type="submit">Finalizar Cadastro</button>
  </form>
`;

// O document do jsdom persiste entre testes do mesmo arquivo: o DOMContentLoaded
// registrado por um import de signup.js em um teste dispararia de novo nos
// seguintes (vi.resetModules não remove listeners antigos do document). Todo
// addEventListener no document é rastreado e removido no afterEach.
const listenersDocument = [];
const addEventListenerDoc = document.addEventListener.bind(document);
const removeEventListenerDoc = document.removeEventListener.bind(document);
document.addEventListener = function (type, fn, options) {
  listenersDocument.push([type, fn, options]);
  return addEventListenerDoc(type, fn, options);
};

async function carregarSignup(html = FORM_HTML) {
  document.body.innerHTML = html;
  vi.resetModules();
  await import("/js/signup.js");
  const { showSnackbar } = await import("/js/global/snackbar.js");
  document.dispatchEvent(new Event("DOMContentLoaded"));
  return showSnackbar;
}

function preencherForm({ name, email, phone, password, confirmPassword }) {
  document.getElementById("name").value = name;
  document.getElementById("email").value = email;
  document.getElementById("phone").value = phone;
  document.getElementById("password").value = password;
  document.getElementById("confirmPassword").value = confirmPassword;
}

function enviarFormulario() {
  document
    .getElementById("cadastro-form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function mockarFetch({ ok = true, status = 201, json = {}, rejeitar = false } = {}) {
  const fetchMock = vi.fn(async () => {
    if (rejeitar) throw new Error("rede fora do ar");
    return { ok, status, json: async () => json };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function aguardarAsync() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const [type, fn, options] of listenersDocument) {
    removeEventListenerDoc(type, fn, options);
  }
  listenersDocument.length = 0;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("signup.js — cadastro de conta", () => {
  it("não faz nada quando o formulário de cadastro não existe na página", async () => {
    const fetchMock = mockarFetch();
    const showSnackbar = await carregarSignup("<main></main>");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(showSnackbar).not.toHaveBeenCalled();
  });

  it("mostra snackbar de validação e não chama a API quando as senhas não coincidem", async () => {
    const fetchMock = mockarFetch();
    const showSnackbar = await carregarSignup();

    preencherForm({
      name: "Ana Souza",
      email: "ana@exemplo.com",
      phone: "(11) 98765-4321",
      password: "senha123",
      confirmPassword: "senha456",
    });
    enviarFormulario();

    expect(showSnackbar).toHaveBeenCalledWith("As senhas não coincidem!", "invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita senha com menos de 6 caracteres e não chama a API", async () => {
    const fetchMock = mockarFetch();
    const showSnackbar = await carregarSignup();

    preencherForm({
      name: "Ana Souza",
      email: "ana@exemplo.com",
      phone: "(11) 98765-4321",
      password: "abc12",
      confirmPassword: "abc12",
    });
    enviarFormulario();

    expect(showSnackbar).toHaveBeenCalledWith(
      "A senha deve ter no mínimo 6 caracteres.",
      "invalid"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia POST para /api/auth/signup com nome sem espaços e telefone só com dígitos", async () => {
    const fetchMock = mockarFetch();
    await carregarSignup();

    preencherForm({
      name: "  Ana Souza  ",
      email: "ana@exemplo.com",
      phone: "(11) 98765-4321",
      password: "senha123",
      confirmPassword: "senha123",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/signup");
    expect(opts.method).toBe("POST");
    expect(opts.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(opts.body)).toEqual({
      nome: "Ana Souza",
      email: "ana@exemplo.com",
      telefone: "11987654321",
      senha: "senha123",
    });
  });

  it("mostra snackbar de sucesso quando a API aceita o cadastro", async () => {
    mockarFetch({ ok: true, status: 201, json: {} });
    const showSnackbar = await carregarSignup();

    preencherForm({
      name: "Ana Souza",
      email: "ana@exemplo.com",
      phone: "(11) 98765-4321",
      password: "senha123",
      confirmPassword: "senha123",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith("Cadastro realizado com sucesso!", "success");
  });

  it("mostra a mensagem do servidor e mantém o formulário preenchido quando a API responde erro", async () => {
    mockarFetch({
      ok: false,
      status: 409,
      json: { error: "E-mail já cadastrado." },
    });
    const showSnackbar = await carregarSignup();

    preencherForm({
      name: "Ana Souza",
      email: "ana@exemplo.com",
      phone: "(11) 98765-4321",
      password: "senha123",
      confirmPassword: "senha123",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith("E-mail já cadastrado.", "error");
    expect(document.getElementById("name").value).toBe("Ana Souza");
    expect(document.getElementById("email").value).toBe("ana@exemplo.com");
    expect(document.getElementById("phone").value).toBe("(11) 98765-4321");
    expect(document.getElementById("password").value).toBe("senha123");
  });

  it("usa mensagem padrão quando o servidor responde erro sem mensagem", async () => {
    mockarFetch({ ok: false, status: 400, json: {} });
    const showSnackbar = await carregarSignup();

    preencherForm({
      name: "Ana Souza",
      email: "ana@exemplo.com",
      phone: "(11) 98765-4321",
      password: "senha123",
      confirmPassword: "senha123",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith("Falha ao cadastrar.", "error");
  });

  it("mostra erro de conexão quando o fetch falha", async () => {
    mockarFetch({ rejeitar: true });
    const showSnackbar = await carregarSignup();

    preencherForm({
      name: "Ana Souza",
      email: "ana@exemplo.com",
      phone: "(11) 98765-4321",
      password: "senha123",
      confirmPassword: "senha123",
    });
    enviarFormulario();
    await aguardarAsync();

    expect(showSnackbar).toHaveBeenCalledWith(
      "Erro ao conectar com o servidor.",
      "error"
    );
    expect(console.error).toHaveBeenCalled();
  });
});
