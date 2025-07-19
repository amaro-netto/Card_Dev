// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // Módulo para manipulação de arquivos
require('dotenv').config(); // Para carregar variáveis de ambiente do .env

// Importa node-fetch apenas se a versão do Node.js for anterior à 18
// Para Node.js 18+ você pode usar o fetch nativo, remova esta linha
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


const app = express();
const PORT = process.env.PORT || 3000; // Porta do servidor, ou 3000 por padrão

// ATENÇÃO: Duas chaves de API agora (Gemini e Replicate)!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Para modelos de texto (Gemini)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN; // Para modelos de imagem (Replicate)

// Verifica se as chaves da API estão configuradas
if (!GEMINI_API_KEY) {
    console.error('ERRO: A variável de ambiente GEMINI_API_KEY não está configurada no arquivo .env');
    console.error('Por favor, certifique-se de que GEMINI_API_KEY=SUA_CHAVE_TEXTO_AQUI está no seu arquivo .env');
    process.exit(1);
}

if (!REPLICATE_API_TOKEN) {
    console.error('ERRO: A variável de ambiente REPLICATE_API_TOKEN não está configurada no arquivo .env');
    console.error('Por favor, certifique-se de que REPLICATE_API_TOKEN=SEU_TOKEN_DO_REPLICATE_AQUI está no seu arquivo .env');
    process.exit(1);
}

// Caminho para o banco de dados SQLite
const DB_PATH = path.join(__dirname, 'data', 'cards.db');
// Caminho para o diretório de armazenamento de imagens
const IMAGES_DIR = path.join(__dirname, 'public', 'images');
// Caminho para o diretório de ícones
const ICONS_DIR = path.join(__dirname, 'public', 'icons');

// NOVO: Caminho para o arquivo CSV de linguagens
const LANGUAGES_CSV_FILE_PATH = path.join(__dirname, 'data', 'Languages.csv'); // Caminho para o CSV


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
                console.log('Tabela "cards" verificada/creada.');
            }
        });
    }
});

// Middlewares
app.use(cors()); // Permite requisições de diferentes origens (necessário para frontend local)
app.use(bodyParser.json({ limit: '10mb' })); // Suporta JSON bodies, com limite maior para Base64

// MIDDLEWARE PARA LOGAR TODAS AS REQUISIÇÕES
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next(); // Passa o controle para o próximo middleware/rota
});

// --- FUNÇÕES DE LÓGICA DO BACKEND ---

/**
 * Chama a API Gemini para gerar dados de texto para um card.
 * @param {string} languageName - Nome da linguagem.
 * @returns {Promise<Object|null>} Dados do card ou null em caso de erro.
 */
