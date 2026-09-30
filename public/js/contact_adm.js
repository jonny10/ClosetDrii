import { showSnackbar } from "/js/global/snackbar.js";

// Painel admin de mensagens de contato.
//
// Proteção de rota (admin) e acesso a dados agora são do back-end:
//   - A rota deve ser protegida por middleware no servidor (Express) — não mais no cliente.
//   - As mensagens devem vir do servidor (renderizadas via Handlebars OU por uma API).
//
// Mantida aqui toda a lógica de FRONT (render em memória, filtros por aba). A leitura
// e a atualização de status no banco viram TODO (Sequelize via API).

// Cache volátil local para renderização reativa (populado pelo servidor/API)
let mensagensCache = [];
let filtroStatusAtual = "pendentes"; // Controla a aba ativa ("pendentes" ou "respondidas")

document.addEventListener("DOMContentLoaded", () => {
  // TODO (nova stack): carregar as mensagens do back-end e popular `mensagensCache`.
  //   Ex.: const resp = await fetch("/admin/contatos"); mensagensCache = await resp.json();
  //   (ou receber os dados já renderizados/injetados pelo servidor via Handlebars).
  carregarMensagens();
  setupFiltrosEventos();
});

async function carregarMensagens() {
  // TODO (nova stack): substituir por chamada real à API/back-end.
  mensagensCache = [];
  renderizarPainelMensagens();
}

// Renderiza a interface filtrada em memória baseado na aba ativa (Pendentes vs Respondidas)
function renderizarPainelMensagens() {
  const container = document.getElementById("messages-grid-container");
  const emptyState = document.getElementById("empty-messages-alert");
  const counter = document.getElementById("pending-count");
  const template = document.getElementById("template-message-card");

  if (!container || !template) return;

  const mensagensFiltradas = mensagensCache.filter((m) => {
    const isRespondida = m.status === "respondido" || m.respondida === true;
    return filtroStatusAtual === "respondidas" ? isRespondida : !isRespondida;
  });

  if (counter) counter.textContent = String(mensagensFiltradas.length);

  if (mensagensFiltradas.length === 0) {
    container.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "flex";
      emptyState.querySelector("p").textContent =
        filtroStatusAtual === "respondidas"
          ? "Você ainda não respondeu nenhuma mensagem de contato."
          : "Nenhuma mensagem pendente de resposta no momento.";
    }
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  const fragment = document.createDocumentFragment();

  mensagensFiltradas.forEach((item) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector(".client-name").textContent = item.nome;
    clone.querySelector(".client-email").textContent = item.email;
    clone.querySelector(".message-text").textContent = item.mensagem;

    const assuntoBadge = clone.querySelector(".badge-subject");
    assuntoBadge.textContent = formatarAssuntoTexto(item.assunto);

    const classeAssuntoSegura = String(item.assunto || "outros")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    assuntoBadge.classList.add(`subject-${classeAssuntoSegura}`);

    const footerElement = clone.querySelector(".message-footer");
    const btnRead = clone.querySelector(".btn-read-action");

    if (filtroStatusAtual === "respondidas") {
      if (footerElement) footerElement.style.display = "none";
    } else {
      btnRead.addEventListener("click", async () => {
        await marcarMensagemRespondida(item.id, btnRead);
      });
    }

    fragment.appendChild(clone);
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}

async function marcarMensagemRespondida(documentId, botaoAlvo) {
  if (botaoAlvo) botaoAlvo.disabled = true;

  // TODO (nova stack): atualizar o status no back-end.
  //   Ex.: await fetch(`/admin/contatos/${documentId}/responder`, { method: "PATCH" });
  const mensagemLocal = mensagensCache.find((m) => m.id === documentId);
  if (mensagemLocal) {
    mensagemLocal.status = "respondido";
    mensagemLocal.respondida = true;
  }

  showSnackbar("Mensagem marcada como respondida (pendente persistir no back-end).", "success");
  renderizarPainelMensagens();
}

// Configura a troca de estado visual e lógico ao clicar nos chips
function setupFiltrosEventos() {
  const tabs = document.querySelectorAll(".status-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      filtroStatusAtual = tab.getAttribute("data-status");
      renderizarPainelMensagens();
    });
  });
}

function formatarAssuntoTexto(chave) {
  const depara = {
    duvidas_produto: "Dúvidas sobre Looks",
    status_pedido: "Status do Pedido",
    trocas_devolucoes: "Trocas e Devoluções",
    outros: "Outros Assuntos",
  };
  return (
    depara[chave] ||
    depara[String(chave).toLowerCase().replace(/\s+/g, "_")] ||
    chave
  );
}
