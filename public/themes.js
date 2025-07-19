// public/themes.js

/**
 * Retorna as variáveis CSS personalizadas para o tema de uma linguagem.
 * Você pode expandir isso para mais linguagens.
 * @param {string} languageName - O nome da linguagem.
 * @returns {Object} Um objeto com as propriedades CSS personalizadas.
 */
export const getLanguageTheme = (languageName) => {
    // Normaliza o nome da linguagem para garantir que o tema seja aplicado corretamente
    const normalizedName = languageName.toLowerCase();

    const themes = {
        "java": {
            "--card-gradient-start": "#D32F2F", // Vermelho escuro (mais próximo do logo Java)
            "--card-gradient-end": "#F44336",   // Vermelho médio
            "--card-border-dark": "#B71C1C",    // Vermelho muito escuro
            "--card-text-color": "#B71C1C",     // Vermelho muito escuro
            "--card-bg-light": "#FFEBEE",       // Vermelho muito claro
            "--card-border-light": "#EF9A9A",   // Vermelho claro
            "--card-value-color": "#C62828",    // Vermelho vibrante
            "--card-border-main": "#D32F2F"     // Vermelho principal
        },
        "kotlin": {
            "--card-gradient-start": "#7F52FF", // Roxo Kotlin
            "--card-gradient-end": "#B380FF",   // Roxo mais claro
            "--card-border-dark": "#6330CC",    // Roxo escuro
            "--card-text-color": "#663399",     // Roxo escuro
            "--card-bg-light": "#E6D9F2",       // Roxo muito claro
            "--card-border-light": "#B399CC",   // Roxo mais claro
            "--card-value-color": "#4D0080",    // Roxo profundo
            "--card-border-main": "#7F52FF"     // Roxo principal
        },
        "python": {
            "--card-gradient-start": "#3776AB", // Azul Python
            "--card-gradient-end": "#4B8BBE",   // Azul mais claro
            "--card-border-dark": "#1F486C",    // Azul escuro
            "--card-text-color": "#1F486C",     // Azul escuro
            "--card-bg-light": "#E0F2F7",       // Azul muito claro
            "--card-border-light": "#4B8BBE",   // Azul mais claro
            "--card-value-color": "#FFD43B",    // Amarelo Python (contraste)
            "--card-border-main": "#3776AB"     // Azul principal
        },
        "javascript": {
            "--card-gradient-start": "#F7DF1E", // Amarelo JS
            "--card-gradient-end": "#FFEA60",   // Amarelo mais claro
            "--card-border-dark": "#C8A000",    // Amarelo escuro
            "--card-text-color": "#C8A000",     // Amarelo escuro
            "--card-bg-light": "#FFFBEB",       // Amarelo muito claro
            "--card-border-light": "#FFEA60",   // Amarelo mais claro
            "--card-value-color": "#A07000",    // Marrom/Amarelo escuro
            "--card-border-main": "#F7DF1E"     // Amarelo principal
        },
        "php": {
            "--card-gradient-start": "#777BB4", // Roxo PHP
            "--card-gradient-end": "#999CDA",   // Roxo mais claro
            "--card-border-dark": "#5B5E8D",    // Roxo escuro
            "--card-text-color": "#5B5E8D",     // Roxo escuro
            "--card-bg-light": "#F0F0F7",       // Roxo muito claro
            "--card-border-light": "#999CDA",   // Roxo mais claro
            "--card-value-color": "#404060",    // Roxo profundo
            "--card-border-main": "#777BB4"     // Roxo principal
        },
        "node.js": { // Tema para Node.js
            "--card-gradient-start": "#68A063", // Verde Node.js
            "--card-gradient-end": "#8CC84B",   // Verde mais claro
            "--card-border-dark": "#3C873A",    // Verde escuro
            "--card-text-color": "#3C873A",     // Verde escuro
            "--card-bg-light": "#E8F5E9",       // Verde muito claro
            "--card-border-light": "#8CC84B",   // Verde mais claro
            "--card-value-color": "#216021",    // Verde profundo
            "--card-border-main": "#68A063"     // Verde principal
        },
        "html": { // Tema para HTML (mais próximo do logo)
            "--card-gradient-start": "#E44D26", // Laranja HTML
            "--card-gradient-end": "#F16529",   // Laranja mais claro
            "--card-border-dark": "#B03E20",    // Laranja escuro
            "--card-text-color": "#B03E20",     // Laranja escuro
            "--card-bg-light": "#FBE9E7",       // Laranja muito claro
            "--card-border-light": "#F16529",   // Laranja mais claro
            "--card-value-color": "#8D3019",    // Vermelho/Marrom
            "--card-border-main": "#E44D26"     // Laranja principal
        },
        "css": { // Tema para CSS (mais próximo do logo)
            "--card-gradient-start": "#264DE4", // Azul CSS
            "--card-gradient-end": "#3366FF",   // Azul mais claro
            "--card-border-dark": "#1A3B9F",    // Azul escuro
            "--card-text-color": "#1A3B9F",     // Azul escuro
            "--card-bg-light": "#E0E8F9",       // Azul muito claro
            "--card-border-light": "#3366FF",   // Azul mais claro
            "--card-value-color": "#0F2A7B",    // Azul profundo
            "--card-border-main": "#264DE4"     // Azul principal
        },
        "c#": { // Tema para C#
            "--card-gradient-start": "#9B59B6", // Roxo C#
            "--card-gradient-end": "#AF7AC5",   // Roxo mais claro
            "--card-border-dark": "#8E44AD",    // Roxo escuro
            "--card-text-color": "#8E44AD",     // Roxo escuro
            "--card-bg-light": "#F5EEF8",       // Roxo muito claro
            "--card-border-light": "#AF7AC5",   // Roxo mais claro
            "--card-value-color": "#7D3C98",    // Roxo profundo
            "--card-border-main": "#9B59B6"     // Roxo principal
        },
        "c++": { // Tema para C++
            "--card-gradient-start": "#00599C", // Azul C++
            "--card-gradient-end": "#3498DB",   // Azul mais claro
            "--card-border-dark": "#003F6F",    // Azul escuro
            "--card-text-color": "#003F6F",     // Azul escuro
            "--card-bg-light": "#EBF5FB",       // Azul muito claro
            "--card-border-light": "#3498DB",   // Azul mais claro
            "--card-value-color": "#002D4E",    // Azul profundo
            "--card-border-main": "#00599C"     // Azul principal
        },
        "ruby": { // Tema para Ruby
            "--card-gradient-start": "#CC342D", // Vermelho Ruby
            "--card-gradient-end": "#E04F4A",   // Vermelho mais claro
            "--card-border-dark": "#A02A24",    // Vermelho escuro
            "--card-text-color": "#A02A24",     // Vermelho escuro
            "--card-bg-light": "#FBEAE9",       // Vermelho muito claro
            "--card-border-light": "#E04F4A",   // Vermelho mais claro
            "--card-value-color": "#80201C",    // Vermelho profundo
            "--card-border-main": "#CC342D"     // Vermelho principal
        },
        "go": { // Tema para Go (Golang)
            "--card-gradient-start": "#00ADD8", // Azul Go
            "--card-gradient-end": "#4ACFEA",   // Azul mais claro
            "--card-border-dark": "#008BB4",    // Azul escuro
            "--card-text-color": "#008BB4",     // Azul escuro
            "--card-bg-light": "#E0F7FA",       // Azul muito claro
            "--card-border-light": "#4ACFEA",   // Azul mais claro
            "--card-value-color": "#006B8E",    // Azul profundo
            "--card-border-main": "#00ADD8"     // Azul principal
        },
        "swift": { // Tema para Swift
            "--card-gradient-start": "#FA7343", // Laranja Swift
            "--card-gradient-end": "#FF9800",   // Laranja mais claro
            "--card-border-dark": "#D35400",    // Laranja escuro
            "--card-text-color": "#D35400",     // Laranja escuro
            "--card-bg-light": "#FFF3E0",       // Laranja muito claro
            "--card-border-light": "#FF9800",   // Laranja mais claro
            "--card-value-color": "#A03C00",    // Laranja profundo
            "--card-border-main": "#FA7343"     // Laranja principal
        },
         "typescript": { // Tema para TypeScript
            "--card-gradient-start": "#007ACC", // Azul TypeScript
            "--card-gradient-end": "#34B3EB",   // Azul mais claro
            "--card-border-dark": "#005B99",    // Azul escuro
            "--card-text-color": "#005B99",     // Azul escuro
            "--card-bg-light": "#E0F2F7",       // Azul muito claro
            "--card-border-light": "#34B3EB",   // Azul mais claro
            "--card-value-color": "#003A66",    // Azul profundo
            "--card-border-main": "#007ACC"     // Azul principal
        },
        "react": { // Tema para React
            "--card-gradient-start": "#61DAFB", // Azul React
            "--card-gradient-end": "#90E0FF",   // Azul mais claro
            "--card-border-dark": "#283238",    // Cinza escuro (fundo do logo)
            "--card-text-color": "#283238",     // Cinza escuro
            "--card-bg-light": "#E0F7FA",       // Azul muito claro
            "--card-border-light": "#90E0FF",   // Azul mais claro
            "--card-value-color": "#20232A",    // Preto (texto principal)
            "--card-border-main": "#61DAFB"     // Azul principal
        },
        "angular": { // Tema para Angular
            "--card-gradient-start": "#DD0031", // Vermelho Angular
            "--card-gradient-end": "#FF4081",   // Vermelho mais claro
            "--card-border-dark": "#B71C1C",    // Vermelho escuro
            "--card-text-color": "#B71C1C",     // Vermelho escuro
            "--card-bg-light": "#FFEBEE",       // Vermelho muito claro
            "--card-border-light": "#FF4081",   // Vermelho mais claro
            "--card-value-color": "#880E4F",    // Vermelho profundo
            "--card-border-main": "#DD0031"     // Vermelho principal
        },
        "vue.js": { // Tema para Vue.js
            "--card-gradient-start": "#42B883", // Verde Vue
            "--card-gradient-end": "#6BE2B2",   // Verde mais claro
            "--card-border-dark": "#358A66",    // Verde escuro
            "--card-text-color": "#358A66",     // Verde escuro
            "--card-bg-light": "#E8F5E9",       // Verde muito claro
            "--card-border-light": "#6BE2B2",   // Verde mais claro
            "--card-value-color": "#2C3E50",    // Cinza escuro (texto principal)
            "--card-border-main": "#42B883"     // Verde principal
        }
    };
    // Retorna o tema da linguagem ou um tema padrão (Java) se não encontrado
    return themes[normalizedName] || themes["java"]; 
};
