import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

import { agenteLogado, CLIENTE, ADMIN } from "./helpers.js";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize, Venda, ProdutoVenda } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /dados (dashboard do admin)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("sem sessão redireciona para /login", async () => {
        const res = await request(app).get("/dados");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("cliente logado é barrado (requireAdmin) → 302 /", async () => {
        const cliente = await agenteLogado(app, CLIENTE);

        const res = await cliente.get("/dados");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/");
    });

    it("admin vê os KPIs e o ranking do seed", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/dados");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Análise de Negócio e Vendas");
        // KPIs calculados no servidor — venda 8 (cancelada) fica de fora
        expect(res.text).toContain('id="kpi-faturamento">R$ 3797,80</p>');
        expect(res.text).toContain('id="kpi-pedidos">14</p>');
        expect(res.text).toContain('id="kpi-ticket">R$ 271,27</p>');
        expect(res.text).toContain('id="kpi-pecas">20</p>');
        // ranking server-rendered, top 1 com medalha e sem <template> de clonagem
        expect(res.text).toContain("Blusa Cropped Listrada");
        expect(res.text).toContain('class="position-badge pos-gold">1º</span>');
        expect(res.text).toContain("Camisa Florida Viscose");
        expect(res.text).not.toContain("<template");
        expect(res.text).not.toContain("Nenhuma venda registrada.");
    });
});

describe("página /dados sem vendas (banco vazio)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
        await ProdutoVenda.destroy({ where: {} });
        await Venda.destroy({ where: {} });
    });

    it("admin vê KPIs zerados e o empty-state do ranking", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/dados");

        expect(res.status).toBe(200);
        expect(res.text).toContain('id="kpi-faturamento">R$ 0,00</p>');
        expect(res.text).toContain('id="kpi-pedidos">0</p>');
        expect(res.text).toContain('id="kpi-ticket">R$ 0,00</p>');
        expect(res.text).toContain('id="kpi-pecas">0</p>');
        expect(res.text).toContain("Nenhuma venda registrada.");
        expect(res.text).not.toContain("position-badge");
    });
});
