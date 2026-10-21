// Bloqueia rotas sem sessão logada.
// API responde 401 JSON; páginas redirecionam pra /login.
function requireAuth(req, res, next) {
    if (req.session?.isLoggedIn) {
        return next();
    }

    if (req.originalUrl.startsWith("/api")) {
        return res.status(401).json({ error: "Não autenticado" });
    }

    res.redirect("/login");
}

module.exports = requireAuth;
