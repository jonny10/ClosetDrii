import { auth, database } from "../../utils/firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
// 🌟 NOVO IMPORT: Métodos para buscar o registro do usuário logado
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { showSnackbar } from "../../shared/components/snackbar/snackbar.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      // 1. Faz o Login de Autenticação básico
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 🌟 2. BUSCA OS DADOS REAIS NO FIRESTORE (Simulando SELECT * FROM usuarios WHERE id = uid)
      const userDocRef = doc(database, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let dadosCompletosUsuario = {
        uid: user.uid,
        email: user.email,
        nome: user.displayName || "Usuário",
        perfil: "cliente", // valor fallback caso não ache o documento por algum motivo
      };

      if (userDocSnap.exists()) {
        const dadosBanco = userDocSnap.data();
        // Mescla os dados do Auth com as colunas reais do seu Banco de Dados
        dadosCompletosUsuario = {
          uid: user.uid,
          email: user.email,
          nome: dadosBanco.nome,
          telefone: dadosBanco.telefone,
          perfil: dadosBanco.perfil, // Aqui vai vir 'cliente' ou 'admin' real do Firestore
          genero: dadosBanco.genero,
        };
      }

      showSnackbar("Login realizado com sucesso!", "success");

      // 3. Salva a sessão real e estruturada no localStorage para o front consumir nas páginas
      localStorage.setItem("loggedUser", JSON.stringify(dadosCompletosUsuario));

      setTimeout(() => {
        if (dadosCompletosUsuario.perfil === "admin") {
          showSnackbar("Bem-vindo, administrador!", "success");
        }
        window.location.href = "../home/home.html";
      }, 1500);
    } catch (error) {
      console.error(error);
      showSnackbar(parseFirebaseAuthError(error), "invalid");
    }
  });
});

function parseFirebaseAuthError(error) {
  switch (error.code) {
    case "auth/wrong-password":
      return "Senha incorreta.";
    case "auth/user-not-found":
      return "Usuário não encontrado.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente mais tarde.";
    case "auth/network-request-failed":
      return "Falha de rede. Verifique sua conexão com a internet.";
    default:
      return "Falha ao realizar login. Verifique seus dados e tente novamente.";
  }
}
