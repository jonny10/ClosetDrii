import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize, ProdutoVariante, Venda } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

// PNG 1x1 válido, em base64
const PNG_1PX = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
);

const REPO_ROOT = path.join(__dirname, "..", "..");

// Ana Paula (id 4) é cliente no seed; Fabricio (id 2) é admin
async function loginCliente() {
    const agente = request.agent(app);
    const res = await agente
        .post("/api/auth/login")
        .send({ email: "ana.paula@email.com", senha: "123456" });
    expect(res.status).toBe(200);
    return agente;
}

async function loginAdmin() {
    const agente = request.agent(app);
    const res = await agente
        .post("/api/auth/login")
        .send({ email: "fabricio@email.com", senha: "123456" });
    expect(res.status).toBe(200);
    return agente;
}

describe("POST /api/vendas", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app)
            .post("/api/vendas")
            .send({ itens: [{ id_variante: 1, quantidade: 1 }] });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("cria venda pendente, recalcula o total pelo banco e dá baixa no estoque", async () => {
        const agente = await loginCliente();

        const res = await agente.post("/api/vendas").send({
            itens: [
                { id_variante: 1, quantidade: 2 }, // Vestido Floral Midi — 189.90
                { id_variante: 4, quantidade: 1 }, // Vestido Tubinho Preto — 249.90
            ],
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ status: "pendente", usuario_id: 4 });
        expect(res.body.valor_total).toBeCloseTo(629.7, 4);
        expect(res.body.endereco_entrega_id).toBeNull();

        const item1 = res.body.itens.find((i) => i.produto_variante_id === 1);
        const item4 = res.body.itens.find((i) => i.produto_variante_id === 4);
        expect(item1).toMatchObject({ quantidade: 2 });
        expect(item1.valor).toBeCloseTo(379.8, 4);
        expect(item1.produto_variante.produto.nome).toBe("Vestido Floral Midi");
        expect(item4).toMatchObject({ quantidade: 1 });
        expect(item4.valor).toBeCloseTo(249.9, 4);
        expect(item4.produto_variante.produto.nome).toBe("Vestido Tubinho Preto");

        const variante1 = await ProdutoVariante.findByPk(1);
        const variante4 = await ProdutoVariante.findByPk(4);
        expect(variante1.estoque).toBe(3); // 5 - 2
        expect(variante4.estoque).toBe(2); // 3 - 1
    });

    it("ignora preço enviado pelo cliente (sempre usa o do banco)", async () => {
        const agente = await loginCliente();

        const res = await agente.post("/api/vendas").send({
            itens: [{ id_variante: 1, quantidade: 1, preco: 0.01 }],
        });

        expect(res.status).toBe(201);
        expect(res.body.valor_total).toBeCloseTo(189.9, 4);
        expect(res.body.itens[0].valor).toBeCloseTo(189.9, 4);
    });

    it("400 sem itens", async () => {
        const agente = await loginCliente();

        const res = await agente.post("/api/vendas").send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Itens do pedido são obrigatórios" });

        const resVazio = await agente.post("/api/vendas").send({ itens: [] });
        expect(resVazio.status).toBe(400);
        expect(resVazio.body).toEqual({ error: "Itens do pedido são obrigatórios" });
    });

    it("400 para item com quantidade ou id inválidos", async () => {
        const agente = await loginCliente();

        const resQtd = await agente
            .post("/api/vendas")
            .send({ itens: [{ id_variante: 1, quantidade: 0 }] });
        expect(resQtd.status).toBe(400);
        expect(resQtd.body).toEqual({
            error: "Item inválido: id_variante e quantidade devem ser inteiros positivos",
        });

        const resId = await agente
            .post("/api/vendas")
            .send({ itens: [{ id_variante: "abc", quantidade: 1 }] });
        expect(resId.status).toBe(400);
    });

    it("400 para itens duplicados", async () => {
        const agente = await loginCliente();

        const res = await agente.post("/api/vendas").send({
            itens: [
                { id_variante: 1, quantidade: 1 },
                { id_variante: 1, quantidade: 1 },
            ],
        });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Itens duplicados no pedido" });
    });

    it("400 para variante inexistente", async () => {
        const agente = await loginCliente();

        const res = await agente
            .post("/api/vendas")
            .send({ itens: [{ id_variante: 9999, quantidade: 1 }] });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Variante de id 9999 não encontrada" });
    });

    it("409 para estoque insuficiente", async () => {
        const agente = await loginCliente();

        const res = await agente
            .post("/api/vendas")
            .send({ itens: [{ id_variante: 1, quantidade: 999 }] });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: 'Estoque insuficiente para "Vestido Floral Midi"' });
    });

    it("rollback: um item inválido não cria venda nem baixa estoque", async () => {
        const agente = await loginCliente();
        const vendasAntes = await Venda.count();
        const varianteAntes = await ProdutoVariante.findByPk(1);

        const res = await agente.post("/api/vendas").send({
            itens: [
                { id_variante: 1, quantidade: 1 },
                { id_variante: 9999, quantidade: 1 },
            ],
        });

        expect(res.status).toBe(400);
        expect(await Venda.count()).toBe(vendasAntes);
        expect((await ProdutoVariante.findByPk(1)).estoque).toBe(varianteAntes.estoque);
    });

    it("400 para endereço de entrega inexistente ou de outro usuário", async () => {
        const agente = await loginCliente();

        const resInexistente = await agente.post("/api/vendas").send({
            itens: [{ id_variante: 1, quantidade: 1 }],
            endereco_entrega_id: 9999,
        });
        expect(resInexistente.status).toBe(400);
        expect(resInexistente.body).toEqual({ error: "Endereço de entrega inválido" });

        // Endereço id 2 é do Fabricio (admin), não da Ana Paula
        const resOutroUsuario = await agente.post("/api/vendas").send({
            itens: [{ id_variante: 1, quantidade: 1 }],
            endereco_entrega_id: 2,
        });
        expect(resOutroUsuario.status).toBe(400);
        expect(resOutroUsuario.body).toEqual({ error: "Endereço de entrega inválido" });
    });

    it("201 vinculando endereço de entrega do próprio usuário", async () => {
        const agente = await loginCliente();

        const res = await agente.post("/api/vendas").send({
            itens: [{ id_variante: 1, quantidade: 1 }],
            endereco_entrega_id: 4, // endereço da Ana Paula no seed
        });

        expect(res.status).toBe(201);
        expect(res.body.endereco_entrega_id).toBe(4);
    });

    it("permite comprar o estoque inteiro e bloqueia a próxima unidade", async () => {
        const agente = await loginCliente();
        const variante2 = await ProdutoVariante.findByPk(2); // estoque 7 no seed, sem uso em outros testes

        const res = await agente.post("/api/vendas").send({
            itens: [{ id_variante: 2, quantidade: variante2.estoque }],
        });

        expect(res.status).toBe(201);
        expect(res.body.valor_total).toBeCloseTo(189.9 * variante2.estoque, 4);
        expect((await ProdutoVariante.findByPk(2)).estoque).toBe(0);

        const resSegunda = await agente.post("/api/vendas").send({
            itens: [{ id_variante: 2, quantidade: 1 }],
        });
        expect(resSegunda.status).toBe(409);
        expect(resSegunda.body).toEqual({
            error: 'Estoque insuficiente para "Vestido Floral Midi"',
        });
    });
});

