import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

import { agenteLogado, CLIENTE, ADMIN } from "./helpers.js";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /historico (meus pedidos)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("sem sessão redireciona para /login", async () => {
        const res = await request(app).get("/historico");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("cliente vê os pedidos renderizados no servidor (sem template)", async () => {
        const cliente = await agenteLogado(app, CLIENTE);

        const res = await cliente.get("/historico");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Meus Pedidos");
        // venda 1 do seed (usuario_id 4) renderizada pelo {{#each}} — sem <template> de clonagem
        expect((res.text.match(/class="order-container-card"/g) || []).length).toBe(1);
        expect(res.text).not.toContain("template-order-card");
        expect(res.text).toContain("#0001");
        // itens com produto/cor/tamanho resolvidos no servidor (cadeia de includes)
        expect(res.text).toContain("Vestido Floral Midi");
        expect(res.text).toContain("Blusa Cropped Listrada");
        expect(res.text).toContain("Rosa");
        expect(res.text).toContain("Branco");
        // total, subtotais e unitário em pt-BR
        expect(res.text).toContain("R$ 269,80");
        expect(res.text).toContain("R$ 189,90");
        expect(res.text).toContain("R$ 79,90");
        // badge com a classe do status da venda (pago)
        expect(res.text).toContain("status-pago");
        // quem tem pedidos não vê o empty-state
        expect(res.text).not.toContain("Você ainda não fez compras");
    });

    it("sidebar de conta renderizada com Meus Pedidos ativo", async () => {
        const cliente = await agenteLogado(app, CLIENTE);

        const res = await cliente.get("/historico");

        expect(res.status).toBe(200);
        // menu à esquerda: nome/e-mail, link ativo no item pedidos e sem edição de foto
        expect(res.text).toContain('class="profile-sidebar"');
        expect(res.text).toContain("Ana Paula Ferreira");
        expect(res.text).toContain('href="/historico"');
        expect(res.text).toContain("sidebar-link active");
        expect(res.text).toContain('href="/profile"');
        expect(res.text).not.toContain("edit-overlay");
    });

    it("usuário sem pedidos vê o empty-state", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/historico");

        expect(res.status).toBe(200);
        // fabricio (id 2) não tem vendas no seed → nenhum card e empty-state visível
        expect((res.text.match(/class="order-container-card"/g) || []).length).toBe(0);
        expect(res.text).toContain("Você ainda não fez compras");
        expect(res.text).toContain('href="/produtos"');
    });
});
