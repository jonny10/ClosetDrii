import { database, auth } from "../../utils/firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";

document.addEventListener("DOMContentLoaded", () => {
  const profileImg = document.getElementById("profile-img");
  const fileInput = document.getElementById("file-input");
  const form = document.getElementById("profile-form");
  const editBtn = document.getElementById("edit-btn");
  const saveBtn = document.getElementById("save-btn");
  const elementsToToggle = form.querySelectorAll("input, select");
  const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");

  // 1. Carrega a sessão completa e preenche todas as colunas mapeadas do BD
  const user = JSON.parse(localStorage.getItem("loggedUser"));
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  // Preenche a UI
  document.getElementById("name").value = user.nome || "";
  document.getElementById("email").value = user.email || "";
  document.getElementById("phone").value = user.telefone || "";
  document.getElementById("cpf").value = user.cpf || "";
  document.getElementById("dt_nascimento").value = user.dt_nascimento || "";
  document.getElementById("genero").value = user.genero || "N/I";

  document.getElementById("user-name-display").textContent =
    user.nome || "Usuário";
  document.getElementById("user-email-display").textContent = user.email || "";
  if (user.photo) profileImg.src = user.photo;

  // 2. Fluxo de Toggle: Altera o estado visual dos campos (Leitura vs Edição)
  editBtn.addEventListener("click", () => {
    elementsToToggle.forEach((el) => {
      // Mantém e-mail bloqueado por segurança, altera o resto
      if (el.id !== "email") el.disabled = false;
    });
    editBtn.style.display = "none";
    saveBtn.style.display = "block";
    showSnackbar("Campos liberados para edição.", "info");
  });

  // 3. Salva no Firestore e sincroniza com o localStorage simultaneamente
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showSnackbar("Salvando dados...", "info");

    const dadosAtualizados = {
      nome: document.getElementById("name").value.trim(),
      telefone: document.getElementById("phone").value.trim(),
      cpf: document.getElementById("cpf").value.trim(),
      dt_nascimento: document.getElementById("dt_nascimento").value,
      genero: document.getElementById("genero").value,
      updated_at: new Date().toISOString(),
    };

    try {
      // Executa o UPDATE direto no documento idêntico ao UID do auth no banco plano
      const userDocRef = doc(database, "usuarios", user.uid);
      await updateDoc(userDocRef, dadosAtualizados);

      // Atualiza a memória de sessão local do navegador
      const novoSessionUser = { ...user, ...dadosAtualizados };
      localStorage.setItem("loggedUser", JSON.stringify(novoSessionUser));

      // Retorna os inputs ao modo de leitura
      elementsToToggle.forEach((el) => (el.disabled = true));
      editBtn.style.display = "block";
      saveBtn.style.display = "none";

      // Sincroniza displays de texto da barra lateral
      document.getElementById("user-name-display").textContent =
        dadosAtualizados.nome;
      showSnackbar("Informações salvas com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      showSnackbar("Não foi possível salvar os dados no momento.", "error");
    }
  });

  // 4. Upload de Foto de Perfil via Base64 (Armazenamento em String Local)
  const triggerPicBox = document.querySelector(".profile-pic-container");
  if (triggerPicBox) {
    triggerPicBox.addEventListener("click", () => fileInput.click());
  }

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      profileImg.src = event.target.result;
      user.photo = event.target.result;
      localStorage.setItem("loggedUser", JSON.stringify(user));
      showSnackbar("Foto de perfil atualizada localmente!", "success");
    };
    reader.readAsDataURL(file);
  });

  // 5. Botão Sair da Barra Lateral
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        localStorage.removeItem("loggedUser");
        window.location.href = "../../pages/home/home.html";
      } catch (err) {
        console.error("Erro ao efetuar logout pela sidebar:", err);
      }
    });
  }
});
