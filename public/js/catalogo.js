import { showSnackbar } from "/js/global/snackbar.js";

// Catálogo (admin) — a tabela e o select de categorias são renderizados no
// SERVIDOR (Handlebars). Aqui fica a UI: busca sobre as linhas do DOM, modal
// de formulário, variantes em memória e as chamadas de CRUD à API.
// Depois de uma mutação bem-sucedida a página recarrega (o servidor re-renderiza
// a tabela) e o snackbar chega via sessionStorage.
//
// Upload de imagem: ao escolher um arquivo no modal ele fica em `arquivosPendentes`
// (preview imediato via object URL). No submit, `enviarImagensPendentes()` sobe cada
// arquivo para POST /api/admin/produtos/upload-imagem e grava a URL pública retornada
// em `variante.imagem_url` — que então vai no payload de criação/atualização.

const CHAVE_SNACKBAR = "catalogoSnackbar";

let buscaDebounceTimer;
let idProdutoParaExcluir = null;
let variantesFormState = [];
let idsVariantesOriginais = []; // ids no banco quando a edição abriu (p/ calcular remoções)
const arquivosPendentes = {}; // { [rowId]: File } — preview visual apenas

document.addEventListener("DOMContentLoaded", () => {
  restaurarSnackbarAposReload();
  configurarOuvintesEventos();
  configurarOuvintesCategorias();
  configurarOuvintesTamanhos();
  filtrarTabela();
});

// Snackbar que sobrevive ao reload pós-mutação
function snackbarAposReload(mensagem) {
  sessionStorage.setItem(CHAVE_SNACKBAR, mensagem);
  window.location.reload();
}

function restaurarSnackbarAposReload() {
  const mensagem = sessionStorage.getItem(CHAVE_SNACKBAR);
  if (mensagem) {
    sessionStorage.removeItem(CHAVE_SNACKBAR);
    showSnackbar(mensagem, "success");
  }
}

// Mostra/esconde as linhas conforme o termo de busca (nome + descrição)
function filtrarTabela() {
  const tbody = document.getElementById("crud-products-tbody");
  if (!tbody) return;

  const termo = (document.getElementById("crud-search-input")?.value || "")
    .trim()
    .toLowerCase();

  const linhas = [...tbody.querySelectorAll('tr[data-id]')];
  const visiveis = termo ? linhas.filter((r) => r.dataset.busca.includes(termo)) : linhas;
  linhas.forEach((r) => {
    r.style.display = visiveis.includes(r) ? "" : "none";
  });

  let vazio = tbody.querySelector(".table-empty-row");
  if (visiveis.length === 0) {
    if (!vazio) {
      vazio = document.createElement("tr");
      vazio.className = "table-empty-row";
      vazio.innerHTML =
        '<td colspan="6" class="table-empty">Nenhum look corresponde aos critérios de pesquisa.</td>';
      tbody.appendChild(vazio);
    }
  } else if (vazio) {
    vazio.remove();
  }
}

// --- Tamanhos (vêm da tabela `tamanhos` — nada de lista hardcoded) ---
let tamanhosCache = null;

async function obterTamanhos() {
  if (tamanhosCache) return tamanhosCache;
  try {
    const resp = await fetch("/api/tamanhos");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    tamanhosCache = await resp.json(); // [{ id, nome, ordem }]
  } catch (err) {
    console.error("Erro ao carregar tamanhos:", err);
    tamanhosCache = [];
  }
  return tamanhosCache;
}

