const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Ainda precisamos aqui para inicializar o DB

// Carrega as variáveis de ambiente do .env
require('dotenv').config(); 

// --- Configurações Iniciais e Banco de Dados ---
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your_super_secret_admin_key'; // Usado na autenticação
const DB_PATH = path.join(__dirname, '../data', 'cards.db'); // Caminho relativo ajustado para ../data

// Garante que a pasta 'data' exista
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
}

// Inicializa o banco de dados SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS cards (
            name TEXT PRIMARY KEY,
            type TEXT,
            description TEXT,
            pwr INTEGER,
            vel INTEGER,
            flx INTEGER,
            com INTEGER,
            crv INTEGER,
            imagePrompt TEXT,
            imageUrl TEXT,
            iconUrl TEXT,
            isValidLanguage BOOLEAN
        )`, (createErr) => {
            if (createErr) {
                console.error('Erro ao criar a tabela cards:', createErr.message);
            } else {
                console.log('Tabela "cards" verificada/criada.');
            }
        });
    }
});

// Exporta a instância do banco de dados para ser usada em outros módulos
module.exports = { db, ADMIN_SECRET }; // Exporta db e ADMIN_SECRET

// --- Configuração do Express ---
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Middleware para logar todas as requisições (útil para depuração)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Importa as rotas (serão criadas nos próximos passos)
const cardRoutes = require('./api/cardRoutes');
const adminRoutes = require('./api/adminRoutes');

// Usa as rotas no aplicativo Express
app.use('/api', cardRoutes); // Rotas de cards (ex: /api/cards)
app.use('/api/admin', adminRoutes); // Rotas de administração (ex: /api/admin/generate-bulk)

// As rotas estáticas devem vir POR ÚLTIMO para não interceptar as chamadas da API
app.use(express.static(path.join(__dirname, '..'))); // Serve arquivos da raiz do projeto (index.html, admin.html)
app.use('/public', express.static(path.join(__dirname, '../public'))); // Serve a pasta public/

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Para acessar o frontend principal, abra http://localhost:${PORT}/index.html no seu navegador.`);
    console.log(`Para acessar a coleção, abra http://localhost:${PORT}/collection.html no seu navegador.`);
    console.log(`Para acessar a página de administração, abra http://localhost:${PORT}/admin.html no seu navegador.`);
});