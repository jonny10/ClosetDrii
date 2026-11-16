// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../public/js/profile.js";

const mocks = vi.hoisted(() => ({ showSnackbar: vi.fn() }));
vi.mock("/js/global/snackbar.js", () => ({ showSnackbar: mocks.showSnackbar }));

const showSnackbarMock = mocks.showSnackbar;

const HTML_PERFIL = `
  <span id="user-name-display">Fulano da Silva</span>
  <form id="profile-form">
    <input id="name" value="Fulano da Silva" disabled />
    <input id="email" value="fulano@email.com" disabled />
    <input id="phone" value="(11) 98765-4321" disabled />
    <input id="cpf" value="123.456.789-01" disabled />
    <input id="dt_nascimento" value="1990-01-01" disabled />
    <select id="genero" disabled>
      <option value="">Não informado</option>
      <option value="feminino">Feminino</option>
      <option value="masculino">Masculino</option>
    </select>
    <button type="button" id="edit-btn" style="display:block">Editar</button>
    <button type="submit" id="save-btn" style="display:none">Salvar</button>
  </form>
  <div class="profile-pic-container">
    <img id="profile-img" src="/img/avatar.png" alt="Foto de perfil" />
  </div>
  <input type="file" id="file-input" />
  <a href="/" id="sidebar-logout-btn">Sair</a>
`;

function montarPagina({ comFormulario = true } = {}) {
  document.body.innerHTML = comFormulario ? HTML_PERFIL : `<a href="/" id="sidebar-logout-btn">Sair</a>`;
  document.dispatchEvent(new Event("DOMContentLoaded"));
}

