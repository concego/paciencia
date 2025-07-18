// script.js

// Funções de sons importadas de sounds.js
// (Assumindo que sounds.js está carregado antes)
const suits = ['hearts', 'diamonds', 'spades', 'clubs'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Estado do jogo
let deck = [];
let stock = [];
let waste = [];
let foundations = { hearts: [], diamonds: [], spades: [], clubs: [] };
let tableau = [[], [], [], [], [], [], []];
let selectedCard = null;
let selectedPile = null;

// Inicializa o jogo
function initGame() {
    createDeck();
    shuffleDeck();
    dealCards();
    renderBoard();
    setupEventListeners();
}

// Cria o baralho
function createDeck() {
    deck = [];
    suits.forEach(suit => {
        values.forEach(value => {
            deck.push({ suit, value, faceUp: false });
        });
    });
}

// Embaralha o baralho
function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Distribui as cartas no tableau
function dealCards() {
    let deckIndex = 0;
    for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
            tableau[j].push({ ...deck[deckIndex], faceUp: j === i });
            deckIndex++;
        }
    }
    stock = deck.slice(deckIndex);
}

// Renderiza o tabuleiro
function renderBoard() {
    // Estoque
    const stockEl = document.getElementById('stock');
    stockEl.innerHTML = stock.length > 0 ? '<div class="card back" aria-label="Estoque: clique para virar uma carta"></div>' : '';

    // Descarte
    const wasteEl = document.getElementById('waste');
    wasteEl.innerHTML = '';
    waste.forEach(card => {
        wasteEl.appendChild(createCardElement(card, 'waste'));
    });

    // Fundações
    Object.keys(foundations).forEach((suit, index) => {
        const foundationEl = document.getElementById(`foundation-${index + 1}`);
        foundationEl.innerHTML = '';
        if (foundations[suit].length > 0) {
            const card = foundations[suit][foundations[suit].length - 1];
            foundationEl.appendChild(createCardElement(card, `foundation-${suit}`));
        }
    });

    // Tableau
    tableau.forEach((pile, index) => {
        const tableauEl = document.getElementById(`tableau-${index + 1}`);
        tableauEl.innerHTML = '';
        pile.forEach(card => {
            tableauEl.appendChild(createCardElement(card, `tableau-${index}`));
        });
    });

    updateGameStatus('');
}

// Cria elemento de carta
function createCardElement(card, pileId) {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card', card.faceUp ? 'face-up' : 'back');
    cardEl.setAttribute('data-suit', card.suit);
    cardEl.setAttribute('data-value', card.value);
    cardEl.setAttribute('data-pile', pileId);
    cardEl.setAttribute('tabindex', card.faceUp ? '0' : '-1');
    cardEl.setAttribute('aria-label', card.faceUp ? `${card.value} de ${translateSuit(card.suit)}` : 'Carta virada para baixo');
    if (card.faceUp) {
        cardEl.textContent = `${card.value} ${card.suit[0].toUpperCase()}`;
    }
    return cardEl;
}

// Traduz naipe para português
function translateSuit(suit) {
    const suitsPt = { hearts: 'Copas', diamonds: 'Ouros', spades: 'Espadas', clubs: 'Paus' };
    return suitsPt[suit];
}

// Configura eventos
function setupEventListeners() {
    // Estoque
    document.getElementById('stock').addEventListener('click', drawCard);
    document.getElementById('stock').addEventListener('keypress', e => {
        if (e.key === 'Enter' || e.key === ' ') drawCard();
    });

    // Botões
    document.getElementById('restart-button').addEventListener('click', restartGame);
    document.getElementById('back-button').addEventListener('click', () => window.location.href = 'index.html');

    // Cartas e pilhas
    document.getElementById('game-area').addEventListener('click', handleCardClick);
    document.getElementById('game-area').addEventListener('keypress', handleCardKeypress);
}

// Vira carta do estoque
function drawCard() {
    if (stock.length === 0 && waste.length > 0) {
        stock = waste.reverse().map(card => ({ ...card, faceUp: false }));
        waste = [];
    } else if (stock.length > 0) {
        const card = stock.pop();
        card.faceUp = true;
        waste.push(card);
        playMoveSound();
    }
    renderBoard();
}

