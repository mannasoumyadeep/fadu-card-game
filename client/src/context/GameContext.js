// client/src/context/GameContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const GameContext = createContext();

export function useGame() {
  return useContext(GameContext);
}

export function GameProvider({ children }) {
  const { currentUser, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [hand, setHand] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [isYourTurn, setIsYourTurn] = useState(false);
  const [turnOptions, setTurnOptions] = useState({ canCall: false, mustDraw: true });
  const [gameMessage, setGameMessage] = useState(null);
  const [error, setError] = useState(null);
  
  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !currentUser) return;
    
    socket.on('gameCreated', ({ gameId, game }) => {
      setCurrentGame(game);
    });
    
    socket.on('playerJoined', ({ player, game }) => {
      setCurrentGame(game);
      setGameMessage(`${player.username} joined the game`);
    });
    
    socket.on('gameStarted', ({ game }) => {
      setCurrentGame(game);
      setGameMessage('Game has started!');
    });
    
    socket.on('gameStateUpdate', (state) => {
      setGameState(state);
    });
    
    socket.on('updateHand', ({ hand }) => {
      setHand(hand);
    });
    
    socket.on('yourTurn', (options) => {
      setIsYourTurn(true);
      setTurnOptions(options);
      setGameMessage("It's your turn");
    });
    
    socket.on('cardDrawn', ({ userId, handSize }) => {
      setGameMessage(`${userId === currentUser.id ? 'You' : userId} drew a card`);
    });
    
    socket.on('callMade', ({ userId, successful, message }) => {
      setGameMessage(message);
    });
    
    socket.on('roundEnded', ({ roundNumber, scores, nextRoundStarter }) => {
      setIsYourTurn(false);
      setGameMessage(`Round ${roundNumber} ended. Starting new round...`);
    });
    
    socket.on('gameCompleted', ({ scores, winners }) => {
      setIsYourTurn(false);
      setGameMessage(`Game completed! Winners: ${winners.join(', ')}`);
      setCurrentGame(prev => ({ ...prev, status: 'completed' }));
    });
    
    socket.on('playerDisconnected', ({ userId }) => {
      setGameMessage(`Player ${userId} disconnected`);
    });
    
    socket.on('deckReshuffled', () => {
      setGameMessage('Deck was reshuffled');
    });
    
    socket.on('gameError', ({ userId, message }) => {
      if (!userId || userId === currentUser.id) {
        setError(message);
        setTimeout(() => setError(null), 5000);
      }
    });
    
    return () => {
      socket.off('gameCreated');
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('gameStateUpdate');
      socket.off('updateHand');
      socket.off('yourTurn');
      socket.off('cardDrawn');
      socket.off('callMade');
      socket.off('roundEnded');
      socket.off('gameCompleted');
      socket.off('playerDisconnected');
      socket.off('deckReshuffled');
      socket.off('gameError');
    };
  }, [socket, currentUser]);
  
  // Create a new game
  const createGame = useCallback((settings) => {
    if (!socket || !currentUser) return;
    
    socket.emit('createGame', {
      userId: currentUser.id,
      username: currentUser.username,
      settings
    });
  }, [socket, currentUser]);
  
  // Join an existing game
  const joinGame = useCallback((gameId) => {
    if (!socket || !currentUser) return;
    
    socket.emit('joinGame', {
      gameId,
      userId: currentUser.id,
      username: currentUser.username
    });
  }, [socket, currentUser]);
  
  // Play a card
  const playCard = useCallback((cardIndex) => {
    if (!socket || !currentUser || !currentGame || !isYourTurn) return;
    
    socket.emit('playCard', {
      gameId: currentGame._id,
      userId: currentUser.id,
      cardIndex
    });
    
    setIsYourTurn(false);
  }, [socket, currentUser, currentGame, isYourTurn]);
  
  // Draw a card
  const drawCard = useCallback(() => {
    if (!socket || !currentUser || !currentGame || !isYourTurn) return;
    
    socket.emit('drawCard', {
      gameId: currentGame._id,
      userId: currentUser.id
    });
  }, [socket, currentUser, currentGame, isYourTurn]);
  
  // Make a call
  const makeCall = useCallback(() => {
    if (!socket || !currentUser || !currentGame || !isYourTurn || !turnOptions.canCall) return;
    
    socket.emit('makeCall', {
      gameId: currentGame._id,
      userId: currentUser.id
    });
    
    setIsYourTurn(false);
  }, [socket, currentUser, currentGame, isYourTurn, turnOptions]);
  
  // Reset game state
  const resetGame = useCallback(() => {
    setCurrentGame(null);
    setHand([]);
    setGameState(null);
    setIsYourTurn(false);
    setTurnOptions({ canCall: false, mustDraw: true });
    setGameMessage(null);
    setError(null);
  }, []);
  
  const value = {
    socket,
    currentGame,
    hand,
    gameState,
    isYourTurn,
    turnOptions,
    gameMessage,
    error,
    createGame,
    joinGame,
    playCard,
    drawCard,
    makeCall,
    resetGame
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}