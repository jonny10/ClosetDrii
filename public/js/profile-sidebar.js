// Sidebar de conta em páginas sem o formulário do /profile (ex.: /historico):
// cuida só do logout — no /profile o profile.js já trata a sidebar inteira.
document.addEventListener("DOMContentLoaded", () => {
  const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");

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
