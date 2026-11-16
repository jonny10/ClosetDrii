import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";

import { agenteLogado, CLIENTE, ADMIN } from "./helpers.js";

const require = createRequire(import.meta.url);
const app = require("../../src/app.js");
const { sequelize } = require("../../src/models/index.js");
const { seed } = require("../../src/seed.js");

describe("página /catalogo (admin)", () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
        await seed();
    });

    it("sem sessão redireciona para /login", async () => {
        const res = await request(app).get("/catalogo");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/login");
    });

    it("cliente logado é barrado (requireAdmin) → 302 /", async () => {
        const cliente = await agenteLogado(app, CLIENTE);

        const res = await cliente.get("/catalogo");

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/");
    });

    it("admin vê a tabela de produtos renderizada no servidor", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/catalogo");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Controle de Catálogo");
        // 20 linhas do seed renderizadas pelo {{#each}} do Handlebars
        expect((res.text.match(/class="btn-action-edit"/g) || []).length).toBe(20);
        expect(res.text).toContain("Vestido Floral Midi");
        // select de categorias server-rendered (5 opções numéricas)
        expect((res.text.match(/<option value="\d+">/g) || []).length).toBe(5);
    });

    it("admin vê os KPIs de estoque e o modal de categorias", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/catalogo");

        expect(res.status).toBe(200);
        // cards de KPI no padrão do /dados, com valores calculados do seed
        expect(res.text).toContain("Looks Cadastrados");
        expect(res.text).toContain("Variações de Grade");
        expect(res.text).toContain("Peças em Estoque");
        expect(res.text).toContain("Preço Médio");
        expect(res.text).toContain("<p>20</p>"); // produtos distintos
        expect(res.text).toContain("<p>32</p>"); // combinações cor/tamanho
        expect(res.text).toContain("<p>171</p>"); // soma dos estoques do seed
        expect(res.text).toContain("R$ 153,90"); // média de preço do seed
        // seções analíticas
        expect(res.text).toContain("Estoque por Categoria");
        expect(res.text).toContain("Alertas de Reposição");
        // modal de categorias server-rendered (5 itens do seed)
        expect((res.text.match(/class="categoria-item"/g) || []).length).toBe(5);
    });

    it("admin vê o modal de tamanhos com o CRUD e o modo edição", async () => {
        const admin = await agenteLogado(app, ADMIN);

        const res = await admin.get("/catalogo");

        expect(res.status).toBe(200);
        // botão que abre o modal de tamanhos
        expect(res.text).toContain('id="btn-open-tamanhos-modal"');
        // 8 tamanhos do seed server-rendered
        expect((res.text.match(/class="tamanho-item"/g) || []).length).toBe(8);
        expect(res.text).toContain("Gerenciar Tamanhos");
        // rótulos de criação vs edição nos dois modais (categorias e tamanhos)
        expect(res.text).toContain('data-label-criacao="Novo"');
        expect(res.text).toContain('data-label-edicao="Cancelar"');
        expect(res.text).toContain('data-label-criacao="Salvar Categoria"');
        expect(res.text).toContain('data-label-edicao="Editar"');
        expect(res.text).toContain('data-label-criacao="Salvar Tamanho"');
        expect(res.text).toContain('data-titulo-criacao="Gerenciar Categorias"');
        expect(res.text).toContain('data-titulo-edicao="Editando Tamanho"');
    });
});