function tamanhoPadrao() {
  return tamanhosCache?.[0]?.nome || "M";
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
    buscaDebounceTimer = setTimeout(filtrarTabela, 250);
  });

  const fecharModal = () => {
    modal.style.display = "none";
    Object.keys(arquivosPendentes).forEach((k) => delete arquivosPendentes[k]);
  };

  btnOpenCreate?.addEventListener("click", async () => {
    await obterTamanhos();
    form.reset();
    document.getElementById("form-product-id").value = "";
    document.getElementById("modal-title-context").textContent = "Cadastrar Novo Look";

    idsVariantesOriginais = [];
    variantesFormState = [
      { id: `new_${Date.now()}`, tamanho: tamanhoPadrao(), cor: "", estoque: 1, imagem_url: "" },
    ];
    renderizarLinhasVariantesModal();
    modal.style.display = "flex";
  });

  document.getElementById("btn-close-modal")?.addEventListener("click", fecharModal);
  document.getElementById("btn-cancel-form")?.addEventListener("click", fecharModal);

  btnAddVariantRow?.addEventListener("click", async () => {
    await obterTamanhos();
    variantesFormState.push({
      id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tamanho: tamanhoPadrao(),
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

    const variante = variantesFormState.find((v) => String(v.id) === rowId);
    if (variante) {
      variante[field] =
        field === "estoque" ? Number(e.target.value) : e.target.value.trim();
    }
  });

  variantsContainer?.addEventListener("click", (e) => {
    const btnDelete = e.target.closest(".btn-remove-variant-row");
    if (!btnDelete) return;

    const rowId = btnDelete.dataset.rowId;
    variantesFormState = variantesFormState.filter((v) => String(v.id) !== rowId);
    renderizarLinhasVariantesModal();
  });

  // Delegação: editar abre o modal com o produto vindo da API; excluir abre a confirmação
  tbody?.addEventListener("click", (e) => {
    const targetBtn = e.target.closest("button");
    if (!targetBtn) return;

    const idProduto = Number(targetBtn.dataset.id);
    if (!idProduto) return;

    if (targetBtn.classList.contains("btn-action-edit")) {
      abrirEdicao(idProduto);
    } else if (targetBtn.classList.contains("btn-action-delete")) {
      idProdutoParaExcluir = idProduto;
      deleteModal.style.display = "flex";
    }
  });

  const fecharDelete = () => (deleteModal.style.display = "none");
  document.getElementById("btn-close-delete-modal")?.addEventListener("click", fecharDelete);
  document.getElementById("btn-cancel-delete")?.addEventListener("click", fecharDelete);

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
      categoria_id: Number(document.getElementById("form-categoria").value),
    };

    const salvou = idInputVal
      ? await executarUpdateCompleto(Number(idInputVal), dadosForm)
      : await executarInsercaoCompleta(dadosForm);

    if (salvou) fecharModal();
  });
}

// Sobe os arquivos de imagem escolhidos no modal (um por variante) e grava a URL
// pública devolvida pelo servidor em `variante.imagem_url`. Chamado antes de montar
// o payload de criação/atualização. Retorna false (e mostra snackbar) se algum falhar.
async function enviarImagensPendentes() {
  for (const variante of variantesFormState) {
    const arquivo = arquivosPendentes[variante.id];
    if (!arquivo) continue;

    const formData = new FormData();
    formData.append("imagem", arquivo);

    try {
      const resp = await fetch("/api/admin/produtos/upload-imagem", {
        method: "POST",
        body: formData, // sem Content-Type manual: o browser define o boundary do multipart
      });

      if (resp.status === 401) {
        window.location.href = "/login";
        return false;
      }

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.url) {
        showSnackbar(data.error || "Falha ao enviar a imagem.", "error");
        return false;
      }

      variante.imagem_url = data.url;
      delete arquivosPendentes[variante.id]; // evita reenviar se o submit repetir
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao enviar a imagem.", "error");
      return false;
    }
  }
  return true;
}

