import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("páginas renderizadas", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("home renderiza com os cards de produtos do banco", async () => {
        const res = await request(app).get("/");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Closet Drii");
        expect(res.text).toContain("Destaques da Semana");
        // 4 cards reais (destaques) + 1 do <template> de clonagem do JS
        expect((res.text.match(/product-card-component/g) || []).length).toBe(5);
        // preços formatados pt-BR (ex.: R$ 129,90)
        expect((res.text.match(/R\$ \d+,\d{2}/g) || []).length).toBeGreaterThanOrEqual(4);
    });

    it.each(["/about", "/contact", "/login", "/signup", "/produtos", "/catalogo", "/cart"])(
        "GET %s responde 200",
        async (rota) => {
            const res = await request(app).get(rota);
            expect(res.status).toBe(200);
        }
    );

    it.each(["/profile", "/historico", "/dados", "/vendas", "/contact_adm"])(
        "GET %s redireciona para /login sem sessão",
        async (rota) => {
            const res = await request(app).get(rota);
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/login");
        }
    );

    it("página inexistente cai na 404", async () => {
        const res = await request(app).get("/nao-existe");

        expect(res.status).toBe(404);
        expect(res.text).toContain("Página não encontrada");
    });
});

describe("rotas protegidas (com sessão)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    async function agenteLogado(email, senha) {
        const agente = request.agent(app);
        const login = await agente.post("/api/auth/login").send({ email, senha });
        expect(login.status).toBe(200);
        return agente;
    }

    it("cliente acessa /profile mas é barrado de /vendas e /contact_adm", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const perfil = await cliente.get("/profile");
        expect(perfil.status).toBe(200);

        const vendas = await cliente.get("/vendas");
        expect(vendas.status).toBe(302);
        expect(vendas.headers.location).toBe("/");

        const contatoAdm = await cliente.get("/contact_adm");
        expect(contatoAdm.status).toBe(302);
        expect(contatoAdm.headers.location).toBe("/");
    });

    it("admin acessa /vendas e /contact_adm", async () => {
        const admin = await agenteLogado("fabricio@email.com", "123456");

        const vendas = await admin.get("/vendas");
        expect(vendas.status).toBe(200);

        const contatoAdm = await admin.get("/contact_adm");
        expect(contatoAdm.status).toBe(200);
    });
});
