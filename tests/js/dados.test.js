// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockShowSnackbar } = vi.hoisted(() => ({
    mockShowSnackbar: vi.fn(),
}));

vi.mock("/js/global/snackbar.js", () => ({ showSnackbar: mockShowSnackbar }));

import { showSnackbar } from "/js/global/snackbar.js";

// Importa o script UMA vez: ele registra o listener de DOMContentLoaded no
// documento, que persiste entre os testes (jsdom). Re-importar a cada teste
// empilharia listeners e dispararia múltiplas requisições por clique.
import "/js/dados.js";

const KPIS_INICIAIS = "-";

function montarDashboard({ comTbody = true } = {}) {
    document.body.innerHTML = `
        <main>
            <button id="btn-refresh-data">Atualizar Dados</button>
            <p id="kpi-faturamento">${KPIS_INICIAIS}</p>
            <p id="kpi-pedidos">${KPIS_INICIAIS}</p>
            <p id="kpi-ticket">${KPIS_INICIAIS}</p>
            <p id="kpi-pecas">${KPIS_INICIAIS}</p>
            ${comTbody ? `<table><tbody id="ranking-products-tbody"></tbody></table>` : ""}
        </main>
    `;
}

function stubFetch(resposta) {
    const fetchMock = vi.fn().mockResolvedValue(resposta);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function resposta({ ok = true, status = 200, dados = {} } = {}) {
    return { ok, status, json: async () => dados };
}

async function carregarDashboard() {
    document.dispatchEvent(new Event("DOMContentLoaded"));
    document.getElementById("btn-refresh-data").click();
}

async function aguardarHandler() {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

function linhasDoRanking() {
    return document.querySelectorAll("#ranking-products-tbody tr");
}

let consoleErrorSpy;

beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
    consoleErrorSpy?.mockRestore();
});

