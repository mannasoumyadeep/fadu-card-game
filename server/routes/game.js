// server/routes/game.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Game = require('../models/Game');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access denied' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Create a new game
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { numberOfRounds, maxPlayers } = req.body;
    
    const newGame = new Game({
      hostId: req.user.id,
      settings: {
        numberOfRounds: numberOfRounds || 3,
        maxPlayers: maxPlayers || 4
      },
      totalRounds: numberOfRounds || 3,
      players: [{
        userId: req.user.id,
        username: req.user.username
      }]
    });
    
    await newGame.save();
    
    res.status(201).json({
      message: 'Game created successfully',
      gameId: newGame._id,
      game: newGame
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all available games (waiting for players)
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const games = await Game.find({ 
      status: 'waiting',
      'players.userId': { $ne: req.user.id }
    }).populate('hostId', 'username');
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's games (active and past)
router.get('/my-games', authenticateToken, async (req, res) => {
  try {
    const games = await Game.find({
      'players.userId': req.user.id
    }).sort({ createdAt: -1 });
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific game
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if user is a player in this game
    const isPlayer = game.players.some(
      player => player.userId.toString() === req.user.id
    );
    
    if (!isPlayer && game.status !== 'waiting') {
      return res.status(403).json({ message: 'Not authorized to view this game' });
    }
    
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start a game
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if user is the host
    if (game.hostId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the host can start the game' });
    }
    
    // Check if there are at least 2 players
    if (game.players.length < 2) {
      return res.status(400).json({ message: 'At least 2 players are required to start' });
    }
    
    // Update game status
    game.status = 'playing';
    game.currentRound = 1;
    await game.save();
    
    res.json({ message: 'Game started successfully', game });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave a game
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if game is in waiting status
    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Cannot leave a game that has already started' });
    }
    
    // Check if user is a player in this game
    const playerIndex = game.players.findIndex(
      player => player.userId.toString() === req.user.id
    );
    
    if (playerIndex === -1) {
      return res.status(400).json({ message: 'You are not in this game' });
    }
    
    // If the player is the host and there are other players, transfer host status
    if (game.hostId.toString() === req.user.id && game.players.length > 1) {
      game.hostId = game.players[1].userId;
    }
    
    // Remove player from the game
    game.players.splice(playerIndex, 1);
    
    // If no players left, delete the game
    if (game.players.length === 0) {
      await Game.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Game deleted as no players remain' });
    }
    
    await game.save();
    
    res.json({ message: 'Successfully left the game' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;