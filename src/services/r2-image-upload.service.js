const crypto = require("crypto");
const { AwsClient } = require("aws4fetch");

// Upload de imagens de produto no Cloudflare R2 (compatível com S3, SigV4 via aws4fetch).
// Opt-in: só é usado quando o middleware define PRODUCT_IMAGE_STORAGE=r2.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 15_000;

// Mimetypes aceitos + extensão usada no nome do arquivo (nunca confiar na extensão enviada)
const MIME_EXTENSIONS = new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
]);

function required(value, name) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`Configuração R2 inválida: ${name} é obrigatório`);
    }
    return value.trim();
}

function normalizePublicBaseUrl(value) {
    const url = new URL(required(value, "R2_PUBLIC_BASE_URL"));
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
        throw new Error("Configuração R2 inválida: R2_PUBLIC_BASE_URL deve ser uma URL HTTPS pública sem query ou fragmento");
    }
    return url.toString().replace(/\/$/, "");
}

function loadR2Config(env = process.env, options = {}) {
    const endpoint = new URL(required(env.R2_ENDPOINT, "R2_ENDPOINT"));
    const allowInsecureEndpoint = options.allowInsecureEndpoint === true;
    if ((!allowInsecureEndpoint && endpoint.protocol !== "https:") || !["https:", "http:"].includes(endpoint.protocol)) {
        throw new Error("Configuração R2 inválida: R2_ENDPOINT deve usar HTTPS");
    }
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
        throw new Error("Configuração R2 inválida: R2_ENDPOINT não pode conter credenciais, query ou fragmento");
    }

    const bucket = required(env.R2_BUCKET, "R2_BUCKET");
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
        throw new Error("Configuração R2 inválida: R2_BUCKET tem formato inválido");
    }

    return {
        endpoint,
        bucket,
        accessKeyId: required(env.R2_ACCESS_KEY_ID, "R2_ACCESS_KEY_ID"),
        secretAccessKey: required(env.R2_SECRET_ACCESS_KEY, "R2_SECRET_ACCESS_KEY"),
        publicBaseUrl: normalizePublicBaseUrl(env.R2_PUBLIC_BASE_URL),
        region: env.R2_REGION || "auto",
    };
}

// Encoding RFC 3986 exigido pelo SigV4 em chaves de objeto
function awsEncode(value) {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function makeObjectKey(mimetype, now = new Date(), randomBytes = crypto.randomBytes) {
    const extension = MIME_EXTENSIONS.get(mimetype);
    if (!extension) throw new Error("Apenas imagens JPG, PNG ou WebP são aceitas");
    const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    return `produtos/produto-${stamp}-${randomBytes(12).toString("hex")}${extension}`;
}

function createR2ImageUploader({ env = process.env, now, randomBytes, allowInsecureEndpoint = false } = {}) {
    const config = loadR2Config(env, { allowInsecureEndpoint });
    const client = new AwsClient({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        service: "s3",
        retries: 0, // falha de upload não deve repetir sozinha — o erro é mapeado pra 502
    });

    return async function uploadImage(file) {
        if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) throw new Error("Arquivo da imagem é obrigatório");
        if (file.buffer.length > MAX_IMAGE_SIZE) throw new Error("Imagem deve ter no máximo 5MB");
        if (!MIME_EXTENSIONS.has(file.mimetype)) throw new Error("Apenas imagens JPG, PNG ou WebP são aceitas");

        const key = makeObjectKey(file.mimetype, now ? now() : new Date(), randomBytes || crypto.randomBytes);
        const encodedKey = key.split("/").map(awsEncode).join("/");
        const endpointUrl = config.endpoint.toString().replace(/\/$/, "");
        const uploadUrl = `${endpointUrl}/${awsEncode(config.bucket)}/${encodedKey}`;

        let response;
        try {
            response = await client.fetch(uploadUrl, {
                method: "PUT",
                body: file.buffer,
                headers: { "content-type": file.mimetype },
                signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
            });
        } catch (error) {
            // Não propaga detalhes internos (endpoint, chaves, mensagem do cliente HTTP)
            const wrapped = new Error("Não foi possível armazenar a imagem no R2");
            wrapped.status = 502;
            wrapped.cause = error;
            throw wrapped;
        }
        if (!response.ok) {
            const error = new Error("Não foi possível armazenar a imagem no R2");
            error.status = 502;
            throw error;
        }
        return `${config.publicBaseUrl}/${encodedKey}`;
    };
}

module.exports = { MAX_IMAGE_SIZE, MIME_EXTENSIONS, awsEncode, loadR2Config, makeObjectKey, createR2ImageUploader };
