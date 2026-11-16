// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

// NOTA (config do Vite): imports de especificadores "/js/..." são bloqueados pelo
// vite:import-analysis porque o alias resolve para dentro do diretório /public
// ("Cannot import non-asset file ... which is inside /public"). Por isso:
//   - o mock do snackbar usa o caminho relativo do MESMO arquivo real;
//   - login.js é lido do disco e executado com o seu único import removido,
//     recebendo o showSnackbar mockado por parâmetro (código idêntico ao original).
vi.mock("../../public/js/global/snackbar.js", () => ({ showSnackbar: vi.fn() }));

import { showSnackbar } from "../../public/js/global/snackbar.js";

const LOGIN_SCRIPT_PATH = path.resolve(process.cwd(), "public/js/login.js");

// Remove apenas a linha de import (linha 1) e executa o restante do script,
// que registra o listener de DOMContentLoaded — equivalente a importar o módulo.
const LOGIN_SCRIPT_SOURCE = fs
  .readFileSync(LOGIN_SCRIPT_PATH, "utf8")
  .replace(/^import\s+[^\n]+;\s*\n/m, "");

new Function("showSnackbar", LOGIN_SCRIPT_SOURCE)(showSnackbar);

const LOGIN_FORM_HTML = `
  <form id="login-form">
    <input type="email" id="email" placeholder="seuemail@exemplo.com" />
    <input type="password" id="password" placeholder="Sua senha" />
    <button type="submit">Entrar</button>
  </form>
`;

/** Monta o formulário e dispara DOMContentLoaded (o script registra o listener nesse evento). */
function mountLoginPage() {
  document.body.innerHTML = LOGIN_FORM_HTML;
  document.dispatchEvent(new Event("DOMContentLoaded"));
}

/** Substitui o fetch global por um mock que responde com objeto simples (jsdom não tem Response). */
function stubFetch(response = {}) {
  const fetchMock = vi.fn(async () => ({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: response.json ?? (async () => ({})),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Preenche os campos, dispara o submit do formulário e aguarda a cadeia de microtasks do handler async. */
async function submitLoginForm(email, password) {
  if (email !== undefined) document.getElementById("email").value = email;
  if (password !== undefined) document.getElementById("password").value = password;
  document.getElementById("login-form").dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  );
  await flushMicrotasks();
}

async function flushMicrotasks() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

describe("página de login", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();

    // jsdom não navega: substituímos location por um objeto simples para observar
    // o destino do redirecionamento sem navegação real.
    delete window.location;
    window.location = { href: "" };

    stubFetch();
    mountLoginPage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("executa o script real de login (sanity: fonte contém o handler e a rota)", () => {
    expect(LOGIN_SCRIPT_SOURCE).toContain('document.addEventListener("DOMContentLoaded"');
    expect(LOGIN_SCRIPT_SOURCE).toContain('"/api/auth/login"');
  });

  it("envia POST para /api/auth/login com email e senha do formulário", async () => {
    const fetchMock = stubFetch({});

    await submitLoginForm("joao@exemplo.com", "senha123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "joao@exemplo.com", senha: "senha123" }),
    });
  });

  it("remove espaços das bordas do email antes de enviar", async () => {
    const fetchMock = stubFetch({});

    await submitLoginForm("  joao@exemplo.com  ", "senha123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        body: JSON.stringify({ email: "joao@exemplo.com", senha: "senha123" }),
      })
    );
  });

  it("mostra snackbar de sucesso e redireciona para /vendas quando o perfil é admin", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: async () => ({ perfil: "admin" }),
    });

    await submitLoginForm("admin@exemplo.com", "senha123");

    expect(showSnackbar).toHaveBeenCalledWith("Login realizado com sucesso!", "success");
    vi.advanceTimersByTime(800);
    expect(window.location.href).toBe("/vendas");
  });

  it("mostra snackbar de sucesso e redireciona para / quando o perfil é cliente", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: async () => ({ perfil: "cliente" }),
    });

    await submitLoginForm("cliente@exemplo.com", "senha123");

    expect(showSnackbar).toHaveBeenCalledWith("Login realizado com sucesso!", "success");
    vi.advanceTimersByTime(800);
    expect(window.location.href).toBe("/");
  });

  it("redireciona para / quando a resposta de sucesso não informa perfil", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await submitLoginForm("joao@exemplo.com", "senha123");

    expect(showSnackbar).toHaveBeenCalledWith("Login realizado com sucesso!", "success");
    vi.advanceTimersByTime(800);
    expect(window.location.href).toBe("/");
  });

  it("mostra a mensagem de erro do servidor quando as credenciais são inválidas", async () => {
    stubFetch({
      ok: false,
      status: 401,
      json: async () => ({ error: "E-mail ou senha inválidos." }),
    });

    await submitLoginForm("joao@exemplo.com", "senha-errada");

    expect(showSnackbar).toHaveBeenCalledWith("E-mail ou senha inválidos.", "error");
    expect(showSnackbar).not.toHaveBeenCalledWith("Login realizado com sucesso!", "success");
    expect(window.location.href).toBe("");
  });

  it("mostra mensagem padrão quando a resposta de erro não traz corpo JSON", async () => {
    stubFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("sem corpo JSON");
      },
    });

    await submitLoginForm("joao@exemplo.com", "senha123");

    expect(showSnackbar).toHaveBeenCalledWith("Falha ao realizar login.", "error");
  });

  it("mostra erro de conexão e registra no console quando a rede falha", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );

    await submitLoginForm("joao@exemplo.com", "senha123");

    expect(showSnackbar).toHaveBeenCalledWith("Erro ao conectar com o servidor.", "error");
    expect(consoleError).toHaveBeenCalled();
  });

  it("não faz nada quando a página não contém o formulário de login", async () => {
    const fetchMock = stubFetch({});
    document.body.innerHTML = "";

    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(showSnackbar).not.toHaveBeenCalled();
  });
});
