import { showSnackbar } from "/js/global/snackbar.js";

// Painel admin de mensagens de contato — os cards são renderizados no SERVIDOR
// (Handlebars, com o array `contatos`). Aqui fica só o front: filtro por aba
// (Pendentes/Respondidas) sobre os cards já no DOM e o PATCH que marca como respondida:
//   PATCH /api/admin/contatos/:id

let filtroStatusAtual = "pendentes"; // Controla a aba ativa ("pendentes" ou "respondidas")

document.addEventListener("DOMContentLoaded", () => {
  setupFiltrosEventos();
  setupAcoesDosCards();
  aplicarFiltro();
});

// Mostra/esconde os cards conforme a aba ativa e atualiza contador + estado vazio
function aplicarFiltro() {
  const container = document.getElementById("messages-grid-container");
  const emptyState = document.getElementById("empty-messages-alert");
  const counter = document.getElementById("pending-count");
  if (!container) return;

  const cards = [...container.querySelectorAll(".message-card")];

  cards.forEach((card) => {
    const respondida = card.dataset.respondida === "true";
    const visivel = filtroStatusAtual === "respondidas" ? respondida : !respondida;
    card.style.display = visivel ? "" : "none";
  });

  // Na aba "respondidas" os cards não mostram o botão de marcar
  container.querySelectorAll(".message-footer").forEach((footer) => {
    footer.style.display = filtroStatusAtual === "respondidas" ? "none" : "";
  });

  const visiveis = cards.filter((card) => card.style.display !== "none");
  if (counter) counter.textContent = String(visiveis.length);

  if (emptyState) {
    emptyState.style.display = visiveis.length === 0 ? "flex" : "none";
    if (visiveis.length === 0) {
      emptyState.querySelector("p").textContent =
        filtroStatusAtual === "respondidas"
          ? "Você ainda não respondeu nenhuma mensagem de contato."
          : "Nenhuma mensagem pendente de resposta no momento.";
    }
  }
}

async function marcarMensagemRespondida(contatoId, botaoAlvo) {
  if (botaoAlvo) botaoAlvo.disabled = true;

  try {
    const resp = await fetch(`/api/admin/contatos/${contatoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (resp.status === 401) {
      window.location.href = "/login";
      return;
    }

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      showSnackbar(data.error || "Falha ao atualizar a mensagem.", "error");
      return;
    }

    const card = document.querySelector(`.message-card[data-id="${contatoId}"]`);
    if (card) card.dataset.respondida = "true";

    showSnackbar("Mensagem marcada como respondida.", "success");
  } catch (err) {
    console.error(err);
    showSnackbar("Erro ao conectar com o servidor.", "error");
  } finally {
    if (botaoAlvo) botaoAlvo.disabled = false;
    aplicarFiltro();
  }
}

// Configura a troca de estado visual e lógico ao clicar nos chips
function setupFiltrosEventos() {
  const tabs = document.querySelectorAll(".status-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      filtroStatusAtual = tab.getAttribute("data-status");
      aplicarFiltro();
    });
  });
}

// Delegação: um único listener no container resolve o clique de todos os cards
function setupAcoesDosCards() {
  const container = document.getElementById("messages-grid-container");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const botao = e.target.closest(".btn-read-action");
    if (!botao) return;

    const card = botao.closest(".message-card");
    if (!card) return;

    marcarMensagemRespondida(Number(card.dataset.id), botao);
  });
}
