import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

import { agenteLogado, CLIENTE, ADMIN } from "./helpers.js";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /vendas (painel do admin)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("sem sessão redireciona para /login", async () => {
        const res = await request(app).get("/vendas");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("cliente logado é barrado (requireAdmin) → 302 /", async () => {
        const cliente = await agenteLogado(app, CLIENTE);

        const res = await cliente.get("/vendas");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/");
    });

    it("admin vê a casca do painel (cards de venda são renderizados no cliente)", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/vendas");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Controle de Vendas");
        // filtros por status (5 abas: todos + 4 status)
        expect((res.text.match(/class="status-tab/g) || []).length).toBe(5);
        expect(res.text).toContain('data-status="cancelado"');
        // container vazio + template de clonagem do vendas.js (dados vêm via fetch)
        expect(res.text).toContain('id="admin-orders-container"');
        expect(res.text).toContain('id="template-admin-order-card"');
        expect(res.text).toContain('id="no-orders-message"');
    });

    it("após logout, volta a redirecionar para /login", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const logout = await admin.post("/api/auth/logout");
        expect(logout.status).toBe(200);

        const res = await admin.get("/vendas");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });
});
