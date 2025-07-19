// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // Módulo para manipulação de arquivos
require('dotenv').config(); // Para carregar variáveis de ambiente do .env

const app = express();
const PORT = process.env.PORT || 3000; // Porta do servidor, ou 3000 por padrão
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Sua chave da API Gemini

// Verifica se a chave da API está configurada
if (!GEMINI_API_KEY) {
    console.error('ERRO: A variável de ambiente GEMINI_API_KEY não está configurada no arquivo .env');
    console.error('Por favor, crie um arquivo .env na raiz do projeto com GEMINI_API_KEY=SUA_CHAVE_AQUI');
    process.exit(1); // Encerra o processo se a chave não estiver presente
}

// Caminho para o banco de dados SQLite
const DB_PATH = path.join(__dirname, 'data', 'cards.db');
// Caminho para o diretório de armazenamento de imagens
const IMAGES_DIR = path.join(__dirname, 'public', 'images');
// Caminho para o diretório de ícones
const ICONS_DIR = path.join(__dirname, 'public', 'icons');


// Garante que os diretórios 'data', 'public/images' e 'public/icons' existam
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}
if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Inicializa o banco de dados SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        // Cria a tabela 'cards' se ela não existir
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
            imageUrl TEXT, -- Agora armazenará a URL local da imagem
            iconUrl TEXT,  -- Adicionado para a URL local do ícone
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

// Middlewares
app.use(cors()); // Permite requisições de diferentes origens (necessário para frontend local)
app.use(bodyParser.json({ limit: '10mb' })); // Suporta JSON bodies, com limite maior para Base64

// Serve o index.html diretamente da raiz do projeto
app.use(express.static(__dirname)); 
// Serve a pasta public/ para assets como imagens e ícones
app.use('/public', express.static(path.join(__dirname, 'public'))); 

// --- Funções para interagir com a API Gemini (no backend) ---

/**
 * Chama a API Gemini para gerar dados de texto para um card.
 * @param {string} languageName - Nome da linguagem.
 * @returns {Promise<Object|null>} Dados do card ou null em caso de erro.
 */
