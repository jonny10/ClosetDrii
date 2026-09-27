import { protegerRota } from "../../utils/auth-helpers.js";
import { database } from "../../utils/firebase-config.js";
import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Estados Globais em memória para gerenciamento e filtragem fluida de pedidos
let vendasGerais = [];
let usuariosMap = {};
let itensPorVendaMap = {};
let filtroStatusAtual = "todos";

document.addEventListener("DOMContentLoaded", () => {
  // Rota Protegida: Valida a sessão em tempo real com o Firebase Auth
  protegerRota(async (user) => {
    // Validação de Autorização: Garante que apenas usuários com nível administrativo acessem o painel
    const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
    if (!loggedUser || loggedUser.perfil !== "admin") {
      showSnackbar("Acesso negado. Área restrita a administradores.", "error");
      setTimeout(() => (window.location.href = "../home/home.html"), 2000);
      return;
    }

    await inicializarDadosPainel();
    setupFiltrosEventos();
  }, "Acesso restrito. Faça login como administrador para gerenciar as vendas.");
});

// Realiza a carga inicial massiva cruzando os nós do banco relacional plano
async function inicializarDadosPainel() {
  try {
    showSnackbar("Carregando base de vendas...", "info");

    const [
      vendasSnapshot,
      produtoVendasSnapshot,
      variantesSnapshot,
      usuariosSnapshot,
    ] = await Promise.all([
      getDocs(collection(database, "vendas")),
      getDocs(collection(database, "produto_vendas")),
      getDocs(collection(database, "produto_variantes")),
      getDocs(collection(database, "usuarios")),
    ]);

    // Dicionário O(1) para mapear dados cadastrais dos clientes
    usuariosSnapshot.forEach((d) => (usuariosMap[d.id] = d.data()));

    // Dicionário O(1) para resolução de SKUs de variantes
    const variantesMap = {};
    variantesSnapshot.forEach((d) => (variantesMap[d.id] = d.data()));

    // Indexa as linhas da tabela pivot produto_vendas agrupando-as por 'venda_id'
    itensPorVendaMap = {};
    produtoVendasSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const vendaId = data.venda_id;

      if (!itensPorVendaMap[vendaId]) itensPorVendaMap[vendaId] = [];

      const dadosVariante = variantesMap[data.produto_variante_id] || {};

      itensPorVendaMap[vendaId].push({
        quantidade: data.quantidade,
        valorTotalItem: data.valor,
        cor: dadosVariante.cor || "Padrão",
        tamanho: dadosVariante.tamanho || "U",
        imagem_url: dadosVariante.imagem_url || "../../assets/img/logo.png",
        nome: dadosVariante.cor
          ? `Peça Loja ${dadosVariante.cor}`
          : "Look Closet Drii",
      });
    });

    // Mapeia o cabeçalho de vendas para o array de memória
    vendasGerais = [];
    vendasSnapshot.forEach((docSnap) => {
      vendasGerais.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Ordenação Cronológica Reversa (Pedidos mais novos no topo) baseado na PK numérica
    vendasGerais.sort((a, b) => Number(b.id) - Number(a.id));

    aplicarFiltroEHRender();
  } catch (error) {
    console.error("❌ Erro ao inicializar painel admin:", error);
    showSnackbar("Falha de comunicação com o Firestore.", "error");
  }
}

// Filtra a base local estática em cache evitando requisições redundantes de rede
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

// Renderização via Fragmento Atômico para impedir engasgos visuais por múltiplos reflows do DOM
function renderizarVendasPainel(lista, container) {
  const cardTemplate = document.getElementById("template-admin-order-card");
  const itemTemplate = document.getElementById("template-admin-order-item");

  if (!cardTemplate || !itemTemplate) return;

  const fragmentoVisual = document.createDocumentFragment();

  lista.forEach((venda) => {
    const cardClone = cardTemplate.content.cloneNode(true);
    const vendaId = venda.id;
    const cliente = usuariosMap[venda.usuario_id] || {
      nome: "Cliente Desconhecido",
    };

    cardClone.querySelector(".order-id").textContent =
      `#${vendaId.padStart(4, "0")}`;
    cardClone.querySelector(".order-client-name").textContent = cliente.nome;
    cardClone.querySelector(".order-total-price").textContent = Number(
      venda.valor_total,
    ).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const statusBadge = cardClone.querySelector(".order-status-badge");
    statusBadge.textContent = venda.status;
    statusBadge.className = `order-status-badge status-${venda.status.toLowerCase()}`;

    const selectStatus = cardClone.querySelector(".status-change-select");
    selectStatus.value = venda.status.toLowerCase();

    const itemsListContainer = cardClone.querySelector(
      ".order-products-rows-list",
    );
    const produtosDessaVenda = itensPorVendaMap[vendaId] || [];

    produtosDessaVenda.forEach((item) => {
      const itemClone = itemTemplate.content.cloneNode(true);
      itemClone.querySelector(".cart-nome").textContent = item.nome;
      itemClone.querySelector(".cart-cor").textContent = item.cor;
      itemClone.querySelector(".cart-tamanho").textContent = item.tamanho;
      itemClone.querySelector(".qty-count").textContent = item.quantidade;
      itemClone.querySelector(".cart-img").src = item.imagem_url;
      itemClone.querySelector(".cart-subtotal-item").textContent = Number(
        item.valorTotalItem,
      ).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      itemsListContainer.appendChild(itemClone);
    });

    // Observa e dispara mutações imediatas de status no dropdown
    selectStatus.addEventListener("change", async (e) => {
      const novoStatus = e.target.value;
      await modificarStatusNoBanco(vendaId, novoStatus);
    });

    fragmentoVisual.appendChild(cardClone);
  });

  container.innerHTML = "";
  container.appendChild(fragmentoVisual);
}

// Atualiza o documento específico na coleção "vendas" e sincroniza o cache local
async function modificarStatusNoBanco(vendaId, novoStatus) {
  try {
    const vendaRef = doc(database, "vendas", vendaId);
    await updateDoc(vendaRef, {
      status: novoStatus,
      updated_at: new Date().toISOString(),
    });

    showSnackbar(
      `Status do pedido #${vendaId} alterado para ${novoStatus.toUpperCase()}!`,
      "success",
    );

    // Mutação reativa no estado em memória para evitar um re-fetch total da base no Firestore
    const vendaLocal = vendasGerais.find((v) => v.id === vendaId);
    if (vendaLocal) vendaLocal.status = novoStatus;

    aplicarFiltroEHRender();
  } catch (error) {
    console.error("Erro ao alterar status:", error);
    showSnackbar("Não foi possível salvar a alteração de status.", "error");
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
