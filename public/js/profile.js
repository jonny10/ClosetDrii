import { showSnackbar } from "/js/global/snackbar.js";

// Perfil do usuário — interatividade de front-end.
//
// Sessão/dados agora vêm do back-end (Node/Express + Sequelize):
//   - A proteção de rota é feita por middleware no servidor (não mais no cliente).
//   - Os dados do usuário devem ser injetados pelo servidor na view (Handlebars)
//     OU buscados por uma API. Salvar/sair também passam pelo back-end.
//
// Mantida aqui a UI: alternância leitura/edição e preview da foto.

document.addEventListener("DOMContentLoaded", () => {
  const profileImg = document.getElementById("profile-img");
  const fileInput = document.getElementById("file-input");
  const form = document.getElementById("profile-form");
  const editBtn = document.getElementById("edit-btn");
  const saveBtn = document.getElementById("save-btn");
  const elementsToToggle = form ? form.querySelectorAll("input, select") : [];
  const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");

  if (!form) return;

  // TODO (nova stack): popular os campos com os dados do usuário vindos do servidor
  //   (idealmente já renderizados na view via Handlebars, ou via GET /perfil).

  // 1. Alterna o estado visual dos campos (Leitura vs Edição)
  editBtn?.addEventListener("click", () => {
    elementsToToggle.forEach((el) => {
      if (el.id !== "email") el.disabled = false; // e-mail permanece bloqueado
    });
    editBtn.style.display = "none";
    if (saveBtn) saveBtn.style.display = "block";
    showSnackbar("Campos liberados para edição.", "info");
  });

  // 2. Salvar alterações
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dadosAtualizados = {
      nome: document.getElementById("name").value.trim(),
      telefone: document.getElementById("phone").value.trim(),
      cpf: document.getElementById("cpf").value.trim(),
      dt_nascimento: document.getElementById("dt_nascimento").value,
      genero: document.getElementById("genero").value,
    };

    // TODO (nova stack): PUT/PATCH /perfil com `dadosAtualizados` (Sequelize no servidor).
    console.log("Perfil (pendente integração com o back-end):", dadosAtualizados);

    elementsToToggle.forEach((el) => (el.disabled = true));
    if (editBtn) editBtn.style.display = "block";
    if (saveBtn) saveBtn.style.display = "none";

    const displayName = document.getElementById("user-name-display");
    if (displayName) displayName.textContent = dadosAtualizados.nome;
    showSnackbar("Alterações aplicadas localmente (pendente salvar no back-end).", "success");
  });

  // 3. Upload/preview da foto de perfil (apenas visual no cliente)
  const triggerPicBox = document.querySelector(".profile-pic-container");
  if (triggerPicBox && fileInput) {
    triggerPicBox.addEventListener("click", () => fileInput.click());
  }

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (profileImg) profileImg.src = event.target.result;
      // TODO (nova stack): enviar a imagem para o back-end (upload) e persistir a URL.
      showSnackbar("Pré-visualização atualizada (upload pendente no back-end).", "success");
    };
    reader.readAsDataURL(file);
  });

  // 4. Logout
  sidebarLogoutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    // TODO (nova stack): encerrar a sessão no servidor (ex.: POST /logout) e redirecionar.
    //   await fetch("/logout", { method: "POST" }); window.location.href = "/";
    window.location.href = "/";
  });
});