// Busca o produto na API e abre o modal preenchido (fetch on-click, padrão da home)
async function abrirEdicao(idProduto) {
  try {
    const [produto] = await Promise.all([
      (async () => {
        const resp = await fetch(`/api/produtos/${idProduto}`);
        if (resp.status === 401) {
          window.location.href = "/login";
          return null;
        }
        if (!resp.ok) return null;
        return resp.json();
      })(),
      obterTamanhos(),
    ]);

    if (!produto) {
      showSnackbar("Erro ao carregar o produto.", "error");
      return;
    }

    document.getElementById("form-product-id").value = String(produto.id);
    document.getElementById("form-nome").value = produto.nome;
    document.getElementById("form-descricao").value = produto.descricao;
    document.getElementById("form-preco").value = produto.preco;
    document.getElementById("form-categoria").value = String(produto.categoria.id);

    variantesFormState = produto.variantes.map((v) => ({ ...v }));
    idsVariantesOriginais = produto.variantes.map((v) => v.id);
    renderizarLinhasVariantesModal();

    document.getElementById("modal-title-context").textContent = `Editando Look #${produto.id}`;
    document.getElementById("product-crud-modal").style.display = "flex";
  } catch (err) {
    console.error("Erro ao abrir edição:", err);
    showSnackbar("Erro ao conectar com o servidor.", "error");
  }
}

// Injeta as linhas de inputs de variantes no modal
function renderizarLinhasVariantesModal() {
  const container = document.getElementById("form-variants-container");
  if (!container) return;

  if (variantesFormState.length === 0) {
    container.innerHTML =
      '<p class="empty-variants-alert">Nenhuma variante cadastrada. Adicione pelo menos uma para o produto ir ao ar.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  variantesFormState.forEach((variante) => {
    const row = document.createElement("div");
    row.className = "variant-form-row";

    const previewSrc = variante.imagem_url || "";

    // opções do select vêm da tabela `tamanhos` (cache carregada na abertura do modal)
    const opcoesTamanho = (tamanhosCache || [])
      .map(
        (t) =>
          `<option value="${t.nome}" ${variante.tamanho === t.nome ? "selected" : ""}>${t.nome}</option>`,
      )
      .join("");

    row.innerHTML = `
      <select data-row-id="${variante.id}" data-field="tamanho" required>
        ${opcoesTamanho}
      </select>
      <input type="text" data-row-id="${variante.id}" data-field="cor" value="${variante.cor}" required placeholder="Ex: Rosa Fúcsia" />
      <input type="number" data-row-id="${variante.id}" data-field="estoque" value="${variante.estoque}" min="0" required placeholder="10" />
      <div class="variant-image-upload">
        ${previewSrc ? `<img class="variant-img-preview" src="${previewSrc}" alt="preview" />` : '<span class="variant-img-placeholder"><i class="fas fa-image"></i></span>'}
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

// POST /api/admin/produtos — cria produto + variantes (transação no servidor)
async function executarInsercaoCompleta(dadosProduto) {
  if (variantesFormState.length === 0) {
    showSnackbar("É necessário adicionar pelo menos uma variante.", "error");
    return false;
  }

  if (!(await enviarImagensPendentes())) return false;

  showSnackbar("Processando inserção relacional...", "info");

  try {
    const resp = await fetch("/api/admin/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...dadosProduto,
        variantes: variantesFormState.map(montarPayloadVariante),
      }),
    });

    if (resp.status === 401) {
      window.location.href = "/login";
      return false;
    }

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      showSnackbar(data.error || "Falha ao salvar o look.", "error");
      return false;
    }

    snackbarAposReload("Look e variantes salvos com sucesso!");
    return true;
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "error");
    return false;
  }
}

// PATCH /api/admin/produtos/:id + sincronização de variantes (cria/atualiza/remove)
async function executarUpdateCompleto(produtoId, dadosProduto) {
  if (!(await enviarImagensPendentes())) return false;

  showSnackbar("Sincronizando modificações...", "info");

  try {
    const respProduto = await fetch(`/api/admin/produtos/${produtoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosProduto),
    });

    if (respProduto.status === 401) {
      window.location.href = "/login";
      return false;
    }
    if (!respProduto.ok) {
      const data = await respProduto.json().catch(() => ({}));
      showSnackbar(data.error || "Falha ao atualizar o look.", "error");
      return false;
    }

    // 1. remove as variantes que saíram do formulário
    const idsNoForm = new Set(
      variantesFormState.filter((v) => Number.isInteger(v.id)).map((v) => v.id),
    );
    for (const idOriginal of idsVariantesOriginais) {
      if (idsNoForm.has(idOriginal)) continue;

      const resp = await fetch(`/api/admin/variantes/${idOriginal}`, { method: "DELETE" });
      if (resp.status === 401) {
        window.location.href = "/login";
        return false;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        showSnackbar(data.error || "Falha ao remover variante.", "error");
        return false;
      }
    }

    // 2. cria as novas e atualiza as existentes
    for (const variante of variantesFormState) {
      const existente = Number.isInteger(variante.id);
      const resp = await fetch(
        existente ? `/api/admin/variantes/${variante.id}` : `/api/admin/produtos/${produtoId}/variantes`,
        {
          method: existente ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(montarPayloadVariante(variante)),
        },
      );

      if (resp.status === 401) {
        window.location.href = "/login";
        return false;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        showSnackbar(data.error || "Falha ao salvar variante.", "error");
        return false;
      }
    }

    snackbarAposReload("Catálogo atualizado com sucesso!");
    return true;
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "error");
    return false;
  }
}

