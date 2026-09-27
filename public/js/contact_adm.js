import { protegerRota } from "../../utils/auth-helpers.js";
import { database } from "../../utils/firebase-config.js";
import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Cache volátil local para controle de concorrência e renderização reativa
let mensagensCache = [];
let filtroStatusAtual = "pendentes";// Controla a aba ativa ("pendentes" ou "respondidas")

document.addEventListener("DOMContentLoaded", () => {
  protegerRota(async (user) => {
    const dadosSessao = JSON.parse(localStorage.getItem("loggedUser"));
    if (!dadosSessao || dadosSessao.perfil !== "admin") {
      showSnackbar(
        "Acesso negado. Painel restrito a administradores.",
        "error",
      );
      setTimeout(() => (window.location.href = "../home/home.html"), 2000);
      return;
    }

    await carregarMensagensBanco();
    setupFiltrosEventos(); // Inicializa os ouvintes das abas
  }, "Acesso restrito. Faça login como administrador.");
});

async function carregarMensagensBanco() {
  try {
    showSnackbar("Buscando mensagens do servidor...", "info");
    const snapshot = await getDocs(collection(database, "contatos"));

    mensagensCache = [];
    snapshot.forEach((docSnap) => {
      mensagensCache.push({ id: docSnap.id, ...docSnap.data() });
    });

    mensagensCache.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    renderizarPainelMensagens();
  } catch (error) {
    console.error("❌ Erro ao ler mensagens de contatos no Firestore:", error);
    showSnackbar("Falha de conexão ao carregar a caixa de entrada.", "error");
  }
}

// Renderiza a interface filtrada em memória baseado na aba ativa (Pendentes vs Respondidas)
function renderizarPainelMensagens() {
  const container = document.getElementById("messages-grid-container");
  const emptyState = document.getElementById("empty-messages-alert");
  const counter = document.getElementById("pending-count");
  const template = document.getElementById("template-message-card");

  if (!container || !template) return;

  // Filtra dinamicamente baseado na aba selecionada no painel
  const mensagensFiltradas = mensagensCache.filter((m) => {
    const isRespondida = m.status === "respondido" || m.respondida === true;
    return filtroStatusAtual === "respondidas" ? isRespondida : !isRespondida;
  });

  if (counter) counter.textContent = String(mensagensFiltradas.length);

  if (mensagensFiltradas.length === 0) {
    container.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "flex";
      // Customiza o texto do estado vazio dependendo da aba
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

    // Se a mensagem já foi respondida, esconde o botão de ação do rodapé
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
  try {
    if (botaoAlvo) botaoAlvo.disabled = true;
    const contatoRef = doc(database, "contatos", String(documentId));

    await updateDoc(contatoRef, {
      status: "respondido",
      respondida: true,
      updated_at: new Date().toISOString(),
    });

    showSnackbar("Mensagem arquivada como respondida!", "success");

    const mensagemLocal = mensagensCache.find((m) => m.id === documentId);
    if (mensagemLocal) {
      mensagemLocal.status = "respondido";
      mensagemLocal.respondida = true;
    }

    renderizarPainelMensagens();
  } catch (error) {
    console.error("❌ Erro ao atualizar status:", error);
    showSnackbar("Erro de rede ao salvar alteração.", "error");
    if (botaoAlvo) botaoAlvo.disabled = false;
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
