import { protegerRota } from "../../utils/auth-helpers.js";
import { database } from "../../utils/firebase-config.js";
import { buscarProdutosEstruturados } from "../../utils/product-helpers.js";
import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const IMGBB_API_KEY = "e16a8e8df3138d20de50819d35d81039";

// Estados voláteis locais para controle de concorrência, filtros e cache de UI
let produtosCache = [];
let categoriasCache = {};
let buscaDebounceTimer;
let idProdutoParaExcluir = null;
let variantesFormState = [];
// Mapa de arquivos selecionados por variante: { [rowId]: File }
const arquivosPendentes = {};

document.addEventListener("DOMContentLoaded", () => {
  // Rota Protegida: Valida a sessão em tempo real com o Firebase Auth
  protegerRota(async (user) => {
    const dadosSessao = JSON.parse(localStorage.getItem("loggedUser"));
    if (!dadosSessao || dadosSessao.perfil !== "admin") {
      showSnackbar(
        "Acesso negado. Rota exclusiva de administradores.",
        "error",
      );
      setTimeout(() => (window.location.href = "../home/home.html"), 2000);
      return;
    }

    await carregarDadosIniciais();
    configurarOuvintesEventos();
  }, "Acesso restrito. Faça login como administrador.");
});

// Resgata tabelas relacionais em paralelo e prepara os selects e dados de visualização
async function carregarDadosIniciais() {
  try {
    const [listaProdutos, categoriasSnapshot] = await Promise.all([
      buscarProdutosEstruturados(),
      getDocs(collection(database, "categorias")),
    ]);

    produtosCache = listaProdutos;

    // Mapeia chaves ordinais e popula o Select do formulário
    const selectCategoria = document.getElementById("form-categoria");
    if (selectCategoria) selectCategoria.innerHTML = "";

    categoriasSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      categoriasCache[docSnap.id] = data.nome;

      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = data.nome;
      selectCategoria?.appendChild(option);
    });

    filtrarERenderizarTabela();
  } catch (error) {
    console.error(
      "❌ Erro ao inicializar tabelas operacionais do CRUD:",
      error,
    );
    showSnackbar("Erro ao carregar dados do catálogo.", "error");
  }
}

