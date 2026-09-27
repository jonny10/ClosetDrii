import { showSnackbar } from "/js/global/snackbar.js";
// TODO (nova stack): integrar com o módulo de carrinho do back-end (Node/Sequelize).
// O carrinho ainda não foi implementado no novo projeto — ver handleAddToCart abaixo.
// import { adicionarAoCarrinho } from "<modulo-de-carrinho>";

let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let selectedQty = 1;

// O HTML do modal é injetado pelo servidor como partial do Handlebars
// (partials/product-modal.handlebars, incluído no layout). Aqui só ligamos os eventos.
function initModal() {
  const modal = document.getElementById("product-modal");
  if (!modal) return; // partial não presente nesta página
  setupModalEvents();
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

  const inputQty = document.getElementById("modal-qty-input");
  if (inputQty) inputQty.value = 1;

  // Popula dados básicos
  document.getElementById("modal-product-name").textContent = produto.nome;
  document.getElementById("modal-product-category").textContent =
    produto.categoria || "Moda Feminina";

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

  const coresUnicas = [...new Set(listaVariantes.map((v) => v.cor))];
  buildColorSelectors(coresUnicas);

  selectColor(coresUnicas[0]);

  document.getElementById("product-modal").classList.add("active");
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
    document.getElementById("modal-product-img").src = "/assets/img/logo.png";
  }

  buildSizeSelectors(variantesDaCor);

  const primeiroComEstoque = variantesDaCor.find((v) => v.estoque > 0);
  if (primeiroComEstoque) {
    selectSize(primeiroComEstoque.tamanho);
  } else {
    selectSize(variantesDaCor[0]?.tamanho || null);
  }
}

function buildSizeSelectors(variantes) {
  const container = document.getElementById("modal-size-options");
  container.innerHTML = "";

  const tamanhosDisponiveis = variantes.map((v) => v.tamanho);
  const padraoTamanhos = ["36", "38", "40", "42", "U", "P", "M", "G", "GG"];

  const tamanhosParaRenderizar = padraoTamanhos.filter((t) =>
    tamanhosDisponiveis.includes(t),
  );

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

// Processa os dados dinâmicos selecionados e monta o item do carrinho
function handleAddToCart() {
  if (!selectedColor || !selectedSize) {
    showSnackbar("Por favor, selecione cor e tamanho.", "error");
    return;
  }

  const varianteSelecionada = currentProduct.variantes.find(
    (v) => v.cor === selectedColor && v.tamanho === selectedSize,
  );

  if (!varianteSelecionada) {
    showSnackbar("Esta combinação não está disponível.", "error");
    return;
  }

  const itemCarrinho = {
    id_variante: varianteSelecionada.id, // ID real da linha em produto_variantes
    produto_id: currentProduct.id,
    nome: currentProduct.nome,
    preco: currentProduct.preco,
    cor: selectedColor,
    tamanho: selectedSize,
    quantidade: selectedQty,
    imagem_url: varianteSelecionada.imagem_url || "/assets/img/logo.png",
  };

  // TODO (nova stack): enviar `itemCarrinho` ao módulo de carrinho do back-end
  // (ou persistir via API). Placeholder temporário até o carrinho existir:
  console.log("Item para o carrinho:", itemCarrinho);
  showSnackbar("Produto adicionado ao carrinho.", "success");

  closeModal();
}

// Liga os eventos ao modal presente na página (partial do Handlebars)
initModal();
