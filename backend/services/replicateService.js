const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const fs = require('fs'); // Ainda precisamos do fs para salvar a imagem localmente
const { REPLICATE_API_TOKEN } = require('../main'); // Importa a chave do main.js

// Caminhos para diretórios de imagens e ícones (ajustados para este módulo)
const IMAGES_DIR = path.join(__dirname, '../../public', 'images'); // Sobe dois níveis para public/images

/**
 * Chama a API do Replicate para gerar uma imagem em Base64 usando Stable Diffusion.
 * @param {string} prompt - Prompt para a geração da imagem.
 * @returns {Promise<string|null>} Imagem Base64 (data URL) ou null em caso de erro.
 */
async function generateImageFromReplicate(prompt) { 
    // Verifica se a chave da API está configurada
    if (!REPLICATE_API_TOKEN) {
        console.error('ERRO: A variável de ambiente REPLICATE_API_TOKEN não está configurada.');
        return null;
    }

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

module.exports = { generateImageFromReplicate, IMAGES_DIR }; // Exporta a função e IMAGES_DIR