// Filtra os dados em memória local e injeta os cartões via fragmento atômico
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

    // Mapeia as variantes para tópicos verticais HTML (ul/li) com destaque visual no estoque
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

  // Abertura do Modal de Criação (Inicializa com uma variante vazia)
  btnOpenCreate?.addEventListener("click", () => {
    form.reset();
    document.getElementById("form-product-id").value = "";
    document.getElementById("modal-title-context").textContent =
      "Cadastrar Novo Look";

    variantesFormState = [
      {
        id: `new_${Date.now()}`,
        tamanho: "M",
        cor: "",
        estoque: 1,
        imagem_url: "",
      },
    ];
    renderizarLinhasVariantesModal();
    modal.style.display = "flex";
  });

  const fecharModal = () => {
    modal.style.display = "none";
    // Limpa arquivos pendentes ao fechar
    Object.keys(arquivosPendentes).forEach((k) => delete arquivosPendentes[k]);
  };
  document
    .getElementById("btn-close-modal")
    ?.addEventListener("click", fecharModal);
  document
    .getElementById("btn-cancel-form")
    ?.addEventListener("click", fecharModal);

  // Injeta uma nova linha de variante volátil na memória do formulário
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

  // Sincronização em tempo real dos inputs internos das variantes com o estado em memória
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

  // Remoção de variantes de dentro do formulário antes do submit
  variantsContainer?.addEventListener("click", (e) => {
    const btnDelete = e.target.closest(".btn-remove-variant-row");
    if (!btnDelete) return;

    const rowId = btnDelete.dataset.rowId;
    variantesFormState = variantesFormState.filter((v) => v.id !== rowId);
    renderizarLinhasVariantesModal();
  });

  // Delegação de Eventos para os botões internos da Tabela Principal
  tbody?.addEventListener("click", (e) => {
    const targetBtn = e.target.closest("button");
    if (!targetBtn) return;

    const idProduto = Number(targetBtn.dataset.id);
    const produtoSelecionado = produtosCache.find((p) => p.id === idProduto);

    if (targetBtn.classList.contains("btn-action-edit") && produtoSelecionado) {
      document.getElementById("form-product-id").value = String(
        produtoSelecionado.id,
      );
      document.getElementById("form-nome").value = produtoSelecionado.nome;
      document.getElementById("form-descricao").value =
        produtoSelecionado.descricao;
      document.getElementById("form-preco").value = produtoSelecionado.preco;

      const fkCategoria = Object.keys(categoriasCache).find(
        (key) => categoriasCache[key] === produtoSelecionado.categoria,
      );
      if (fkCategoria)
        document.getElementById("form-categoria").value = fkCategoria;

      // Clona as variantes existentes do produto para o formulário de edição
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

  document
    .getElementById("btn-confirm-delete")
    ?.addEventListener("click", async () => {
      if (idProdutoParaExcluir) {
        deleteModal.style.display = "none";
        await executarRemocaoProduto(idProdutoParaExcluir);
        idProdutoParaExcluir = null;
      }
    });

  // Submissão unificada do formulário
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInputVal = document.getElementById("form-product-id").value;
    const dadosForm = {
      nome: document.getElementById("form-nome").value.trim(),
      descricao: document.getElementById("form-descricao").value.trim(),
      preco: Number(document.getElementById("form-preco").value),
      categoria_id: document.getElementById("form-categoria").value,
      updated_at: new Date().toISOString(),
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

    // Listener para capturar o arquivo e mostrar preview imediato
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

// Faz upload da imagem para o ImgBB e retorna a URL pública
async function uploadImagemVariante(rowId) {
  const file = arquivosPendentes[rowId];
  if (!file) return null;

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!data.success) throw new Error("Falha no upload da imagem para ImgBB.");
  return data.data.url;
}

// Gravação atômica unificada: ID incremental para novos produtos e suas respectivas variantes
async function executarInsercaoCompleta(dadosProduto) {
  showSnackbar("Processando inserção relacional...", "info");
  try {
    if (variantesFormState.length === 0) {
      throw new Error("Falha: É necessário adicionar pelo menos uma variante.");
    }

    // Faz upload das imagens antes da transação
    for (const variante of variantesFormState) {
      const url = await uploadImagemVariante(variante.id);
      if (url) variante.imagem_url = url;
    }

    await runTransaction(database, async (transaction) => {
      const prodCounterRef = doc(database, "contadores", "produtos");
      const varCounterRef = doc(database, "contadores", "produto_variantes");

      const [prodCounterSnap, varCounterSnap] = await Promise.all([
        transaction.get(prodCounterRef),
        transaction.get(varCounterRef),
      ]);

      const proximoProdId = prodCounterSnap.exists()
        ? prodCounterSnap.data().atual + 1
        : 1;
      let proximoVarId = varCounterSnap.exists()
        ? varCounterSnap.data().atual
        : 0;

      const novoProdRef = doc(database, "produtos", String(proximoProdId));
      const prodExisteSnap = await transaction.get(novoProdRef);

      if (prodExisteSnap.exists()) {
        throw new Error(
          `Conflito de ID: O produto #${proximoProdId} já existe no banco.`,
        );
      }

      transaction.set(novoProdRef, {
        ...dadosProduto,
        created_at: new Date().toISOString(),
      });

      variantesFormState.forEach((variante) => {
        proximoVarId++;
        const novaVarRef = doc(database, "produto_variantes", String(proximoVarId));
        transaction.set(novaVarRef, {
          produto_id: proximoProdId,
          cor: variante.cor,
          tamanho: variante.tamanho,
          estoque: Number(variante.estoque),
          imagem_url: variante.imagem_url || "",
        });
      });

      transaction.set(prodCounterRef, { atual: proximoProdId });
      transaction.set(varCounterRef, { atual: proximoVarId });
    });

    showSnackbar("Look e variantes salvos com sucesso!", "success");
    await carregarDadosIniciais();
  } catch (error) {
    console.error(error);
    showSnackbar(
      error.message || "Erro ao processar salvamento unificado.",
      "error",
    );
  }
}

// Sincroniza edições, remoções e inclusões órfãs de variantes no cenário de UPDATE
async function executarUpdateCompleto(produtoId, dadosProduto) {
  showSnackbar("Sincronizando modificações...", "info");
  try {
    const numProdId = Number(produtoId);

    // Faz upload de imagens novas antes de salvar
    for (const variante of variantesFormState) {
      const url = await uploadImagemVariante(variante.id);
      if (url) variante.imagem_url = url;
    }

    await setDoc(doc(database, "produtos", String(produtoId)), dadosProduto, { merge: true });

    // Busca as variantes atuais associadas a esse produto para checar deleções
    const variantesSnapshot = await getDocs(
      collection(database, "produto_variantes"),
    );
    const variantesDoProdutoNoBanco = [];

    variantesSnapshot.forEach((docSnap) => {
      if (Number(docSnap.data().produto_id) === numProdId) {
        variantesDoProdutoNoBanco.push({ id: docSnap.id, ...docSnap.data() });
      }
    });

    // Remove do banco variantes antigas que foram excluídas no modal
    const idsAtivosNoForm = variantesFormState.map((v) => String(v.id));
    const variantesParaDeletar = variantesDoProdutoNoBanco.filter(
      (v) => !idsAtivosNoForm.includes(String(v.id)),
    );

    for (const varDel of variantesParaDeletar) {
      await deleteDoc(doc(database, "produto_variantes", String(varDel.id)));
    }

    // Processa inclusões e edições das variantes restantes
    let proximoVarId = null;

    for (const variante of variantesFormState) {
      const isNova = String(variante.id).startsWith("new_");

      if (isNova) {
        await runTransaction(database, async (transaction) => {
          const varCounterRef = doc(
            database,
            "contadores",
            "produto_variantes",
          );
          const varCounterSnap = await transaction.get(varCounterRef);

          proximoVarId = varCounterSnap.exists()
            ? varCounterSnap.data().atual + 1
            : 1;

          const novaVarRef = doc(
            database,
            "produto_variantes",
            String(proximoVarId),
          );
          transaction.set(novaVarRef, {
            produto_id: numProdId,
            cor: variante.cor,
            tamanho: variante.tamanho,
            estoque: Number(variante.estoque),
            imagem_url: variante.imagem_url || "",
          });

          transaction.set(varCounterRef, { atual: proximoVarId });
        });
      } else {
        const varExistenteRef = doc(
          database,
          "produto_variantes",
          String(variante.id),
        );
        await setDoc(
          varExistenteRef,
          {
            cor: variante.cor,
            tamanho: variante.tamanho,
            estoque: Number(variante.estoque),
            imagem_url: variante.imagem_url || "",
          },
          { merge: true },
        );
      }
    }

    showSnackbar("Catálogo atualizado com sucesso!", "success");
    await carregarDadosIniciais();
  } catch (error) {
    console.error(error);
    showSnackbar("Falha técnica ao sincronizar alterações em lote.", "error");
  }
}

// Remoção em cascata (Deleta o produto e limpa todas as suas variantes filhas)
async function executarRemocaoProduto(id) {
  showSnackbar("Limpando registros em cascata...", "info");
  try {
    const numProdId = Number(id);

    await deleteDoc(doc(database, "produtos", String(id)));

    const variantesSnapshot = await getDocs(
      collection(database, "produto_variantes"),
    );
    for (const docSnap of variantesSnapshot) {
      if (Number(docSnap.data().produto_id) === numProdId) {
        await deleteDoc(doc(database, "produto_variantes", docSnap.id));
      }
    }

    showSnackbar("Produto e suas variantes removidos da base.", "success");
    await carregarDadosIniciais();
  } catch (error) {
    console.error(error);
    showSnackbar("Erro de comunicação ao deletar do catálogo.", "error");
  }
}
