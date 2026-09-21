import { showSnackbar } from "/js/global/snackbar.js";
// 🌟 NOVO IMPORT: Conecta o modal com a lógica real de persistência do carrinho
import { adicionarAoCarrinho } from "../../../pages/cart/cart.js"; // Certifique-se de que o caminho das pastas bate no seu projeto

let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let selectedQty = 1;

// Injeta automaticamente o HTML do modal na página assim que o script é importado
async function initModal() {
  if (document.getElementById("product-modal")) return;

  try {
    const response = await fetch(
      "../../shared/components/product-modal/product-modal.html",
    );
    const html = await response.text();

    document.body.insertAdjacentHTML("beforeend", html);
    setupModalEvents();
  } catch (error) {
    console.error("Erro ao carregar o componente global de modal:", error);
  }
}

function setupModalEvents() {
  const modal = document.getElementById("product-modal");
  const btnClose = modal.querySelector(".modal-close-btn");

  btnClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Controles de quantidade
  const inputQty = document.getElementById("modal-qty-input");
  document.getElementById("btn-qty-minus").addEventListener("click", () => {
    if (selectedQty > 1) {
      selectedQty--;
      inputQty.value = selectedQty;
    }
  });

  document.getElementById("btn-qty-plus").addEventListener("click", () => {
    const variante = currentProduct.variantes.find(
      (v) => v.cor === selectedColor && v.tamanho === selectedSize,
    );
    if (variante && selectedQty < variante.estoque) {
      selectedQty++;
      inputQty.value = selectedQty;
    } else {
      showSnackbar("Limite de estoque atingido para esta variação.", "error");
    }
  });

  // Evento de Adicionar ao carrinho
  document
    .getElementById("modal-add-to-cart-btn")
    .addEventListener("click", handleAddToCart);
}

function closeModal() {
  document.getElementById("product-modal").classList.remove("active");
}

export function openProductModal(produto) {
    currentProduct = produto;
    selectedQty = 1;
    
    const inputQty = document.getElementById('modal-qty-input');
    if (inputQty) inputQty.value = 1;

    // Popula dados básicos
    document.getElementById('modal-product-name').textContent = produto.nome;
    document.getElementById('modal-product-category').textContent = produto.categoria || 'Moda Feminina';
    
    const precoNum =
      typeof produto.preco === "number"
        ? produto.preco
        : parseFloat(produto.preco.replace(/[^\d.,]/g, "").replace(",", "."));
    document.getElementById("modal-product-price").textContent =
      precoNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    document.getElementById("modal-product-description").textContent =
      produto.descricao || "Nenhuma descrição disponível.";

    const listaVariantes = produto.variantes || produto.produto_variantes || [];

    if (listaVariantes.length === 0) {
      console.warn(
        `O produto "${produto.nome}" não possui nenhuma variante cadastrada.`,
      );
      document.getElementById("modal-color-options").innerHTML =
        '<p class="stock-status">Variações indisponíveis</p>';
      document.getElementById("modal-size-options").innerHTML = "";
      document.getElementById("modal-stock-status").textContent =
        "Fora de estoque";
      document.getElementById("modal-add-to-cart-btn").disabled = true;

      document.getElementById("product-modal").classList.add("active");
      return;
    }

    currentProduct.variantes = listaVariantes;

    const coresUnicas = [...new Set(listaVariantes.map(v => v.cor))];
    buildColorSelectors(coresUnicas);

    selectColor(coresUnicas[0]);

    document.getElementById('product-modal').classList.add('active');
}

function buildColorSelectors(cores) {
  const container = document.getElementById("modal-color-options");
  container.innerHTML = "";

  cores.forEach((cor) => {
    const btn = document.createElement("button");
    btn.className = "color-btn";
    btn.textContent = cor;
    btn.addEventListener("click", () => selectColor(cor));
    container.appendChild(btn);
  });
}

function selectColor(cor) {
  selectedColor = cor;
  document.getElementById("selected-color-text").textContent = cor;

  document.querySelectorAll(".color-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.textContent === cor);
  });

  const variantesDaCor = currentProduct.variantes.filter((v) => v.cor === cor);

  if (variantesDaCor.length > 0 && variantesDaCor[0].imagem_url) {
    document.getElementById("modal-product-img").src =
      variantesDaCor[0].imagem_url;
  } else {
    document.getElementById("modal-product-img").src =
      "../../assets/img/logo.png";
  }

  buildSizeSelectors(variantesDaCor);

  const primeiroComEstoque = variantesDaCor.find((v) => v.estoque > 0);
  if (primeiroComEstoque) {
    selectSize(primeiroComEstoque.tamanho);
  } else {
    // Se o primeiro não tiver estoque, pega a primeira variação de tamanho mesmo assim
    selectSize(variantesDaCor[0]?.tamanho || null);
  }
}

