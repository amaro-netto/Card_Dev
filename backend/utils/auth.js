// backend/utils/auth.js
const { ADMIN_SECRET } = require('../main'); 

/**
 * Middleware de autenticação para rotas de administração.
 * Verifica se o cabeçalho 'Authorization' contém a chave secreta correta.
 * @param {Object} req - Objeto de requisição do Express.
 * @param {Object} res - Objeto de resposta do Express.
 * @param {Function} next - Função para passar o controle para o próximo middleware.
 */
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acesso não autorizado. Cabeçalho de autorização Bearer ausente ou malformatado.' });
    }

    const token = authHeader.split(' ')[1]; 

    if (token === ADMIN_SECRET) {
        next(); 
    } else {
        return res.status(401).json({ error: 'Acesso não autorizado. Chave de administração inválida.' });
    }
}

module.exports = { authenticateAdmin };