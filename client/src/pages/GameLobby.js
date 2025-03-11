// client/src/pages/GameLobby.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';

const GameLobby = () => {
  const { id: gameId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { joinGame, currentGame } = useGame();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/game/${gameId}`);
        
        // If game is already in playing state, redirect to game room
        if (res.data.status === 'playing' || res.data.status === 'completed') {
          navigate(`/game/${gameId}`);
          return;
        }
        
        // Join the game through socket
        joinGame(gameId);
        
      } catch (err) {
        setError('Failed to load game details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGameDetails();
  }, [gameId, joinGame, navigate]);
  
  const handleStartGame = async () => {
    try {
      // Check if the current user is the host
      if (currentGame && currentGame.hostId === currentUser.id) {
        // Start the game via API
        await axios.post(`/api/game/${gameId}/start`);
        navigate(`/game/${gameId}`);
      }
    } catch (err) {
      setError('Failed to start game');
      console.error(err);
    }
  };
  
  const handleLeaveGame = async () => {
    try {
      await axios.post(`/api/game/${gameId}/leave`);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to leave game');
      console.error(err);
    }
  };
  
  if (loading || !currentGame) {
    return <div className="loading">Loading lobby...</div>;
  }
  
  const isHost = currentGame.hostId === currentUser.id;
  
  return (
    <div className="game-lobby">
      <h1>Game Lobby</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card">
        <div className="card-header">
          <h2>Game Information</h2>
        </div>
        <div className="card-body">
          <p><strong>Game ID:</strong> {currentGame._id}</p>
          <p><strong>Host:</strong> {currentGame.players[0].username}</p>
          <p><strong>Number of Rounds:</strong> {currentGame.settings.numberOfRounds}</p>
          <p><strong>Maximum Players:</strong> {currentGame.settings.maxPlayers}</p>
          <p><strong>Status:</strong> {currentGame.status}</p>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2>Players ({currentGame.players.length}/{currentGame.settings.maxPlayers})</h2>
        </div>
        <div className="card-body">
          <ul className="player-list">
            {currentGame.players.map((player, index) => (
              <li key={player.userId} className="player-item">
                <span>{player.username} {player.userId === currentUser.id ? '(You)' : ''}</span>
                {index === 0 && <span className="host-badge">Host</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="lobby-controls">
        {isHost ? (
          <button 
            className="btn btn-success"
            onClick={handleStartGame}
            disabled={currentGame.players.length < 2}
          >
            {currentGame.players.length < 2 
              ? 'Waiting for more players' 
              : 'Start Game'}
          </button>
        ) : (
          <p>Waiting for the host to start the game...</p>
        )}
        
        <button 
          className="btn btn-danger"
          onClick={handleLeaveGame}
        >
          Leave Game
        </button>
      </div>
      
      <div className="lobby-chat">
        <h3>Game Rules</h3>
        <div className="rules-container">
          <p>Welcome to Fadu! Here's a quick reminder of the rules:</p>
          <ul>
            <li>Each player starts with 5 cards</li>
            <li>On your first turn, you must draw a card and then play</li>
            <li>On regular turns, if you have matching cards, you can play without drawing</li>
            <li>If you don't have matching cards, you must draw</li>
            <li>You can call if you think you have the lowest sum</li>
            <li>Successful call: +3 points</li>
            <li>Failed call: -2 points (caller) and +1 point (players with lowest sum)</li>
            <li>Empty your hand: +4 points</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;