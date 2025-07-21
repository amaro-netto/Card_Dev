const { db } = require('../main'); // Importa a instância do banco de dados do main.js

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
 * Função para verificar se um card com o nome especificado já existe no banco de dados.
 * @param {string} name - O nome do card a ser verificado.
 * @returns {Promise<boolean>} True se o card existe, false caso contrário.
 */
async function checkCardExists(name) {
    return new Promise((resolve, reject) => {
        db.get("SELECT name FROM cards WHERE name = ?", [name], (err, row) => {
            if (err) {
                console.error(`ERRO DB: Erro ao verificar existência do card '${name}':`, err.message);
                reject(err); // Rejeita a promessa em caso de erro no DB
            } else {
                resolve(!!row); // Retorna true se a linha (row) existir, false caso contrário
            }
        });
    });
}

module.exports = { saveCardToDb, checkCardExists };