async function getCardDataFromGemini(languageName) {
    const chatHistory = [];
    const prompt = `Gere dados para um cartão de jogo de linguagem de programação, no estilo de um jogo de cartas de fantasia, para a linguagem ${languageName}.
Inclua o nome, um tipo (escolha entre: "Linguagem", "Framework", "Biblioteca", "Banco de Dados", "API & Plataforma", "Marcação/Estilo", "Containerization", "Mobile" ou "Outros" - selecione o que melhor se encaixa no contexto. Ferramentas, ambientes de desenvolvimento e plataformas devem ser categorizadas como "API & Plataforma".), uma descrição concisa em português (máximo 30 palavras), estatísticas de poder (PWR), velocidade (VEL), flexibilidade (FLX), comunidade (COM) e curva de aprendizado (CRV).
As estatísticas devem ser valores **entre 0 e 100** e devem refletir as características reais da linguagem:
- PWR (Poder): Capacidade da linguagem para lidar com tarefas complexas e de alta demanda.
- VEL (Velocidade): Desempenho em tempo de execução e eficiência.
- FLX (Flexibilidade): Adaptabilidade para diferentes paradigmas e domínios.
- COM (Comunidade): Tamanho e atividade da comunidade de desenvolvedores e recursos disponíveis.
- CRV (Curva de Aprendizado): Facilidade ou dificuldade para iniciantes aprenderem e dominarem a linguagem.
Além disso, forneça um prompt detalhado para gerar uma ilustração de personagem de anime no estilo Pokémon de 1ª geração para ${languageName}, com foco em suas características principais.
O prompt da imagem deve especificar um aspecto retangular ligeiramente vertical (próximo de 1:1 ou 4:5) e cores que combinem com a linguagem (ex: laranjas e vermelhos para Java, roxos e laranjas para Kotlin).
Defina 'isValidLanguage' como true se '${languageName}' for uma tecnologia de desenvolvimento, linguagem, framework, ferramenta, plataforma, ambiente ou conceito relevante na área de TI.
Caso contrário, defina 'isValidLanguage' como false e os outros campos podem ser vazios ou padrão.`;

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
            console.error(`ERRO API DE TEXTO GEMINI: ${response.status} ${response.statusText}`, errorBody);
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
 * Chama a API do Replicate para gerar uma imagem em Base64 usando Stable Diffusion.
 * @param {string} prompt - Prompt para a geração da imagem.
 * @returns {Promise<string|null>} Imagem Base64 (data URL) ou null em caso de erro.
 */
async function generateImageFromReplicate(prompt) { 
    // ESTE É O ID DE VERSÃO QUE VOCÊ INDICOU PARA 'stability-ai/stable-diffusion'.
    // SE PRECISAR DE SDXL, VOCÊ DEVE MUDAR O NOME DO MODELO TAMBÉM E O ID.
    const model = "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4"; 

    // A API do Replicate é uma API de inferência de modelos.
    const apiUrl = `https://api.replicate.com/v1/predictions`;

    const payload = {
        version: model.split(':')[1], // O ID da versão do modelo
        input: {
            prompt: prompt,
            // Adicione parâmetros de imagem que podem ser úteis para o Stable Diffusion
            width: 512, // Tamanho da imagem, ajuste conforme necessário e limite do modelo
            height: 640, // Proporção 4:5 (para 512x640)
            num_outputs: 1, // Número de imagens a gerar
            scheduler: "K_EULER", // Adicionado para consistência com o exemplo do curl
        }
    };

    console.log("DEBUG: Chamando API do Replicate com prompt:", prompt);
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${REPLICATE_API_TOKEN}`, 
                'Prefer': 'wait' 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`ERRO API DE IMAGEM REPLICATE (1): ${response.status} ${response.statusText}`, errorBody);
            return null;
        }

        const initialResult = await response.json();
        console.log("DEBUG: Resposta inicial do Replicate:", JSON.stringify(initialResult, null, 2));

        // Replicate API retorna uma URL para checar o status da predição
        // Precisamos "poll" essa URL até que a imagem esteja pronta ou haja um erro.
        if (initialResult.urls && initialResult.urls.get) {
            let imageUrl = null;
            let status = initialResult.status;
            let attempt = 0;
            const maxAttempts = 30; // Aumentado o limite de tentativas para 30s (com delay de 1s)
            const delay = 1000; // 1 segundo de atraso entre as tentativas

            while (status === 'starting' || status === 'processing' || status === 'queued' && attempt < maxAttempts) {
                await new Promise(res => setTimeout(res, delay));
                const statusResponse = await fetch(initialResult.urls.get, {
                    headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` } 
                });

                if (!statusResponse.ok) {
                    const statusErrorBody = await statusResponse.text();
                    console.error(`ERRO API DE IMAGEM REPLICATE (Status Check): ${statusResponse.status} ${statusResponse.statusText}`, statusErrorBody);
                    return null;
                }

                const statusResult = await statusResponse.json();
                status = statusResult.status;
                console.log(`DEBUG: Replicate status: ${status} (Tentativa ${attempt + 1}/${maxAttempts})`);

                if (status === 'succeeded' && statusResult.output && statusResult.output.length > 0) {
                    imageUrl = statusResult.output[0]; // A URL da imagem gerada
                    break;
                } else if (status === 'failed' || status === 'canceled') {
                    console.error(`ERRO: Geração de imagem no Replicate falhou ou foi cancelada. Detalhes:`, statusResult.error);
                    return null;
                }
                attempt++;
            }

            if (imageUrl) {
                console.log("DEBUG: Imagem gerada no Replicate. URL:", imageUrl);
                // O Replicate retorna uma URL de imagem direta, não um Base64.
                // Precisamos buscar essa imagem e convertê-la para Base64.
                const imageResponse = await fetch(imageUrl);
                const imageBuffer = await imageResponse.buffer(); // Obter a imagem como Buffer
                const base64Data = imageBuffer.toString('base64');
                return `data:image/png;base64,${base64Data}`;

            } else {
                console.error("ERRO: Não foi possível obter a URL da imagem do Replicate após várias tentativas ou status inesperado.");
                return null;
            }

        } else {
            console.error("ERRO: Resposta inicial do Replicate não contém 'urls.get'.", initialResult);
            return null;
        }
    } catch (error) {
        console.error("ERRO AO CHAMAR API REPLICATE (network/other):", error);
        return null;
    }
}