async function getCardDataFromGemini(languageName) {
    const chatHistory = [];
    // PROMPT ATUALIZADO: Instruindo a IA a usar categorias específicas.
    const prompt = `Gere dados para um cartão de jogo de linguagem de programação, no estilo de um jogo de cartas de fantasia, para a linguagem ${languageName}.
Inclua o nome, um tipo (escolha entre: "Linguagem", "Framework", "Biblioteca", "Banco de Dados", "API & Plataforma", "Marcação/Estilo", "Containerization", "Mobile" ou "Outros" - selecione o que melhor se encaixa no contexto), uma descrição concisa em português (máximo 30 palavras), estatísticas de poder (PWR), velocidade (VEL), flexibilidade (FLX), comunidade (COM) e curva de aprendizado (CRV).
As estatísticas devem ser valores **entre 0 e 100** e devem refletir as características reais da linguagem:
- PWR (Poder): Capacidade da linguagem para lidar com tarefas complexas e de alta demanda.
- VEL (Velocidade): Desempenho em tempo de execução e eficiência.
- FLX (Flexibilidade): Adaptabilidade para diferentes paradigmas e domínios.
- COM (Comunidade): Tamanho e atividade da comunidade de desenvolvedores e recursos disponíveis.
- CRV (Curva de Aprendizado): Facilidade ou dificuldade para iniciantes aprenderem e dominarem a linguagem.
Além disso, forneça um prompt detalhado para gerar uma ilustração de personagem de anime no estilo Pokémon de 1ª geração para ${languageName}, com foco em suas características principais.
O prompt da imagem deve especificar um aspecto retangular ligeiramente vertical (próximo de 1:1 ou 4:5) e cores que combinem com a linguagem (ex: laranjas e vermelhos para Java, roxos e laranjas para Kotlin).
**Se '${languageName}' não for uma linguagem de programação, de marcação ou tecnologia web principal e reconhecível, defina 'isValidLanguage' como false e os outros campos podem ser vazios ou padrão.**`;
    
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "name": { "type": "STRING" },
                    "type": { "type": "STRING" },
                    "description": { "type": "STRING" },
                    "stats": {
                        "type": "OBJECT",
                        "properties": {
                            "pwr": { "type": "NUMBER" },
                            "vel": { "type": "NUMBER" },
                            "flx": { "type": "NUMBER" },
                            "com": { "type": "NUMBER" },
                            "crv": { "type": "NUMBER" }
                        },
                        "required": ["pwr", "vel", "flx", "com", "crv"]
                    },
                    "imagePrompt": { "type": "STRING" },
                    "isValidLanguage": { "type": "BOOLEAN" } 
                },
                "required": ["name", "type", "description", "stats", "imagePrompt", "isValidLanguage"]
            }
        }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Erro na requisição da API de Texto Gemini: ${response.status} ${response.statusText}`, errorBody);
            return null;
        }

        const rawTextResult = await response.text();
        if (typeof rawTextResult === 'string' && rawTextResult.trim().length > 0) {
            try {
                const parsedResult = JSON.parse(rawTextResult);
                if (parsedResult.candidates && parsedResult.candidates.length > 0 &&
                    parsedResult.candidates[0].content && parsedResult.candidates[0].content.parts &&
                    parsedResult.candidates[0].content.parts.length > 0) {

                    const jsonString = parsedResult.candidates[0].content.parts[0].text;
                    if (typeof jsonString === 'string' && jsonString.trim().length > 0) {
                        try {
                            const parsedJson = JSON.parse(jsonString);
                            if (typeof parsedJson.isValidLanguage === 'boolean') {
                                return parsedJson;
                            } else {
                                console.error("JSON da API de Texto não contém a propriedade 'isValidLanguage' esperada.", parsedJson);
                                return null;
                            }
                        } catch (parseError) {
                            console.error("Erro ao fazer parse do JSON interno da API de Texto (parts[0].text):", parseError);
                            return null;
                        }
                    } else {
                        console.error("Conteúdo de texto da API de Texto (parts[0].text) está vazio ou não é uma string válida.", jsonString);
                        return null;
                    }
                } else {
                    console.error("Estrutura de resposta inesperada ou conteúdo ausente da API de Texto (candidates/content/parts).", parsedResult);
                    return null;
                }
            } catch (parseErrorOuter) {
                console.error("Erro ao fazer parse do JSON da resposta principal da API de Texto:", parseErrorOuter);
                return null;
            }
        } else {
            console.error("Resposta bruta da API de Texto está vazia ou não é uma string válida.", rawTextResult);
            return null;
        }
    } catch (error) {
        console.error("Erro ao chamar a API Gemini para dados do card:", error);
        return null;
    }
}

/**
 * Chama a API Gemini para gerar uma imagem em Base64.
 * @param {string} prompt - Prompt para a geração da imagem.
 * @returns {Promise<string|null>} Imagem Base64 (data URL) ou null em caso de erro.
 */
async function generateImageFromGemini(prompt) {
    const payload = { instances: { prompt: prompt }, parameters: { "sampleCount": 1} };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Erro na requisição da API de Imagem Gemini: ${response.status} ${response.statusText}`, errorBody);
            return null;
        }

        const result = await response.json();

        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
        } else {
            console.error("Estrutura de resposta inesperada ou conteúdo de imagem ausente da API de Imagem.", result);
            return null;
        }
    } catch (error) {
        console.error("Erro ao chamar a API Gemini para gerar imagem:", error);
        return null;
    }
}

/**
 * Processa a atualização de um card específico (ou tenta gerá-lo se não existir).
 * Esta função contém a lógica compartilhada para gerar/atualizar cards.
 * @param {string} languageName - O nome da linguagem a ser processada.
 * @param {boolean} forceImageRegeneration - Força a regeneração da imagem mesmo que já exista.
 * @returns {Promise<Object>} Objeto com sucesso/erro e o card.
 */
