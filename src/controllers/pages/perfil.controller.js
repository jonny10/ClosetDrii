const { Usuario } = require("../../models");

// Máscara de telefone: 10 dígitos "(19) 9876-5000" / 11 "(19) 98765-0000"
function formatarTelefone(telefone) {
    const digitos = String(telefone || "").replace(/\D/g, "");
    if (digitos.length === 11) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    }
    if (digitos.length === 10) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    }
    return telefone || "";
}

// Máscara de CPF: "000.000.000-00"
function formatarCpf(cpf) {
    const digitos = String(cpf || "").replace(/\D/g, "");
    if (digitos.length === 11) {
        return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
    }
    return cpf || "";
}

// Página fala direto com o model (service é só pra API). Busca o usuário pelo id
// da sessão pra exibir também os campos que o snapshot da sessão não carrega.
async function renderPerfil(req, res, next) {
    try {
        const usuario = await Usuario.findByPk(req.session.user.id);
        if (!usuario) {
            // sessão apontando pra usuário que não existe mais — encerra
            req.session.destroy(() => {});
            return res.redirect("/login");
        }

        const dtNascimento = usuario.dt_nascimento
            ? new Date(`${usuario.dt_nascimento}T00:00:00Z`).toISOString().slice(0, 10)
            : "";

        res.render("pages/profile", {
            title: "Closet Drii | Perfil",
            pageStyle: "profile",
            pageScript: "profile",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                telefone: formatarTelefone(usuario.telefone),
                cpf: formatarCpf(usuario.cpf),
                dt_nascimento: dtNascimento,
                genero: usuario.genero || "",
            },
        });
    } catch (err) {
        next(err);
    }
}

module.exports = renderPerfil;
