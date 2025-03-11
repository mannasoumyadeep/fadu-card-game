// server/game/CardGame.js
const Game = require('../models/Game');
const User = require('../models/User');

class CardGame {
  constructor(gameDocument, io) {
    this.gameId = gameDocument._id.toString();
    this.io = io;
    
    // Fix the player mapping issue
    this.players = gameDocument.players
      .filter(p => p && p.userId)  // Filter out invalid player entries
      .map(p => p.userId.toString());
    
    console.log("Players initialized:", this.players);
    
    this.playerData = new Map();
    this.currentRound = gameDocument.currentRound;
    this.totalRounds = gameDocument.totalRounds;
    this.deck = [];
    this.discardPile = [];
    this.currentPlayer = null;
    this.firstTurn = true;
    this.roundStarted = false;
    
    // Initialize the card deck
    this.initializeDeck();
  }

  // Initialize a standard 52-card deck
  initializeDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = [
      { display: 'A', numeric: 1 },
      { display: '2', numeric: 2 },
      { display: '3', numeric: 3 },
      { display: '4', numeric: 4 },
      { display: '5', numeric: 5 },
      { display: '6', numeric: 6 },
      { display: '7', numeric: 7 },
      { display: '8', numeric: 8 },
      { display: '9', numeric: 9 },
      { display: '10', numeric: 10 },
      { display: 'J', numeric: 11 },
      { display: 'Q', numeric: 12 },
      { display: 'K', numeric: 13 }
    ];
    
    this.deck = [];
    
    for (const suit of suits) {
      for (const {display, numeric} of values) {
        this.deck.push({
          suit,
          value: display,
          numericValue: numeric
        });
      }
    }
    
