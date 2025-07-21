const express = require('express');
const router = express.Router();
const cardProcessor = require('../services/cardProcessor'); // Importa a função de processamento de cards
const auth = require('../utils/auth'); // Importa o middleware de autenticação
const csvParser = require('../utils/csvParser'); // Importa o parser de CSV

// Rota para gerar dados de texto em massa via IA (Gemini)
// Protegida pelo middleware de autenticação (auth.authenticateAdmin)
router.post('/generate-bulk', auth.authenticateAdmin, async (req, res) => {
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
            // Adicionar atraso antes de cada requisição ao Gemini (para evitar rate limit)
            await new Promise(resolve => setTimeout(resolve, cardProcessor.GEMINI_REQUEST_DELAY_MS));

            // Verificar se o card já existe antes de chamar a API Gemini
            const existingCard = await cardProcessor.checkCardExists(name); // Usando a nova função

            if (existingCard) {
                results.push({ name: name, success: true, message: `Card para '${name}' já existe no DB. Pulando geração Gemini.` });
                console.log(`INFO: Card para '${name}' já existe. Pulando geração.`);
                continue; // Pula para a próxima linguagem no loop
            }

            const processResult = await cardProcessor.processCardUpdate(name, false); 

            if (processResult.success) {
                const saved = await cardProcessor.saveCardToDb(processResult.card); // Salvar o card processado no DB
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
        successful: successfulCount, // Passando apenas a contagem para evitar enviar grandes arrays de nomes
        failed: failedCount // Passando apenas a contagem para evitar enviar grandes arrays de erros
    });
});


// Rota para upload de CSV e geração em massa (com verificação de existência e atraso)
// Protegida pelo middleware de autenticação (auth.authenticateAdmin)
router.post('/upload-csv', auth.authenticateAdmin, async (req, res) => {
    const csvContent = req.body.csvData; // Espera o conteúdo CSV como uma string no body.csvData

    if (!csvContent || typeof csvContent !== 'string' || csvContent.trim() === '') {
        return res.status(400).json({ error: 'Nenhum conteúdo CSV válido fornecido para upload.' });
    }

    // Usar o parser de CSV do módulo utils
    const languageNames = csvParser.parseLanguageNamesFromCsv(csvContent);

    if (languageNames.length === 0) {
        return res.status(400).json({ message: 'Nenhum nome de linguagem encontrado no CSV após a análise. Verifique se a coluna "ProgrammingLanguage" existe e se há dados.' });
    }

    console.log(`INFO: Recebida solicitação de upload de CSV para ${languageNames.length} linguagens.`);

    const results = [];
    for (const name of languageNames) {
        try {
            // Adicionar atraso antes de cada requisição ao Gemini (para evitar rate limit)
            await new Promise(resolve => setTimeout(resolve, cardProcessor.GEMINI_REQUEST_DELAY_MS));

            // Verificar se o card já existe antes de chamar a API Gemini
            const existingCard = await cardProcessor.checkCardExists(name); // Usando a nova função

            if (existingCard) {
                results.push({ name: name, success: true, message: `Card para '${name}' já existe no DB. Pulando geração Gemini.` });
                console.log(`INFO: Card para '${name}' já existe. Pulando geração.`);
                continue; // Pula para a próxima linguagem no loop
            }

            // Se não existe, procede com a geração Gemini
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

module.exports = router;