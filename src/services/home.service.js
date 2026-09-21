// depois trocar pelo banco de dados utilizando sequelize, por enquanto é só um mock
async function getDadosHome() {
    const destaques = [
        { nome: "Vestido Floral", preco: "129,90", imagem: "/assets/img/sala.png"},
        { nome: "Blusa de Tricô", preco: "89,90", imagem: "/assets/img/sala.png"},
        { nome: "Saia Midi", preco: "109,90", imagem: "/assets/img/sala.png" },
    ];

    const ofertas = [
        { nome: "Conjunto Verão", preco: "79,90", imagem: "/assets/img/sala.png"},
        { nome: "Calça Wide Leg", preco: "99,90", imagem: "/assets/img/sala.png"},
    ];

    return { destaques, ofertas };
}

module.exports = { getDadosHome };
