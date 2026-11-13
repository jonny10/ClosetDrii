const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { createR2ImageUploader, MIME_EXTENSIONS, MAX_IMAGE_SIZE } = require("../services/r2-image-upload.service");

// Upload da imagem de uma variante de produto (POST /api/admin/produtos/upload-imagem).
// Por padrão, o comportamento legado permanece: grava em uploads/produtos (fora do git —
// ver .gitignore) e devolve a URL relativa em req.imagemUrl. Para habilitar o Cloudflare R2
// (storage externo — na Render o disco é efêmero), defina PRODUCT_IMAGE_STORAGE=r2 e as
// variáveis R2_* documentadas em .env.example; a URL devolvida passa a ser pública/absoluta.
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "produtos");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const extension = MIME_EXTENSIONS.get(file.mimetype);
        cb(null, `produto-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
});

const memoryStorage = multer.memoryStorage();

function fileFilter(req, file, cb) {
    if (MIME_EXTENSIONS.has(file.mimetype)) return cb(null, true);
    cb(new Error("Apenas imagens JPG, PNG ou WebP são aceitas"));
}

function makeUpload(storageEngine) {
    return multer({ storage: storageEngine, limits: { fileSize: MAX_IMAGE_SIZE }, fileFilter });
}

function sendUploadError(res, err) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Imagem deve ter no máximo 5MB" : err.message;
    return res.status(err.status || 400).json({ error: message });
}

function runMulter(upload, req, res) {
    return new Promise((resolve, reject) => {
        upload.single("imagem")(req, res, (err) => (err ? reject(err) : resolve()));
    });
}

async function uploadImagemProduto(req, res, next) {
    const useR2 = process.env.PRODUCT_IMAGE_STORAGE === "r2";
    try {
        await runMulter(makeUpload(useR2 ? memoryStorage : storage), req, res);
        if (!req.file) {
            return res.status(400).json({ error: "Arquivo da imagem é obrigatório" });
        }

        if (useR2) {
            // Configuração é lida apenas no modo opt-in; sem R2_* o modo legado segue intacto.
            const uploadToR2 = createR2ImageUploader();
            req.imagemUrl = await uploadToR2(req.file);
        } else {
            req.imagemUrl = `/uploads/produtos/${req.file.filename}`;
        }
        next();
    } catch (err) {
        // Não expõe endpoint, chaves ou detalhes internos do storage ao cliente.
        if (useR2 && err.status === 502) return res.status(502).json({ error: "Não foi possível armazenar a imagem" });
        return sendUploadError(res, err);
    }
}

// Converte apenas URLs legadas no disco. URLs R2 e URLs antigas externas não são alteradas.
uploadImagemProduto.caminhoImagem = (url) => {
    if (!url || typeof url !== "string" || !url.startsWith("/uploads/produtos/")) {
        return null;
    }
    return path.join(UPLOADS_DIR, path.basename(url));
};

module.exports = uploadImagemProduto;
