// backend/api/adminRoutes.js
const express = require('express');
const router = express.Router();
const cardProcessor = require('../services/cardProcessor'); 
const auth = require('../utils/auth'); 
const csvParser = require('../utils/csvParser'); 
const dbService = require('../services/dbService'); 


// Rota para gerar dados de texto em massa via IA (Gemini)
// Protegida pelo middleware de autenticação (auth.authenticateAdmin)
router.post('/generate-bulk', auth.authenticateAdmin, async (req, res) => {
    const languageNamesString = req.body.languageNames; 

    if (!languageNamesString || typeof languageNamesString !== 'string' || languageNamesString.trim() === '') {
        return res.status(400).json({ error: 'Nomes de linguagens para geração em massa são obrigatórios e devem ser uma string separada por vírgula.' });
    }

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
            await new Promise(resolve => setTimeout(resolve, cardProcessor.GEMINI_REQUEST_DELAY_MS));

            const existingCard = await cardProcessor.checkCardExists(name); 

            if (existingCard) {
                results.push({ name: name, success: true, message: `Card para '${name}' já existe no DB. Pulando geração Gemini.` });
                console.log(`INFO: Card para '${name}' já existe. Pulando geração.`);
                continue; 
            }

            const processResult = await cardProcessor.processCardUpdate(name, false); 

            if (processResult.success) {
                const saved = await cardProcessor.saveCardToDb(processResult.card); 
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
        successful: successfulCount, 
        failed: failedCount 
    });
});


// Rota para upload de CSV e geração em massa (com verificação de existência e atraso)
// Protegida pelo middleware de autenticação (auth.authenticateAdmin)
router.post('/upload-csv', auth.authenticateAdmin, async (req, res) => {
    const csvContent = req.body.csvData; 

    if (!csvContent || typeof csvContent !== 'string' || csvContent.trim() === '') {
        return res.status(400).json({ error: 'Nenhum conteúdo CSV válido fornecido para upload.' });
    }

    const languageNames = csvParser.parseLanguageNamesFromCsv(csvContent);

    if (languageNames.length === 0) {
        return res.status(400).json({ message: 'Nenhum nome de linguagem encontrado no CSV após a análise. Verifique se a coluna "ProgrammingLanguage" existe e se há dados.' });
    }

    console.log(`INFO: Recebida solicitação de upload de CSV para ${languageNames.length} linguagens.`);

    const results = [];
    for (const name of languageNames) {
        try {
            await new Promise(resolve => setTimeout(resolve, cardProcessor.GEMINI_REQUEST_DELAY_MS));

            const existingCard = await cardProcessor.checkCardExists(name); 

            if (existingCard) {
                results.push({ name: name, success: true, message: `Card para '${name}' já existe no DB. Pulando geração Gemini.` });
                console.log(`INFO: Card para '${name}' já existe. Pulando geração.`);
                continue; 
            }

            const processResult = await cardProcessor.processCardUpdate(name, false); 

            if (processResult.success) {
                const saved = await cardProcessor.saveCardToDb(processResult.card);
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
        successful: successfulCount,
        failed: failedCount
    });
});

// NOVA ROTA: Buscar um card específico pelo nome
// Protegida pelo middleware de autenticação (auth.authenticateAdmin)
router.get('/cards/:name', auth.authenticateAdmin, async (req, res) => {
    const languageName = req.params.name;
    try {
        const card = await dbService.getCardByName(languageName); // Usando dbService para buscar o card
        if (card) {
            res.json(card);
        } else {
            res.status(404).json({ message: `Card '${languageName}' não encontrado.` });
        }
    } catch (error) {
        console.error(`ERRO: Erro ao buscar card '${languageName}':`, error);
        res.status(500).json({ error: `Erro interno ao buscar card '${languageName}'.` });
    }
});


module.exports = router;