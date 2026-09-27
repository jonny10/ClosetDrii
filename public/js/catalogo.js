import { showSnackbar } from "/js/global/snackbar.js";

// Catálogo (admin) — CRUD de produtos e variantes.
//
// Proteção de rota (admin) e persistência agora são do back-end (Node/Express + Sequelize):
//   - A rota deve ser protegida por middleware no servidor (não mais no cliente).
//   - Listar/criar/editar/excluir produtos e variantes vira chamada à API.
//   - Upload de imagem deve ser feito pelo back-end (a antiga chave imgBB no cliente
//     era um segredo exposto e foi REMOVIDA).
//
// Mantida aqui toda a UI: tabela, modal de formulário e edição de variantes em memória.

// Estados voláteis locais (populados pelo back-end via TODO)
let produtosCache = [];
let categoriasCache = {};
let buscaDebounceTimer;
let idProdutoParaExcluir = null;
let variantesFormState = [];
const arquivosPendentes = {}; // { [rowId]: File }

document.addEventListener("DOMContentLoaded", () => {
  // TODO (nova stack): proteger a rota no servidor. Aqui apenas carrega a UI.
  carregarDadosIniciais();
  configurarOuvintesEventos();
});

// TODO (nova stack): buscar produtos e categorias do back-end (GET /admin/produtos, /categorias)
async function carregarDadosIniciais() {
  produtosCache = [];

  // Popular o select de categorias quando os dados vierem do servidor.
  const selectCategoria = document.getElementById("form-categoria");
  if (selectCategoria) selectCategoria.innerHTML = "";
  // Ex.: categoriasCache[id] = nome; e criar <option> para cada.

  filtrarERenderizarTabela();
}

