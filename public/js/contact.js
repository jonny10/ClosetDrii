import { showSnackbar } from "/js/global/snackbar.js";

// Formulário de contato — envia a mensagem para POST /api/contatos,
// que persiste na tabela `contatos` via Sequelize.

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

    const dadosMensagem = {
      nome: document.getElementById("contact-nome").value.trim(),
      email: document.getElementById("contact-email").value.trim(),
      assunto: document.getElementById("contact-assunto").value.trim(),
      mensagem: document.getElementById("contact-mensagem").value.trim(),
    };

    showSnackbar("Enviando sua mensagem...", "info");

    try {
      const resp = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosMensagem),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showSnackbar(data.error || "Falha ao enviar a mensagem.", "error");
        return;
      }

      showSnackbar(
        "Mensagem enviada com sucesso! Breve entraremos em contato.",
        "success",
      );
      form.reset();
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao conectar com o servidor.", "error");
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  });
}
