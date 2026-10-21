import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");
const requireAuth = require("../../src/middlewares/require-auth.middleware.js");
const requireAdmin = require("../../src/middlewares/require-admin.middleware.js");

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

    it.each(["/profile", "/historico", "/dados"])(
        "cliente logado acessa %s (requireAuth)",
        async (rota) => {
            const cliente = await agenteLogado("ana.paula@email.com", "123456");

            const res = await cliente.get(rota);
            expect(res.status).toBe(200);
        }
    );

    it.each(["/vendas", "/contact_adm"])(
        "cliente logado é barrado de %s (requireAdmin) → 302 /",
        async (rota) => {
            const cliente = await agenteLogado("ana.paula@email.com", "123456");

            const res = await cliente.get(rota);
            expect(res.status).toBe(302);
            expect(res.headers.location).toBe("/");
        }
    );

    it.each(["/vendas", "/contact_adm", "/profile", "/historico", "/dados"])(
        "admin logado acessa tudo %s",
        async (rota) => {
            const admin = await agenteLogado("fabricio@email.com", "123456");

            const res = await admin.get(rota);
            expect(res.status).toBe(200);
        }
    );

    it("após logout, rotas protegidas voltam a redirecionar para /login", async () => {
        const cliente = await agenteLogado("ana.paula@email.com", "123456");

        const logout = await cliente.post("/api/auth/logout");
        expect(logout.status).toBe(200);

        const perfil = await cliente.get("/profile");
        expect(perfil.status).toBe(302);
        expect(perfil.headers.location).toBe("/login");

        const vendas = await cliente.get("/vendas");
        expect(vendas.status).toBe(302);
        expect(vendas.headers.location).toBe("/login");
    });
});

describe("middlewares requireAuth/requireAdmin (branches)", () => {
    function mockReq({ session = {}, originalUrl = "/" }) {
        return { session, originalUrl };
    }

    function mockRes() {
        const res = { redirect: vi.fn(), status: vi.fn(), json: vi.fn() };
        res.status.mockReturnValue(res);
        return res;
    }

    it("requireAuth: API sem sessão → 401 JSON", () => {
        const req = mockReq({ originalUrl: "/api/alguma-coisa" });
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Não autenticado" });
        expect(next).not.toHaveBeenCalled();
    });

    it("requireAuth: página sem sessão → redirect /login", () => {
        const req = mockReq({ originalUrl: "/profile" });
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith("/login");
        expect(next).not.toHaveBeenCalled();
    });

    it("requireAuth: com sessão → next()", () => {
        const req = mockReq({ session: { isLoggedIn: true, user: { perfil: "cliente" } } });
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("requireAdmin: API sem sessão → 401 JSON", () => {
        const req = mockReq({ originalUrl: "/api/admin/vendas" });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Não autenticado" });
    });

    it("requireAdmin: página sem sessão → redirect /login", () => {
        const req = mockReq({ originalUrl: "/vendas" });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith("/login");
    });

    it("requireAdmin: API com cliente → 403 JSON", () => {
        const req = mockReq({
            session: { isLoggedIn: true, user: { perfil: "cliente" } },
            originalUrl: "/api/admin/vendas",
        });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: "Acesso restrito a administradores" });
        expect(next).not.toHaveBeenCalled();
    });

    it("requireAdmin: página com cliente → redirect /", () => {
        const req = mockReq({
            session: { isLoggedIn: true, user: { perfil: "cliente" } },
            originalUrl: "/vendas",
        });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith("/");
    });

    it("requireAdmin: API com admin → next()", () => {
        const req = mockReq({
            session: { isLoggedIn: true, user: { perfil: "admin" } },
            originalUrl: "/api/admin/vendas",
        });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("requireAdmin: sessão logada SEM user (edge) → 403 JSON em API", () => {
        const req = mockReq({
            session: { isLoggedIn: true },
            originalUrl: "/api/admin/vendas",
        });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