function buildSizeSelectors(variantes) {
  const container = document.getElementById("modal-size-options");
  container.innerHTML = "";

  // Suporta tamanhos numéricos do jeans (36, 38) ou tradicionais (P, M, G) mapeados no banco
  const tamanhosDisponiveis = variantes.map((v) => v.tamanho);

  // Lista base para renderizar os botões na ordem correta da tela
  const padraoTamanhos = ["36", "38", "40", "42", "U", "P", "M", "G", "GG"];

  // Ordena os botões conforme a lista padrão para não misturar posições na tela
  const tamanhosParaRenderizar = padraoTamanhos.filter((t) =>
    tamanhosDisponiveis.includes(t),
  );

  // Fallback caso venha algum tamanho fora do padrão definido
  tamanhosDisponiveis.forEach((t) => {
    if (!tamanhosParaRenderizar.includes(t)) tamanhosParaRenderizar.push(t);
  });

  tamanhosParaRenderizar.forEach((tam) => {
    const varianteExistente = variantes.find((v) => v.tamanho === tam);
    const btn = document.createElement("button");
    btn.className = "size-btn";
    btn.textContent = tam;

    if (!varianteExistente || varianteExistente.estoque === 0) {
      btn.classList.add("disabled");
      // Se não tem estoque, o botão só ganha estilo desativado e não aceita click
    } else {
      btn.addEventListener("click", () => selectSize(tam));
    }

    container.appendChild(btn);
  });
}

function selectSize(tamanho) {
  selectedSize = tamanho;
  document.getElementById("selected-size-text").textContent = tamanho
    ? tamanho
    : "Selecione";

  document.querySelectorAll(".size-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.textContent === tamanho);
  });

  updateStockStatus();
}

function updateStockStatus() {
  const txtEstoque = document.getElementById("modal-stock-status");
  const btnCarrinho = document.getElementById("modal-add-to-cart-btn");

  if (!selectedColor || !selectedSize) {
    txtEstoque.textContent = "";
    btnCarrinho.disabled = true;
    return;
  }

  const variante = currentProduct.variantes.find(
    (v) => v.cor === selectedColor && v.tamanho === selectedSize,
  );

  if (variante && variante.estoque > 0) {
    txtEstoque.textContent = `Em estoque (${variante.estoque} unidades disponíveis)`;
    txtEstoque.style.color = "#2e7d32";
    btnCarrinho.disabled = false;
  } else {
    txtEstoque.textContent = "Fora de estoque";
    txtEstoque.style.color = "#c62828";
    btnCarrinho.disabled = true;
  }
}

// 🌟 ATUALIZADO: Processa os dados dinâmicos selecionados e joga no localStorage
function handleAddToCart() {
  if (!selectedColor || !selectedSize) {
    showSnackbar("Por favor, selecione cor e tamanho.", "error");
    return;
  }

  // Localiza a variante selecionada para resgatar o ID real da linha ("produto_variantes")
  const varianteSelecionada = currentProduct.variantes.find(
    (v) => v.cor === selectedColor && v.tamanho === selectedSize,
  );

  if (!varianteSelecionada) {
    showSnackbar("Esta combinação não está disponível.", "error");
    return;
  }

  // Monta o payload idêntico ao contrato aceito pelo renderizador do carrinho
  const itemCarrinho = {
    id_variante: varianteSelecionada.id, // O ID string do doc do Firestore mapeado na busca
    produto_id: currentProduct.id,
    nome: currentProduct.nome,
    preco: currentProduct.preco,
    cor: selectedColor,
    tamanho: selectedSize,
    quantidade: selectedQty,
    imagem_url: varianteSelecionada.imagem_url || "/assets/img/logo.png",
  };

  // Envia diretamente para o gerenciador do carrinho (localStorage)
  adicionarAoCarrinho(itemCarrinho);

  closeModal();
}

// Executa o carregamento assíncrono do HTML do componente
initModal();
