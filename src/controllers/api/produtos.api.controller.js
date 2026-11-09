const produtoService = require("../../services/produto.service");
const produtoVarianteService = require("../../services/produto_variante.service");

// GET /api/produtos — filtros: categoria (nome exato), busca (nome), orderBy (preco|nome), dir (asc|desc)
async function listarProdutos(req, res, next) {
    try {
        const produtos = await produtoService.listarProdutos({
            categoria: req.query.categoria,
            busca: req.query.busca,
            orderBy: req.query.orderBy,
            dir: req.query.dir,
        });
        res.json(produtos);
    } catch (err) {
        next(err);
    }
}

// GET /api/produtos/:id — detalhe com categoria e variantes
async function buscarProduto(req, res, next) {
    try {
        const produto = await produtoService.buscarProduto(Number(req.params.id));
        if (!produto) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }
        res.json(produtoService.formatarProduto(produto));
    } catch (err) {
        next(err);
    }
}

// GET /api/produtos/:id/variantes — só as variantes; 404 se o produto não existir
async function listarVariantesDeProduto(req, res, next) {
    try {
        const id = Number(req.params.id);
        const produto = await produtoService.buscarProduto(id);
        if (!produto) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }
        const variantes = await produtoService.listarVariantes(id);
        res.json(variantes);
    } catch (err) {
        next(err);
    }
}

// POST /api/admin/produtos/upload-imagem — recebe o arquivo (multipart, campo "imagem"),
// que o middleware já salvou em uploads/produtos, e devolve a URL pública pra
// o cliente gravar em imagem_url da variante.
function uploadImagemProduto(req, res) {
    return res.status(201).json({ url: req.imagemUrl });
}

// --- Admin: CRUD de produtos e variantes (T28) ---

// Monta os campos do produto (parcial no PATCH); devolve string de erro quando inválido
function montarDadosProduto(body = {}, parcial = false) {
    const dados = {};

    if (body.nome !== undefined || !parcial) {
        const nome = typeof body.nome === "string" ? body.nome.trim() : "";
        if (!nome) return "Nome é obrigatório";
        dados.nome = nome;
    }

    if (body.descricao !== undefined || !parcial) {
        const descricao = typeof body.descricao === "string" ? body.descricao.trim() : "";
        if (!descricao) return "Descrição é obrigatória";
        dados.descricao = descricao;
    }

    if (body.preco !== undefined || !parcial) {
        const preco = Number(body.preco);
        if (!Number.isFinite(preco) || preco <= 0) {
            return "Preço deve ser um número maior que zero";
        }
        dados.preco = preco;
    }

    if (body.categoria_id !== undefined || !parcial) {
        const categoriaId = Number(body.categoria_id);
        if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
            return "Categoria inválida";
        }
        dados.categoria_id = categoriaId;
    }

    return dados;
}

// Valida o array de variantes opcional do payload; devolve string de erro quando inválido
function montarVariantesDoPayload(variantes) {
    if (variantes === undefined) return [];
    if (!Array.isArray(variantes)) return "Variantes deve ser um array";

    const chaves = new Set();
    const validadas = [];

    for (const v of variantes) {
        const cor = typeof v?.cor === "string" ? v.cor.trim() : "";
        const tamanho = typeof v?.tamanho === "string" ? v.tamanho.trim() : "";
        if (!cor) return "Cor da variante é obrigatória";
        if (!tamanho) return "Tamanho da variante é obrigatório";

        let estoque = 0;
        if (v.estoque !== undefined) {
            estoque = Number(v.estoque);
            if (!Number.isInteger(estoque) || estoque < 0) {
                return "Estoque da variante deve ser um inteiro não-negativo";
            }
        }

        const imagem_url = typeof v.imagem_url === "string" ? v.imagem_url : null;

        const chave = `${cor.toLowerCase()}|${tamanho.toLowerCase()}`;
        if (chaves.has(chave)) return "Variantes duplicadas (mesma cor e tamanho)";
        chaves.add(chave);

        validadas.push({ cor, tamanho, estoque, imagem_url });
    }

    return validadas;
}

