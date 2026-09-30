import { showSnackbar } from "/js/global/snackbar.js";

// Carrinho — gestão no cliente (localStorage), renderização e checkout.
//
// A FINALIZAÇÃO da compra (validação de estoque + gravação de venda) agora é do
// back-end (Node/Express + Sequelize), dentro de uma transação SQL.
// TODO (nova stack): enviar o carrinho via POST para a API (ex.: POST /checkout).
//   O servidor valida estoque, cria a venda/itens e responde com o id do pedido;
//   o front então limpa o carrinho e abre o modal de instruções (WhatsApp).

const CART_STORAGE_KEY = "carrinho";
let itensCarrinho = getCartFromStorage();

// Recupera os dados do carrinho salvos no navegador de forma segura
function getCartFromStorage() {
  try {
    const dados = localStorage.getItem(CART_STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (e) {
    console.error("Erro ao ler localStorage:", e);
    return [];
  }
}

// Persiste o estado atual do carrinho no localStorage
function salvarCarrinhoNoStorage() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itensCarrinho));
}

// Adiciona um produto ao carrinho (sem duplicar variantes iguais)
export function adicionarAoCarrinho(novoItem) {
  itensCarrinho = getCartFromStorage();

  const itemExistente = itensCarrinho.find(
    (item) => item.id_variante === novoItem.id_variante,
  );

  if (itemExistente) {
    itemExistente.quantidade += novoItem.quantidade || 1;
  } else {
    itensCarrinho.push(novoItem);
  }

  salvarCarrinhoNoStorage();
  showSnackbar(`${novoItem.nome} adicionado ao carrinho!`, "success");
}