describe("dados.js — dashboard admin (/dados)", () => {
    it("clique em 'Atualizar Dados' injeta os KPIs formatados do back-end", async () => {
        const fetchMock = stubFetch(
            resposta({
                dados: {
                    faturamento: "R$ 1.234,56",
                    pedidos: 42,
                    ticket_medio: "R$ 29,39",
                    pecas_vendidas: 87,
                    ranking: [{ nome: "Camiseta Básica", quantidade: 10, receita: "R$ 499,90" }],
                },
            })
        );
        montarDashboard();
        await carregarDashboard();

        await vi.waitFor(() => {
            expect(document.getElementById("kpi-faturamento").textContent).toBe("R$ 1.234,56");
        });

        expect(fetchMock).toHaveBeenCalledWith("/api/admin/dashboard");
        expect(document.getElementById("kpi-pedidos").textContent).toBe("42");
        expect(document.getElementById("kpi-ticket").textContent).toBe("R$ 29,39");
        expect(document.getElementById("kpi-pecas").textContent).toBe("87");
        expect(showSnackbar).toHaveBeenCalledWith("Dados atualizados.", "success");
    });

    it("reconstrói o ranking com medalhas nas 3 primeiras posições", async () => {
        const ranking = [
            { nome: "Vestido Floral Midi", quantidade: 8, receita: "R$ 1.519,20" },
            { nome: "Blusa Cropped Listrada", quantidade: 5, receita: "R$ 399,50" },
            { nome: "Saia Midi Plissada", quantidade: 3, receita: "R$ 299,70" },
            { nome: "Calça Jeans Skinny", quantidade: 2, receita: "R$ 259,80" },
        ];
        stubFetch(
            resposta({
                dados: {
                    faturamento: "R$ 2.478,20",
                    pedidos: 18,
                    ticket_medio: "R$ 137,68",
                    pecas_vendidas: 18,
                    ranking,
                },
            })
        );
        montarDashboard();
        // linha antiga server-rendered deve ser substituída pelo novo ranking
        document.getElementById("ranking-products-tbody").innerHTML =
            `<tr class="linha-antiga"><td colspan="4">antiga</td></tr>`;
        await carregarDashboard();

        await vi.waitFor(() => {
            expect(linhasDoRanking()).toHaveLength(4);
        });

        const linhas = linhasDoRanking();
        expect(document.querySelector(".linha-antiga")).toBeNull();

        const medalhas = ["pos-gold", "pos-silver", "pos-bronze"];
        [0, 1, 2].forEach((i) => {
            const badge = linhas[i].querySelector(".position-badge");
            expect(badge.classList.contains("position-badge")).toBe(true);
            expect(badge.classList.contains(medalhas[i])).toBe(true);
            expect(badge.textContent).toBe(`${i + 1}º`);
        });
        const badgeSemMedalha = linhas[3].querySelector(".position-badge");
        expect(badgeSemMedalha.classList.contains("position-badge")).toBe(true);
        expect(badgeSemMedalha.classList.length).toBe(1);

        expect(linhas[0].querySelector("td:nth-child(2) strong").textContent).toBe("Vestido Floral Midi");
        expect(linhas[0].textContent).toContain("8");
        expect(linhas[0].textContent).toContain("R$ 1.519,20");
    });

    it("ranking com mais de 10 itens renderiza apenas os 10 primeiros", async () => {
        const ranking = Array.from({ length: 12 }, (_, i) => ({
            nome: `Produto ${i + 1}`,
            quantidade: 12 - i,
            receita: `R$ ${100 - i},00`,
        }));
        stubFetch(
            resposta({
                dados: {
                    faturamento: "R$ 9.999,00",
                    pedidos: 66,
                    ticket_medio: "R$ 151,50",
                    pecas_vendidas: 78,
                    ranking,
                },
            })
        );
        montarDashboard();
        await carregarDashboard();

        await vi.waitFor(() => {
            expect(linhasDoRanking()).toHaveLength(10);
        });

        const linhas = linhasDoRanking();
        expect(linhas[0].textContent).toContain("1º");
        expect(linhas[9].textContent).toContain("10º");
        expect(linhas[9].textContent).toContain("Produto 10");
        expect(document.getElementById("ranking-products-tbody").textContent).not.toContain("Produto 11");
    });

    it("ranking vazio mostra a mensagem de nenhuma venda registrada", async () => {
        stubFetch(
            resposta({
                dados: {
                    faturamento: "R$ 0,00",
                    pedidos: 0,
                    ticket_medio: "R$ 0,00",
                    pecas_vendidas: 0,
                    ranking: [],
                },
            })
        );
        montarDashboard();
        await carregarDashboard();

        await vi.waitFor(() => {
            expect(linhasDoRanking()).toHaveLength(1);
        });

        const linha = linhasDoRanking()[0];
        expect(linha.querySelector("td").classList.contains("table-empty")).toBe(true);
        expect(linha.querySelector("td").getAttribute("colspan")).toBe("4");
        expect(linha.textContent).toContain("Nenhuma venda registrada.");
        // KPIs são injetados mesmo com o ranking vazio
        expect(document.getElementById("kpi-pedidos").textContent).toBe("0");
        expect(showSnackbar).toHaveBeenCalledWith("Dados atualizados.", "success");
    });

    it("resposta 401 não injeta nada na tela e não mostra snackbar", async () => {
        stubFetch(resposta({ ok: false, status: 401, dados: {} }));
        montarDashboard();
        await carregarDashboard();
        await aguardarHandler();

        expect(document.getElementById("kpi-faturamento").textContent).toBe(KPIS_INICIAIS);
        expect(document.getElementById("kpi-pedidos").textContent).toBe(KPIS_INICIAIS);
        expect(document.getElementById("kpi-ticket").textContent).toBe(KPIS_INICIAIS);
        expect(document.getElementById("kpi-pecas").textContent).toBe(KPIS_INICIAIS);
        expect(document.getElementById("ranking-products-tbody").children).toHaveLength(0);
        expect(showSnackbar).not.toHaveBeenCalled();
    });

    it("resposta de erro do servidor mostra o snackbar com a mensagem do back-end", async () => {
        stubFetch(resposta({ ok: false, status: 500, dados: { error: "Banco indisponível." } }));
        montarDashboard();
        await carregarDashboard();
        await aguardarHandler();

        expect(showSnackbar).toHaveBeenCalledWith("Banco indisponível.", "error");
        expect(document.getElementById("kpi-faturamento").textContent).toBe(KPIS_INICIAIS);
        expect(linhasDoRanking()).toHaveLength(0);
    });

    it("resposta de erro com JSON inválido usa a mensagem padrão no snackbar", async () => {
        stubFetch({
            ok: false,
            status: 500,
            json: async () => {
                throw new Error("JSON inválido");
            },
        });
        montarDashboard();
        await carregarDashboard();
        await aguardarHandler();

        expect(showSnackbar).toHaveBeenCalledWith("Não foi possível atualizar os dados.", "error");
    });

    it("falha de rede mostra o snackbar de erro de conexão", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
        montarDashboard();
        await carregarDashboard();
        await aguardarHandler();

        expect(showSnackbar).toHaveBeenCalledWith("Erro ao conectar com o servidor.", "error");
        expect(document.getElementById("kpi-faturamento").textContent).toBe(KPIS_INICIAIS);
    });

    it("atualização sem tbody de ranking injeta os KPIs sem quebrar", async () => {
        stubFetch(
            resposta({
                dados: {
                    faturamento: "R$ 500,00",
                    pedidos: 3,
                    ticket_medio: "R$ 166,67",
                    pecas_vendidas: 4,
                    ranking: [],
                },
            })
        );
        montarDashboard({ comTbody: false });
        await carregarDashboard();

        await vi.waitFor(() => {
            expect(document.getElementById("kpi-faturamento").textContent).toBe("R$ 500,00");
        });

        expect(document.getElementById("kpi-ticket").textContent).toBe("R$ 166,67");
        expect(showSnackbar).toHaveBeenCalledWith("Dados atualizados.", "success");
        expect(showSnackbar).toHaveBeenCalledTimes(1);
    });
});
