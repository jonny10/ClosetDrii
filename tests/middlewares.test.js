import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const requireAuth = require("../src/middlewares/require-auth.middleware.js");
const requireAdmin = require("../src/middlewares/require-admin.middleware.js");

function mockReq({ session = {}, originalUrl = "/" }) {
    return { session, originalUrl };
}

function mockRes() {
    const res = { redirect: vi.fn(), status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
}

describe("middleware requireAuth", () => {
    it("API sem sessão → 401 JSON", () => {
        const req = mockReq({ originalUrl: "/api/alguma-coisa" });
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Não autenticado" });
        expect(next).not.toHaveBeenCalled();
    });

    it("página sem sessão → redirect /login", () => {
        const req = mockReq({ originalUrl: "/profile" });
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith("/login");
        expect(next).not.toHaveBeenCalled();
    });

    it("com sessão → next()", () => {
        const req = mockReq({ session: { isLoggedIn: true, user: { perfil: "cliente" } } });
        const res = mockRes();
        const next = vi.fn();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});

describe("middleware requireAdmin", () => {
    it("API sem sessão → 401 JSON", () => {
        const req = mockReq({ originalUrl: "/api/admin/vendas" });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Não autenticado" });
        expect(next).not.toHaveBeenCalled();
    });

    it("página sem sessão → redirect /login", () => {
        const req = mockReq({ originalUrl: "/vendas" });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith("/login");
        expect(next).not.toHaveBeenCalled();
    });

    it("API com cliente → 403 JSON", () => {
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

    it("página com cliente → redirect /", () => {
        const req = mockReq({
            session: { isLoggedIn: true, user: { perfil: "cliente" } },
            originalUrl: "/vendas",
        });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(res.redirect).toHaveBeenCalledWith("/");
        expect(next).not.toHaveBeenCalled();
    });

    it("API com admin → next()", () => {
        const req = mockReq({
            session: { isLoggedIn: true, user: { perfil: "admin" } },
            originalUrl: "/api/admin/vendas",
        });
        const res = mockRes();
        const next = vi.fn();

        requireAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it("sessão logada SEM user (edge) → 403 JSON em API", () => {
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
