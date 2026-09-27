import { database, auth } from "../../utils/firebase-config.js";
import { protegerRota } from "../../utils/auth-helpers.js";
import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";
import {
  collection,
  getDocs,
  query,
  where,
  documentId,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Inicialização da Página monitorada pelo Firebase Auth
document.addEventListener("DOMContentLoaded", () => {
  protegerRota(
    async (user) => {
      await carregarHistoricoPedidos(user.uid);
    },
    "Acesso restrito. Faça login para visualizar seu histórico.",
  );
});

async function carregarHistoricoPedidos(userUid) {
  const container = document.getElementById("orders-container");
  const emptyMessage = document.getElementById("empty-history-message");

  try {
    // Consulta filtrada: busca somente vendas relacionadas ao usuário autenticado
    const formulasQuery = query(
      collection(database, "vendas"),
      where("usuario_id", "==", String(userUid)),
    );

    const vendasSnapshot = await getDocs(formulasQuery);

    // Caso o usuário não tenha compras registradas, escondemos a lista
    // e mostramos o estado vazio da página
    if (vendasSnapshot.empty) {
      if (container) container.style.display = "none";
      if (emptyMessage) emptyMessage.style.display = "block";
      return;
    }

    // Se existem pedidos, garante que a lista fique visível
    // e remove a mensagem de histórico vazio
    if (container) container.style.display = "flex";
    if (emptyMessage) emptyMessage.style.display = "none";

    // Transforma o retorno do Firebase em um array manipulável
    // Também guarda os IDs das vendas para buscar apenas os produtos relacionados
    const listaVendas = [];
    const idsVendasUsuario = [];

    vendasSnapshot.forEach((docSnap) => {
      const idVenda = docSnap.id;

      idsVendasUsuario.push(idVenda);

      listaVendas.push({
        id: idVenda,
        ...docSnap.data(),
      });
    });

    // Ordena os pedidos pelo ID para mostrar primeiro as compras mais recentes
    // O usuário sempre verá o histórico em ordem cronológica decrescente
    listaVendas.sort((a, b) => Number(b.id) - Number(a.id));

    // Busca somente os produtos que pertencem às vendas encontradas
    const produtoVendasQuery = query(
      collection(database, "produto_vendas"),
      where("venda_id", "in", idsVendasUsuario.slice(0, 30)),
    );

    const produtoVendasSnapshot = await getDocs(produtoVendasQuery);

    // Cria uma lista única de variantes necessárias
    // Assim evitamos buscar todas as variantes existentes no banco
    const idsVariantesNecessarias = new Set();

    produtoVendasSnapshot.forEach((docSnap) => {
      idsVariantesNecessarias.add(docSnap.data().produto_variante_id);
    });

    // Busca somente as informações das variantes utilizadas nas compras
    // Recupera dados como cor, tamanho e imagem do produto
    let variantesMap = {};

    if (idsVariantesNecessarias.size > 0) {
      const variantesQuery = query(
        collection(database, "produto_variantes"),
        where(
          documentId(),
          "in",
          Array.from(idsVariantesNecessarias).slice(0, 30),
        ),
      );

      const variantesSnapshot = await getDocs(variantesQuery);

      // Monta um mapa usando o ID da variante como chave
      // Facilita encontrar rapidamente os dados do produto depois
      variantesSnapshot.forEach((docSnap) => {
        variantesMap[docSnap.id] = docSnap.data();
      });
    }

    // Organiza os produtos agrupando pelo ID da venda
    // Dessa forma cada pedido recebe apenas seus próprios itens
    const itensPorVendaMap = {};

    produtoVendasSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const vendaId = data.venda_id;

      // Inicializa o array da venda caso ainda não exista
      if (!itensPorVendaMap[vendaId]) {
        itensPorVendaMap[vendaId] = [];
      }

      // Recupera os detalhes da variante correspondente
      const dadosVariante = variantesMap[data.produto_variante_id] || {};

      // Salva somente os dados necessários para montar o card do pedido
      itensPorVendaMap[vendaId].push({
        quantidade: data.quantidade,
        valorTotalItem: data.valor,
        cor: dadosVariante.cor || "Padrão",
        tamanho: dadosVariante.tamanho || "U",
        imagem_url: dadosVariante.imagem_url || "../../assets/img/logo.png",

        nome: dadosVariante.cor
          ? `Peça Elegance ${dadosVariante.cor}`
          : "Look Closet Drii",
      });
    });

    // Busca os templates HTML já preparados no documento
    // Eles serão clonados para montar os cards sem criar HTML manualmente
    const cardTemplate = document.getElementById("template-order-card");
    const itemTemplate = document.getElementById("template-order-item");

    // Validação para evitar erro caso os templates não existam na página
    if (!cardTemplate || !itemTemplate) return;

    // Cria um fragmento em memória para montar todos os pedidos antes de inserir no DOM
    // Melhora performance evitando vários reflows da página
    const fragmentoVisual = document.createDocumentFragment();

    // Percorre cada venda encontrada para criar seu card visual
    listaVendas.forEach((venda) => {
      // Duplica o template do pedido para preencher os dados reais da compra
      const cardClone = cardTemplate.content.cloneNode(true);

      // Preenche informações gerais do pedido
      cardClone.querySelector(".order-id").textContent =
        `#${venda.id.padStart(4, "0")}`;

      // Converte a data salva no Firebase para o formato brasileiro
      // Caso não exista data, usa a data atual como fallback
      const dataFormatada = venda.created_at
        ? new Date(venda.created_at).toLocaleDateString("pt-BR")
        : new Date().toLocaleDateString("pt-BR");

      cardClone.querySelector(".order-date").textContent = dataFormatada;

      // Atualiza o badge de status dinamicamente
      // A classe também muda para aplicar o estilo correspondente ao status
      const statusBadge = cardClone.querySelector(".order-status-badge");

      statusBadge.textContent = venda.status;

      statusBadge.className = `order-status-badge status-${venda.status.toLowerCase()}`;

      // Formata o valor total da compra para moeda brasileira
      cardClone.querySelector(".order-total-price").textContent = Number(
        venda.valor_total,
      ).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      // Localiza o espaço onde os produtos desse pedido serão inseridos
      const itemsContainer = cardClone.querySelector(
        ".order-products-rows-list",
      );

      // Busca apenas os produtos pertencentes a essa venda específica
      const itensDessaVenda = itensPorVendaMap[venda.id] || [];

      // Renderiza cada item comprado dentro do card do pedido
      itensDessaVenda.forEach((item) => {
        // Cria uma cópia do template de item do produto
        const itemClone = itemTemplate.content.cloneNode(true);

        // Preenche os dados visuais do produto comprado
        itemClone.querySelector(".cart-nome").textContent = item.nome;
        itemClone.querySelector(".cart-cor").textContent = item.cor;
        itemClone.querySelector(".cart-tamanho").textContent = item.tamanho;
        itemClone.querySelector(".qty-count").textContent = item.quantidade;
        itemClone.querySelector(".cart-img").src = item.imagem_url;

        // Calcula o preço unitário dividindo o valor total pela quantidade
        itemClone.querySelector(".cart-preco-unitario").textContent = `Unid: ${(
          item.valorTotalItem / item.quantidade
        ).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}`;

        // Mostra o subtotal daquele produto dentro da compra
        itemClone.querySelector(".cart-subtotal-item").textContent = Number(
          item.valorTotalItem,
        ).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

        // Adiciona o produto renderizado dentro da lista do pedido
        itemsContainer.appendChild(itemClone);
      });

      // Adiciona o pedido completo ao fragmento de renderização
      fragmentoVisual.appendChild(cardClone);
    });

    // Limpa o conteúdo antigo e insere todos os pedidos de uma vez
    container.innerHTML = "";

    container.appendChild(fragmentoVisual);
  } catch (error) {
    // Captura falhas de comunicação com Firebase ou problemas de renderização
    console.error("❌ Erro ao renderizar histórico otimizado:", error);

    showSnackbar("Erro ao processar sua lista de pedidos.", "error");
  }
}