function mockFetchSucesso(dados = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(dados),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function mockFetchFalha(status = 400, dados = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: vi.fn().mockResolvedValue(dados),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function dispararInput(el, valor) {
  el.value = valor;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function dispararSubmit(form) {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

let consoleErrorSpy;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  showSnackbarMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  consoleErrorSpy.mockRestore();
  document.body.innerHTML = "";
});

describe("página de perfil", () => {
  it("não registra nenhum comportamento quando o formulário #profile-form não existe", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    montarPagina({ comFormulario: false });

    document.getElementById("sidebar-logout-btn").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(showSnackbarMock).not.toHaveBeenCalled();
  });

  it("botão editar habilita os campos, mantém o e-mail bloqueado e alterna a visibilidade dos botões", () => {
    montarPagina();

    document.getElementById("edit-btn").click();

    expect(document.getElementById("name").disabled).toBe(false);
    expect(document.getElementById("phone").disabled).toBe(false);
    expect(document.getElementById("cpf").disabled).toBe(false);
    expect(document.getElementById("dt_nascimento").disabled).toBe(false);
    expect(document.getElementById("genero").disabled).toBe(false);
    expect(document.getElementById("email").disabled).toBe(true);

    expect(document.getElementById("edit-btn").style.display).toBe("none");
    expect(document.getElementById("save-btn").style.display).toBe("block");
    expect(showSnackbarMock).toHaveBeenCalledWith("Campos liberados para edição.", "info");
  });

  it("aplica máscara de telefone com 11 dígitos no evento input", () => {
    montarPagina();
    const phone = document.getElementById("phone");

    dispararInput(phone, "11987654321");

    expect(phone.value).toBe("(11) 98765-4321");
  });

  it("aplica máscara de telefone com 10 dígitos no evento input", () => {
    montarPagina();
    const phone = document.getElementById("phone");

    dispararInput(phone, "1122223333");

    expect(phone.value).toBe("(11) 2222-3333");
  });

  it("aplica máscara de CPF no evento input", () => {
    montarPagina();
    const cpf = document.getElementById("cpf");

    dispararInput(cpf, "12345678901");

    expect(cpf.value).toBe("123.456.789-01");
  });

  it("envia PATCH /api/usuarios/me apenas com dígitos e reaplica máscaras após o sucesso", async () => {
    const fetchMock = mockFetchSucesso({
      nome: "Novo Nome",
      telefone: "11912345678",
      cpf: "11122233344",
    });
    montarPagina();

    const form = document.getElementById("profile-form");
    document.getElementById("name").value = "  Novo Nome  ";
    document.getElementById("phone").value = "(11) 91234-5678";
    document.getElementById("cpf").value = "111.222.333-44";
    document.getElementById("dt_nascimento").value = "1992-02-02";
    document.getElementById("genero").value = "feminino";

    dispararSubmit(form);

    await vi.waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith("Informações salvas com sucesso!", "success"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/usuarios/me");
    expect(options.method).toBe("PATCH");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toEqual({
      nome: "Novo Nome",
      telefone: "11912345678",
      cpf: "11122233344",
      dt_nascimento: "1992-02-02",
      genero: "feminino",
    });

    for (const id of ["name", "email", "phone", "cpf", "dt_nascimento"]) {
      expect(document.getElementById(id).disabled).toBe(true);
    }
    expect(document.getElementById("genero").disabled).toBe(true);
    expect(document.getElementById("edit-btn").style.display).toBe("block");
    expect(document.getElementById("save-btn").style.display).toBe("none");
    expect(document.getElementById("user-name-display").textContent).toBe("Novo Nome");
    expect(document.getElementById("phone").value).toBe("(11) 91234-5678");
    expect(document.getElementById("cpf").value).toBe("111.222.333-44");
  });

  it("mantém o formulário em modo edição e mostra o erro retornado quando o servidor responde com falha", async () => {
    mockFetchFalha(400, { error: "Nome muito curto." });
    montarPagina();
    document.getElementById("edit-btn").click();

    dispararSubmit(document.getElementById("profile-form"));

    await vi.waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith("Nome muito curto.", "error"),
    );

    expect(document.getElementById("name").disabled).toBe(false);
    expect(document.getElementById("edit-btn").style.display).toBe("none");
    expect(document.getElementById("save-btn").style.display).toBe("block");
  });

  it("bloqueia o envio e mostra aviso quando o telefone tem menos de 10 dígitos", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    montarPagina();

    dispararInput(document.getElementById("phone"), "12345");
    dispararSubmit(document.getElementById("profile-form"));

    expect(showSnackbarMock).toHaveBeenCalledWith("Telefone inválido.", "error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bloqueia o envio e mostra aviso quando o CPF não tem 11 dígitos", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    montarPagina();

    dispararInput(document.getElementById("cpf"), "123");
    dispararSubmit(document.getElementById("profile-form"));

    expect(showSnackbarMock).toHaveBeenCalledWith("CPF deve ter 11 dígitos.", "error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mostra snackbar de erro de conexão quando o fetch falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede fora")));
    montarPagina();

    dispararSubmit(document.getElementById("profile-form"));

    await vi.waitFor(() =>
      expect(showSnackbarMock).toHaveBeenCalledWith("Erro ao conectar com o servidor.", "error"),
    );
  });

  it("clique no container da foto aciona o seletor de arquivo", () => {
    montarPagina();

    const fileInput = document.getElementById("file-input");
    const clickSpy = vi.spyOn(fileInput, "click").mockImplementation(() => {});

    document.querySelector(".profile-pic-container").click();

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("selecionar um arquivo atualiza a pré-visualização da foto de perfil", async () => {
    montarPagina();

    const fileInput = document.getElementById("file-input");
    const file = new File(["imagem"], "avatar.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true });

    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() =>
      expect(document.getElementById("profile-img").src).toContain("data:image/png"),
    );
    expect(showSnackbarMock).toHaveBeenCalledWith(
      "Pré-visualização atualizada (upload pendente no back-end).",
      "success",
    );
  });

  it("logout pela sidebar envia POST /api/auth/logout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    montarPagina();

    document.getElementById("sidebar-logout-btn").click();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });
});