// POST /api/admin/produtos — cria produto (com variantes opcionais) numa transação
async function criarProduto(req, res, next) {
    try {
        const dados = montarDadosProduto(req.body);
        if (typeof dados === "string") {
            return res.status(400).json({ error: dados });
        }

        const variantes = montarVariantesDoPayload(req.body?.variantes);
        if (typeof variantes === "string") {
            return res.status(400).json({ error: variantes });
        }

        const produto = await produtoService.criarProdutoComVariantes(dados, variantes);
        return res.status(201).json(produto);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// PATCH /api/admin/produtos/:id — update parcial dos campos do produto
async function atualizarProduto(req, res, next) {
    try {
        const id = Number.parseInt(req.params.id, 10);

        const dados = montarDadosProduto(req.body, true);
        if (typeof dados === "string") {
            return res.status(400).json({ error: dados });
        }
        if (Object.keys(dados).length === 0) {
            return res.status(400).json({ error: "Nenhum campo para atualizar" });
        }

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }

        const produto = await produtoService.atualizarProduto(id, dados);
        if (!produto) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }

        return res.json(produto);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// DELETE /api/admin/produtos/:id — remove produto + variantes; 409 com vínculos
async function removerProduto(req, res, next) {
    try {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }

        const resultado = await produtoService.removerProduto(id);
        if (!resultado) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }

        return res.json(resultado);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// POST /api/admin/produtos/:id/variantes — cria variante no produto; 404 produto inexistente
async function criarVarianteDeProduto(req, res, next) {
    try {
        const produtoId = Number.parseInt(req.params.id, 10);
        const produto =
            Number.isInteger(produtoId) && produtoId > 0
                ? await produtoService.buscarProduto(produtoId)
                : null;
        if (!produto) {
            return res.status(404).json({ error: "Produto não encontrado" });
        }

        const cor = typeof req.body?.cor === "string" ? req.body.cor.trim() : "";
        const tamanho = typeof req.body?.tamanho === "string" ? req.body.tamanho.trim() : "";
        if (!cor) return res.status(400).json({ error: "Cor da variante é obrigatória" });
        if (!tamanho) return res.status(400).json({ error: "Tamanho da variante é obrigatório" });

        let estoque = 0;
        if (req.body.estoque !== undefined) {
            estoque = Number(req.body.estoque);
            if (!Number.isInteger(estoque) || estoque < 0) {
                return res.status(400).json({ error: "Estoque da variante deve ser um inteiro não-negativo" });
            }
        }
        const imagem_url = typeof req.body.imagem_url === "string" ? req.body.imagem_url : null;

        const variante = await produtoVarianteService.criarVariante({
            produto_id: produtoId,
            cor,
            tamanho,
            estoque,
            imagem_url,
        });
        return res.status(201).json(variante);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// PATCH /api/admin/variantes/:id — update parcial de cor/tamanho/estoque/imagem_url
async function atualizarVariante(req, res, next) {
    try {
        const id = Number.parseInt(req.params.id, 10);
        const body = req.body || {};

        const dados = {};
        if (body.cor !== undefined) {
            const cor = typeof body.cor === "string" ? body.cor.trim() : "";
            if (!cor) return res.status(400).json({ error: "Cor da variante é obrigatória" });
            dados.cor = cor;
        }
        if (body.tamanho !== undefined) {
            const tamanho = typeof body.tamanho === "string" ? body.tamanho.trim() : "";
            if (!tamanho) return res.status(400).json({ error: "Tamanho da variante é obrigatório" });
            dados.tamanho = tamanho;
        }
        if (body.estoque !== undefined) {
            const estoque = Number(body.estoque);
            if (!Number.isInteger(estoque) || estoque < 0) {
                return res.status(400).json({ error: "Estoque da variante deve ser um inteiro não-negativo" });
            }
            dados.estoque = estoque;
        }
        if (body.imagem_url !== undefined) {
            if (typeof body.imagem_url !== "string") {
                return res.status(400).json({ error: "Imagem da variante inválida" });
            }
            dados.imagem_url = body.imagem_url;
        }

        if (Object.keys(dados).length === 0) {
            return res.status(400).json({ error: "Nenhum campo para atualizar" });
        }

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Variante não encontrada" });
        }

        const variante = await produtoVarianteService.atualizarVariante(id, dados);
        if (!variante) {
            return res.status(404).json({ error: "Variante não encontrada" });
        }

        return res.json(variante);
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

// DELETE /api/admin/variantes/:id — 409 se a variante tiver vendas
async function removerVariante(req, res, next) {
    try {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(404).json({ error: "Variante não encontrada" });
        }

        const resultado = await produtoVarianteService.removerVariante(id);
        if (!resultado) {
            return res.status(404).json({ error: "Variante não encontrada" });
        }

        return res.json({ id });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
}

module.exports = {
    listarProdutos,
    buscarProduto,
    listarVariantesDeProduto,
    uploadImagemProduto,
    criarProduto,
    atualizarProduto,
    removerProduto,
    criarVarianteDeProduto,
    atualizarVariante,
    removerVariante,
};