// Monta o payload de uma variante — imagem_url só vai quando preenchida
// (a API rejeita valores que não sejam string)
function montarPayloadVariante(variante) {
  const payload = {
    cor: variante.cor,
    tamanho: variante.tamanho,
    estoque: Number(variante.estoque),
  };
  if (variante.imagem_url) payload.imagem_url = variante.imagem_url;
  return payload;
}

// DELETE /api/admin/produtos/:id — cascata de variantes no servidor
async function executarRemocaoProduto(id) {
  showSnackbar("Limpando registros em cascata...", "info");

  try {
    const resp = await fetch(`/api/admin/produtos/${id}`, { method: "DELETE" });

    if (resp.status === 401) {
      window.location.href = "/login";
      return;
    }

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      showSnackbar(data.error || "Falha ao excluir o produto.", "error");
      return;
    }

    snackbarAposReload("Produto e suas variantes removidos da base.");
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "error");
  }
}

// --- Modais de categorias e tamanhos (CRUD via /api/admin/*) ---
//
// Os dois modais compartilham o mesmo comportamento de rodapé:
// em modo criação → "Novo" + "Salvar X"
// em modo edição  → "Cancelar" (sai da edição) + "Editar" (salva a alteração)
// Os rótulos ficam nos data-label-criacao / data-label-edicao dos botões.

function alternarModoEdicao(form, emEdicao) {
  form.querySelectorAll("[data-label-criacao], [data-label-edicao]").forEach((btn) => {
    const rotulo = emEdicao ? btn.dataset.labelEdicao : btn.dataset.labelCriacao;
    if (rotulo) btn.textContent = rotulo;
  });

  const titulo = form.closest(".modal-card")?.querySelector("[data-titulo-criacao]");
  if (titulo) {
    titulo.textContent = emEdicao
      ? titulo.dataset.tituloEdicao
      : titulo.dataset.tituloCriacao;
  }
}