async function processCardUpdate(languageName, forceImageRegeneration = false) {
    const normalizedLanguageName = languageName.charAt(0).toUpperCase() + languageName.slice(1).toLowerCase();

    // 1. Gerar dados de texto do card via Gemini (sempre com o prompt mais recente)
    const cardData = await getCardDataFromGemini(normalizedLanguageName);

    if (!cardData || cardData.isValidLanguage === false) {
        return { success: false, error: `"${normalizedLanguageName}" não é uma linguagem de programação, de marcação ou tecnologia web principal reconhecível.`, isValidLanguage: false };
    }
    
    cardData.name = normalizedLanguageName; // Garante que o nome final no cardData seja o normalizado
    let imageUrlToSave = `/public/images/placeholder.png`; // Fallback para imagem
    const imageFileName = `${normalizedLanguageName.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`; // Nome de arquivo seguro
    const imageFilePath = path.join(IMAGES_DIR, imageFileName);

    // 2. Gerar imagem via Gemini (Base64) ou usar existente se não for forçado
    let generatedBase64ImageUrl = null;
    if (forceImageRegeneration || !fs.existsSync(imageFilePath)) {
        console.log(`Gerando imagem para '${normalizedLanguageName}' via Gemini...`);
        generatedBase64ImageUrl = await generateImageFromGemini(cardData.imagePrompt);
    } else {
        console.log(`Imagem para '${normalizedLanguageName}' já existe. Não regerando.`);
        imageUrlToSave = `/public/images/${imageFileName}`; // Usa a URL existente
    }


    if (generatedBase64ImageUrl) {
        // 3. Salvar imagem localmente no diretório public/images
        const base64Data = generatedBase64ImageUrl.replace(/^data:image\/\w+;base64,/, "");
        
        try {
            fs.writeFileSync(imageFilePath, base64Data, 'base64');
            imageUrlToSave = `/public/images/${imageFileName}`; // URL acessível pelo frontend
            console.log(`Imagem salva localmente: ${imageUrlToSave}`);
        } catch (fileError) {
            console.error("Erro ao salvar imagem localmente:", fileError);
            // Mantém o fallback se o salvamento falhar
        }
    } else if (forceImageRegeneration && !fs.existsSync(imageFilePath)) { // Se a regeração foi forçada mas falhou
        console.warn(`Não foi possível regerar imagem para '${normalizedLanguageName}'. Usando placeholder.`);
    }


    // 4. Verificar se um ícone local existe, caso contrário, usar um fallback.
    const iconFileName = `${normalizedLanguageName.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
    const iconFilePath = path.join(ICONS_DIR, iconFileName);
    let iconUrlToSave = ''; // String vazia se não tiver ícone específico

    if (fs.existsSync(iconFilePath)) {
        iconUrlToSave = `/public/icons/${iconFileName}`;
        console.log(`Ícone local encontrado: ${iconUrlToSave}`);
    } else {
        console.log(`Ícone local para '${normalizedLanguageName}' não encontrado. O frontend usará um SVG default.`);
    }

    // 5. Salvar/Atualizar o card no banco de dados SQLite
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`REPLACE INTO cards (name, type, description, pwr, vel, flx, com, crv, imagePrompt, imageUrl, iconUrl, isValidLanguage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(
            normalizedLanguageName,
            cardData.type,
            cardData.description,
            cardData.stats.pwr,
            cardData.stats.vel,
            cardData.stats.flx,
            cardData.stats.com,
            cardData.stats.crv,
            cardData.imagePrompt,
            imageUrlToSave, // URL da imagem salva no Storage local
            iconUrlToSave, // URL do ícone local
            cardData.isValidLanguage ? 1 : 0, // SQLite não tem booleano nativo, usa 0 ou 1
            function(insertErr) {
                if (insertErr) {
                    console.error('Erro ao inserir/atualizar card no DB:', insertErr.message);
                    return reject({ success: false, error: insertErr.message });
                }
                const processedCard = {
                    name: normalizedLanguageName,
                    type: cardData.type,
                    description: cardData.description,
                    pwr: cardData.stats.pwr,
                    vel: cardData.stats.vel,
                    flx: cardData.stats.flx,
                    com: cardData.stats.com,
                    crv: cardData.stats.crv,
                    imagePrompt: cardData.imagePrompt,
                    imageUrl: imageUrlToSave,
                    iconUrl: iconUrlToSave, // Inclui a URL do ícone no retorno
                    isValidLanguage: cardData.isValidLanguage
                };
                resolve({ success: true, card: processedCard, message: `Card para '${normalizedLanguageName}' processado com sucesso!` });
            }
        );
        stmt.finalize();
    });
}


