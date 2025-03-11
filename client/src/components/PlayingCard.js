// client/src/components/PlayingCard.js
import React from 'react';

const PlayingCard = ({ card, onClick, isPlayable = true }) => {
  if (!card) return null;
  
  const { suit, value } = card;
  
  // Get suit symbol
  const getSuitSymbol = (suit) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };
  
  const suitColor = suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
  
  const cardClasses = `playing-card ${suit} ${!isPlayable ? 'disabled' : ''}`;
  
  return (
    <div 
      className={cardClasses} 
      onClick={isPlayable ? onClick : undefined}
      style={{ 
        opacity: isPlayable ? 1 : 0.7, 
        cursor: isPlayable ? 'pointer' : 'not-allowed',
        color: suitColor,
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '5px',
        margin: '0 5px',
        width: '80px',
        height: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{value}</div>
      <div style={{ fontSize: '2rem', textAlign: 'center' }}>{getSuitSymbol(suit)}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', alignSelf: 'flex-end' }}>{value}</div>
    </div>
  );
};

export default PlayingCard;