import { showSnackbar } from "/js/global/snackbar.js";

// Perfil do usuário — dados renderizados pelo servidor (Handlebars); aqui fica
// a UI: alternância leitura/edição, máscaras, PATCH /api/usuarios/me e logout.

document.addEventListener("DOMContentLoaded", () => {
  const profileImg = document.getElementById("profile-img");
  const fileInput = document.getElementById("file-input");
  const form = document.getElementById("profile-form");
  const editBtn = document.getElementById("edit-btn");
  const saveBtn = document.getElementById("save-btn");
  const elementsToToggle = form ? form.querySelectorAll("input, select") : [];
  const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");

  if (!form) return;

  // 1. Alterna o estado visual dos campos (Leitura vs Edição)
  editBtn?.addEventListener("click", () => {
    elementsToToggle.forEach((el) => {
      if (el.id !== "email") el.disabled = false; // e-mail permanece bloqueado
    });
    editBtn.style.display = "none";
    if (saveBtn) saveBtn.style.display = "block";
    showSnackbar("Campos liberados para edição.", "info");
  });

  // 2. Máscaras de telefone e CPF (envia só dígitos, como o signup)
  const phoneInput = document.getElementById("phone");
  const cpfInput = document.getElementById("cpf");

  function apenasDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function mascaraTelefone(valor) {
    const d = apenasDigitos(valor).slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function mascaraCpf(valor) {
    const d = apenasDigitos(valor).slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  phoneInput?.addEventListener("input", (e) => {
    e.target.value = mascaraTelefone(e.target.value);
  });

  cpfInput?.addEventListener("input", (e) => {
    e.target.value = mascaraCpf(e.target.value);
  });

  // 3. Salvar alterações via PATCH /api/usuarios/me
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const telefone = apenasDigitos(phoneInput?.value);
    const cpf = apenasDigitos(cpfInput?.value);

    if (telefone && (telefone.length < 10 || telefone.length > 11)) {
      showSnackbar("Telefone inválido.", "error");
      return;
    }
    if (cpf && cpf.length !== 11) {
      showSnackbar("CPF deve ter 11 dígitos.", "error");
      return;
    }

    const dadosAtualizados = {
      nome: document.getElementById("name").value.trim(),
      telefone,
      cpf,
      dt_nascimento: document.getElementById("dt_nascimento").value,
      genero: document.getElementById("genero").value,
    };

    if (saveBtn) saveBtn.disabled = true;
    showSnackbar("Salvando dados...", "info");

    try {
      const resp = await fetch("/api/usuarios/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosAtualizados),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        showSnackbar(data.error || "Não foi possível salvar os dados.", "error");
        return; // mantém o formulário em modo edição pra correção
      }

      elementsToToggle.forEach((el) => (el.disabled = true));
      if (editBtn) editBtn.style.display = "block";
      if (saveBtn) saveBtn.style.display = "none";

      const displayName = document.getElementById("user-name-display");
      if (displayName) displayName.textContent = data.nome;

      // telefone/cpf voltam mascarados na próxima edição
      if (phoneInput) phoneInput.value = mascaraTelefone(data.telefone);
      if (cpfInput) cpfInput.value = mascaraCpf(data.cpf);

      showSnackbar("Informações salvas com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showSnackbar("Erro ao conectar com o servidor.", "error");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  // 4. Upload/preview da foto de perfil (apenas visual no cliente)
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
      showSnackbar("Pré-visualização atualizada (upload pendente no back-end).", "success");
    };
    reader.readAsDataURL(file);
  });

  // 5. Logout: encerra a sessão no servidor e volta pra home
  sidebarLogoutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Erro ao efetuar logout pela sidebar:", err);
    }
    window.location.href = "/";
  });
});
