// backend/services/cardProcessor.js
const geminiService = require('./geminiService'); 
const replicateService = require('./replicateService'); 
const dbService = require('./dbService'); 
const fs = require('fs'); 
const path = require('path'); 

// Caminhos para diretórios de imagens e ícones (ajustados para este módulo)
const IMAGES_DIR = path.join(__dirname, '../../public', 'images'); 
const ICONS_DIR = path.join(__dirname, '../../public', 'icons');   

// Atraso entre as requisições Gemini para evitar limites de cota
const GEMINI_REQUEST_DELAY_MS = 2000; 

/**
 * Normaliza um nome de linguagem para um formato de nome de arquivo seguro.
 * Remove caracteres não alfanuméricos e converte para minúsculas.
 * @param {string} name - O nome da linguagem original.
 * @returns {string} O nome de arquivo normalizado.
 */
function normalizeForFileName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Procura por um arquivo de imagem existente em diferentes formatos (WebP, PNG, JPEG).
 * @param {string} baseFileName - O nome base do arquivo (sem extensão).
 * @returns {string|null} O caminho relativo para a imagem se encontrada, ou null.
 */
function findExistingImageFile(baseFileName) {
    const formats = ['webp', 'png', 'jpeg', 'jpg']; // Ordem de preferência de busca
    for (const format of formats) {
        const filePath = path.join(IMAGES_DIR, `${baseFileName}.${format}`);
        if (fs.existsSync(filePath)) {
            console.log(`INFO: Imagem local existente encontrada: /public/images/${baseFileName}.${format}`);
            return `/public/images/${baseFileName}.${format}`;
        }
    }
    return null;
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
    const fileNameBase = normalizeForFileName(normalizedLanguageName); // Nome base seguro para arquivo
    
    let imageUrlToSave = `/public/images/placeholder.png`; 
    let imageFormat = 'png'; // Formato padrão caso a imagem seja placeholder ou erro.

    // 1. Gerar dados de texto do card via Gemini (sempre com o prompt mais recente)
    const cardData = await geminiService.getCardDataFromGemini(normalizedLanguageName);

    if (!cardData || cardData.isValidLanguage === false) {
        return { success: false, error: `"${normalizedLanguageName}" não é uma tecnologia de desenvolvimento, linguagem, framework, ferramenta, plataforma, ambiente ou conceito relevante na área de TI reconhecível.`, isValidLanguage: false };
    }

    // 2. Tentar usar imagem existente ou gerar
    let generatedImageResult = null; // Agora pode ser { base64Data, format } ou null

    if (forceImageRegeneration) { // Se forçar regeneração, ignora arquivo existente
        console.log(`INFO: Regeneração forçada para '${normalizedLanguageName}'. Iniciando geração via Replicate...`);
        generatedImageResult = await replicateService.generateImageFromReplicate(cardData.imagePrompt);
    } else {
        // Tenta encontrar um arquivo existente em qualquer formato
        const existingImageUrl = findExistingImageFile(fileNameBase);
        if (existingImageUrl) {
            imageUrlToSave = existingImageUrl; // Usa a URL do arquivo encontrado
            console.log(`INFO: Imagem para '${normalizedLanguageName}' já existe. Usando: ${imageUrlToSave}`);
        } else {
            console.log(`INFO: Imagem para '${normalizedLanguageName}' não encontrada localmente. Iniciando geração via Replicate...`);
            generatedImageResult = await replicateService.generateImageFromReplicate(cardData.imagePrompt);
        }
    }

    if (generatedImageResult) { // Se uma imagem foi gerada (ou regerada)
        const { base64Data, format } = generatedImageResult;
        imageFormat = format; // Atualiza o formato com o que foi gerado
        const imageFileName = `${fileNameBase}.${format}`; // Nome do arquivo com a extensão correta
        const imageFilePath = path.join(IMAGES_DIR, imageFileName);

        try {
            fs.writeFileSync(imageFilePath, base64Data, 'base64');
            imageUrlToSave = `/public/images/${imageFileName}`; 
            console.log(`SUCESSO: Imagem salva localmente: ${imageUrlToSave}`);
        } catch (fileError) {
            console.error("ERRO: Erro ao salvar imagem localmente:", fileError);
            imageUrlToSave = `/public/images/placeholder.png`; // Fallback para placeholder em caso de falha de salvamento
        }
    } else if (imageUrlToSave === `/public/images/placeholder.png`) { // Se não gerou e não encontrou existente, ou falhou
        console.warn(`AVISO: Não foi possível gerar ou encontrar imagem para '${normalizedLanguageName}'. Usando placeholder.`);
    }

    // 4. Verificar se um ícone local existe, caso contrário, usar um fallback.
    const iconFileName = `${fileNameBase}.svg`; // Usa o nome de arquivo normalizado para ícone
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