const { ADMIN_SECRET } = require('../main'); // Importa o ADMIN_SECRET do main.js

/**
 * Middleware de autenticação para rotas de administração.
 * Verifica se o cabeçalho 'Authorization' contém a chave secreta correta.
 * @param {Object} req - Objeto de requisição do Express.
 * @param {Object} res - Objeto de resposta do Express.
 * @param {Function} next - Função para passar o controle para o próximo middleware.
 */
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    // Verifica se o cabeçalho Authorization existe e tem o formato "Bearer <chave>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acesso não autorizado. Cabeçalho de autorização Bearer ausente ou malformatado.' });
    }

    const token = authHeader.split(' ')[1]; // Pega a parte da chave após "Bearer "

    if (token === ADMIN_SECRET) {
        next(); // Chave válida, prossegue para a próxima função da rota
    } else {
        return res.status(401).json({ error: 'Acesso não autorizado. Chave de administração inválida.' });
    }
}

module.exports = { authenticateAdmin };