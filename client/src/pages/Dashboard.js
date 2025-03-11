// client/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { createGame } = useGame();
  const [availableGames, setAvailableGames] = useState([]);
  const [myGames, setMyGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameSettings, setGameSettings] = useState({
    numberOfRounds: 3,
    maxPlayers: 4
  });
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        
        // Fetch available games
        const availableRes = await axios.get('/api/game/available');
        setAvailableGames(availableRes.data);
        
        // Fetch user's games
        const myGamesRes = await axios.get('/api/game/my-games');
        setMyGames(myGamesRes.data);
        
      } catch (err) {
        setError('Failed to fetch games');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGames();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchGames, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleCreateGame = async () => {
    try {
      const res = await axios.post('/api/game/create', gameSettings);
      navigate(`/lobby/${res.data.gameId}`);
    } catch (err) {
      setError('Failed to create game');
      console.error(err);
    }
  };
  
  const handleSettingsChange = e => {
    setGameSettings({
      ...gameSettings,
      [e.target.name]: parseInt(e.target.value)
    });
  };
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <div>
      <h1>Dashboard</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card">
        <div className="card-header">
          <h2>Create a New Game</h2>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label htmlFor="numberOfRounds">Number of Rounds</label>
            <select
              name="numberOfRounds"
              id="numberOfRounds"
              className="form-control"
              value={gameSettings.numberOfRounds}
              onChange={handleSettingsChange}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="maxPlayers">Maximum Players</label>
            <select
              name="maxPlayers"
              id="maxPlayers"
              className="form-control"
              value={gameSettings.maxPlayers}
              onChange={handleSettingsChange}
            >
              {[2, 3, 4, 5, 6, 7, 8].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-success"
            onClick={handleCreateGame}
          >
            Create Game
          </button>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2>Available Games</h2>
        </div>
        <div className="card-body">
          {availableGames.length === 0 ? (
            <p>No available games. Create one to get started!</p>
          ) : (
            <div className="game-list">
              {availableGames.map(game => (
                <div key={game._id} className="game-item">
                  <div>
                    <h3>Game #{game._id.substring(0, 8)}</h3>
                    <p>Host: {game.players[0].username}</p>
                    <p>Players: {game.players.length}/{game.settings.maxPlayers}</p>
                    <p>Rounds: {game.settings.numberOfRounds}</p>
                  </div>
                  <Link to={`/lobby/${game._id}`} className="btn btn-primary">
                    Join Game
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2>My Games</h2>
        </div>
        <div className="card-body">
          {myGames.length === 0 ? (
            <p>You haven't joined any games yet.</p>
          ) : (
            <div className="game-list">
              {myGames.map(game => (
                <div key={game._id} className="game-item">
                  <div>
                    <h3>Game #{game._id.substring(0, 8)}</h3>
                    <p>Status: {game.status}</p>
                    <p>Players: {game.players.length}/{game.settings.maxPlayers}</p>
                    <p>
                      {game.status === 'playing' 
                        ? `Round ${game.currentRound}/${game.totalRounds}` 
                        : `Rounds: ${game.settings.numberOfRounds}`
                      }
                    </p>
                  </div>
                  <Link 
                    to={game.status === 'waiting' ? `/lobby/${game._id}` : `/game/${game._id}`} 
                    className="btn btn-primary"
                  >
                    {game.status === 'waiting' ? 'Go to Lobby' : 'Continue Game'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;