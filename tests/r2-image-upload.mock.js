// Executável com Node puro: node tests/r2-image-upload.mock.js
const assert = require("node:assert/strict");
const { createR2ImageUploader, awsEncode, loadR2Config, makeObjectKey } = require("../src/services/r2-image-upload.service");

const env = {
    R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
    R2_BUCKET: "closet-images",
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
    R2_PUBLIC_BASE_URL: "https://images.example.test",
    R2_REGION: "auto",
};
const now = () => new Date("2026-11-10T14:00:00.000Z");
const randomBytes = () => Buffer.alloc(12, 0xab);
const suffix = "ab".repeat(12);

// aws4fetch assina e chama o fetch global — o stub captura o Request assinado.
function stubFetch(statusCode) {
    const calls = [];
    return {
        calls,
        async fetch(input) {
            calls.push(input);
            return new Response(null, { status: statusCode });
        },
    };
}

(async () => {
    const originalFetch = globalThis.fetch;
    try {
        const success = stubFetch(200);
        globalThis.fetch = success.fetch;
        const upload = createR2ImageUploader({ env, now, randomBytes });
        const url = await upload({ mimetype: "image/png", buffer: Buffer.from("image-bytes") });
        assert.equal(url, `https://images.example.test/produtos/produto-20261110140000-${suffix}.png`);
        assert.equal(success.calls.length, 1);

        const request = success.calls[0];
        assert.equal(request.method, "PUT");
        assert.equal(request.url, `https://account.r2.cloudflarestorage.com/closet-images/produtos/produto-20261110140000-${suffix}.png`);
        assert.equal(request.headers.get("content-type"), "image/png");
        assert.match(request.headers.get("x-amz-date"), /^\d{8}T\d{6}Z$/);
        assert.equal(request.headers.get("x-amz-content-sha256"), "UNSIGNED-PAYLOAD");
        assert.match(
            request.headers.get("authorization"),
            /^AWS4-HMAC-SHA256 Credential=test-access-key\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[a-f0-9]{64}$/
        );
        assert.deepEqual(Buffer.from(await request.arrayBuffer()), Buffer.from("image-bytes"));

        // Resposta não-2xx do storage → 502 mapeado
        globalThis.fetch = stubFetch(503).fetch;
        await assert.rejects(
            createR2ImageUploader({ env, now, randomBytes })({ mimetype: "image/jpeg", buffer: Buffer.from("x") }),
            (error) => error.status === 502 && error.message === "Não foi possível armazenar a imagem no R2"
        );

        // Falha de rede → 502 mapeado, sem expor detalhes do cliente HTTP
        globalThis.fetch = async () => { throw new Error("ECONNREFUSED 127.0.0.1"); };
        await assert.rejects(
            createR2ImageUploader({ env, now, randomBytes })({ mimetype: "image/jpeg", buffer: Buffer.from("x") }),
            (error) => error.status === 502 && error.message === "Não foi possível armazenar a imagem no R2"
        );

        // Validações rodam ANTES de qualquer request
        const noNetwork = stubFetch(200);
        globalThis.fetch = noNetwork.fetch;
        const protectedUpload = createR2ImageUploader({ env, now, randomBytes });
        await assert.rejects(protectedUpload({ mimetype: "image/gif", buffer: Buffer.from("x") }), /JPG, PNG ou WebP/);
        await assert.rejects(protectedUpload({ mimetype: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }), /no máximo 5MB/);
        await assert.rejects(protectedUpload({ mimetype: "image/png", buffer: Buffer.alloc(0) }), /obrigatório/);
        assert.equal(noNetwork.calls.length, 0);

        // Validação de configuração
        assert.throws(() => loadR2Config({ ...env, R2_ENDPOINT: "http://localhost:9000" }), /deve usar HTTPS/);
        assert.throws(() => loadR2Config({ ...env, R2_SECRET_ACCESS_KEY: "" }), /R2_SECRET_ACCESS_KEY é obrigatório/);
        assert.throws(() => loadR2Config({ ...env, R2_BUCKET: "Bucket Inválido" }), /formato inválido/);
        assert.throws(() => loadR2Config({ ...env, R2_PUBLIC_BASE_URL: "http://imagens.example.test" }), /deve ser uma URL HTTPS pública/);

        // Chave de objeto: extensão do mimetype e rejeição de tipos fora da lista
        assert.equal(makeObjectKey("image/webp", now(), randomBytes), `produtos/produto-20261110140000-${suffix}.webp`);
        assert.throws(() => makeObjectKey("image/svg+xml", now(), randomBytes), /JPG, PNG ou WebP/);

        // Encoding RFC 3986 do caminho (ex.: espaço → %20, barra do prefixo preservada)
        assert.equal(["produtos", "a b.png"].map(awsEncode).join("/"), "produtos/a%20b.png");

        console.log("PASS: R2 upload mockado, headers SigV4, contrato de URL, erros, limites e validação de config");
    } finally {
        globalThis.fetch = originalFetch;
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
