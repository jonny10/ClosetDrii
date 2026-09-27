import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";
import { database, auth } from "../../utils/firebase-config.js";
import {
  doc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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
// Mantém os produtos disponíveis mesmo após o usuário atualizar a página
function salvarCarrinhoNoStorage() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itensCarrinho));
}

// Adiciona um produto ao carrinho mantendo a regra de não duplicar variantes iguais
// Caso o item já exista, apenas incrementa sua quantidade
export function adicionarAoCarrinho(novoItem) {
  itensCarrinho = getCartFromStorage();

  // Procura se já existe uma variante igual adicionada no carrinho
  const itemExistente = itensCarrinho.find(
    (item) => item.id_variante === novoItem.id_variante,
  );

  // Se já existe, aumenta a quantidade comprada
  if (itemExistente) {
    itemExistente.quantidade += novoItem.quantidade || 1;
  }
  // Caso seja um novo produto, adiciona na lista
  else {
    itensCarrinho.push(novoItem);
  }

  salvarCarrinhoNoStorage();

  // Feedback visual para o usuário confirmando a ação
  showSnackbar(`${novoItem.nome} adicionado ao carrinho!`, "success");
}

// Renderiza os produtos atuais do carrinho na interface
// Usa templates HTML e fragmentos para evitar várias alterações no DOM
function renderizarCarrinho() {
  const listContainer = document.getElementById("cart-items-container");
  const emptyMessage = document.getElementById("empty-cart-message");
  const template = document.getElementById("template-cart-item");

  // Validação para evitar erro caso a página não tenha os elementos esperados
  if (!listContainer || !template) return;

  // Caso não existam produtos, exibe o estado vazio do carrinho
  if (itensCarrinho.length === 0) {
    listContainer.innerHTML = "";
    listContainer.style.display = "none";

    if (emptyMessage) emptyMessage.style.display = "block";

    atualizarResumoFinanceiro();
    return;
  }

  // Caso existam produtos, mostra a lista e esconde mensagem vazia
  listContainer.style.display = "flex";
  if (emptyMessage) emptyMessage.style.display = "none";

  // Cria tudo em memória antes de inserir no DOM
  // Evita múltiplos reflows e melhora performance
  const fragment = document.createDocumentFragment();

  itensCarrinho.forEach((item) => {
    // Clona o template para criar um novo card de produto
    const clone = template.content.cloneNode(true);

    // Calcula o subtotal daquele item específico
    const subtotalItem = item.preco * item.quantidade;

    // Guarda o ID da variante no elemento raiz
    // Permite identificar qual produto foi clicado usando delegação de eventos
    const cardRoot =
      clone.querySelector(".cart-item-card") || clone.firstElementChild;
    if (cardRoot) cardRoot.dataset.idVariante = item.id_variante;

    // Preenche os dados do produto no HTML
    clone.querySelector(".cart-nome").textContent = item.nome;
    clone.querySelector(".cart-cor").textContent = item.cor;
    clone.querySelector(".cart-tamanho").textContent = item.tamanho;

    // Atualiza imagem do produto com fallback caso não exista
    const imgElement = clone.querySelector(".cart-img");
    if (imgElement) {
      imgElement.src = item.imagem_url || "../../assets/img/logo.png";
      imgElement.alt = item.nome;
    }

    // Define quantidade inicial no input
    const qtyInput = clone.querySelector(".cart-qty-input");
    if (qtyInput) qtyInput.value = item.quantidade;

    // Mostra preço unitário formatado
    clone.querySelector(".cart-preco-unitario").textContent =
      `Unid: ${item.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;

    // Mostra subtotal do produto considerando quantidade
    clone.querySelector(".cart-subtotal-item").textContent =
      subtotalItem.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

    fragment.appendChild(clone);
  });

  // Atualiza a tela de uma vez com todos os produtos renderizados
  listContainer.innerHTML = "";
  listContainer.appendChild(fragment);
  atualizarResumoFinanceiro();
}

// Configura os eventos dos botões do carrinho usando delegação
// Assim existe apenas um listener para todos os produtos renderizados
function configurarOuvinteCarrinho() {
  const listContainer = document.getElementById("cart-items-container");
  if (!listContainer) return;

  listContainer.addEventListener("click", (e) => {
    // Descobre qual botão foi clicado
    const target = e.target;

    // Encontra o card do produto clicado
    const card = target.closest("[data-id-variante]");
    if (!card) return;

    const idVariante = card.dataset.idVariante;

    // Busca o produto correspondente dentro do estado do carrinho
    const item = itensCarrinho.find((i) => i.id_variante === idVariante);
    if (!item) return;

    // Diminui quantidade respeitando limite mínimo de 1
    if (target.classList.contains("btn-qty-minus")) {
      if (item.quantidade > 1) {
        item.quantidade--;
        salvarCarrinhoNoStorage();
        renderizarCarrinho();
      }
    } else if (target.classList.contains("btn-qty-plus")) {
      // Aumenta quantidade do produto

      item.quantidade++;
      salvarCarrinhoNoStorage();
      renderizarCarrinho();
    } else if (target.closest(".btn-remove-item")) {
      // Remove produto completamente do carrinho
      itensCarrinho = itensCarrinho.filter((i) => i.id_variante !== idVariante);
      salvarCarrinhoNoStorage();
      showSnackbar(`${item.nome} removido do carrinho.`, "info");
      renderizarCarrinho();
    }
  });
}

// Calcula o valor total somando todos os produtos e quantidades
function calcularTotal() {
  return itensCarrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0,
  );
}

// Atualiza os valores exibidos no resumo da compra
// Também controla se o botão de checkout deve estar disponível
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

  // Bloqueia checkout quando não existem produtos
  if (btnCheckout) btnCheckout.disabled = itensCarrinho.length === 0;
}

// Processa a finalização da compra diretamente no Firebase
// Utiliza uma transação para garantir que estoque, venda e itens sejam atualizados juntos
// evitando inconsistências caso ocorra algum erro no meio do processo
// Processa a esteira atômica de Checkout garantindo isolamento ACID sobre concorrência de estoque
async function processarCheckoutBancoDados() {
  const btnCheckout = document.getElementById("btn-checkout");
  const loggedUserRaw = localStorage.getItem("loggedUser");

  if (!loggedUserRaw) {
    showSnackbar(
      "Você precisa estar logado para finalizar uma compra.",
      "invalid",
    );

    // Força a limpeza de possíveis dados locais corrompidos ou manipulados
    localStorage.removeItem("loggedUser");

    setTimeout(() => (window.location.href = "../login/login.html"), 2000);
    return;
  }

  const usuarioLogado = JSON.parse(loggedUserRaw);
  if (btnCheckout) btnCheckout.disabled = true;
  showSnackbar("Processando seu pedido, aguarde...", "info");

  let vendaIdGerado = null;
  const totalPedido = calcularTotal();
  const nomeCliente =
    usuarioLogado.nome || usuarioLogado.email.split("@")[0];

  try {
    const timestampAtual = new Date().toISOString();

    // Executa todas as alterações como uma única operação atômica
    // Se qualquer etapa falhar, nenhuma alteração é aplicada no banco
    await runTransaction(database, async (transaction) => {
      // Referências dos contadores responsáveis por gerar IDs sequenciais
      const vendasCounterRef = doc(database, "contadores", "vendas");
      const produtoVendasCounterRef = doc(
        database,
        "contadores",
        "produto_vendas",
      );

      // Busca os valores atuais dos contadores
      // Eles serão usados para gerar os próximos IDs
      const [vendasCounterSnap, prodVendasCounterSnap] = await Promise.all([
        transaction.get(vendasCounterRef),
        transaction.get(produtoVendasCounterRef),
      ]);

      // Define o próximo ID da venda
      // Caso seja a primeira venda, começa pelo ID 1
      const proximoVendaId = vendasCounterSnap.exists()
        ? vendasCounterSnap.data().atual + 1
        : 1;

      // Recupera o último ID de produto_venda criado
      let proximoProdVendaId = prodVendasCounterSnap.exists()
        ? prodVendasCounterSnap.data().atual
        : 0;

      // Cria todas as referências das variantes compradas
      // Isso permite buscar os estoques em paralelo
      vendaIdGerado = proximoVendaId;

      const referenciasVariantes = itensCarrinho.map((item) =>
        doc(database, "produto_variantes", String(item.id_variante)),
      );

      // Busca todos os produtos do carrinho ao mesmo tempo
      // Melhora performance comparado a fazer uma busca por item
      const snapshotsVariantes = await Promise.all(
        referenciasVariantes.map((ref) => transaction.get(ref)),
      );

      // Guarda as atualizações de estoque que serão aplicadas depois
      const variantesAtualizadas = [];

      // Valida todos os produtos antes de gravar a compra
      // Evita criar uma venda sem estoque suficiente
      itensCarrinho.forEach((item, index) => {
        const varianteSnap = snapshotsVariantes[index];

        // Caso o produto tenha sido removido do banco
        if (!varianteSnap.exists()) {
          throw new Error(
            `A variante do produto ${item.nome} não foi encontrada no banco.`,
          );
        }

        // Recupera o estoque atual da variante
        const estoqueAtual = Number(varianteSnap.data().estoque);

        // Bloqueia compras acima do estoque disponível
        if (estoqueAtual < item.quantidade) {
          throw new Error(
            `Estoque insuficiente para ${item.nome} (${item.cor} - ${item.tamanho}). Disponível: ${estoqueAtual}`,
          );
        }

        // Salva o novo estoque que será aplicado após confirmar a compra
        variantesAtualizadas.push({
          ref: referenciasVariantes[index],
          novoEstoque: estoqueAtual - item.quantidade,
        });
      });

      // Cria o registro principal da venda
      // Representa o pedido realizado pelo usuário
      const novaVendaRef = doc(database, "vendas", String(proximoVendaId));
      transaction.set(novaVendaRef, {
        usuario_id: String(usuarioLogado.uid),
        valor_total: totalPedido,
        status: "pendente",
        endereco_entrega_id: "1",
        created_at: timestampAtual,
        updated_at: timestampAtual,
      });

      // Cria cada item relacionado à venda
      // Cada produto comprado vira um registro separado
      itensCarrinho.forEach((item) => {
        proximoProdVendaId++;
        const itemVendaRef = doc(
          database,
          "produto_vendas",
          String(proximoProdVendaId),
        );

        transaction.set(itemVendaRef, {
          produto_variante_id: String(item.id_variante),
          venda_id: String(proximoVendaId),
          quantidade: item.quantidade,
          valor: item.preco * item.quantidade,
          created_at: timestampAtual,
          updated_at: timestampAtual,
        });
      });

      // Atualiza estoques decrementados
      variantesAtualizadas.forEach((v) => {
        transaction.update(v.ref, {
          estoque: v.novoEstoque,
          updated_at: timestampAtual,
        });
      });

      // Commita estados das chaves primárias globais do ecossistema
      transaction.set(vendasCounterRef, { atual: proximoVendaId });
      transaction.set(produtoVendasCounterRef, { atual: proximoProdVendaId });
    });

    // Caso a transação finalize sem erros,
    // limpa o carrinho e informa sucesso ao usuário
    showSnackbar(
      "Pedido finalizado com sucesso! Estoque atualizado.",
      "success",
    );

    abrirModalInstrucoesCheckout(vendaIdGerado, totalPedido, nomeCliente);

    itensCarrinho = [];
    localStorage.removeItem(CART_STORAGE_KEY);
    renderizarCarrinho();
  } catch (error) {
    // Captura erros de estoque, Firebase ou falhas de transação
    console.error("❌ Erro na transação de checkout:", error);
    showSnackbar(
      error.message || "Erro desconhecido ao processar pedido.",
      "invalid",
    );

    // Libera novamente o botão caso a compra falhe
    if (btnCheckout) btnCheckout.disabled = false;
  }
}

// Inicialização única de listeners
document.addEventListener("DOMContentLoaded", () => {
  itensCarrinho = getCartFromStorage();
  renderizarCarrinho();
  configurarOuvinteCarrinho();

  document
    .getElementById("btn-checkout")
    ?.addEventListener("click", processarCheckoutBancoDados);
});

function enviarMensagemWhatsApp(idCompra, total, nomeCliente) {
  // Substitua pelo número oficial da Closet Drii (DDI + DDD + Número apenas)
  const numeroLoja = "551994974618";

  const totalFormatado = total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Template com formatação de negritos (*) e tópicos para leitura fluida
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

  // Abre o aplicativo ou aba do WhatsApp Web sem quebrar a experiência do carrinho
  window.open(urlWhatsApp, "_blank");
}

function abrirModalInstrucoesCheckout(idCompra, total, nomeCliente) {
  const modal = document.getElementById("checkout-instructions-modal");
  const txtId = document.getElementById("modal-txt-id");
  const txtTotal = document.getElementById("modal-txt-total");
  const btnRedirect = document.getElementById("btn-modal-whatsapp-redirect");
  const btnClose = document.getElementById("btn-close-checkout-modal");

  if (!modal) return;

  // Atualiza as strings de dados do resumo nos nós do HTML
  if (txtId) txtId.textContent = `#${String(idCompra).padStart(4, "0")}`;
  if (txtTotal)
    txtTotal.textContent = total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  // Exibe o modal na tela usando a propriedade flex global
  modal.style.display = "flex";

  // Cria uma função isolada para limpar os ouvintes e disparar o app do Whats
  const executarRedirecionamento = () => {
    modal.style.display = "none";
    enviarMensagemWhatsApp(idCompra, total, nomeCliente);

    // Remove os ouvintes pontuais para evitar acúmulos na memória
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
