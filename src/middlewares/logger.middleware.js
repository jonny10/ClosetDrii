// Exemplo simples de middleware para depois criar o de login: registra cada requisição no console.
function logger(req, res, next) {
    console.log(`[${new Date().toISOString()}] ${req.method}
    ${req.originalUrl}`);
    next();
}

module.exports = logger;
