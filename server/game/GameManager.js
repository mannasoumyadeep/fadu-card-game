// server/game/GameManager.js
const Game = require('../models/Game');
const CardGame = require('./CardGame');

class GameManager {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // gameId -> CardGame instance
    this.playerSocketMap = new Map(); // socketId -> { userId, gameId }
  }

  // Create a new game
  async createGame(socket, userId, username, settings) {
    try {
      const game = new Game({
        hostId: userId,
        settings,
        totalRounds: settings.numberOfRounds,
        players: [{
          userId,
          username,
          socketId: socket.id
        }]
      });
      
      await game.save();
      
      // Map socket to user and game
      this.playerSocketMap.set(socket.id, { userId, gameId: game._id.toString() });
      
      // Join socket to game room
      socket.join(game._id.toString());
      
      // Notify the creator
      socket.emit('gameCreated', { gameId: game._id, game });
      
      return game._id;
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('gameError', { message: 'Failed to create game' });
    }
  }

  // Join an existing game
  async joinGame(socket, gameId, userId, username) {
    try {
      const game = await Game.findById(gameId);
      
      if (!game) {
        return socket.emit('gameError', { message: 'Game not found' });
      }
      
      if (game.status !== 'waiting') {
        return socket.emit('gameError', { message: 'Game already started' });
      }
      
      if (game.players.length >= game.settings.maxPlayers) {
        return socket.emit('gameError', { message: 'Game is full' });
      }
      
      // Check if player is already in the game
      const existingPlayer = game.players.find(
        player => player.userId.toString() === userId
      );
      
      if (existingPlayer) {
        // Update socket id for reconnection
        existingPlayer.socketId = socket.id;
        existingPlayer.isConnected = true;
      } else {
        // Add new player
        game.players.push({
          userId,
          username,
          socketId: socket.id,
          isConnected: true
        });
      }
      
      await game.save();
      
      // Map socket to user and game
      this.playerSocketMap.set(socket.id, { userId, gameId });
      
      // Join socket to game room
      socket.join(gameId);
      
      // Notify everyone in the game
      this.io.to(gameId).emit('playerJoined', {
        player: { userId, username },
        game
      });
      
      // If game is now full, start it automatically
      if (game.players.length === game.settings.maxPlayers) {
        this.startGame(gameId);
      }
      
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('gameError', { message: 'Failed to join game' });
    }
  }

  // Start a game
  async startGame(gameId) {
    try {
      const game = await Game.findById(gameId);
      
      if (!game || game.status !== 'waiting') {
        return;
      }
      
      // Update game status
      game.status = 'playing';
      game.currentRound = 1;
      await game.save();
      
      // Create a new card game instance
      const cardGame = new CardGame(game, this.io);
      this.activeGames.set(gameId, cardGame);
      
      // Start the game
      cardGame.startRound();
      
      // Notify all players
      this.io.to(gameId).emit('gameStarted', { game });
      
    } catch (error) {
      console.error('Error starting game:', error);
      this.io.to(gameId).emit('gameError', { message: 'Failed to start game' });
    }
  }

  // Handle player's move to play a card
  playCard(gameId, userId, cardIndex) {
    const cardGame = this.activeGames.get(gameId);
    
    if (!cardGame) {
      return this.io.to(gameId).emit('gameError', { 
        userId,
        message: 'Game not found' 
      });
    }
    
    cardGame.playCard(userId, cardIndex);
  }

  // Handle player's move to draw a card
  drawCard(gameId, userId) {
    const cardGame = this.activeGames.get(gameId);
    
    if (!cardGame) {
      return this.io.to(gameId).emit('gameError', { 
        userId,
        message: 'Game not found' 
      });
    }
    
    cardGame.drawCard(userId);
  }

  // Handle player making a call
  makeCall(gameId, userId) {
    const cardGame = this.activeGames.get(gameId);
    
    if (!cardGame) {
      return this.io.to(gameId).emit('gameError', { 
        userId,
        message: 'Game not found' 
      });
    }
    
    cardGame.makeCall(userId);
  }

  // Handle player disconnection
  async handleDisconnect(socketId) {
    const playerInfo = this.playerSocketMap.get(socketId);
    if (!playerInfo) return;
    
    const { userId, gameId } = playerInfo;
    
    try {
      const game = await Game.findById(gameId);
      
      if (!game) return;
      
      // Update player connection status
      const playerIndex = game.players.findIndex(
        p => p.userId.toString() === userId
      );
      
      if (playerIndex !== -1) {
        game.players[playerIndex].isConnected = false;
        await game.save();
      }
      
      // Notify other players
      this.io.to(gameId).emit('playerDisconnected', { userId });
      
      // If game is active, handle in the card game
      const cardGame = this.activeGames.get(gameId);
      if (cardGame) {
        cardGame.handlePlayerDisconnect(userId);
      }
      
      // Remove socket from maps
      this.playerSocketMap.delete(socketId);
      
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }
}

module.exports = GameManager;