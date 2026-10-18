import { showSnackbar } from "/js/global/snackbar.js";

// Cadastro — envia { nome, email, telefone, senha } para POST /api/auth/signup.
// Sucesso: redireciona para /login. Erro: mostra a mensagem do servidor.

document.addEventListener("DOMContentLoaded", () => {
  const cadastroForm = document.getElementById("cadastro-form");
  if (!cadastroForm) return;

  cadastroForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.replace(/\D/g, "");
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      showSnackbar("As senhas não coincidem!", "invalid");
      return;
    }

    if (password.length < 6) {
      showSnackbar("A senha deve ter no mínimo 6 caracteres.", "invalid");
      return;
    }

    try {
      const resp = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: name,
          email,
          telefone: phone,
          senha: password,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showSnackbar(data.error || "Falha ao cadastrar.", "error");
        return;
      }

      showSnackbar("Cadastro realizado com sucesso!", "success");

      setTimeout(() => {
        window.location.href = "/login";
      }, 800);
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao conectar com o servidor.", "error");
    }
  });
});