/**
 * Função auxiliar para inserir/atualizar um único card no banco de dados.
 * @param {Object} cardData - Os dados do card a ser salvo.
 * @returns {Promise<boolean>} True se o card foi salvo com sucesso, false caso contrário.
 */
async function saveCardToDb(cardData) {
    return new Promise((resolve) => {
        const stmt = db.prepare(`REPLACE INTO cards (name, type, description, pwr, vel, flx, com, crv, imagePrompt, imageUrl, iconUrl, isValidLanguage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(
            cardData.name,
            cardData.type,
            cardData.description,
            cardData.pwr,
            cardData.vel,
            cardData.flx,
            cardData.com,
            cardData.crv,
            cardData.imagePrompt,
            cardData.imageUrl,
            cardData.iconUrl,
            cardData.isValidLanguage ? 1 : 0,
            function(insertErr) {
                if (insertErr) {
                    console.error(`ERRO DB: Erro ao inserir/atualizar card '${cardData.name}' no DB:`, insertErr.message);
                    resolve(false);
                } else {
                    console.log(`SUCESSO DB: Card '${cardData.name}' salvo/atualizado no DB.`);
                    resolve(true);
                }
            }
        );
        stmt.finalize();
    });
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
        return { success: false, error: `"${normalizedLanguageName}" não é uma tecnologia de desenvolvimento, linguagem, framework, ferramenta, plataforma, ambiente ou conceito relevante na área de TI reconhecível.`, isValidLanguage: false };
    }

    cardData.name = normalizedLanguageName; // Garante que o nome final no cardData seja o normalizado
    let imageUrlToSave = `/public/images/placeholder.png`; // Fallback para imagem
    const imageFileName = `${normalizedLanguageName.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`; // Nome de arquivo seguro
    const imageFilePath = path.join(IMAGES_DIR, imageFileName);

    // 2. Gerar imagem via Replicate (Base64) ou usar existente se não for forçado
    let generatedBase64ImageUrl = null;
    if (forceImageRegeneration || !fs.existsSync(imageFilePath)) {
        console.log(`INFO: Iniciando geração/regeneration de imagem para '${normalizedLanguageName}' via Replicate...`);
        generatedBase64ImageUrl = await generateImageFromReplicate(cardData.imagePrompt); 
    } else {
        console.log(`INFO: Imagem para '${normalizedLanguageName}' já existe e regeração não forçada. Usando a imagem existente.`);
        imageUrlToSave = `/public/images/${imageFileName}`; // Usa a URL existente
    }


    if (generatedBase64ImageUrl) {
        // 3. Salvar imagem localmente no diretório public/images
        const base64Data = generatedBase64ImageUrl.replace(/^data:image\/\w+;base64,/, "");

        try {
            fs.writeFileSync(imageFilePath, base64Data, 'base64');
            imageUrlToSave = `/public/images/${imageFileName}`; // URL acessível pelo frontend
            console.log(`SUCESSO: Imagem salva localmente: ${imageUrlToSave}`);
        } catch (fileError) {
            console.error("ERRO: Erro ao salvar imagem localmente:", fileError);
            // Mantém o fallback se o salvamento falhar
        }
    } else if (forceImageRegeneration && !fs.existsSync(imageFilePath)) { // Se a regeração foi forçada mas falhou
        console.warn(`AVISO: Não foi possível regerar imagem para '${normalizedLanguageName}'. Usando placeholder.`);
    }


    // 4. Verificar se um ícone local existe, caso contrário, usar um fallback.
    const iconFileName = `${normalizedLanguageName.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
    const iconFilePath = path.join(ICONS_DIR, iconFileName);
    let iconUrlToSave = ''; // String vazia se não tiver ícone específico

    if (fs.existsSync(iconFilePath)) {
        iconUrlToSave = `/public/icons/${iconFileName}`;
        console.log(`INFO: Ícone local encontrado: ${iconUrlToSave}`);
    } else {
        console.log(`INFO: Ícone local para '${normalizedLanguageName}' não encontrado. O frontend usará um SVG default.`);
    }

    // Retornar o card processado para que possa ser salvo posteriormente
    return {
        success: true,
        card: {
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
            iconUrl: iconUrlToSave,
            isValidLanguage: cardData.isValidLanguage
        },
        message: `Card para '${normalizedLanguageName}' processado com sucesso!`
    };
}


// --- ROTAS DA API ---
// É CRUCIAL QUE AS ROTAS DA API VENHAM ANTES DOS ARQUIVOS ESTÁTICOS!

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
            console.log(`INFO: Card para '${normalizedLanguageName}' já existe no DB local. Nenhuma ação necessária para esta rota.`);
            return res.status(200).json({ message: "Card já existe no banco de dados local.", card: row });
        }

        // Se não encontrado, processa e insere
        console.log(`INFO: Gerando dados e imagem para novo card '${normalizedLanguageName}' via Gemini...`);
        const result = await processCardUpdate(normalizedLanguageName, true); // Força regeneração da imagem para novos cards

        if (result.success) {
            // Salvar o card no DB após o processamento bem-sucedido
            const saved = await saveCardToDb(result.card);
            if (saved) {
                res.status(201).json({ message: result.message, card: result.card });
            } else {
                res.status(500).json({ error: "Erro ao salvar o card no banco de dados após o processamento." });
            }
        } else {
            res.status(400).json({ error: result.error, isValidLanguage: result.isValidLanguage });
        }
    });
});


