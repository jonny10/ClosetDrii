import { showSnackbar } from "/js/global/snackbar.js";

// Vendas (admin) — painel de pedidos: os dados e a mudança de status vêm do
// back-end (GET /api/admin/vendas e PATCH /api/admin/vendas/:id/status).
// O comprovante (recebido por WhatsApp) é anexado pelo próprio admin via
// POST /api/admin/vendas/:id/comprovante junto com a mudança de status.

let vendasGerais = [];
let filtroStatusAtual = "todos";

document.addEventListener("DOMContentLoaded", () => {
  inicializarDadosPainel();
  setupFiltrosEventos();
});

// Carrega as vendas do back-end (já com cliente e itens cruzados pelo servidor)
async function inicializarDadosPainel() {
  try {
    const resp = await fetch("/api/admin/vendas");

    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({}));
      showSnackbar(erro.error || "Erro ao carregar os pedidos.", "invalid");
      return;
    }

    vendasGerais = await resp.json();
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "invalid");
    return;
  }

  aplicarFiltroEHRender();
}

// Filtra a base em memória pelo status selecionado
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
    const cliente = venda.usuario?.nome || "Cliente Desconhecido";

    cardClone.querySelector(".order-id").textContent = `#${String(vendaId).padStart(4, "0")}`;
    cardClone.querySelector(".order-client-name").textContent = cliente;
    cardClone.querySelector(".order-total-price").textContent = Number(
      venda.valor_total,
    ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const statusBadge = cardClone.querySelector(".order-status-badge");
    statusBadge.textContent = venda.status;
    statusBadge.className = `order-status-badge status-${venda.status.toLowerCase()}`;

    const selectStatus = cardClone.querySelector(".status-change-select");
    selectStatus.value = venda.status.toLowerCase();

    const itemsListContainer = cardClone.querySelector(".order-products-rows-list");
    (venda.itens || []).forEach((item) => {
      const variante = item.produto_variante || {};
      const itemClone = itemTemplate.content.cloneNode(true);
      itemClone.querySelector(".cart-nome").textContent =
        variante.produto?.nome || "Produto";
      itemClone.querySelector(".cart-cor").textContent = variante.cor || "-";
      itemClone.querySelector(".cart-tamanho").textContent = variante.tamanho || "-";
      itemClone.querySelector(".qty-count").textContent = item.quantidade;
      itemClone.querySelector(".cart-img").src =
        variante.imagem_url || "/assets/img/logo.png";
      itemClone.querySelector(".cart-subtotal-item").textContent = Number(
        item.valor,
      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      itemsListContainer.appendChild(itemClone);
    });

    // Comprovante: link pro arquivo quando já existe; input pra anexar sempre
    const linkComprovante = cardClone.querySelector(".comprovante-link");
    if (venda.comprovante_url) {
      linkComprovante.href = venda.comprovante_url;
      linkComprovante.style.display = "";
    }

    const inputComprovante = cardClone.querySelector(".comprovante-input");
    selectStatus.addEventListener("change", (e) => {
      const arquivo = inputComprovante.files?.[0] ?? null;
      modificarStatusPedido(vendaId, e.target.value, arquivo);
    });

    fragmentoVisual.appendChild(cardClone);
  });

  container.innerHTML = "";
  container.appendChild(fragmentoVisual);
}

// Altera o status no servidor; se o admin selecionou um arquivo, anexa o
// comprovante antes (o pagamento foi combinado/acertado por WhatsApp)
async function modificarStatusPedido(vendaId, novoStatus, arquivo) {
  try {
    if (arquivo) {
      const formData = new FormData();
      formData.append("comprovante", arquivo);

      const upload = await fetch(`/api/admin/vendas/${vendaId}/comprovante`, {
        method: "POST",
        body: formData,
      });

      if (!upload.ok) {
        const erro = await upload.json().catch(() => ({}));
        showSnackbar(erro.error || "Erro ao enviar o comprovante.", "invalid");
        return;
      }
    }

    const resp = await fetch(`/api/admin/vendas/${vendaId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });

    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({}));
      showSnackbar(erro.error || "Erro ao alterar o status.", "invalid");
      return;
    }

    showSnackbar(
      `Status do pedido #${String(vendaId).padStart(4, "0")} atualizado!`,
      "success",
    );
    await inicializarDadosPainel(); // recarrega do servidor (fonte da verdade)
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "invalid");
  }
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
