// Variáveis globais para o URL base do backend
        const API_BASE_URL = 'http://localhost:3000';

        // Importa a função getLanguageTheme do arquivo separado
        // Referências aos elementos HTML
        const myCollectionGrid = document.getElementById('myCollectionGrid');
        const messageArea = document.getElementById('messageArea');
        const backButton = document.getElementById('backButton');
        const updateAllCardsButton = document.getElementById('updateAllCardsButton');
        const filterButtons = document.querySelectorAll('.filter-button');
        let allCardsData = []; // Variável para armazenar todos os cards carregados

        /**
         * Mapeia o "type" do card (retornado pela IA) para uma categoria de filtro.
         * Esta é a lógica de categorização principal.
         * @param {string} cardType - O tipo de card retornado pela IA (ex: "Backend", "Frontend", "Framework JS").
         * @param {string} cardName - O nome do card para verificações específicas (ex: "Jupyter Notebook").
         * @returns {string} A categoria de filtro correspondente (linguagem, framework, etc.).
         */
        const getFilterCategory = (cardType, cardName) => {
            const lowerCaseType = cardType.toLowerCase();
            const lowerCaseName = cardName ? cardName.toLowerCase() : '';

            // Início das verificações específicas para Jupyter Notebook
            if (lowerCaseName.includes("jupyter notebook") || lowerCaseType.includes("notebook") || lowerCaseType.includes("interactive computing") || lowerCaseType.includes("data science platform")) {
                return "api_plataforma"; // Jupyter Notebook categorizado como API & Plataforma
            }
            // Fim das verificações específicas para Jupyter Notebook


            // Linguagens de Programação
            if (lowerCaseType.includes("linguagem") || lowerCaseType.includes("language") || lowerCaseType.includes("programação") || lowerCaseType.includes("scripting") || lowerCaseType === "backend" || lowerCaseType === "frontend" || lowerCaseType.includes("general-purpose")) {
                return "linguagem";
            }
            // Frameworks
            if (lowerCaseType.includes("framework") || lowerCaseType.includes("estrutura")) {
                return "framework";
            }
            // Bibliotecas
            if (lowerCaseType.includes("biblioteca") || lowerCaseType.includes("library") || lowerCaseType.includes("ui library") || lowerCaseType.includes("data visualization")) {
                return "biblioteca";
            }
            // Bancos de Dados
            if (lowerCaseType.includes("banco de dados") || lowerCaseType.includes("database") || lowerCaseType.includes("nosql") || lowerCaseType.includes("sql") || lowerCaseType.includes("data store")) {
                return "banco_dados";
            }
            // APIs & Plataformas (inclui runtimes, plataformas em nuvem, etc.)
            if (lowerCaseType.includes("api") || lowerCaseType.includes("platform") || lowerCaseType.includes("plataforma") || lowerCaseType.includes("runtime") || lowerCaseType.includes("service") || lowerCaseType.includes("cloud")) {
                return "api_plataforma";
            }
            // Marcação/Estilo
            if (lowerCaseType.includes("marcação") || lowerCaseType.includes("markup") || lowerCaseType.includes("estilo") || lowerCaseType.includes("stylesheet") || lowerCaseType.includes("frontend markup") || lowerCaseType.includes("web standard") || lowerCaseType.includes("document structure") || lowerCaseType.includes("layout")) {
                return "marcacao_estilo";
            }
            // Containerization
            if (lowerCaseType.includes("container") || lowerCaseType.includes("docker") || lowerCaseType.includes("kubernetes") || lowerCaseType.includes("orchestration")) {
                return "containerization";
            }
            // Mobile
            if (lowerCaseType.includes("mobile") || lowerCaseType.includes("android") || lowerCaseType.includes("ios") || lowerCaseType.includes("cross-platform") || lowerCaseType.includes("react native") || lowerCaseType.includes("flutter") || lowerCaseType.includes("xamarin")) {
                return "mobile";
            }

            return "other";
        };


        /**
         * Atualiza a área de mensagens na UI.
         * @param {string} message - A mensagem a ser exibida.
         * @param {string} type - Tipo de mensagem ('info', 'error', 'success').
         */
        const updateMessage = (message, type = 'info') => {
            messageArea.textContent = message;
            messageArea.className = 'message-area';
            if (type === 'error') {
                messageArea.classList.add('text-red-600');
            } else if (type === 'success') {
                messageArea.classList.add('text-green-600');
            } else {
                messageArea.classList.add('text-gray-700');
            }
        };

        /**
         * Adapta o tamanho da fonte de um elemento para que seu texto caiba no contêiner.
         * @param {HTMLElement} element - O elemento HTML cujo texto será ajustado.
         * @param {number} maxFontSizePx - O tamanho máximo da fonte em pixels.
         * @param {number} minFontSizePx - O tamanho mínimo da fonte em pixels.
         * @param {number} [maxLines=1] - O número máximo de linhas permitidas (para texto multilinha).
         */
        const fitTextToContainer = (element, maxFontSizePx, minFontSizePx, maxLines = 1) => {
            let currentFontSize = maxFontSizePx;
            element.style.fontSize = `${currentFontSize}px`;

            element.style.overflow = 'visible';
            element.style.whiteSpace = 'normal';

            while (currentFontSize > minFontSizePx) {
                let overflows = false;

                if (maxLines === 1) {
                    if (element.scrollWidth > element.clientWidth) {
                        overflows = true;
                    }
                } else {
                    if (element.scrollHeight > element.clientHeight) {
                        overflows = true;
                    }
                }

                if (overflows) {
                    currentFontSize -= 0.5;
                    element.style.fontSize = `${currentFontSize}px`;
                } else {
                    break;
                }
            }

            if (maxLines === 1) {
                element.style.overflow = 'hidden';
                element.style.whiteSpace = 'nowrap';
                element.style.textOverflow = 'ellipsis';
            } else {
                element.style.overflow = 'hidden';
                element.style.whiteSpace = 'normal';
            }
        };

        /**
         * Cria e retorna um elemento HTML de cartão de linguagem.
         * Inclui o botão de atualização individual.
         * @param {Object} cardData - Os dados do cartão.
         * @returns {HTMLElement} O elemento div do cartão.
         */
        const createCardElement = (cardData) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container';
            cardDiv.dataset.languageName = cardData.name; 

            const theme = getLanguageTheme(cardData.name);
            for (const [prop, value] of Object.entries(theme)) {
                cardDiv.style.setProperty(prop, value);
            }

            let iconHtmlContent = '';
            if (cardData.iconUrl) {
                iconHtmlContent = `<img class="card-logo-svg" src="${API_BASE_URL}${cardData.iconUrl}" alt="${cardData.name} Icon">`;
            } else {
                const defaultSvgPath = '<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm-4 10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>';
                iconHtmlContent = `<svg class="card-logo-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>${cardData.name}</title>${defaultSvgPath}</svg>`;
            }

            cardDiv.innerHTML = `
                <div class="card-header">
                    <div class="card-name-wrapper">
                        ${iconHtmlContent}
                        <div class="card-name" data-max-font="1.4" data-min-font="0.8">${cardData.name}</div>
                    </div>
                    <div class="card-type" data-max-font="0.8" data-min-font="0.6">${cardData.type}</div>
                </div>
                <div class="card-image-wrapper">
                    <img class="card-image" src="${cardData.imageUrl || API_BASE_URL + '/public/images/placeholder.png'}"
                    alt="Ilustração do ${cardData.name} como um Personagem Anime">
                </div>
                <div class="card-description" data-max-font="0.85" data-min-font="0.6" data-max-lines="4">
                    ${cardData.description}
                </div>
                <div class="card-stats">
                    <div class="stat-item">
                        <span class="stat-label">PWR/</span>
                        <span class="stat-value">${cardData.pwr !== undefined ? cardData.pwr : '--'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">| VEL/</span>
                        <span class="stat-value">${cardData.vel !== undefined ? cardData.vel : '--'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">| FLX/</span>
                        <span class="stat-value">${cardData.flx !== undefined ? cardData.flx : '--'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">| COM/</span>
                        <span class="stat-value">${cardData.com !== undefined ? cardData.com : '--'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">| CRV/</span>
                        <span class="stat-value">${cardData.crv !== undefined ? cardData.crv : '--'}</span>
                    </div>
                </div>
                <div class="card-footer">
                    <span>Ilustração: Amaro AI</span>
                    <button class="update-card-button" title="Atualizar este card" data-language-name="${cardData.name}">
                        <svg class="update-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="white" stroke-width="1.5"/>
                            <path d="M12 6V12L16 14" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;

            const updateButton = cardDiv.querySelector('.update-card-button');
            if (updateButton) {
                updateButton.addEventListener('click', async () => {
                    const nameToUpdate = updateButton.dataset.languageName;
                    if (confirm(`Tem certeza que deseja atualizar o card de "${nameToUpdate}"? Isso regerará seus dados e imagem via IA.`)) {
                        await updateSpecificCard(nameToUpdate);
                    }
                });
            }

            return cardDiv;
        };

        const renderCards = (cardsArray, containerElement) => {
            containerElement.innerHTML = '';
            if (cardsArray.length === 0) {
                containerElement.innerHTML = '<p class="text-gray-500">Nenhum card nesta categoria. Que tal buscar por "Java" ou "Python" na página principal?</p>';
                return;
            }
            cardsArray.forEach(cardData => {
                const cardElement = createCardElement(cardData);
                containerElement.appendChild(cardElement);

                const nameEl = cardElement.querySelector('.card-name');
                const typeEl = cardElement.querySelector('.card-type');
                const descriptionEl = cardElement.querySelector('.card-description');

                const remToPx = parseFloat(window.getComputedStyle(document.documentElement).fontSize);

                const nameMaxFont = parseFloat(nameEl.dataset.maxFont) * remToPx;
                const nameMinFont = parseFloat(nameEl.dataset.minFont) * remToPx;
                fitTextToContainer(nameEl, nameMaxFont, nameMinFont, 1);

                const typeMaxFont = parseFloat(typeEl.dataset.maxFont) * remToPx;
                const typeMinFont = parseFloat(typeEl.dataset.minFont) * remToPx;
                fitTextToContainer(typeEl, typeMaxFont, typeMinFont, 1);

                const descMaxFont = parseFloat(descriptionEl.dataset.maxFont) * remToPx;
                const descMinFont = parseFloat(descriptionEl.dataset.minFont) * remToPx;
                const descMaxLines = parseInt(descriptionEl.dataset.maxLines, 10);
                fitTextToContainer(descriptionEl, descMaxFont, descMinFont, descMaxLines);
            });
        };

        const loadCollectionAndApplyFilter = async () => {
            updateMessage("Carregando sua coleção de cards...", "info");
            updateAllCardsButton.disabled = true;
            filterButtons.forEach(btn => btn.disabled = true);
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/cards`);
                if (!response.ok) {
                    throw new Error(`Erro ao carregar cards: ${response.status} ${response.statusText}`);
                }
                const cards = await response.json();
                allCardsData = cards;

                const activeFilterButton = document.querySelector('.filter-button.active');
                const currentFilter = activeFilterButton ? activeFilterButton.dataset.filter : 'all';
                filterCards(currentFilter);
                
                updateMessage(`Sua coleção tem ${cards.length} cards.`, "success");
            } catch (error) {
                console.error("Erro ao carregar a coleção inicial:", error);
                updateMessage("Erro ao carregar sua coleção de cards. Verifique o console do servidor e do navegador. O servidor Node.js pode não estar rodando.", "error");
                myCollectionGrid.innerHTML = '<p class="text-red-500">Erro ao carregar cards. O servidor Node.js pode não estar rodando.</p>';
            } finally {
                updateAllCardsButton.disabled = false;
                filterButtons.forEach(btn => btn.disabled = false);
            }
        };

        const filterCards = (filterCategory) => {
            let filtered = [];
            if (filterCategory === "all") {
                filtered = allCardsData;
            } else {
                // Passa card.name para getFilterCategory
                filtered = allCardsData.filter(card => getFilterCategory(card.type, card.name) === filterCategory);
            }
            renderCards(filtered, myCollectionGrid);
        };

        const updateSpecificCard = async (languageName) => {
            updateMessage(`Atualizando card para "${languageName}"... Isso pode levar um momento.`, "info");
            updateAllCardsButton.disabled = true;
            filterButtons.forEach(btn => btn.disabled = true);
            const cardElement = document.querySelector(`.card-container[data-language-name="${languageName}"]`);
            if (cardElement) {
                const button = cardElement.querySelector('.update-card-button');
                if (button) button.disabled = true;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/cards/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ languageName: languageName })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Erro ao atualizar card: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                updateMessage(result.message, "success");
                await loadCollectionAndApplyFilter();

            } catch (error) {
                console.error(`Erro ao atualizar card "${languageName}":`, error);
                updateMessage(`Erro ao atualizar card "${languageName}": ${error.message}`, "error");
            } finally {
                updateAllCardsButton.disabled = false;
                filterButtons.forEach(btn => btn.disabled = false);
                const cardElement = document.querySelector(`.card-container[data-language-name="${languageName}"]`);
                if (cardElement) {
                    const button = cardElement.querySelector('.update-card-button');
                    if (button) button.disabled = false;
                }
            }
        };

        const updateAllCards = async () => {
            if (!confirm("Tem certeza que deseja atualizar TODOS os cards da sua coleção? Isso pode levar vários minutos e consumir cota da sua API Gemini.")) {
                return;
            }

            updateMessage("Atualizando TODOS os cards... Isso pode demorar bastante!", "info");
            updateAllCardsButton.disabled = true;
            filterButtons.forEach(btn => btn.disabled = true);

            try {
                const response = await fetch(`${API_BASE_URL}/api/cards/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Erro ao atualizar todos os cards: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                updateMessage(result.message, "success");

                if (result.failed && result.failed.length > 0) {
                    console.warn("Cards que falharam na atualização:", result.failed);
                    updateMessage(`Atualização em massa concluída. Alguns cards falharam. Verifique o console para detalhes.`, "warning");
                }
                
                await loadCollectionAndApplyFilter();

            } catch (error) {
                console.error("Erro ao atualizar todos os cards:", error);
                updateMessage(`Erro ao atualizar todos os cards: ${error.message}`, "error");
            } finally {
                updateAllCardsButton.disabled = false;
                filterButtons.forEach(btn => btn.disabled = false);
            }
        };

        // Event Listeners
        backButton.addEventListener('click', () => {
            window.location.href = '/index.html';
        });

        updateAllCardsButton.addEventListener('click', updateAllCards);

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const filterType = button.dataset.filter;
                filterCards(filterType);
            });
        });

        window.onload = loadCollectionAndApplyFilter;