function configurarOuvintesCategorias() {
  const modal = document.getElementById("categorias-modal");
  const form = document.getElementById("categoria-form");
  if (!modal || !form) return;

  document.getElementById("btn-open-categorias-modal")?.addEventListener("click", () => {
    resetarFormCategoria();
    modal.style.display = "flex";
  });

  document
    .getElementById("btn-close-categorias-modal")
    ?.addEventListener("click", () => (modal.style.display = "none"));

  document.getElementById("btn-reset-categoria")?.addEventListener("click", () => {
    // em modo edição o botão vira "Cancelar": volta ao formulário de criação
    resetarFormCategoria();
  });

  // delegação: editar preenche o form, excluir manda o DELETE
  document.querySelector(".categorias-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const item = btn.closest(".categoria-item");
    const id = Number(btn.dataset.id);

    if (btn.classList.contains("btn-categoria-edit") && item) {
      document.getElementById("categoria-id").value = String(id);
      document.getElementById("categoria-nome").value = item.dataset.nome;
      document.getElementById("categoria-descricao").value = item.dataset.descricao;
      alternarModoEdicao(form, true);
      document.getElementById("categoria-nome").focus();
    } else if (btn.classList.contains("btn-categoria-delete")) {
      removerCategoria(id);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("categoria-id").value;
    const payload = {
      nome: document.getElementById("categoria-nome").value.trim(),
      descricao: document.getElementById("categoria-descricao").value.trim(),
    };

    try {
      const resp = await fetch(
        idInput ? `/api/admin/categorias/${idInput}` : "/api/admin/categorias",
        {
          method: idInput ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (resp.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showSnackbar(data.error || "Falha ao salvar categoria.", "error");
        return;
      }

      snackbarAposReload(
        idInput ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!",
      );
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao conectar com o servidor.", "error");
    }
  });
}

function resetarFormCategoria() {
  document.getElementById("categoria-form").reset();
  document.getElementById("categoria-id").value = "";
  const form = document.getElementById("categoria-form");
  if (form) alternarModoEdicao(form, false);
}

// --- Modal de tamanhos (CRUD via /api/admin/tamanhos) ---

function configurarOuvintesTamanhos() {
  const modal = document.getElementById("tamanhos-modal");
  const form = document.getElementById("tamanho-form");
  if (!modal || !form) return;

  document.getElementById("btn-open-tamanhos-modal")?.addEventListener("click", () => {
    resetarFormTamanho();
    modal.style.display = "flex";
  });

  document
    .getElementById("btn-close-tamanhos-modal")
    ?.addEventListener("click", () => (modal.style.display = "none"));

  document.getElementById("btn-reset-tamanho")?.addEventListener("click", () => {
    // em modo edição o botão vira "Cancelar": volta ao formulário de criação
    resetarFormTamanho();
  });

  document.querySelector(".tamanhos-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const item = btn.closest(".tamanho-item");
    const id = Number(btn.dataset.id);

    if (btn.classList.contains("btn-tamanho-edit") && item) {
      document.getElementById("tamanho-id").value = String(id);
      document.getElementById("tamanho-nome").value = item.dataset.nome;
      document.getElementById("tamanho-ordem").value = item.dataset.ordem;
      alternarModoEdicao(form, true);
      document.getElementById("tamanho-nome").focus();
    } else if (btn.classList.contains("btn-tamanho-delete")) {
      removerTamanho(id);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idInput = document.getElementById("tamanho-id").value;
    const payload = {
      nome: document.getElementById("tamanho-nome").value.trim(),
      ordem: Number(document.getElementById("tamanho-ordem").value),
    };

    try {
      const resp = await fetch(
        idInput ? `/api/admin/tamanhos/${idInput}` : "/api/admin/tamanhos",
        {
          method: idInput ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (resp.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showSnackbar(data.error || "Falha ao salvar tamanho.", "error");
        return;
      }

      snackbarAposReload(
        idInput ? "Tamanho atualizado com sucesso!" : "Tamanho criado com sucesso!",
      );
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao conectar com o servidor.", "error");
    }
  });
}

function resetarFormTamanho() {
  document.getElementById("tamanho-form").reset();
  document.getElementById("tamanho-id").value = "";
  const form = document.getElementById("tamanho-form");
  if (form) alternarModoEdicao(form, false);
}

async function removerTamanho(id) {
  try {
    const resp = await fetch(`/api/admin/tamanhos/${id}`, { method: "DELETE" });

    if (resp.status === 401) {
      window.location.href = "/login";
      return;
    }

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      showSnackbar(data.error || "Falha ao excluir tamanho.", "error");
      return;
    }

    snackbarAposReload("Tamanho removido com sucesso!");
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "error");
  }
}

async function removerCategoria(id) {
  try {
    const resp = await fetch(`/api/admin/categorias/${id}`, { method: "DELETE" });

    if (resp.status === 401) {
      window.location.href = "/login";
      return;
    }

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      showSnackbar(data.error || "Falha ao excluir categoria.", "error");
      return;
    }

    snackbarAposReload("Categoria removida com sucesso!");
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "error");
  }
}