// Manipula clique em carta ou pilha
function handleCardClick(e) {
    const cardEl = e.target.closest('.card.face-up');
    const pileEl = e.target.closest('[id^="tableau-"],[id^="foundation-"],#waste');

    if (cardEl) {
        selectCard(cardEl);
    } else if (pileEl && selectedCard) {
        moveCard(pileEl);
    }
}

// Manipula tecla em carta ou pilha
function handleCardKeypress(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        const cardEl = e.target.closest('.card.face-up');
        const pileEl = e.target.closest('[id^="tableau-"],[id^="foundation-"],#waste');
        if (cardEl) {
            selectCard(cardEl);
        } else if (pileEl && selectedCard) {
            moveCard(pileEl);
        }
    } else if (e.key === 'Escape') {
        deselectCard();
    }
}

// Seleciona carta
function selectCard(cardEl) {
    deselectCard();
    selectedCard = cardEl;
    selectedCard.classList.add('selected');
    const pileId = cardEl.getAttribute('data-pile');
    selectedPile = pileId;
    updateGameStatus(`Carta selecionada: ${cardEl.getAttribute('aria-label')}`);
}

// Deseleciona carta
function deselectCard() {
    if (selectedCard) {
        selectedCard.classList.remove('selected');
        selectedCard = null;
        selectedPile = null;
        updateGameStatus('');
    }
}

// Move carta
function moveCard(pileEl) {
    const pileId = pileEl.id;
    const card = getCardFromElement(selectedCard);
    let targetPile, targetType;

    if (pileId.startsWith('tableau-')) {
        targetType = 'tableau';
        targetPile = tableau[parseInt(pileId.split('-')[1]) - 1];
    } else if (pileId.startsWith('foundation-')) {
        targetType = 'foundation';
        targetPile = foundations[Object.keys(foundations)[parseInt(pileId.split('-')[1]) - 1]];
    }

    if (canMoveCard(card, targetPile, targetType)) {
        removeCardFromSource();
        targetPile.push(card);
        playMoveSound();
        if (targetType === 'foundation' && isGameWon()) {
            playWinSound();
            updateGameStatus('Parabéns! Você venceu!');
        }
    } else {
        playErrorSound();
        updateGameStatus('Movimento inválido');
    }
    deselectCard();
    revealTopCard();
    renderBoard();
}

// Obtém carta do elemento
function getCardFromElement(cardEl) {
    return {
        suit: cardEl.getAttribute('data-suit'),
        value: cardEl.getAttribute('data-value'),
        faceUp: true
    };
}

// Verifica se pode mover carta
function canMoveCard(card, targetPile, targetType) {
    if (targetType === 'foundation') {
        if (targetPile.length === 0) {
            return card.value === 'A';
        }
        const topCard = targetPile[targetPile.length - 1];
        return card.suit === topCard.suit && values.indexOf(card.value) === values.indexOf(topCard.value) + 1;
    } else if (targetType === 'tableau') {
        if (targetPile.length === 0) {
            return card.value === 'K';
        }
        const topCard = targetPile[targetPile.length - 1];
        const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
        const topIsRed = topCard.suit === 'hearts' || topCard.suit === 'diamonds';
        return isRed !== topIsRed && values.indexOf(card.value) === values.indexOf(topCard.value) - 1;
    }
    return false;
}

// Remove carta da origem
function removeCardFromSource() {
    if (selectedPile === 'waste') {
        waste.pop();
    } else if (selectedPile.startsWith('tableau-')) {
        tableau[parseInt(selectedPile.split('-')[1]) - 1].pop();
    } else if (selectedPile.startsWith('foundation-')) {
        foundations[Object.keys(foundations)[parseInt(selectedPile.split('-')[1]) - 1]].pop();
    }
}

// Revela carta no topo do tableau
function revealTopCard() {
    tableau.forEach(pile => {
        if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
            pile[pile.length - 1].faceUp = true;
        }
    });
}

// Verifica vitória
function isGameWon() {
    return Object.values(foundations).every(pile => pile.length === 13);
}

// Atualiza status do jogo
function updateGameStatus(message) {
    document.getElementById('game-status').textContent = message;
}

// Reinicia o jogo
function restartGame() {
    deck = [];
    stock = [];
    waste = [];
    foundations = { hearts: [], diamonds: [], spades: [], clubs: [] };
    tableau = [[], [], [], [], [], []];
    initGame();
    updateGameStatus('Jogo reiniciado');
}

// Inicializa o jogo ao carregar
document.addEventListener('DOMContentLoaded', initGame);