// Rota para atualizar cards existentes (um específico ou todos)
app.post('/api/cards/update', async (req, res) => {
    const { languageName } = req.body; // Pode ser undefined para atualizar todos

    if (languageName) {
        // Atualizar um card específico
        console.log(`INFO: Solicitação para atualizar card: ${languageName}`);
        try {
            const result = await processCardUpdate(languageName, true); // Força regeneração de imagem

            if (result.success) {
                // Salvar o card no DB após o processamento bem-sucedido
                const saved = await saveCardToDb(result.card);
                if (saved) {
                    res.status(200).json({ message: result.message, card: result.card });
                } else {
                    res.status(500).json({ error: "Erro ao salvar o card no banco de dados após a atualização." });
                }
            } else {
                res.status(400).json({ error: result.error, isValidLanguage: result.isValidLanguage });
            }
        } catch (error) {
            console.error(`ERRO: Erro ao atualizar card ${languageName}:`, error);
            res.status(500).json({ error: `Erro interno ao atualizar card ${languageName}.` });
        }
    } else {
        // Atualizar todos os cards
        console.log('INFO: Solicitação para atualizar TODOS os cards.');
        db.all("SELECT name FROM cards", [], async (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const updatePromises = rows.map(async (row) => { 
                const result = await processCardUpdate(row.name, true); // Força regerar imagem para todos
                if (result.success) {
                    await saveCardToDb(result.card); // Salvar cada card após processamento
                }
                return result; 
            });

            try {
                const results = await Promise.allSettled(updatePromises);

                const successfulUpdates = results.filter(r => r.status === 'fulfilled' && r.value.success).map(r => r.value.card.name);
                const failedUpdates = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

                console.log(`INFO: Atualização em massa concluída. Sucessos: ${successfulUpdates.length}, Falhas: ${failedUpdates.length}.`);

                res.status(200).json({
                    message: `Processamento de atualização em massa concluído. ${successfulUpdates.length} cards adicionados/atualizados.`,
                    successful: successfulUpdates,
                    failed: failedUpdates.map(r => r.status === 'rejected' ? r.reason.message || r.reason : r.value.error)
                });
            } catch (error) {
                console.error("ERRO: Erro no processamento em massa de cards:", error);
                res.status(500).json({ error: "Erro interno ao atualizar todos os cards." });
            }
        });
    }
});


