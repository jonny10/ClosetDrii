const { Contato } = require("../../models");

const ASSUNTO_LABELS = {
    duvidas_produto: "Dúvidas sobre Looks",
    status_pedido: "Status do Pedido",
    trocas_devolucoes: "Trocas e Devoluções",
    outros: "Outros Assuntos",
};

// Classe CSS segura a partir do assunto (ex.: "duvidas_produto" -> "subject-duvidas_produto")
function assuntoClasse(assunto) {
    return String(assunto || "outros")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
}

// Páginas falam direto com os models; a camada de services fica para a API.
async function renderContactAdm(req, res, next) {
    try {
        const contatos = await Contato.findAll({ order: [["created_at", "DESC"]] });

        // converte a instância do Sequelize em objeto simples e formata o que a view precisa
        const lista = contatos.map((c) => ({
            id: c.id,
            nome: c.nome,
            email: c.email,
            mensagem: c.mensagem,
            respondida: c.respondida,
            assuntoLabel: ASSUNTO_LABELS[c.assunto] || c.assunto,
            assuntoClasse: assuntoClasse(c.assunto),
        }));

        res.render("pages/contact_adm", {
            title: "Closet Drii | Contato Admin",
            pageStyle: "contact_adm",   // carrega /css/contact_adm.css
            pageScript: "contact_adm",  // carrega /js/contact_adm.js
            contatos: lista,
        });
    } catch (err) {
        next(err); // cai no handler de erro global do app.js
    }
}

module.exports = renderContactAdm;
