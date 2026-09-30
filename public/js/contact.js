import { showSnackbar } from "/js/global/snackbar.js";

// Formulário de contato — coleta e envio.
//
// TODO (nova stack): enviar a mensagem via POST para a API (ex.: POST /contatos),
//   que persiste na tabela `contatos` via Sequelize. A geração do ID e o vínculo
//   com o usuário logado passam a ser responsabilidade do servidor (sessão).

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

    // TODO (nova stack): POST /contatos com `dadosMensagem` e tratar a resposta.
    console.log("Mensagem de contato (pendente integração):", dadosMensagem);
    showSnackbar("Envio de contato ainda não integrado ao back-end.", "info");
    form.reset();

    if (btnSubmit) btnSubmit.disabled = false;
  });
}
