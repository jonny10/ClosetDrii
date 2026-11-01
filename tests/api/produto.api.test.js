import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize, ProdutoVariante } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("GET /api/produtos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("lista todos os produtos com categoria e variantes", async () => {
        const res = await request(app).get("/api/produtos");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(20);

        const vestido = res.body.find((p) => p.id === 1);
        expect(vestido).toMatchObject({
            nome: "Vestido Floral Midi",
            descricao: expect.any(String),
            preco: 189.9, // Number, não string formatada
            categoria: { id: 1, nome: "Vestidos" },
        });
        expect(vestido.variantes).toHaveLength(3);
    });

    it("filtra por categoria (nome exato)", async () => {
        const res = await request(app).get("/api/produtos").query({ categoria: "Vestidos" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(5);
        res.body.forEach((p) => expect(p.categoria.nome).toBe("Vestidos"));
    });

    it("busca por nome (like)", async () => {
        const res = await request(app).get("/api/produtos").query({ busca: "jeans" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        res.body.forEach((p) => expect(p.nome.toLowerCase()).toContain("jeans"));
    });

    it("ordena por preço desc", async () => {
        const res = await request(app).get("/api/produtos").query({ orderBy: "preco", dir: "desc" });

        expect(res.status).toBe(200);
        const precos = res.body.map((p) => p.preco);
        expect(precos[0]).toBe(299.9); // Vestido Longo Boho
        expect(precos[precos.length - 1]).toBe(49.9); // Blusa Regata Básica
    });
});

describe("GET /api/produtos/:id", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("retorna o detalhe com categoria e variantes", async () => {
        const res = await request(app).get("/api/produtos/1");

        expect(res.status).toBe(200);
        expect(res.body.nome).toBe("Vestido Floral Midi");
        expect(res.body.categoria).toEqual({ id: 1, nome: "Vestidos" });
        expect(res.body.variantes).toHaveLength(3);
        // a ordem do include não é garantida — busca por valor
        const rosaP = res.body.variantes.find((v) => v.cor === "Rosa" && v.tamanho === "P");
        expect(rosaP).toMatchObject({ estoque: 5 });
    });

    it("404 JSON para produto inexistente", async () => {
        const res = await request(app).get("/api/produtos/999");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Produto não encontrado" });
    });
});

describe("GET /api/produtos/:id/variantes", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("lista só as variantes do produto", async () => {
        const res = await request(app).get("/api/produtos/1/variantes");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
        // o service ordena por id ASC — primeira é a Rosa P
        expect(res.body[0]).toMatchObject({ cor: "Rosa", tamanho: "P", estoque: 5 });
        res.body.forEach((v) => expect(typeof v.estoque).toBe("number"));
    });

    it("404 se o produto não existir", async () => {
        const res = await request(app).get("/api/produtos/999/variantes");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Produto não encontrado" });
    });
});