// --- Rotas da API ---

// Rota para obter todos os cards
app.get('/api/cards', (req, res) => {
    db.all("SELECT * FROM cards", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Rota para gerar e salvar um novo card (ou obter um existente)
app.post('/api/cards', async (req, res) => {
    const languageName = req.body.languageName;

    if (!languageName) {
        return res.status(400).json({ error: "Nome da linguagem é obrigatório." });
    }

    const normalizedLanguageName = languageName.charAt(0).toUpperCase() + languageName.slice(1).toLowerCase();

    // Tentar obter o card do DB local
    db.get("SELECT * FROM cards WHERE name = ?", [normalizedLanguageName], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            // Card encontrado, retorna ele
            console.log(`Card para '${normalizedLanguageName}' já existe no DB local. Nenhuma ação necessária para esta rota.`);
            return res.status(200).json({ message: "Card já existe no banco de dados local.", card: row });
        }

        // Se não encontrado, processa e insere
        console.log(`Gerando dados e imagem para novo card '${normalizedLanguageName}' via Gemini...`);
        const result = await processCardUpdate(normalizedLanguageName, true); // Força regeneração da imagem para novos cards

        if (result.success) {
            res.status(201).json({ message: result.message, card: result.card });
        } else {
            res.status(400).json({ error: result.error, isValidLanguage: result.isValidLanguage });
        }
    });
});


// NOVA ROTA: Rota para atualizar cards existentes (um específico ou todos)
app.post('/api/cards/update', async (req, res) => {
    const { languageName } = req.body; // Pode ser undefined para atualizar todos

    if (languageName) {
        // Atualizar um card específico
        console.log(`Solicitação para atualizar card: ${languageName}`);
        try {
            const result = await processCardUpdate(languageName, true); // Força regeneração de imagem
            if (result.success) {
                res.status(200).json({ message: result.message, card: result.card });
            } else {
                res.status(400).json({ error: result.error, isValidLanguage: result.isValidLanguage });
            }
        } catch (error) {
            console.error(`Erro ao atualizar card ${languageName}:`, error);
            res.status(500).json({ error: `Erro interno ao atualizar card ${languageName}.` });
        }
    } else {
        // Atualizar todos os cards
        console.log('Solicitação para atualizar TODOS os cards.');
        db.all("SELECT name FROM cards", [], async (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const updatePromises = rows.map(row => processCardUpdate(row.name, true)); // Força regerar imagem para todos
            
            try {
                const results = await Promise.allSettled(updatePromises);
                const successfulUpdates = results.filter(r => r.status === 'fulfilled' && r.value.success).map(r => r.value.card.name);
                const failedUpdates = results.filter(r => r.status === 'rejected' || !r.value.success);

                console.log(`Atualização em massa concluída. Sucessos: ${successfulUpdates.length}, Falhas: ${failedUpdates.length}`);

                res.status(200).json({ 
                    message: `Processo de atualização em massa concluído. ${successfulUpdates.length} cards atualizados.`,
                    successful: successfulUpdates,
                    failed: failedUpdates.map(r => r.status === 'rejected' ? r.reason : r.value.error)
                });
            } catch (error) {
                console.error("Erro no processamento em massa de cards:", error);
                res.status(500).json({ error: "Erro interno ao atualizar todos os cards." });
            }
        });
    }
});


// Rota para deletar um card específico (opcional, mas útil para testes)
app.delete('/api/cards/:name', (req, res) => {
    const languageName = req.params.name;
    db.run("DELETE FROM cards WHERE name = ?", [languageName], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: "Card não encontrado." });
        }
        res.status(200).json({ message: `Card '${languageName}' deletado com sucesso.`, deletedCount: this.changes });
    });
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Para acessar o frontend principal, abra http://localhost:${PORT}/index.html no seu navegador.`);
    console.log(`Para acessar a coleção, abra http://localhost:${PORT}/collection.html no seu navegador.`);
});