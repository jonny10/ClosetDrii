// Exige usuário com perfil admin
// API: 401 JSON sem sessão, 403 JSON logado sem perfil admin. Páginas: redirect /login ou /.
function requireAdmin(req, res, next) {
    const perfil = req.session?.isLoggedIn && req.session.user ? req.session.user.perfil : null;

    if (perfil === "admin") {
        return next();
    }

    if (!req.session?.isLoggedIn) {
        if (req.originalUrl.startsWith("/api")) {
            return res.status(401).json({ error: "Não autenticado" });
        }
        return res.redirect("/login");
    }

    if (req.originalUrl.startsWith("/api")) {
        return res.status(403).json({ error: "Acesso restrito a administradores" });
    }

    res.redirect("/");
}

module.exports = requireAdmin;
