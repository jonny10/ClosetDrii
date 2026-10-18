import { showSnackbar } from "/js/global/snackbar.js";

// Login — envia { email, senha } para POST /api/auth/login.
// Sucesso: redireciona por perfil (admin → /vendas, cliente → /). Erro: mostra a mensagem do servidor.

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha: password }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showSnackbar(data.error || "Falha ao realizar login.", "error");
        return;
      }

      showSnackbar("Login realizado com sucesso!", "success");

      const destino = data.perfil === "admin" ? "/vendas" : "/";
      setTimeout(() => {
        window.location.href = destino;
      }, 800);
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao conectar com o servidor.", "error");
    }
  });
});