// Rota para gerar dados de texto em massa via IA (Gemini)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your_super_secret_admin_key'; 
const GEMINI_REQUEST_DELAY_MS = 2000; // Atraso de 2 segundos entre as requisições Gemini

app.post('/api/admin/generate-bulk', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
        return res.status(401).json({ error: 'Acesso não autorizado. Chave de administração inválida.' });
    }

    const languageNamesString = req.body.languageNames; // Nomes separados por vírgula

    if (!languageNamesString || typeof languageNamesString !== 'string' || languageNamesString.trim() === '') {
        return res.status(400).json({ error: 'Nomes de linguagens para geração em massa são obrigatórios e devem ser uma string separada por vírgula.' });
    }

    // Dividir a string por vírgula, remover espaços extras e filtrar vazios
    const namesArray = languageNamesString.split(',')
                                         .map(name => name.trim())
                                         .filter(name => name.length > 0);

    if (namesArray.length === 0) {
        return res.status(400).json({ error: 'Nenhum nome de linguagem válido fornecido após a separação por vírgula.' });
    }

    console.log(`INFO: Recebida solicitação de geração em massa para ${namesArray.length} linguagens via Gemini: ${namesArray.join(', ')}`);

    const results = [];
    for (const name of namesArray) {
        try {
            // Adicionar atraso antes de cada requisição ao Gemini
            await new Promise(resolve => setTimeout(resolve, GEMINI_REQUEST_DELAY_MS));

            const processResult = await processCardUpdate(name, false); 

            if (processResult.success) {
                const saved = await saveCardToDb(processResult.card); // Salvar o card processado no DB
                if (saved) {
                    results.push({ name: name, success: true, message: processResult.message });
                } else {
                    results.push({ name: name, success: false, error: "Erro ao salvar card no DB após geração Gemini." });
                }
            } else {
                results.push({ name: name, success: false, error: processResult.error || "Erro desconhecido na geração Gemini." });
            }
        } catch (error) {
            console.error(`ERRO: Falha crítica ao processar a geração em massa para '${name}':`, error);
            results.push({ name: name, success: false, error: `Exceção durante o processamento: ${error.message}` });
        }
    }

    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`INFO: Geração em massa via Gemini concluída. Sucessos: ${successfulCount}, Falhas: ${failedCount}.`);
    res.status(200).json({
        message: `Processamento de geração em massa concluído. ${successfulCount} cards adicionados/atualizados.`,
        successful: results.filter(r => r.success).map(r => r.name),
        failed: results.filter(r => !r.success)
    });
});


