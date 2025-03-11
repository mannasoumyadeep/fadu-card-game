// server/models/Game.js
const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'completed'],
    default: 'waiting'
  },
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    isConnected: {
      type: Boolean,
      default: true
    },
    socketId: String
  }],
  settings: {
    numberOfRounds: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    maxPlayers: {
      type: Number,
      default: 4,
      min: 2,
      max: 8
    }
  },
  currentRound: {
    type: Number,
    default: 0
  },
  totalRounds: {
    type: Number,
    default: 3
  },
  scores: {
    type: Map,
    of: Number,
    default: new Map()
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
gameSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;