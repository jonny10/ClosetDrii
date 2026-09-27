import { showSnackbar } from "/js/global/snackbar.js";

// Histórico de pedidos do usuário.
//
// Proteção de rota e dados agora são do back-end (Node/Express + Sequelize).
// Mantida aqui a RENDERIZAÇÃO dos cards; a busca dos pedidos vira TODO (API/Sequelize).

document.addEventListener("DOMContentLoaded", () => {
  // TODO (nova stack): proteger a rota no servidor e carregar o histórico do back-end.
  carregarHistoricoPedidos();
});

// TODO (nova stack): buscar as vendas do usuário logado no back-end
//   (ex.: GET /historico), já com os itens e variantes cruzados pelo servidor,
//   e chamar renderizarHistorico(listaVendas, itensPorVendaMap).
async function carregarHistoricoPedidos() {
  const listaVendas = [];
  const itensPorVendaMap = {};
  renderizarHistorico(listaVendas, itensPorVendaMap);
}

function renderizarHistorico(listaVendas, itensPorVendaMap) {
  const container = document.getElementById("orders-container");
  const emptyMessage = document.getElementById("empty-history-message");

  if (!listaVendas || listaVendas.length === 0) {
    if (container) container.style.display = "none";
    if (emptyMessage) emptyMessage.style.display = "block";
    return;
  }

  if (container) container.style.display = "flex";
  if (emptyMessage) emptyMessage.style.display = "none";

  const cardTemplate = document.getElementById("template-order-card");
  const itemTemplate = document.getElementById("template-order-item");
  if (!cardTemplate || !itemTemplate || !container) return;

  const fragmentoVisual = document.createDocumentFragment();

  listaVendas.forEach((venda) => {
    const cardClone = cardTemplate.content.cloneNode(true);

    cardClone.querySelector(".order-id").textContent = `#${String(venda.id).padStart(4, "0")}`;

    const dataFormatada = venda.created_at
      ? new Date(venda.created_at).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");
    cardClone.querySelector(".order-date").textContent = dataFormatada;

    const statusBadge = cardClone.querySelector(".order-status-badge");
    statusBadge.textContent = venda.status;
    statusBadge.className = `order-status-badge status-${venda.status.toLowerCase()}`;

    cardClone.querySelector(".order-total-price").textContent = Number(
      venda.valor_total,
    ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const itemsContainer = cardClone.querySelector(".order-products-rows-list");
    const itensDessaVenda = itensPorVendaMap[venda.id] || [];

    itensDessaVenda.forEach((item) => {
      const itemClone = itemTemplate.content.cloneNode(true);

      itemClone.querySelector(".cart-nome").textContent = item.nome;
      itemClone.querySelector(".cart-cor").textContent = item.cor;
      itemClone.querySelector(".cart-tamanho").textContent = item.tamanho;
      itemClone.querySelector(".qty-count").textContent = item.quantidade;
      itemClone.querySelector(".cart-img").src = item.imagem_url || "/assets/img/logo.png";

      itemClone.querySelector(".cart-preco-unitario").textContent = `Unid: ${(
        item.valorTotalItem / item.quantidade
      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;

      itemClone.querySelector(".cart-subtotal-item").textContent = Number(
        item.valorTotalItem,
      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      itemsContainer.appendChild(itemClone);
    });

    fragmentoVisual.appendChild(cardClone);
  });

  container.innerHTML = "";
  container.appendChild(fragmentoVisual);
}
