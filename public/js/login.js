import { showSnackbar } from "/js/global/snackbar.js";

// Login — validação/UX do formulário no cliente.
// A AUTENTICAÇÃO agora é responsabilidade do back-end (Node/Express + Sequelize).
//
// TODO (nova stack): enviar { email, senha } via POST para a rota de login da API
//   (ex.: POST /login). O servidor valida as credenciais (hash de senha),
//   cria a sessão (cookie) e responde. O front então redireciona para "/".

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // TODO (nova stack): autenticar no back-end e redirecionar em caso de sucesso.
    //   const resp = await fetch("/login", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ email, senha: password }),
    //   });
    //   if (resp.ok) { showSnackbar("Login realizado com sucesso!", "success"); window.location.href = "/"; }
    //   else { showSnackbar("Falha ao realizar login.", "invalid"); }
    console.log("Login submetido (pendente integração com o back-end):", { email });
    showSnackbar("Login ainda não integrado ao back-end.", "info");
  });
});
