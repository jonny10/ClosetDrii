const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Upload da imagem de uma variante de produto (POST /api/admin/produtos/upload-imagem).
// Salva em uploads/produtos (fora do git — ver .gitignore) e expõe a URL relativa
// em req.imagemUrl; o multer não cria o diretório sozinho.
//
// Atenção (infra): na Render o disco é efêmero — estes arquivos somem a cada
// deploy/restart. Aceitável para o cenário atual; para persistência de verdade
// seria preciso um storage externo (S3 ou similar).
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "produtos");

// Mimetypes aceitos + extensão usada no nome do arquivo (nunca confiar na extensão enviada)
const TIPOS_PERMITIDOS = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
]);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const extensao = TIPOS_PERMITIDOS.get(file.mimetype);
        cb(null, `produto-${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (TIPOS_PERMITIDOS.has(file.mimetype)) return cb(null, true);
        cb(new Error("Apenas imagens JPG, PNG ou WebP são aceitas"));
    },
});

// Envolve o multer pra responder 400 JSON com mensagem em PT (sem cair no handler 500)
function uploadImagemProduto(req, res, next) {
    upload.single("imagem")(req, res, (err) => {
        if (err) {
            const message =
                err.code === "LIMIT_FILE_SIZE"
                    ? "Imagem deve ter no máximo 5MB"
                    : err.message;
            return res.status(400).json({ error: message });
        }
        if (!req.file) {
            return res.status(400).json({ error: "Arquivo da imagem é obrigatório" });
        }
        req.imagemUrl = `/uploads/produtos/${req.file.filename}`;
        next();
    });
}

// Converte a URL pública (/uploads/produtos/x.png) no caminho absoluto do arquivo
// no disco; null pra URL que não pertence ao diretório de imagens de produto
uploadImagemProduto.caminhoImagem = (url) => {
    if (!url || typeof url !== "string" || !url.startsWith("/uploads/produtos/")) {
        return null;
    }
    return path.join(UPLOADS_DIR, path.basename(url));
};

module.exports = uploadImagemProduto;
