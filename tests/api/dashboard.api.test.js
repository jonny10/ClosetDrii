import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

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

describe("GET /api/admin/dashboard", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("sem sessão responde 401", async () => {
        const res = await request(app).get("/api/admin/dashboard");
        expect(res.status).toBe(401);
    });

    it("cliente logado responde 403", async () => {
        const cliente = await loginCliente();
        const res = await cliente.get("/api/admin/dashboard");
        expect(res.status).toBe(403);
    });

    it("admin recebe as métricas do seed (vendas canceladas de fora)", async () => {
        const admin = await loginAdmin();
        const res = await admin.get("/api/admin/dashboard");

        expect(res.status).toBe(200);
        // venda 8 (cancelada, R$ 229,90) fora: 14 pedidos e R$ 3797,80
        expect(res.body).toEqual({
            faturamento: "R$ 3797,80",
            pedidos: 14,
            ticket_medio: "R$ 271,27",
            pecas_vendidas: 20,
            ranking: expect.any(Array),
        });
        expect(res.body.ranking).toHaveLength(10);
        expect(res.body.ranking[0]).toEqual({
            nome: "Blusa Cropped Listrada",
            quantidade: 3,
            receita: "R$ 239,70",
        });
        expect(res.body.ranking[1]).toEqual({
            nome: "Camisa Florida Viscose",
            quantidade: 3,
            receita: "R$ 219,70",
        });
    });
});
