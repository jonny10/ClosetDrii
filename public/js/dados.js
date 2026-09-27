import { showSnackbar } from "/js/global/snackbar.js";

// Dashboard (admin) — KPIs e ranking de produtos.
//
// Proteção de rota (admin) e cálculo das métricas agora são do back-end
// (Node/Express + Sequelize). O ideal é o servidor computar os KPIs (via queries/
// views SQL) e entregá-los prontos. Mantida aqui apenas a INJEÇÃO na tela.

document.addEventListener("DOMContentLoaded", () => {
  // TODO (nova stack): proteger a rota no servidor e carregar as métricas do back-end.
  processarMetricasDashboard();

  document
    .getElementById("btn-refresh-data")
    ?.addEventListener("click", () => processarMetricasDashboard());
});

// TODO (nova stack): buscar as métricas já computadas do back-end
//   (ex.: GET /admin/dashboard) e chamar InjetarDadosTela com os valores reais.
async function processarMetricasDashboard() {
  // Valores zerados até a integração com a API.
  const faturamentoTotal = 0;
  const totalPedidos = 0;
  const ticketMedio = 0;
  const totalPecasVendidas = 0;
  const rankingOrdenado = [];

  InjetarDadosTela(
    faturamentoTotal,
    totalPedidos,
    ticketMedio,
    totalPecasVendidas,
    rankingOrdenado,
  );
  showSnackbar("Métricas ainda não integradas ao back-end.", "info");
}

function InjetarDadosTela(faturamento, pedidos, ticket, pecas, ranking) {
  document.getElementById("kpi-faturamento").textContent =
    faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  document.getElementById("kpi-pedidos").textContent = String(pedidos);
  document.getElementById("kpi-ticket").textContent = ticket.toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" },
  );
  document.getElementById("kpi-pecas").textContent = String(pecas);

  const tbody = document.getElementById("ranking-products-tbody");
  if (!tbody) return;

  if (ranking.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Nenhum dado amostral computado.</td></tr>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  ranking.slice(0, 10).forEach((item, index) => {
    const tr = document.createElement("tr");
    const posicao = index + 1;

    let medalhaClasse = "";
    if (posicao === 1) medalhaClasse = "pos-gold";
    else if (posicao === 2) medalhaClasse = "pos-silver";
    else if (posicao === 3) medalhaClasse = "pos-bronze";

    tr.innerHTML = `
      <td><span class="position-badge ${medalhaClasse}">${posicao}º</span></td>
      <td><strong>${item.nome}</strong></td>
      <td style="text-align: center; font-weight: 600;">${item.quantidade}</td>
      <td style="text-align: right; color: var(--primary); font-weight: 700;">
        ${item.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </td>
    `;
    fragment.appendChild(tr);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}
