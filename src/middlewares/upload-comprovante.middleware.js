const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Upload do comprovante de pagamento (POST /api/vendas/:id/comprovante).
// Salva em uploads/comprovantes (fora do git — ver .gitignore) e expõe a URL
// relativa em req.comprovanteUrl; o multer não cria o diretório sozinho.
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "comprovantes");

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
        cb(null, `comprovante-${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`);
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
function uploadComprovante(req, res, next) {
    // barra antes do multer quando o Content-Length já estoura o limite —
    // evita que o multer grave um arquivo parcial em disco
    const contentLength = Number(req.headers["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Comprovante deve ter no máximo 5MB" });
    }

    upload.single("comprovante")(req, res, (err) => {
        if (err) {
            const message =
                err.code === "LIMIT_FILE_SIZE"
                    ? "Comprovante deve ter no máximo 5MB"
                    : err.message;
            return res.status(400).json({ error: message });
        }
        if (!req.file) {
            return res.status(400).json({ error: "Arquivo do comprovante é obrigatório" });
        }
        req.comprovanteUrl = `/uploads/comprovantes/${req.file.filename}`;
        next();
    });
}

// Converte a URL pública (/uploads/comprovantes/x.png) no caminho absoluto do
// arquivo no disco; null pra URL que não pertence ao diretório de comprovantes
uploadComprovante.caminhoComprovante = (url) => {
    if (!url || typeof url !== "string" || !url.startsWith("/uploads/comprovantes/")) {
        return null;
    }
    return path.join(UPLOADS_DIR, path.basename(url));
};

module.exports = uploadComprovante;