// Renderiza os produtos atuais do carrinho na interface
function renderizarCarrinho() {
  const listContainer = document.getElementById("cart-items-container");
  const emptyMessage = document.getElementById("empty-cart-message");
  const template = document.getElementById("template-cart-item");

  if (!listContainer || !template) return;

  if (itensCarrinho.length === 0) {
    listContainer.innerHTML = "";
    listContainer.style.display = "none";
    if (emptyMessage) emptyMessage.style.display = "block";
    atualizarResumoFinanceiro();
    return;
  }

  listContainer.style.display = "flex";
  if (emptyMessage) emptyMessage.style.display = "none";

  const fragment = document.createDocumentFragment();

  itensCarrinho.forEach((item) => {
    const clone = template.content.cloneNode(true);
    const subtotalItem = item.preco * item.quantidade;

    const cardRoot =
      clone.querySelector(".cart-item-card") || clone.firstElementChild;
    if (cardRoot) cardRoot.dataset.idVariante = item.id_variante;

    clone.querySelector(".cart-nome").textContent = item.nome;
    clone.querySelector(".cart-cor").textContent = item.cor;
    clone.querySelector(".cart-tamanho").textContent = item.tamanho;

    const imgElement = clone.querySelector(".cart-img");
    if (imgElement) {
      imgElement.src = item.imagem_url || "/assets/img/logo.png";
      imgElement.alt = item.nome;
    }

    const qtyInput = clone.querySelector(".cart-qty-input");
    if (qtyInput) qtyInput.value = item.quantidade;

    clone.querySelector(".cart-preco-unitario").textContent =
      `Unid: ${item.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;

    clone.querySelector(".cart-subtotal-item").textContent =
      subtotalItem.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

    fragment.appendChild(clone);
  });

  listContainer.innerHTML = "";
  listContainer.appendChild(fragment);
  atualizarResumoFinanceiro();
}

// Eventos dos botões do carrinho (delegação)
function configurarOuvinteCarrinho() {
  const listContainer = document.getElementById("cart-items-container");
  if (!listContainer) return;

  listContainer.addEventListener("click", (e) => {
    const target = e.target;
    const card = target.closest("[data-id-variante]");
    if (!card) return;

    const idVariante = card.dataset.idVariante;
    const item = itensCarrinho.find((i) => i.id_variante === idVariante);
    if (!item) return;

    if (target.classList.contains("btn-qty-minus")) {
      if (item.quantidade > 1) {
        item.quantidade--;
        salvarCarrinhoNoStorage();
        renderizarCarrinho();
      }
    } else if (target.classList.contains("btn-qty-plus")) {
      item.quantidade++;
      salvarCarrinhoNoStorage();
      renderizarCarrinho();
    } else if (target.closest(".btn-remove-item")) {
      itensCarrinho = itensCarrinho.filter((i) => i.id_variante !== idVariante);
      salvarCarrinhoNoStorage();
      showSnackbar(`${item.nome} removido do carrinho.`, "info");
      renderizarCarrinho();
    }
  });
}

// Calcula o valor total do carrinho
function calcularTotal() {
  return itensCarrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0,
  );
}

// Atualiza os valores exibidos no resumo da compra
function atualizarResumoFinanceiro() {
  const totalFinal = calcularTotal();
  const txtSubtotal = document.getElementById("summary-subtotal");
  const txtTotal = document.getElementById("summary-total");
  const btnCheckout = document.getElementById("btn-checkout");

  const valorFormatado = totalFinal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  if (txtSubtotal) txtSubtotal.textContent = valorFormatado;
  if (txtTotal) txtTotal.textContent = valorFormatado;

  if (btnCheckout) btnCheckout.disabled = itensCarrinho.length === 0;
}

// Finalização da compra.
// TODO (nova stack): toda a validação de estoque e a gravação de venda/itens
// devem ocorrer no back-end, dentro de uma transação SQL (Sequelize).
async function processarCheckout() {
  const btnCheckout = document.getElementById("btn-checkout");
  if (itensCarrinho.length === 0) return;

  if (btnCheckout) btnCheckout.disabled = true;
  showSnackbar("Processando seu pedido, aguarde...", "info");

  // Payload que deve ser enviado ao back-end
  const payloadPedido = {
    itens: itensCarrinho.map((item) => ({
      id_variante: item.id_variante,
      quantidade: item.quantidade,
    })),
  };

  // TODO (nova stack): POST /checkout com `payloadPedido`.
  //   const resp = await fetch("/checkout", { method: "POST", headers: {...}, body: JSON.stringify(payloadPedido) });
  //   if (resp.ok) {
  //     const { vendaId, total, nomeCliente } = await resp.json();
  //     itensCarrinho = []; localStorage.removeItem(CART_STORAGE_KEY); renderizarCarrinho();
  //     abrirModalInstrucoesCheckout(vendaId, total, nomeCliente);
  //   } else { showSnackbar("Falha ao finalizar o pedido.", "invalid"); }
  console.log("Checkout (pendente integração com o back-end):", payloadPedido);
  showSnackbar("Checkout ainda não integrado ao back-end.", "info");
  if (btnCheckout) btnCheckout.disabled = false;
}

// Inicialização única de listeners
document.addEventListener("DOMContentLoaded", () => {
  itensCarrinho = getCartFromStorage();
  renderizarCarrinho();
  configurarOuvinteCarrinho();

  document
    .getElementById("btn-checkout")
    ?.addEventListener("click", processarCheckout);
});

function enviarMensagemWhatsApp(idCompra, total, nomeCliente) {
  const numeroLoja = "551994974618";

  const totalFormatado = total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const textoMensagem =
    `🛍️ *NOVO PEDIDO - CLOSET DRII* 🛍️%0A%0A` +
    `Olá! Meu nome é *${nomeCliente}* e acabei de finalizar um pedido no site.%0A%0A` +
    `📌 *DADOS DO PEDIDO:*%0A` +
    `• *Código:* %23${String(idCompra).padStart(4, "0")}%0A` +
    `• *Total:* ${totalFormatado}%0A%0A` +
    `⚙️ *PRÓXIMOS PASSOS:*%0A` +
    `O meu pedido consta como *PENDENTE* no site. Gostaria de combinar por aqui os detalhes do *pagamento e da entrega* com a equipe.%0A%0A` +
    `⚠️ _Estou ciente de que, assim que finalizarmos o acerto, o status mudará no painel do site. Caso o pagamento não seja realizado, a compra será cancelada._%0A%0A` +
    `✨ Fico no aguardo do atendimento!`;

  const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroLoja}&text=${textoMensagem}`;
  window.open(urlWhatsApp, "_blank");
}

function abrirModalInstrucoesCheckout(idCompra, total, nomeCliente) {
  const modal = document.getElementById("checkout-instructions-modal");
  const txtId = document.getElementById("modal-txt-id");
  const txtTotal = document.getElementById("modal-txt-total");
  const btnRedirect = document.getElementById("btn-modal-whatsapp-redirect");
  const btnClose = document.getElementById("btn-close-checkout-modal");

  if (!modal) return;

  if (txtId) txtId.textContent = `#${String(idCompra).padStart(4, "0")}`;
  if (txtTotal)
    txtTotal.textContent = total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  modal.style.display = "flex";

  const executarRedirecionamento = () => {
    modal.style.display = "none";
    enviarMensagemWhatsApp(idCompra, total, nomeCliente);
    btnRedirect.removeEventListener("click", executarRedirecionamento);
    btnClose?.removeEventListener("click", fecharModalDireto);
  };

  const fecharModalDireto = () => {
    modal.style.display = "none";
    btnRedirect.removeEventListener("click", executarRedirecionamento);
    btnClose?.removeEventListener("click", fecharModalDireto);
  };

  btnRedirect.addEventListener("click", executarRedirecionamento);
  btnClose?.addEventListener("click", fecharModalDireto);
}
