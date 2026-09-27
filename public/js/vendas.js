import { showSnackbar } from "/js/global/snackbar.js";

// Vendas (admin) — painel de pedidos.
//
// Proteção de rota (admin) e dados agora são do back-end (Node/Express + Sequelize).
// Mantida aqui a UI: render em memória, filtros por status. A carga de dados e a
// mudança de status viram TODO (API/Sequelize).

let vendasGerais = [];
let usuariosMap = {};
let itensPorVendaMap = {};
let filtroStatusAtual = "todos";

document.addEventListener("DOMContentLoaded", () => {
  // TODO (nova stack): proteger a rota no servidor e carregar os dados do back-end.
  inicializarDadosPainel();
  setupFiltrosEventos();
});

// TODO (nova stack): buscar vendas + itens + variantes + usuários do back-end
// (idealmente já cruzados/paginados pelo servidor) e popular os estados abaixo.
async function inicializarDadosPainel() {
  vendasGerais = [];
  usuariosMap = {};
  itensPorVendaMap = {};
  aplicarFiltroEHRender();
}

// Filtra a base local em cache
function aplicarFiltroEHRender() {
  const container = document.getElementById("admin-orders-container");
  const emptyMessage = document.getElementById("no-orders-message");
  const countTxt = document.getElementById("orders-count");

  if (!container) return;

  let vendasFiltradas = [...vendasGerais];

  if (filtroStatusAtual !== "todos") {
    vendasFiltradas = vendasGerais.filter(
      (venda) => venda.status.toLowerCase() === filtroStatusAtual,
    );
  }

  if (countTxt) countTxt.textContent = String(vendasFiltradas.length);

  if (vendasFiltradas.length === 0) {
    container.innerHTML = "";
    if (emptyMessage) emptyMessage.style.display = "block";
    return;
  }

  if (emptyMessage) emptyMessage.style.display = "none";
  renderizarVendasPainel(vendasFiltradas, container);
}

// Renderização via fragmento atômico
function renderizarVendasPainel(lista, container) {
  const cardTemplate = document.getElementById("template-admin-order-card");
  const itemTemplate = document.getElementById("template-admin-order-item");

  if (!cardTemplate || !itemTemplate) return;

  const fragmentoVisual = document.createDocumentFragment();

  lista.forEach((venda) => {
    const cardClone = cardTemplate.content.cloneNode(true);
    const vendaId = venda.id;
    const cliente = usuariosMap[venda.usuario_id] || { nome: "Cliente Desconhecido" };

    cardClone.querySelector(".order-id").textContent = `#${String(vendaId).padStart(4, "0")}`;
    cardClone.querySelector(".order-client-name").textContent = cliente.nome;
    cardClone.querySelector(".order-total-price").textContent = Number(
      venda.valor_total,
    ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const statusBadge = cardClone.querySelector(".order-status-badge");
    statusBadge.textContent = venda.status;
    statusBadge.className = `order-status-badge status-${venda.status.toLowerCase()}`;

    const selectStatus = cardClone.querySelector(".status-change-select");
    selectStatus.value = venda.status.toLowerCase();

    const itemsListContainer = cardClone.querySelector(".order-products-rows-list");
    const produtosDessaVenda = itensPorVendaMap[vendaId] || [];

    produtosDessaVenda.forEach((item) => {
      const itemClone = itemTemplate.content.cloneNode(true);
      itemClone.querySelector(".cart-nome").textContent = item.nome;
      itemClone.querySelector(".cart-cor").textContent = item.cor;
      itemClone.querySelector(".cart-tamanho").textContent = item.tamanho;
      itemClone.querySelector(".qty-count").textContent = item.quantidade;
      itemClone.querySelector(".cart-img").src = item.imagem_url || "/assets/img/logo.png";
      itemClone.querySelector(".cart-subtotal-item").textContent = Number(
        item.valorTotalItem,
      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      itemsListContainer.appendChild(itemClone);
    });

    selectStatus.addEventListener("change", async (e) => {
      await modificarStatusPedido(vendaId, e.target.value);
    });

    fragmentoVisual.appendChild(cardClone);
  });

  container.innerHTML = "";
  container.appendChild(fragmentoVisual);
}

// TODO (nova stack): atualizar o status via API (PATCH /admin/vendas/:id).
async function modificarStatusPedido(vendaId, novoStatus) {
  console.log("Alteração de status (pendente integração):", { vendaId, novoStatus });

  const vendaLocal = vendasGerais.find((v) => v.id === vendaId);
  if (vendaLocal) vendaLocal.status = novoStatus;

  showSnackbar(
    `Status do pedido #${vendaId} alterado localmente (pendente salvar no back-end).`,
    "success",
  );
  aplicarFiltroEHRender();
}

function setupFiltrosEventos() {
  const tabs = document.querySelectorAll(".status-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      filtroStatusAtual = tab.getAttribute("data-status").toLowerCase();
      aplicarFiltroEHRender();
    });
  });
}
