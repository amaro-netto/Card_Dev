const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { GEMINI_API_KEY } = require('../main'); // Importa a chave do main.js

/**
 * Chama a API Gemini para gerar dados de texto para um card.
 * @param {string} languageName - Nome da linguagem.
 * @returns {Promise<Object|null>} Dados do card ou null em caso de erro.
 */
async function getCardDataFromGemini(languageName) {
    // Verifica se a chave da API está configurada
    if (!GEMINI_API_KEY) {
        console.error('ERRO: A variável de ambiente GEMINI_API_KEY não está configurada.');
        return null;
    }

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

module.exports = { getCardDataFromGemini };