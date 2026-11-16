import { showSnackbar } from "/js/global/snackbar.js";

// Dashboard (admin) — KPIs e ranking já vêm renderizados pelo servidor.
// O botão "Atualizar Dados" busca as métricas frescas em GET /api/admin/dashboard
// e reinjeta na tela (valores monetários já chegam formatados do back-end).
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("btn-refresh-data")
    ?.addEventListener("click", atualizarDashboard);
});

async function atualizarDashboard() {
  try {
    const resp = await fetch("/api/admin/dashboard");
    if (resp.status === 401) {
      window.location.href = "/login";
      return;
    }
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      showSnackbar(
        dados.error || "Não foi possível atualizar os dados.",
        "error",
      );
      return;
    }
    injetarDadosTela(dados);
    showSnackbar("Dados atualizados.", "success");
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "error");
  }
}

function injetarDadosTela(dados) {
  document.getElementById("kpi-faturamento").textContent = dados.faturamento;
  document.getElementById("kpi-pedidos").textContent = String(dados.pedidos);
  document.getElementById("kpi-ticket").textContent = dados.ticket_medio;
  document.getElementById("kpi-pecas").textContent = String(dados.pecas_vendidas);

  const tbody = document.getElementById("ranking-products-tbody");
  if (!tbody) return;

  if (!dados.ranking || dados.ranking.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Nenhuma venda registrada.</td></tr>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  dados.ranking.slice(0, 10).forEach((item, index) => {
    const posicao = index + 1;
    let medalhaClasse = "";
    if (posicao === 1) medalhaClasse = "pos-gold";
    else if (posicao === 2) medalhaClasse = "pos-silver";
    else if (posicao === 3) medalhaClasse = "pos-bronze";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="position-badge ${medalhaClasse}">${posicao}º</span></td>
      <td><strong>${item.nome}</strong></td>
      <td style="text-align: center; font-weight: 600;">${item.quantidade}</td>
      <td style="text-align: right; color: var(--primary); font-weight: 700;">
        ${item.receita}
      </td>
    `;
    fragment.appendChild(tr);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}
