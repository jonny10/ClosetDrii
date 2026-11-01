import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize, Endereco } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

// Ana Paula (id 4) é cliente no seed
async function loginCliente() {
    const agente = request.agent(app);
    const res = await agente
        .post("/api/auth/login")
        .send({ email: "ana.paula@email.com", senha: "123456" });
    expect(res.status).toBe(200);
    return agente;
}

const ENDERECO_VALIDO = {
    rua: "Rua das Flores",
    numero: "123",
    bairro: "Jardim das Acácias",
    cidade: "Campinas",
    estado: "sp",
    cep: "13012345",
    complemento: "Casa 2",
};

describe("GET /api/enderecos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app).get("/api/enderecos");

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("lista apenas os endereços do usuário logado", async () => {
        const agente = await loginCliente();

        const res = await agente.get("/api/enderecos");

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body.every((endereco) => endereco.usuario_id === 4)).toBe(true);

        const doSeed = res.body.find((endereco) => endereco.id === 4);
        expect(doSeed).toMatchObject({ rua: "Av. José de Souza Campos", usuario_id: 4 });
    });
});

describe("POST /api/enderecos", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("401 sem sessão", async () => {
        const res = await request(app).post("/api/enderecos").send(ENDERECO_VALIDO);

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Não autenticado" });
    });

    it("201 cria endereço vinculado à sessão (ignora usuario_id do body)", async () => {
        const agente = await loginCliente();

        const res = await agente
            .post("/api/enderecos")
            .send({ ...ENDERECO_VALIDO, usuario_id: 999 });

        expect(res.status).toBe(201);
        expect(res.body.usuario_id).toBe(4);
        expect(res.body.estado).toBe("SP");
        expect(res.body.cep).toBe("13012345");

        const noBanco = await Endereco.findByPk(res.body.id);
        expect(noBanco.usuario_id).toBe(4);
    });

    it("400 para campo obrigatório ausente", async () => {
        const agente = await loginCliente();

        const { rua, ...semRua } = ENDERECO_VALIDO;
        const res = await agente.post("/api/enderecos").send(semRua);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Rua é obrigatório" });
    });

    it("400 para estado com formato inválido", async () => {
        const agente = await loginCliente();

        const res = await agente
            .post("/api/enderecos")
            .send({ ...ENDERECO_VALIDO, estado: "SAO" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Estado deve ter 2 letras (ex.: SP)" });
    });

    it("400 para CEP com formato inválido", async () => {
        const agente = await loginCliente();

        const res = await agente
            .post("/api/enderecos")
            .send({ ...ENDERECO_VALIDO, cep: "1301234" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "CEP deve ter 8 dígitos" });
    });
});
