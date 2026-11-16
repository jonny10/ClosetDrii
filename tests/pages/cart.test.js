import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /cart (carrinho)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("visitante vê a casca do carrinho (itens vêm do localStorage via JS)", async () => {
        const res = await request(app).get("/cart");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Seu Closet Virtual");
        // container vazio + template de clonagem do cart.js (render é no cliente)
        expect(res.text).toContain('id="cart-items-container"');
        expect(res.text).toContain('id="template-cart-item"');
        // resumo do pedido zerado + botão de finalizar
        expect(res.text).toContain('id="summary-total"');
        expect(res.text).toContain('id="btn-checkout"');
        // modal de checkout (WhatsApp) presente, oculto por padrão
        expect(res.text).toContain('id="checkout-instructions-modal"');
    });
});
