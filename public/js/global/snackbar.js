export function showSnackbar(message, type = "success") {
  const snackbarBox = document.getElementById("snackbarBox");

  if (!snackbarBox) return;

  const snackbar = document.createElement("div");

  snackbar.className = `snackbar ${type}`;

  let icon = "";

  if (type === "success") {
    icon = "fa-circle-check";
  } else if (type === "error") {
    icon = "fa-circle-xmark";
  } else {
    icon = "fa-triangle-exclamation";
  }

  snackbar.innerHTML = `
    <i class="fa-solid ${icon}"></i>

    <span class="snackbar-message">
      ${message}
    </span>

    <button class="close-btn">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  snackbarBox.appendChild(snackbar);

  // REMOVE COM BOTÃO
  snackbar.querySelector(".close-btn").addEventListener("click", () => {
    removeSnackbar(snackbar);
  });

  // AUTO REMOVE
  setTimeout(() => {
    removeSnackbar(snackbar);
  }, 3000);
}

// FUNÇÃO REMOVER
function removeSnackbar(snackbar) {
  snackbar.style.animation = "snackbarExit .3s ease forwards";

  setTimeout(() => {
    snackbar.remove();
  }, 300);
}
