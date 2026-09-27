import { auth, database } from "../../utils/firebase-config.js"; // Certifique-se de que o 'database' (Firestore) é exportado aqui
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
// 🌟 NOVO IMPORT: Métodos do Firestore para salvar na tabela plana
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";

document.addEventListener("DOMContentLoaded", () => {
  const cadastroForm = document.getElementById("cadastro-form");

  cadastroForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      showSnackbar("As senhas não coincidem!", "error");
      return;
    }

    try {
      // 1. Cria a conta do usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Adiciona o Nome no Perfil nativo do Auth
      if (name) {
        await updateProfile(user, {
          displayName: name,
        });
      }

      // 🌟 3. SALVA NO FIRESTORE (Simulando o INSERT INTO usuarios)
      // Usamos o 'user.uid' como ID do documento para amarrar os dois mundos perfeitamente
      await setDoc(doc(database, "usuarios", user.uid), {
        nome: name,
        email: email,
        telefone: phone,
        cpf: null, // Pode ser atualizado no painel da conta depois
        perfil: "cliente", // Valor padrão do seu Enum SQL
        genero: "N/I",
        dt_nascimento: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      });

      showSnackbar("Cadastro realizado com sucesso!", "success");

      setTimeout(() => {
        window.location.href = "../home/home.html";
      }, 2000);
    } catch (error) {
      console.error(error);
      showSnackbar(parseFirebaseAuthError(error), "invalid");
    }
  });
});

function parseFirebaseAuthError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "Este e-mail já está cadastrado.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/weak-password":
      return "Senha muito fraca. Use pelo menos 6 caracteres.";
    case "auth/operation-not-allowed":
      return "Cadastro de e-mail/senha não está habilitado no Firebase.";
    default:
      return "Falha ao criar a conta. Verifique os dados e tente novamente.";
  }
}
