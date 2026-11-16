import request from "supertest";
import { expect } from "vitest";

export const CLIENTE = { email: "ana.paula@email.com", senha: "123456" };
export const ADMIN = { email: "fabricio@email.com", senha: "123456" };

// Sessão autenticada via agente (mantém o cookie connect.sid entre requisições).
export async function agenteLogado(app, { email, senha } = CLIENTE) {
    const agente = request.agent(app);
    const login = await agente.post("/api/auth/login").send({ email, senha });
    expect(login.status).toBe(200);
    return agente;
}
