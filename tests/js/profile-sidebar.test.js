// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Monta a sidebar (botão de logout) no DOM.
function mountSidebar() {
  document.body.innerHTML = `
    <aside class="sidebar">
      <button id="sidebar-logout-btn" type="button">Sair</button>
    </aside>
  `;
  return document.getElementById("sidebar-logout-btn");
}

// jsdom não navega: troca window.location por um objeto simples pra evitar
// erro de "navigation not implemented" quando o script faz href = "/".
function stubLocation() {
  const location = { href: "" };
  Object.defineProperty(window, "location", {
    value: location,
    writable: true,
    configurable: true,
  });
  return location;
}

describe("profile-sidebar.js — logout pela sidebar", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubLocation();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  // Importa o módulo e dispara o DOMContentLoaded, como o navegador faria.
  // Obs.: import relativo porque o vite:import-analysis rejeita specifiers
  // "/js/..." que apontam pra arquivos reais dentro de /public (o alias não
  // contorna essa checagem). O script em si não tem imports absolutos.
  async function setup() {
    await import("../../public/js/profile-sidebar.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
  }

  it("chama POST /api/auth/logout ao clicar em Sair", async () => {
    mountSidebar();
    await setup();

    document.getElementById("sidebar-logout-btn").click();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("chama o fetch uma vez por clique no botão de logout", async () => {
    const btn = mountSidebar();
    await setup();

    btn.click();
    btn.click();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("não faz nada quando o botão de logout não está no DOM", async () => {
    document.body.innerHTML = "";
    await setup();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("não dispara requisição se o clique acontecer antes do DOMContentLoaded", async () => {
    mountSidebar();
    await import("../../public/js/profile-sidebar.js");

    document.getElementById("sidebar-logout-btn").click();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trata falha do fetch sem quebrar o fluxo (log de erro silencioso)", async () => {
    fetchMock.mockRejectedValue(new Error("rede fora"));
    mountSidebar();
    await setup();

    document.getElementById("sidebar-logout-btn").click();

    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Erro ao efetuar logout pela sidebar:",
        expect.any(Error),
      );
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