    // Shuffle the deck
    this.shuffleDeck();
  }

  // Fisher-Yates shuffle algorithm
  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // Start a new round
  async startRound() {
    try {
      // Reset game state for new round
      this.playerData.clear();
      this.discardPile = [];
      this.firstTurn = true;
      this.roundStarted = true;
      
      // If new game, initialize the deck
      if (this.currentRound === 1) {
        this.initializeDeck();
      }
      
      // Deal cards to players (5 cards each)
      for (const userId of this.players) {
        const hand = [];
        for (let i = 0; i < 5; i++) {
          if (this.deck.length > 0) {
            hand.push(this.deck.pop());
          }
        }
        
        this.playerData.set(userId, {
          hand,
          score: 0
        });
      }
      
      // Add one card to the discard pile to start
      this.discardPile.push(this.deck.pop());
      
      // Determine first player
      if (this.currentRound === 1) {
        // First round: host starts
        const game = await Game.findById(this.gameId);
        this.currentPlayer = game.hostId.toString();
      } else {
        // Subsequent rounds: winner of previous round starts
        // (We'll set this when the round ends)
      }
      
      // Notify clients about the new round
      this.broadcastGameState();
      
      // Notify the current player it's their turn
      this.notifyPlayerTurn();
    } catch (error) {
      console.error('Error starting round:', error);
      this.io.to(this.gameId).emit('gameError', { 
        message: 'Failed to start round' 
      });
    }
  }

  // Play a card from hand
  playCard(userId, cardIndex) {
    // Verify it's this player's turn
    if (userId !== this.currentPlayer) {
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "It's not your turn"
      });
    }
    
    const playerData = this.playerData.get(userId);
    
    if (!playerData) {
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "Player not found"
      });
    }
    
    // Check if card index is valid
    if (cardIndex < 0 || cardIndex >= playerData.hand.length) {
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "Invalid card index"
      });
    }
    
    const card = playerData.hand[cardIndex];
    const topCard = this.discardPile[this.discardPile.length - 1];
    
    // Check if this is a valid play based on game rules
    if (this.firstTurn) {
      // First turn of the round - player must draw first
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "You must draw a card on your first turn"
      });
    } else if (card.value !== topCard.value && !this.hasDrawnThisTurn) {
      // Not matching the top card - check if they can play without drawing
      const hasMatchingCard = playerData.hand.some(c => c.value === topCard.value);
      
      if (hasMatchingCard) {
        // Player has a matching card but is trying to play a different card
        return this.io.to(this.gameId).emit('gameError', {
          userId,
          message: "You must play a matching card or draw first"
        });
      }
      
      // Player has no matching cards - they must draw first
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "You must draw a card first"
      });
    }
    
    // Play the card
    const playedCard = playerData.hand.splice(cardIndex, 1)[0];
    this.discardPile.push(playedCard);
    
    // Check if player has emptied their hand
    if (playerData.hand.length === 0) {
      // Player gets +4 points for emptying their hand
      playerData.score += 4;
      
      // End the round
      this.endRound(userId);
      return;
    }
    
    // Move to next player
    this.moveToNextPlayer();
    
    // Reset turn state
    this.hasDrawnThisTurn = false;
    
    // Update game state for all players
    this.broadcastGameState();
    
    // Notify next player it's their turn
    this.notifyPlayerTurn();
  }

  // Draw a card from the deck
  drawCard(userId) {
    // Verify it's this player's turn
    if (userId !== this.currentPlayer) {
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "It's not your turn"
      });
    }
    
    const playerData = this.playerData.get(userId);
    
    if (!playerData) {
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "Player not found"
      });
    }
    
    // Check if deck needs reshuffling
    if (this.deck.length < 5) {
      this.reshuffleDeck();
    }
    
    // Draw a card if available
    if (this.deck.length > 0) {
      const card = this.deck.pop();
      playerData.hand.push(card);
      this.hasDrawnThisTurn = true;
      
      // If this is the first turn, move to the playing phase
      if (this.firstTurn) {
        this.firstTurn = false;
      }
      
      // Update player's game state
      this.io.to(this.gameId).emit('cardDrawn', {
        userId,
        handSize: playerData.hand.length
      });
      
      // Send the drawn card to the player
      this.sendPlayerHand(userId);
    } else {
      this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "No cards left to draw"
      });
    }
  }

  // Make a call (claiming lowest sum)
  makeCall(userId) {
    // Verify it's this player's turn and it's the start of their turn
    if (userId !== this.currentPlayer) {
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "It's not your turn"
      });
    }
    
    if (!this.firstTurn && this.hasDrawnThisTurn) {
      return this.io.to(this.gameId).emit('gameError', {
        userId,
        message: "You can only call at the start of your turn"
      });
    }
    
    // Calculate each player's hand value
    const handValues = new Map();
    let lowestSum = Infinity;
    let lowestPlayers = [];
    
    for (const [playerId, data] of this.playerData.entries()) {
      const sum = data.hand.reduce((total, card) => total + card.numericValue, 0);
      handValues.set(playerId, sum);
      
      if (sum < lowestSum) {
        lowestSum = sum;
        lowestPlayers = [playerId];
      } else if (sum === lowestSum) {
        lowestPlayers.push(playerId);
      }
    }
    
    // Determine if the call was successful
    const isSuccessful = lowestPlayers.length === 1 && lowestPlayers[0] === userId;
    
    if (isSuccessful) {
      // Successful call: +3 points
      this.playerData.get(userId).score += 3;
      
      this.io.to(this.gameId).emit('callMade', {
        userId,
        successful: true,
        handValues: Object.fromEntries(handValues),
        message: `${userId} made a successful call and earned 3 points!`
      });
    } else {
      // Failed call: -2 points for caller, +1 for players with lowest sum
      this.playerData.get(userId).score -= 2;
      
      for (const playerId of lowestPlayers) {
        this.playerData.get(playerId).score += 1;
      }
      
      this.io.to(this.gameId).emit('callMade', {
        userId,
        successful: false,
        handValues: Object.fromEntries(handValues),
        lowestPlayers,
        message: `${userId} made an unsuccessful call and lost 2 points. Players with the lowest sum earned 1 point each.`
      });
    }
    
    // End the round
    this.endRound(isSuccessful ? userId : lowestPlayers[0]);
  }

  // End the current round
  async endRound(winnerUserId) {
    try {
      // Update scores in the database
      const game = await Game.findById(this.gameId);
      
      if (!game) {
        return console.error('Game not found when ending round');
      }
      
      // Update scores in the database
      for (const [userId, data] of this.playerData.entries()) {
        const currentScore = game.scores.get(userId) || 0;
        game.scores.set(userId, currentScore + data.score);
      }
      
      // Set the winner as the next round's first player
      this.currentPlayer = winnerUserId;
      
      // Increment round counter
      game.currentRound += 1;
      this.currentRound = game.currentRound;
      
      // Check if game is over
      if (game.currentRound > game.totalRounds) {
        // Game complete
        game.status = 'completed';
        await game.save();
        
        // Calculate final scores and determine winner(s)
        const finalScores = [...game.scores.entries()];
        let highestScore = -Infinity;
        let winners = [];
        
        for (const [userId, score] of finalScores) {
          if (score > highestScore) {
            highestScore = score;
            winners = [userId];
          } else if (score === highestScore) {
            winners.push(userId);
          }
          
          // Update player stats
          await User.findByIdAndUpdate(userId, {
            $inc: {
              gamesPlayed: 1,
              gamesWon: winners.includes(userId) ? 1 : 0,
              totalPoints: score
            }
          });
        }
        
        // Notify players of game completion
        this.io.to(this.gameId).emit('gameCompleted', {
          scores: Object.fromEntries(game.scores),
          winners
        });
        
      } else {
        // Save updated game state
        await game.save();
        
        // Notify players of round end
        this.io.to(this.gameId).emit('roundEnded', {
          roundNumber: game.currentRound - 1,
          scores: Object.fromEntries(game.scores),
          nextRoundStarter: winnerUserId
        });
        
        // Start next round after a delay
        setTimeout(() => this.startRound(), 5000);
      }
    } catch (error) {
      console.error('Error ending round:', error);
      this.io.to(this.gameId).emit('gameError', { 
        message: 'Failed to end round' 
      });
    }
  }

  // Move to the next player
  moveToNextPlayer() {
    const currentIndex = this.players.indexOf(this.currentPlayer);
    const nextIndex = (currentIndex + 1) % this.players.length;
    this.currentPlayer = this.players[nextIndex];
    this.firstTurn = true;
    this.hasDrawnThisTurn = false;
  }

  // Reshuffle the discard pile back into the deck
  reshuffleDeck() {
    // Keep the top card
    const topCard = this.discardPile.pop();
    
    // Move all other cards from discard pile to deck
    this.deck = [...this.discardPile];
    this.discardPile = [topCard];
    
    // Shuffle the deck
    this.shuffleDeck();
    
    // Notify players
    this.io.to(this.gameId).emit('deckReshuffled');
  }

  // Send private hand information to a player
  sendPlayerHand(userId) {
    const playerData = this.playerData.get(userId);
    
    if (playerData) {
      const socketIds = this.getPlayerSocketIds(userId);
      
      for (const socketId of socketIds) {
        this.io.to(socketId).emit('updateHand', {
          hand: playerData.hand
        });
      }
    }
  }

  // Get socket IDs for a user
  async getPlayerSocketIds(userId) {
    try {
      const game = await Game.findById(this.gameId);
      
      if (!game) return [];
      
      const player = game.players.find(p => p.userId.toString() === userId);
      
      return player && player.socketId ? [player.socketId] : [];
    } catch (error) {
      console.error('Error getting player socket IDs:', error);
      return [];
    }
  }

  // Broadcast game state to all players
  broadcastGameState() {
    console.log(`Broadcasting game state to room ${this.gameId}`);
    
    // Create a public game state (without revealing hands)
    const publicState = {
      gameId: this.gameId,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentPlayer: this.currentPlayer,
      topCard: this.discardPile[this.discardPile.length - 1],
      deckSize: this.deck.length,
      players: this.players.map(userId => {
        const playerData = this.playerData.get(userId);
        return {
          userId,
          handSize: playerData?.hand.length || 0,
          score: playerData?.score || 0
        };
      })
    };
    
    console.log("Broadcasting state:", JSON.stringify(publicState, null, 2));
    
    // Send public state to all players
    this.io.to(this.gameId).emit('gameStateUpdate', publicState);
    
    // Send private hand information to each player
    for (const userId of this.players) {
      this.sendPlayerHand(userId);
    }
  }

  // Notify the current player it's their turn
  notifyPlayerTurn() {
    const socketIds = this.getPlayerSocketIds(this.currentPlayer);
    
    for (const socketId of socketIds) {
      this.io.to(socketId).emit('yourTurn', {
        canCall: this.firstTurn && !this.hasDrawnThisTurn,
        mustDraw: this.firstTurn || !this.canPlayWithoutDrawing(this.currentPlayer)
      });
    }
  }

  // Check if a player can play without drawing
  canPlayWithoutDrawing(userId) {
    const playerData = this.playerData.get(userId);
    
    if (!playerData) return false;
    
    const topCard = this.discardPile[this.discardPile.length - 1];
    
    return playerData.hand.some(card => card.value === topCard.value);
  }

  // Handle player disconnection
  handlePlayerDisconnect(userId) {
    // For now, just continue the game
    // In a more advanced implementation, you could add AI to play for disconnected players
    // or allow reconnection within a time limit
    
    // If it's the disconnected player's turn, move to the next player
    if (this.currentPlayer === userId) {
      this.moveToNextPlayer();
      this.broadcastGameState();
      this.notifyPlayerTurn();
    }
  }
}

module.exports = CardGame;