import { protegerRota } from "../../utils/auth-helpers.js";
import { database } from "../../utils/firebase-config.js";
import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // Rota Protegida: Valida privilégio de administrador antes de ler os faturamentos
  protegerRota(async (user) => {
    const dadosSessao = JSON.parse(localStorage.getItem("loggedUser"));
    if (!dadosSessao || dadosSessao.perfil !== "admin") {
      showSnackbar(
        "Acesso negado. Painel restrito a administradores.",
        "error",
      );
      setTimeout(() => (window.location.href = "../home/home.html"), 2000);
      return;
    }

    await processarMetricasDashboard();

    document
      .getElementById("btn-refresh-data")
      ?.addEventListener("click", async () => {
        await processarMetricasDashboard();
      });
  }, "Acesso restrito. Faça login como administrador.");
});

async function processarMetricasDashboard() {
  try {
    showSnackbar("Processando cubo de dados analíticos...", "info");

    const [vendasSnap, prodVendasSnap, produtosSnap, variantesSnap] =
      await Promise.all([
        getDocs(collection(database, "vendas")),
        getDocs(collection(database, "produto_vendas")),
        getDocs(collection(database, "produtos")),
        getDocs(collection(database, "produto_variantes")),
      ]);

    // 1. Dicionários O(1) de mapeamento relacional
    const produtosMap = {};
    produtosSnap.forEach((d) => {
      produtosMap[d.id] = d.data().nome;
    });

    const variantesProdIdMap = {};
    variantesSnap.forEach((d) => {
      variantesProdIdMap[d.id] = d.data().produto_id;
    });

    // 2. Processamento dos KPIs de Faturamento e Pedidos
    let faturamentoTotal = 0;
    let totalPedidos = 0;

    vendasSnap.forEach((docSnap) => {
      const venda = docSnap.data();
      // Considera apenas vendas que não foram canceladas/pendentes se preferir, ou pega a receita bruta global
      faturamentoTotal += Number(venda.valor_total || 0);
      totalPedidos++;
    });

    const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;

    // 3. Processamento de Peças e Consolidação de Ranking por Produto
    let totalPecasVendidas = 0;
    const acumuloVendasPorLook = {}; // chave: produto_id -> valor: { qtd, receita }

    prodVendasSnap.forEach((docSnap) => {
      const itemVenda = docSnap.data();
      const qtd = Number(itemVenda.quantidade || 0);
      const valorTotalItem = Number(itemVenda.valor || 0);

      totalPecasVendidas += qtd;

      // Resgata o id do produto pai através do mapa da variante
      const produtoId = variantesProdIdMap[itemVenda.produto_variante_id];
      if (produtoId) {
        if (!acumuloVendasPorLook[produtoId]) {
          acumuloVendasPorLook[produtoId] = { quantidade: 0, receita: 0 };
        }
        acumuloVendasPorLook[produtoId].quantidade += qtd;
        acumuloVendasPorLook[produtoId].receita += valorTotalItem;
      }
    });

    // 4. Montagem e Ordenação do Ranking (Top Looks)
    const rankingOrdenado = Object.keys(acumuloVendasPorLook).map((prodId) => ({
      id: prodId,
      nome: produtosMap[prodId] || `Look Removido #${prodId}`,
      quantidade: acumuloVendasPorLook[prodId].quantidade,
      receita: acumuloVendasPorLook[prodId].receita,
    }));

    // Ordena do mais vendido para o menos vendido
    rankingOrdenado.sort((a, b) => b.quantidade - a.quantidade);

    // 5. Atualização da UI
    InjetarDadosTela(
      faturamentoTotal,
      totalPedidos,
      ticketMedio,
      totalPecasVendidas,
      rankingOrdenado,
    );
    showSnackbar("Métricas consolidadas com sucesso!", "success");
  } catch (error) {
    console.error("❌ Erro ao compilar cubo analítico:", error);
    showSnackbar("Falha técnica ao calcular dados gerenciais.", "error");
  }
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

  // Exibe no máximo o Top 10 looks de alta performance
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