describe("GET /api/vendas/minhas", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app).get("/api/vendas/minhas");

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("lista apenas as vendas do usuário logado, com itens", async () => {
        const agente = await loginCliente();

        const res = await agente.get("/api/vendas/minhas");

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body.every((venda) => venda.usuario_id === 4)).toBe(true);

        const vendaSeed = res.body.find((venda) => venda.id === 1);
        expect(vendaSeed).toBeDefined();
        expect(vendaSeed.valor_total).toBeCloseTo(269.8, 4);
        expect(vendaSeed.itens).toHaveLength(2);

        const item = vendaSeed.itens.find((i) => i.produto_variante_id === 1);
        expect(item.produto_variante.produto.nome).toBe("Vestido Floral Midi");
    });

    it("usuário sem vendas recebe lista vazia", async () => {
        const agente = await loginAdmin(); // Fabricio (id 2) não tem vendas no seed

        const res = await agente.get("/api/vendas/minhas");

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe("POST /api/admin/vendas/:id/comprovante", () => {
    const arquivosCriados = [];

    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    afterAll(() => {
        for (const arquivo of arquivosCriados) {
            if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
        }
    });

    it("401 sem sessão", async () => {
        const res = await request(app)
            .post("/api/admin/vendas/1/comprovante")
            .attach("comprovante", PNG_1PX, { filename: "c.png", contentType: "image/png" });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado (só o admin anexa comprovante)", async () => {
        const agente = await loginCliente();

        const res = await agente
            .post("/api/admin/vendas/1/comprovante")
            .attach("comprovante", PNG_1PX, {
                filename: "comprovante.png",
                contentType: "image/png",
            });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Acesso restrito a administradores" });
    });

    it("200 admin vincula o comprovante a qualquer venda", async () => {
        const agente = await loginAdmin(); // venda 1 é da Ana Paula — o admin anexa mesmo assim

        const res = await agente
            .post("/api/admin/vendas/1/comprovante")
            .attach("comprovante", PNG_1PX, {
                filename: "comprovante.png",
                contentType: "image/png",
            });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(1);
        expect(res.body.comprovante_url).toMatch(/^\/uploads\/comprovantes\/comprovante-.*\.png$/);

        const caminho = path.join(REPO_ROOT, res.body.comprovante_url);
        arquivosCriados.push(caminho);
        expect(fs.existsSync(caminho)).toBe(true);

        const venda = await Venda.findByPk(1);
        expect(venda.comprovante_url).toBe(res.body.comprovante_url);
    });

    it("404 para venda inexistente", async () => {
        const agente = await loginAdmin();

        const res = await agente
            .post("/api/admin/vendas/9999/comprovante")
            .attach("comprovante", PNG_1PX, {
                filename: "comprovante.png",
                contentType: "image/png",
            });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Venda não encontrada" });
    });

    it("404 para id inválido na URL", async () => {
        const agente = await loginAdmin();

        const res = await agente
            .post("/api/admin/vendas/abc/comprovante")
            .attach("comprovante", PNG_1PX, {
                filename: "comprovante.png",
                contentType: "image/png",
            });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Venda não encontrada" });
    });

    it("400 para tipo de arquivo não permitido", async () => {
        const agente = await loginAdmin();

        const res = await agente
            .post("/api/admin/vendas/1/comprovante")
            .attach("comprovante", Buffer.from("nota fiscal fake"), {
                filename: "nota.txt",
                contentType: "text/plain",
            });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Apenas imagens JPG, PNG ou WebP são aceitas" });
    });

    it("400 para arquivo acima de 5MB", async () => {
        const agente = await loginAdmin();
        const arquivoGrande = Buffer.alloc(5 * 1024 * 1024 + 1, 1);

        const res = await agente
            .post("/api/admin/vendas/1/comprovante")
            .attach("comprovante", arquivoGrande, {
                filename: "grande.png",
                contentType: "image/png",
            });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Comprovante deve ter no máximo 5MB" });
    });

    it("serve o comprovante enviado via GET /uploads", async () => {
        const agente = await loginAdmin();

        const upload = await agente
            .post("/api/admin/vendas/1/comprovante")
            .attach("comprovante", PNG_1PX, {
                filename: "comprovante.png",
                contentType: "image/png",
            });

        expect(upload.status).toBe(200);
        arquivosCriados.push(path.join(REPO_ROOT, upload.body.comprovante_url));

        // rota estática do app.js — sem autenticação, pra o admin abrir a imagem direto
        const res = await request(app).get(upload.body.comprovante_url);

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("image/png");
    });

    it("400 sem arquivo", async () => {
        const agente = await loginAdmin();

        const res = await agente.post("/api/admin/vendas/1/comprovante");

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Arquivo do comprovante é obrigatório" });
    });
});

describe("GET /api/admin/vendas", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app).get("/api/admin/vendas");

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado", async () => {
        const agente = await loginCliente();

        const res = await agente.get("/api/admin/vendas");

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Acesso restrito a administradores" });
    });

    it("admin lista todas as vendas com cliente e itens", async () => {
        const agente = await loginAdmin();

        const res = await agente.get("/api/admin/vendas");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(15); // 15 vendas no seed

        const venda1 = res.body.find((venda) => venda.id === 1);
        expect(venda1.usuario.nome).toBe("Ana Paula Ferreira");
        expect(venda1.itens).toHaveLength(2);

        const item = venda1.itens.find((i) => i.produto_variante_id === 1);
        expect(item.produto_variante.produto.nome).toBe("Vestido Floral Midi");
    });
});

