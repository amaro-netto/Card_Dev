// backend/main.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Define global.fetch para que o fetch nativo do Node.js seja acessível em outros módulos CommonJS
global.fetch = require('node-fetch'); // Usamos o node-fetch aqui no main.js e o tornamos global


// Carrega as variáveis de ambiente do .env
require('dotenv').config(); 

// --- Configurações Iniciais e Banco de Dados ---
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your_super_secret_admin_key'; 

// Lê as chaves de API do process.env (depois que dotenv carregou)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Verifica se as chaves da API estão configuradas (aqui é uma verificação inicial para subir o servidor)
if (!GEMINI_API_KEY) {
    console.warn('AVISO: A variável de ambiente GEMINI_API_KEY não está configurada. Funções Gemini podem falhar.');
}
if (!REPLICATE_API_TOKEN) {
    console.warn('AVISO: A variável de ambiente REPLICATE_API_TOKEN não está configurada. Funções de imagem podem falhar.');
}


const DB_PATH = path.join(__dirname, '../data', 'cards.db'); 

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

// Exporta a instância do banco de dados e as chaves para outros módulos
module.exports = { db, ADMIN_SECRET, GEMINI_API_KEY, REPLICATE_API_TOKEN }; 

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

// Importa as rotas
const cardRoutes = require('./api/cardRoutes');
const adminRoutes = require('./api/adminRoutes');

// Usa as rotas no aplicativo Express
app.use('/api', cardRoutes); 
app.use('/api/admin', adminRoutes); 

// As rotas estáticas devem vir POR ÚLTIMO para não interceptar as chamadas da API
app.use(express.static(path.join(__dirname, '..'))); 
app.use('/public', express.static(path.join(__dirname, '../public'))); 

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Para acessar o frontend principal, abra http://localhost:${PORT}/index.html no seu navegador.`);
    console.log(`Para acessar a coleção, abra http://localhost:${PORT}/collection.html no seu navegador.`);
    console.log(`Para acessar a página de administração, abra http://localhost:${PORT}/admin.html no seu navegador.`);
});