const express = require('express');
const router = express.Router();
const { db } = require('../main'); // Importa a instância do banco de dados do main.js
const cardProcessor = require('../services/cardProcessor'); // Importa a função de processamento
const auth = require('../utils/auth'); // Importa o middleware de autenticação

// Rota para obter todos os cards
router.get('/cards', (req, res) => {
    db.all("SELECT * FROM cards", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Rota para gerar e salvar um novo card (ou obter um existente)
router.post('/cards', async (req, res) => {
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
        const result = await cardProcessor.processCardUpdate(normalizedLanguageName, true); // Força regeneração da imagem para novos cards

        if (result.success) {
            // Salvar o card no DB após o processamento bem-sucedido
            const saved = await cardProcessor.saveCardToDb(result.card);
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
// Agora protegida pelo middleware de autenticação (auth.authenticateAdmin)
router.post('/cards/update', auth.authenticateAdmin, async (req, res) => {
    const { languageName } = req.body; // Pode ser undefined para atualizar todos

    if (languageName) {
        // Atualizar um card específico
        console.log(`INFO: Solicitação para atualizar card: ${languageName}`);
        try {
            const result = await cardProcessor.processCardUpdate(languageName, true); // Força regeneração de imagem

            if (result.success) {
                // Salvar o card no DB após o processamento bem-sucedido
                const saved = await cardProcessor.saveCardToDb(result.card);
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
                const result = await cardProcessor.processCardUpdate(row.name, true); // Força regerar imagem para todos
                if (result.success) {
                    await cardProcessor.saveCardToDb(result.card); // Salvar cada card após processamento
                }
                return result; 
            });

            try {
                // Use Promise.allSettled para que todas as promessas sejam executadas,
                // mesmo que algumas falhem, e você possa ver os resultados de todas.
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

// Rota para deletar um card específico
// Protegida pelo middleware de autenticação (auth.authenticateAdmin)
router.delete('/cards/:name', auth.authenticateAdmin, (req, res) => {
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

module.exports = router;