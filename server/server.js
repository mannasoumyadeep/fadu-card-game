// Import required modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

// Import game logic
const GameManager = require('./game/GameManager');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://faduadmin:4LFtZDw7kzhfDIGZ@cluster0.dlumj.mongodb.net/fadu-card-game?retryWrites=true&w=majority&appName=Cluster0';
console.log('Attempting to connect to MongoDB with URI:', mongoURI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:***@'));

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('Connection details:', {
      uri_protocol: mongoURI.split('://')[0],
      uri_host: mongoURI.split('@')[1]?.split('/')[0] || 'undefined'
    });
  });

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Initialize game manager
const gameManager = new GameManager(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Handle user joining a game
  socket.on('joinGame', ({ gameId, userId, username }) => {
    gameManager.joinGame(socket, gameId, userId, username);
  });
  
  // Handle user creating a game
  socket.on('createGame', ({ userId, username, settings }) => {
    gameManager.createGame(socket, userId, username, settings);
  });
  
  // Handle game actions
  socket.on('playCard', ({ gameId, userId, cardIndex }) => {
    gameManager.playCard(gameId, userId, cardIndex);
  });
  
  socket.on('drawCard', ({ gameId, userId }) => {
    gameManager.drawCard(gameId, userId);
  });
  
  socket.on('makeCall', ({ gameId, userId }) => {
    gameManager.makeCall(gameId, userId);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    gameManager.handleDisconnect(socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});