describe("Admin: CRUD /api/admin/produtos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    async function loginAdmin() {
        const agente = request.agent(app);
        const res = await agente
            .post("/api/auth/login")
            .send({ email: "fabricio@email.com", senha: "123456" });
        expect(res.status).toBe(200);
        return agente;
    }

    async function loginCliente() {
        const agente = request.agent(app);
        const res = await agente
            .post("/api/auth/login")
            .send({ email: "ana.paula@email.com", senha: "123456" });
        expect(res.status).toBe(200);
        return agente;
    }

    it("401 sem sessão", async () => {
        const res = await request(app)
            .post("/api/admin/produtos")
            .send({ nome: "X", descricao: "Y", preco: 10, categoria_id: 1 });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("403 para cliente logado", async () => {
        const agente = await loginCliente();
        const res = await agente
            .post("/api/admin/produtos")
            .send({ nome: "X", descricao: "Y", preco: 10, categoria_id: 1 });
        expect(res.status).toBe(403);
    });

    it("201 cria produto com variantes numa transação", async () => {
        const agente = await loginAdmin();
        const res = await agente.post("/api/admin/produtos").send({
            nome: "Vestido Teste",
            descricao: "Descrição do vestido teste",
            preco: 129.9,
            categoria_id: 1,
            variantes: [
                { cor: "Rosa", tamanho: "P", estoque: 5 },
                { cor: "Rosa", tamanho: "M", estoque: 3, imagem_url: "https://exemplo.com/img.jpg" },
            ],
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ id: 21, nome: "Vestido Teste", preco: 129.9 });
        expect(res.body.categoria).toEqual({ id: 1, nome: "Vestidos" });
        expect(res.body.variantes).toHaveLength(2);
        // a ordem do include não é garantida — busca por valor
        const rosaP = res.body.variantes.find((v) => v.cor === "Rosa" && v.tamanho === "P");
        expect(rosaP).toMatchObject({ estoque: 5 });
    });

    it("400 sem campos obrigatórios ou preço inválido", async () => {
        const agente = await loginAdmin();

        const resVazio = await agente.post("/api/admin/produtos").send({});
        expect(resVazio.status).toBe(400);
        expect(resVazio.body).toEqual({ error: "Nome é obrigatório" });

        const resPreco = await agente.post("/api/admin/produtos").send({
            nome: "X",
            descricao: "Y",
            preco: -1,
            categoria_id: 1,
        });
        expect(resPreco.status).toBe(400);
        expect(resPreco.body).toEqual({ error: "Preço deve ser um número maior que zero" });
    });

    it("400 com categoria inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.post("/api/admin/produtos").send({
            nome: "X",
            descricao: "Y",
            preco: 10,
            categoria_id: 999,
        });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Categoria não encontrada" });
    });

    it("400 com variante inválida ou duplicada no payload", async () => {
        const agente = await loginAdmin();

        const resSemCor = await agente.post("/api/admin/produtos").send({
            nome: "X",
            descricao: "Y",
            preco: 10,
            categoria_id: 1,
            variantes: [{ tamanho: "P", estoque: 1 }],
        });
        expect(resSemCor.status).toBe(400);
        expect(resSemCor.body).toEqual({ error: "Cor da variante é obrigatória" });

        const resDuplicada = await agente.post("/api/admin/produtos").send({
            nome: "X",
            descricao: "Y",
            preco: 10,
            categoria_id: 1,
            variantes: [
                { cor: "Rosa", tamanho: "P" },
                { cor: "rosa", tamanho: "P" },
            ],
        });
        expect(resDuplicada.status).toBe(400);
        expect(resDuplicada.body).toEqual({ error: "Variantes duplicadas (mesma cor e tamanho)" });
    });

    it("200 atualiza produto parcialmente", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/produtos/18").send({ preco: 59.9 });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 18, preco: 59.9 });
    });

    it("400 atualiza sem campos", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/produtos/18").send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Nenhum campo para atualizar" });
    });

    it("404 atualiza produto inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/produtos/999").send({ preco: 10 });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Produto não encontrado" });
    });

    it("200 remove produto sem vínculos (com cascata nas variantes)", async () => {
        const agente = await loginAdmin();

        const criado = await agente.post("/api/admin/produtos").send({
            nome: "Para Remover",
            descricao: "Produto criado só para ser excluído",
            preco: 99.9,
            categoria_id: 1,
            variantes: [{ cor: "Azul", tamanho: "M", estoque: 2 }],
        });
        expect(criado.status).toBe(201);

        const res = await agente.delete(`/api/admin/produtos/${criado.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: criado.body.id });

        const variantesRestantes = await ProdutoVariante.count({
            where: { produto_id: criado.body.id },
        });
        expect(variantesRestantes).toBe(0);
    });

    it("409 remove produto com avaliações vinculadas", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/produtos/1");

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Produto possui avaliações vinculadas" });
    });

    it("409 remove produto com vendas vinculadas", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/produtos/4");

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Produto possui vendas vinculadas" });
    });

    it("404 remove produto inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/produtos/999");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Produto não encontrado" });
    });
});

describe("Admin: CRUD de variantes", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    async function loginAdmin() {
        const agente = request.agent(app);
        const res = await agente
            .post("/api/auth/login")
            .send({ email: "fabricio@email.com", senha: "123456" });
        expect(res.status).toBe(200);
        return agente;
    }

    it("401 sem sessão", async () => {
        const res = await request(app)
            .post("/api/admin/produtos/18/variantes")
            .send({ cor: "Verde", tamanho: "P" });
        expect(res.status).toBe(401);
    });

    it("201 cria variante no produto", async () => {
        const agente = await loginAdmin();
        const res = await agente
            .post("/api/admin/produtos/18/variantes")
            .send({ cor: "Verde", tamanho: "P", estoque: 10 });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            produto_id: 18,
            cor: "Verde",
            tamanho: "P",
            estoque: 10,
            imagem_url: null,
        });
    });

    it("404 cria variante em produto inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente
            .post("/api/admin/produtos/999/variantes")
            .send({ cor: "Verde", tamanho: "P" });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Produto não encontrado" });
    });

    it("400 cria variante sem cor", async () => {
        const agente = await loginAdmin();
        const res = await agente
            .post("/api/admin/produtos/18/variantes")
            .send({ tamanho: "M" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Cor da variante é obrigatória" });
    });

    it("409 cria variante com cor+tamanho já existentes no produto", async () => {
        const agente = await loginAdmin();
        const res = await agente
            .post("/api/admin/produtos/1/variantes")
            .send({ cor: "Rosa", tamanho: "P" });

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Variante já existe para este produto" });
    });

    it("200 atualiza variante", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/variantes/29").send({ estoque: 4 });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 29, estoque: 4 });
    });

    it("409 ao colidir cor+tamanho com outra variante do mesmo produto", async () => {
        const agente = await loginAdmin();
        const res = await agente
            .patch("/api/admin/variantes/30")
            .send({ cor: "Branco", tamanho: "P" }); // colide com a variante 29 (produto 18)

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Variante já existe para este produto" });
    });

    it("400 atualiza variante sem campos", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/variantes/29").send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Nenhum campo para atualizar" });
    });

    it("404 atualiza variante inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.patch("/api/admin/variantes/999").send({ estoque: 1 });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Variante não encontrada" });
    });

    it("200 remove variante sem vendas", async () => {
        const agente = await loginAdmin();

        const criada = await agente
            .post("/api/admin/produtos/18/variantes")
            .send({ cor: "Amarelo", tamanho: "M", estoque: 10 });
        expect(criada.status).toBe(201);

        const res = await agente.delete(`/api/admin/variantes/${criada.body.id}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: criada.body.id });
    });

    it("409 remove variante com vendas vinculadas", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/variantes/1");

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "Variante possui vendas vinculadas" });
    });

    it("404 remove variante inexistente", async () => {
        const agente = await loginAdmin();
        const res = await agente.delete("/api/admin/variantes/999");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Variante não encontrada" });
    });
});