// Rota para upload de CSV e geração em massa (com verificação de existência e atraso)
app.post('/api/admin/upload-csv', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
        return res.status(401).json({ error: 'Acesso não autorizado. Chave de administração inválida.' });
    }

    const csvContent = req.body.csvData; // Espera o conteúdo CSV como uma string no body.csvData

    if (!csvContent || typeof csvContent !== 'string' || csvContent.trim() === '') {
        return res.status(400).json({ error: 'Nenhum conteúdo CSV válido fornecido para upload.' });
    }

    // Dividir o conteúdo CSV em linhas
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length <= 1) { // Apenas cabeçalho ou vazio
        return res.status(400).json({ message: 'Conteúdo CSV inválido: precisa de pelo menos um cabeçalho e uma linha de dados.' });
    }

    const header = lines[0].split(',').map(h => h.trim());
    const languageNameColumnIndex = header.indexOf('ProgrammingLanguage'); // Encontra o índice da coluna

    if (languageNameColumnIndex === -1) {
        return res.status(400).json({ error: 'Coluna "ProgrammingLanguage" não encontrada no cabeçalho do CSV.' });
    }

    const languageNames = [];
    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim());
        if (columns.length > languageNameColumnIndex) {
            const langName = columns[languageNameColumnIndex];
            if (langName) {
                languageNames.push(langName);
            }
        }
    }

    if (languageNames.length === 0) {
        return res.status(200).json({ message: 'Nenhum nome de linguagem encontrado no CSV após a análise.' });
    }

    console.log(`INFO: Recebida solicitação de upload de CSV para ${languageNames.length} linguagens.`);

    const results = [];
    for (const name of languageNames) {
        try {
            // Adicionar atraso antes de cada requisição ao Gemini (para evitar rate limit)
            await new Promise(resolve => setTimeout(resolve, GEMINI_REQUEST_DELAY_MS));

            // Verificar se o card já existe antes de chamar a API Gemini
            const existingCard = await new Promise((resolve, reject) => {
                db.get("SELECT name FROM cards WHERE name = ?", [name], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });

            if (existingCard) {
                results.push({ name: name, success: true, message: `Card para '${name}' já existe no DB. Pulando geração Gemini.` });
                console.log(`INFO: Card para '${name}' já existe. Pulando geração.`);
                continue; // Pula para a próxima linguagem no loop
            }

            // Se não existe, procede com a geração Gemini
            const processResult = await processCardUpdate(name, false); 

            if (processResult.success) {
                const saved = await saveCardToDb(processResult.card);
                if (saved) {
                    results.push({ name: name, success: true, message: processResult.message });
                } else {
                    results.push({ name: name, success: false, error: "Erro ao salvar card no DB após geração Gemini." });
                }
            } else {
                results.push({ name: name, success: false, error: processResult.error || "Erro desconhecido na geração Gemini." });
            }
        } catch (error) {
            console.error(`ERRO: Falha crítica ao processar a geração para '${name}' a partir do CSV:`, error);
            results.push({ name: name, success: false, error: `Exceção durante o processamento: ${error.message}` });
        }
    }

    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`INFO: Geração de cards a partir do CSV concluída. Sucessos: ${successfulCount}, Falhas: ${failedCount}.`);
    res.status(200).json({
        message: `Geração de cards a partir do CSV concluída. ${successfulCount} cards adicionados/atualizados.`,
        successful: results.filter(r => r.success).map(r => r.name),
        failed: results.filter(r => !r.success)
    });
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


// As rotas estáticas devem vir POR ÚLTIMO para não interceptar as chamadas da API
app.use(express.static(__dirname)); 
app.use('/public', express.static(path.join(__dirname, 'public'))); 


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Para acessar o frontend principal, abra http://localhost:${PORT}/index.html no seu navegador.`);
    console.log(`Para acessar a coleção, abra http://localhost:${PORT}/collection.html no seu navegador.`);
    console.log(`Para acessar a página de administração de upload, abra http://localhost:${PORT}/admin.html no seu navegador.`);
});