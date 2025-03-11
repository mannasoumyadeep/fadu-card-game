// client/src/pages/GameRoom.js
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import PlayingCard from '../components/PlayingCard';

const GameRoom = () => {
  const { id: gameId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    joinGame, 
    currentGame, 
    hand, 
    gameState, 
    isYourTurn, 
    turnOptions,
    gameMessage,
    error,
    playCard,
    drawCard,
    makeCall
  } = useGame();
  
  useEffect(() => {
    if (gameId) {
      joinGame(gameId);
    }
  }, [gameId, joinGame]);
  
  if (!currentGame || !gameState) {
    return <div className="loading">Loading game...</div>;
  }
  
  // Get current player info
  const playerInfo = gameState.players.find(
    p => p.userId === currentUser.id
  );
  
  // Get current player's index in the game
  const playerIndex = gameState.players.findIndex(
    p => p.userId === currentUser.id
  );
  
  // Reorder players so current player is at the bottom
  const orderedPlayers = [...gameState.players];
  const playersReordered = [
    ...orderedPlayers.slice(playerIndex + 1),
    ...orderedPlayers.slice(0, playerIndex)
  ];
  
  const handlePlayCard = (index) => {
    if (isYourTurn && (!turnOptions.mustDraw || hand[index].value === gameState.topCard.value)) {
      playCard(index);
    }
  };
  
  const handleDrawCard = () => {
    if (isYourTurn) {
      drawCard();
    }
  };
  
  const handleMakeCall = () => {
    if (isYourTurn && turnOptions.canCall) {
      makeCall();
    }
  };
  
  const backToDashboard = () => {
    navigate('/dashboard');
  };
  
  return (
    <div>
      <h1>Fadu Card Game</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {gameMessage && <div className="game-message">{gameMessage}</div>}
      
      <div className="game-info">
        <p>Round: {gameState.currentRound}/{gameState.totalRounds}</p>
        <p>Current Player: {
          gameState.currentPlayer === currentUser.id 
            ? 'You' 
            : gameState.players.find(p => p.userId === gameState.currentPlayer)?.userId
        }</p>
      </div>
      
      <div className="game-container">
        <div className="player-list">
          <h2>Players</h2>
          {gameState.players.map(player => (
            <div 
              key={player.userId} 
              className={`player-item ${player.userId === gameState.currentPlayer ? 'player-current' : ''}`}
            >
              <span>
                {player.userId === currentUser.id ? 'You' : player.userId}
                {player.userId === gameState.currentPlayer ? ' (Current Turn)' : ''}
              </span>
              <span>
                Cards: {player.handSize} | Score: {player.score}
              </span>
            </div>
          ))}
        </div>
        
        <div className="game-board">
          <div className="table-area">
            {/* Other players' hands (just counts) */}
            <div className="other-players">
              {playersReordered.map(player => (
                <div key={player.userId} className="other-player">
                  <div className="player-name">
                    {player.userId === currentUser.id ? 'You' : player.userId}
                  </div>
                  <div className="card-back-container">
                    {Array(player.handSize).fill(0).map((_, i) => (
                      <div key={i} className="card-back"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Deck and discard pile */}
            <div className="deck" onClick={handleDrawCard}>
              <div className="card-back">
                <span>Deck ({gameState.deckSize})</span>
              </div>
            </div>
            
            <div className="discard-pile">
              {gameState.topCard && (
                <PlayingCard
                  card={gameState.topCard}
                  onClick={() => {}}
                />
              )}
            </div>
          </div>
          
          {/* Player's hand */}
          <div className="player-hand" style={{ 
  display: 'flex', 
  justifyContent: 'center',
  padding: '20px',
  backgroundColor: '#f5f5f5',
  borderRadius: '10px',
  marginTop: '20px'
}}>
  {hand && hand.length > 0 ? (
    <div className="card-list" style={{ display: 'flex', gap: '10px' }}>
      {hand.map((card, index) => (
        <PlayingCard
          key={`${card.suit}-${card.value}-${index}`}
          card={card}
          onClick={() => handlePlayCard(index)}
          isPlayable={isYourTurn && (!turnOptions.mustDraw || card.value === gameState.topCard.value)}
        />
      ))}
    </div>
  ) : (
    <div>No cards in hand</div>
  )}
</div>
          
          {/* Game controls */}
          <div className="game-controls">
            <button 
              className="btn" 
              onClick={handleDrawCard}
              disabled={!isYourTurn}
            >
              Draw Card
            </button>
            
            <button 
              className="btn" 
              onClick={handleMakeCall}
              disabled={!isYourTurn || !turnOptions.canCall}
            >
              Make Call
            </button>
            
            {currentGame.status === 'completed' && (
              <button 
                className="btn btn-primary" 
                onClick={backToDashboard}
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;