describe("PATCH /api/admin/vendas/:id/status", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app)
            .patch("/api/admin/vendas/1/status")
            .send({ status: "enviado" });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado", async () => {
        const agente = await loginCliente();

        const res = await agente.patch("/api/admin/vendas/1/status").send({ status: "pago" });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Acesso restrito a administradores" });
    });

    it("admin altera o status da venda", async () => {
        const agente = await loginAdmin();

        const res = await agente
            .patch("/api/admin/vendas/1/status")
            .send({ status: "enviado" });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 1, status: "enviado" });
        expect((await Venda.findByPk(1)).status).toBe("enviado");
    });

    it("400 para status inválido", async () => {
        const agente = await loginAdmin();

        const res = await agente
            .patch("/api/admin/vendas/1/status")
            .send({ status: "entregue" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Status inválido" });
    });

    it("404 para venda inexistente", async () => {
        const agente = await loginAdmin();

        const res = await agente
            .patch("/api/admin/vendas/9999/status")
            .send({ status: "pago" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Venda não encontrada" });
    });
});

describe("DELETE /api/admin/vendas/:id/comprovante", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app).delete("/api/admin/vendas/1/comprovante");

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado", async () => {
        const agente = await loginCliente();

        const res = await agente.delete("/api/admin/vendas/1/comprovante");

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: "Acesso restrito a administradores" });
    });

    it("admin remove o vínculo e apaga o arquivo do disco", async () => {
        // simula um comprovante já anexado (arquivo real no disco)
        const nomeArquivo = "comprovante-teste-remocao.png";
        const arquivo = path.join(REPO_ROOT, "uploads", "comprovantes", nomeArquivo);
        fs.writeFileSync(arquivo, PNG_1PX);

        const venda = await Venda.findByPk(1);
        venda.comprovante_url = `/uploads/comprovantes/${nomeArquivo}`;
        await venda.save();

        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/vendas/1/comprovante");

        expect(res.status).toBe(200);
        expect(res.body.comprovante_url).toBeNull();
        expect((await Venda.findByPk(1)).comprovante_url).toBeNull();
        expect(fs.existsSync(arquivo)).toBe(false);
    });

    it("200 idempotente quando a venda não tem comprovante", async () => {
        const agente = await loginAdmin();

        const res = await agente.delete("/api/admin/vendas/1/comprovante");

        expect(res.status).toBe(200);
        expect(res.body.comprovante_url).toBeNull();
    });

    it("404 para venda inexistente", async () => {
        const agente = await loginAdmin();

        const res = await agente.delete("/api/admin/vendas/9999/comprovante");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Venda não encontrada" });
    });

    it("404 para id inválido na URL", async () => {
        const agente = await loginAdmin();

        const res = await agente.delete("/api/admin/vendas/abc/comprovante");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Venda não encontrada" });
    });
});
