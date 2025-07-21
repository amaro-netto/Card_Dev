/**
 * Analisa o conteúdo CSV e extrai os nomes das linguagens de programação.
 * Espera que a coluna com os nomes das linguagens se chame "ProgrammingLanguage".
 * @param {string} csvContent - O conteúdo bruto do arquivo CSV como uma string.
 * @returns {string[]} Um array de nomes de linguagens de programação.
 */
function parseLanguageNamesFromCsv(csvContent) {
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length <= 1) { // Apenas cabeçalho ou vazio
        console.warn("AVISO: Conteúdo CSV inválido ou muito curto. Precisa de pelo menos um cabeçalho e uma linha de dados.");
        return [];
    }

    const header = lines[0].split(',').map(h => h.trim());
    const languageNameColumnIndex = header.indexOf('ProgrammingLanguage'); // Encontra o índice da coluna

    if (languageNameColumnIndex === -1) {
        console.error('ERRO CSV PARSER: Coluna "ProgrammingLanguage" não encontrada no cabeçalho do CSV. Verifique o cabeçalho.');
        return [];
    }

    const languageNames = [];
    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim());
        if (columns.length > languageNameColumnIndex) {
            const langName = columns[languageNameColumnIndex];
            if (langName) { // Garante que o nome não é vazio
                languageNames.push(langName);
            }
        }
    }

    if (languageNames.length === 0) {
        console.warn("AVISO: Nenhuma linguagem válida encontrada no CSV após a análise. Verifique os dados.");
    }

    return languageNames;
}

module.exports = { parseLanguageNamesFromCsv };