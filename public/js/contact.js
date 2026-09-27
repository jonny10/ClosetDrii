import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";
import { database, auth } from "../../utils/firebase-config.js";
import {
  doc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  configurarFormularioContato();
});

function configurarFormularioContato() {
  const form = document.getElementById("contact-store-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;

    // Resgata os metadados do remetente se ele estiver logado na sessão ativa
    const usuarioLogado = auth.currentUser;

    const dadosMensagem = {
      nome: document.getElementById("contact-nome").value.trim(),
      email: document.getElementById("contact-email").value.trim(),
      assunto: document.getElementById("contact-assunto").value.trim(),
      mensagem: document.getElementById("contact-mensagem").value.trim(),
      usuario_id: usuarioLogado ? String(usuarioLogado.uid) : "visitante",
      status: "nao_lido",
      created_at: new Date().toISOString(),
    };

    showSnackbar("Enviando sua mensagem...", "info");

    try {
      // Executa transação atômica para garantir a PK incremental numérica sequencial
      await runTransaction(database, async (transaction) => {
        const counterRef = doc(database, "contadores", "contatos");
        const counterSnap = await transaction.get(counterRef);

        const proximoId = counterSnap.exists()
          ? counterSnap.data().atual + 1
          : 1;
        const novoContatoRef = doc(database, "contatos", String(proximoId));

        transaction.set(novoContatoRef, dadosMensagem);
        transaction.set(counterRef, { atual: proximoId });
      });

      showSnackbar(
        "Mensagem enviada com sucesso! Breve entraremos em contato.",
        "success",
      );
      form.reset();
    } catch (error) {
      console.error("❌ Erro ao registrar mensagem de contato:", error);
      showSnackbar(
        "Falha técnica ao enviar. Tente novamente mais tarde.",
        "error",
      );
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  });
}
