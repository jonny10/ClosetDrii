import { showSnackbar } from "/js/global/snackbar.js";

// Cadastro — validação/UX do formulário no cliente.
// A criação de conta agora é responsabilidade do back-end (Node/Express + Sequelize).
//
// TODO (nova stack): enviar os dados via POST para a rota de cadastro (ex.: POST /signup).
//   O servidor cria o usuário (hash de senha), inicia a sessão e responde.
//   O front então redireciona para "/".

document.addEventListener("DOMContentLoaded", () => {
  const cadastroForm = document.getElementById("cadastro-form");
  if (!cadastroForm) return;

  cadastroForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validação de front (mantida)
    if (password !== confirmPassword) {
      showSnackbar("As senhas não coincidem!", "error");
      return;
    }

    // TODO (nova stack): criar a conta no back-end.
    //   const resp = await fetch("/signup", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ nome: name, email, telefone: phone, senha: password }),
    //   });
    //   if (resp.ok) { showSnackbar("Cadastro realizado com sucesso!", "success"); window.location.href = "/"; }
    console.log("Cadastro submetido (pendente integração com o back-end):", {
      name,
      email,
      phone,
    });
    showSnackbar("Cadastro ainda não integrado ao back-end.", "info");
  });
});
