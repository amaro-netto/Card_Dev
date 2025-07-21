// backend/services/cardProcessor.js
// REMOVIDA: const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const geminiService = require('./geminiService'); 
const replicateService = require('./replicateService'); 
const dbService = require('./dbService'); 
const fs = require('fs'); 
const path = require('path'); 

// Caminhos para diretórios de imagens e ícones (ajustados para este módulo)
const IMAGES_DIR = path.join(__dirname, '../../public', 'images'); 
const ICONS_DIR = path.join(__dirname, '../../public', 'icons');   

// Atraso entre as requisições Gemini para evitar limites de cota
const GEMINI_REQUEST_DELAY_MS = 2000; // Atraso de 2 segundos (2000 ms)

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
    const cardData = await geminiService.getCardDataFromGemini(normalizedLanguageName);

    if (!cardData || cardData.isValidLanguage === false) {
        return { success: false, error: `"${normalizedLanguageName}" não é uma tecnologia de desenvolvimento, linguagem, framework, ferramenta, plataforma, ambiente ou conceito relevante na área de TI reconhecível.`, isValidLanguage: false };
    }

    cardData.name = normalizedLanguageName; 
    let imageUrlToSave = `/public/images/placeholder.png`; 
    const imageFileName = `${normalizedLanguageName.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`; 
    const imageFilePath = path.join(IMAGES_DIR, imageFileName);

    // 2. Gerar imagem via Replicate (Base64) ou usar existente se não for forçado
    let generatedBase64ImageUrl = null;
    if (forceImageRegeneration || !fs.existsSync(imageFilePath)) {
        console.log(`INFO: Iniciando geração/regeneration de imagem para '${normalizedLanguageName}' via Replicate...`);
        generatedBase64ImageUrl = await replicateService.generateImageFromReplicate(cardData.imagePrompt); 
    } else {
        console.log(`INFO: Imagem para '${normalizedLanguageName}' já existe e regeração não forçada. Usando a imagem existente.`);
        imageUrlToSave = `/public/images/${imageFileName}`; 
    }


    if (generatedBase64ImageUrl) {
        // 3. Salvar imagem localmente no diretório public/images
        const base64Data = generatedBase64ImageUrl.replace(/^data:image\/\w+;base64,/, "");

        try {
            fs.writeFileSync(imageFilePath, base64Data, 'base64');
            imageUrlToSave = `/public/images/${imageFileName}`; 
            console.log(`SUCESSO: Imagem salva localmente: ${imageUrlToSave}`);
        } catch (fileError) {
            console.error("ERRO: Erro ao salvar imagem localmente:", fileError);
        }
    } else if (forceImageRegeneration && !fs.existsSync(imageFilePath)) { 
        console.warn(`AVISO: Não foi possível regerar imagem para '${normalizedLanguageName}'. Usando placeholder.`);
    }


    // 4. Verificar se um ícone local existe, caso contrário, usar um fallback.
    const iconFileName = `${normalizedLanguageName.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
    const iconFilePath = path.join(ICONS_DIR, iconFileName);
    let iconUrlToSave = ''; 

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

module.exports = {
    processCardUpdate,
    saveCardToDb: dbService.saveCardToDb, 
    checkCardExists: dbService.checkCardExists, 
    GEMINI_REQUEST_DELAY_MS 
};