// Filtra em memória e injeta as linhas da tabela
function filtrarERenderizarTabela() {
  const tbody = document.getElementById("crud-products-tbody");
  if (!tbody) return;

  const inputBusca = document.getElementById("crud-search-input");
  const termo = inputBusca?.value.trim().toLowerCase() || "";

  const produtosFiltrados = produtosCache.filter(
    (p) =>
      p.nome.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo),
  );

  if (produtosFiltrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Nenhum look corresponde aos critérios de pesquisa.</td></tr>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  produtosFiltrados.forEach((produto) => {
    const tr = document.createElement("tr");

    const listaVariantesHTML =
      produto.variantes.length > 0
        ? `<ul class="crud-variants-list">
          ${produto.variantes.map((v) => `<li><i class="fas fa-caret-right"></i> ${v.tamanho}-${v.cor} <strong>(${v.estoque})</strong></li>`).join("")}
         </ul>`
        : '<span class="no-variants-text">Sem variantes</span>';

    tr.innerHTML = `
      <td><strong>#${String(produto.id).padStart(3, "0")}</strong></td>
      <td><span class="product-title-bold">${produto.nome}</span></td>
      <td><span class="badge-category">${produto.categoria}</span></td>
      <td><span class="product-price-highlight">${produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></td>
      <td>${listaVariantesHTML}</td>
      <td>
        <div class="action-buttons-wrapper">
          <button class="btn-action-edit" data-id="${produto.id}" title="Editar Look"><i class="fas fa-edit"></i></button>
          <button class="btn-action-delete" data-id="${produto.id}" title="Excluir Look"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    `;

    fragment.appendChild(tr);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

function configurarOuvintesEventos() {
  const modal = document.getElementById("product-crud-modal");
  const deleteModal = document.getElementById("delete-confirm-modal");
  const form = document.getElementById("product-crud-form");
  const btnOpenCreate = document.getElementById("btn-open-create-modal");
  const tbody = document.getElementById("crud-products-tbody");
  const inputBusca = document.getElementById("crud-search-input");
  const btnAddVariantRow = document.getElementById("btn-add-variant-row");

  inputBusca?.addEventListener("input", () => {
    clearTimeout(buscaDebounceTimer);
    buscaDebounceTimer = setTimeout(() => filtrarERenderizarTabela(), 250);
  });

  btnOpenCreate?.addEventListener("click", () => {
    form.reset();
    document.getElementById("form-product-id").value = "";
    document.getElementById("modal-title-context").textContent =
      "Cadastrar Novo Look";

    variantesFormState = [
      { id: `new_${Date.now()}`, tamanho: "M", cor: "", estoque: 1, imagem_url: "" },
    ];
    renderizarLinhasVariantesModal();
    modal.style.display = "flex";
  });

  const fecharModal = () => {
    modal.style.display = "none";
    Object.keys(arquivosPendentes).forEach((k) => delete arquivosPendentes[k]);
  };
  document.getElementById("btn-close-modal")?.addEventListener("click", fecharModal);
  document.getElementById("btn-cancel-form")?.addEventListener("click", fecharModal);

  btnAddVariantRow?.addEventListener("click", () => {
    variantesFormState.push({
      id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tamanho: "M",
      cor: "",
      estoque: 1,
      imagem_url: "",
    });
    renderizarLinhasVariantesModal();
  });

  const variantsContainer = document.getElementById("form-variants-container");
  variantsContainer?.addEventListener("input", (e) => {
    const field = e.target.dataset.field;
    const rowId = e.target.dataset.rowId;
    if (!field || !rowId) return;

    const variante = variantesFormState.find((v) => v.id === rowId);
    if (variante) {
      variante[field] =
        field === "estoque" ? Number(e.target.value) : e.target.value.trim();
    }
  });

  variantsContainer?.addEventListener("click", (e) => {
    const btnDelete = e.target.closest(".btn-remove-variant-row");
    if (!btnDelete) return;

    const rowId = btnDelete.dataset.rowId;
    variantesFormState = variantesFormState.filter((v) => v.id !== rowId);
    renderizarLinhasVariantesModal();
  });

  tbody?.addEventListener("click", (e) => {
    const targetBtn = e.target.closest("button");
    if (!targetBtn) return;

    const idProduto = Number(targetBtn.dataset.id);
    const produtoSelecionado = produtosCache.find((p) => p.id === idProduto);

    if (targetBtn.classList.contains("btn-action-edit") && produtoSelecionado) {
      document.getElementById("form-product-id").value = String(produtoSelecionado.id);
      document.getElementById("form-nome").value = produtoSelecionado.nome;
      document.getElementById("form-descricao").value = produtoSelecionado.descricao;
      document.getElementById("form-preco").value = produtoSelecionado.preco;

      const fkCategoria = Object.keys(categoriasCache).find(
        (key) => categoriasCache[key] === produtoSelecionado.categoria,
      );
      if (fkCategoria) document.getElementById("form-categoria").value = fkCategoria;

      variantesFormState = produtoSelecionado.variantes.map((v) => ({ ...v }));
      renderizarLinhasVariantesModal();

      document.getElementById("modal-title-context").textContent =
        `Editando Look #${produtoSelecionado.id}`;
      modal.style.display = "flex";
    } else if (targetBtn.classList.contains("btn-action-delete")) {
      idProdutoParaExcluir = idProduto;
      deleteModal.style.display = "flex";
    }
  });

  document
    .getElementById("btn-close-delete-modal")
    ?.addEventListener("click", () => (deleteModal.style.display = "none"));
  document
    .getElementById("btn-cancel-delete")
    ?.addEventListener("click", () => (deleteModal.style.display = "none"));

  document.getElementById("btn-confirm-delete")?.addEventListener("click", async () => {
    if (idProdutoParaExcluir) {
      deleteModal.style.display = "none";
      await executarRemocaoProduto(idProdutoParaExcluir);
      idProdutoParaExcluir = null;
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInputVal = document.getElementById("form-product-id").value;
    const dadosForm = {
      nome: document.getElementById("form-nome").value.trim(),
      descricao: document.getElementById("form-descricao").value.trim(),
      preco: Number(document.getElementById("form-preco").value),
      categoria_id: document.getElementById("form-categoria").value,
    };

    if (idInputVal) {
      await executarUpdateCompleto(idInputVal, dadosForm);
    } else {
      await executarInsercaoCompleta(dadosForm);
    }

    fecharModal();
  });
}

// Injeta as linhas de inputs de variantes no modal
function renderizarLinhasVariantesModal() {
  const container = document.getElementById("form-variants-container");
  if (!container) return;

  if (variantesFormState.length === 0) {
    container.innerHTML = `<p class="empty-variants-alert">Nenhuma variante cadastrada. Adicione pelo menos uma para o produto ir ao ar.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  variantesFormState.forEach((variante) => {
    const row = document.createElement("div");
    row.className = "variant-form-row";

    const previewSrc = variante.imagem_url || "";

    row.innerHTML = `
      <select data-row-id="${variante.id}" data-field="tamanho" required>
        <option value="P" ${variante.tamanho === "P" ? "selected" : ""}>P</option>
        <option value="M" ${variante.tamanho === "M" ? "selected" : ""}>M</option>
        <option value="G" ${variante.tamanho === "G" ? "selected" : ""}>G</option>
        <option value="GG" ${variante.tamanho === "GG" ? "selected" : ""}>GG</option>
        <option value="U" ${variante.tamanho === "U" ? "selected" : ""}>U</option>
      </select>
      <input type="text" data-row-id="${variante.id}" data-field="cor" value="${variante.cor}" required placeholder="Ex: Rosa Fúcsia" />
      <input type="number" data-row-id="${variante.id}" data-field="estoque" value="${variante.estoque}" min="0" required placeholder="10" />
      <div class="variant-image-upload">
        ${previewSrc ? `<img class="variant-img-preview" src="${previewSrc}" alt="preview" />` : `<span class="variant-img-placeholder"><i class="fas fa-image"></i></span>`}
        <label class="btn-upload-img" title="Selecionar imagem">
          <i class="fas fa-upload"></i>
          <input type="file" accept="image/*" data-row-id="${variante.id}" style="display:none" />
        </label>
      </div>
      <button type="button" class="btn-remove-variant-row" data-row-id="${variante.id}" title="Remover Variante">
        <i class="fas fa-minus-circle"></i>
      </button>
    `;

    // Captura o arquivo e mostra preview imediato (apenas visual no cliente)
    const fileInput = row.querySelector('input[type="file"]');
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      arquivosPendentes[variante.id] = file;

      const previewEl = row.querySelector(".variant-img-preview, .variant-img-placeholder");
      const img = document.createElement("img");
      img.className = "variant-img-preview";
      img.src = URL.createObjectURL(file);
      img.alt = "preview";
      if (previewEl) previewEl.replaceWith(img);
    });

    fragment.appendChild(row);
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}

// TODO (nova stack): o upload de imagem deve ser feito pelo back-end (rota de upload),
// nunca com chave de API no cliente. Retorna a URL pública salva pelo servidor.
async function uploadImagemVariante(rowId) {
  const file = arquivosPendentes[rowId];
  if (!file) return null;
  console.log("Upload de imagem pendente de integração com o back-end:", rowId, file.name);
  return null;
}

// TODO (nova stack): criar produto + variantes via API (POST /admin/produtos),
// dentro de uma transação SQL no servidor.
async function executarInsercaoCompleta(dadosProduto) {
  if (variantesFormState.length === 0) {
    showSnackbar("É necessário adicionar pelo menos uma variante.", "error");
    return;
  }
  console.log("Inserção (pendente integração):", { dadosProduto, variantes: variantesFormState });
  showSnackbar("Cadastro ainda não integrado ao back-end.", "info");
}

// TODO (nova stack): atualizar produto + variantes via API (PUT /admin/produtos/:id).
async function executarUpdateCompleto(produtoId, dadosProduto) {
  console.log("Update (pendente integração):", { produtoId, dadosProduto, variantes: variantesFormState });
  showSnackbar("Edição ainda não integrada ao back-end.", "info");
}

// TODO (nova stack): excluir produto (cascata de variantes) via API (DELETE /admin/produtos/:id).
async function executarRemocaoProduto(id) {
  console.log("Remoção (pendente integração):", id);
  showSnackbar("Exclusão ainda não integrada ao back-end.", "info");
}
