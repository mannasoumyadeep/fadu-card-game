// client/src/pages/Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to Fadu Card Game</h1>
        <p className="lead">
          An exciting multiplayer card game for 2-8 players.
        </p>
        
        {isAuthenticated ? (
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            Go to Dashboard
          </Link>
        ) : (
          <div className="cta-buttons">
            <Link to="/login" className="btn btn-primary btn-lg">
              Login
            </Link>
            <Link to="/register" className="btn btn-success btn-lg">
              Register
            </Link>
          </div>
        )}
      </div>
      
      <div className="features-section">
        <h2>How to Play</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <h3>Basic Rules</h3>
            <p>
              Fadu is played with a standard 52-card deck. Each player starts with 5 cards,
              and the goal is to earn the most points across multiple rounds.
            </p>
          </div>
          
          <div className="feature-card">
            <h3>Taking Turns</h3>
            <p>
              On your first turn, draw a card and then play one. On regular turns, you can
              play matching cards without drawing, or draw first if you don't have a match.
            </p>
          </div>
          
          <div className="feature-card">
            <h3>Scoring Points</h3>
            <p>
              Empty your hand to get +4 points. Make a successful call (having the lowest sum alone)
              to earn +3 points. Failed calls cost -2 points.
            </p>
          </div>
          
          <div className="feature-card">
            <h3>Winning the Game</h3>
            <p>
              After all rounds are completed, the player with the highest total points
              wins the game!
            </p>
          </div>
        </div>
      </div>
      
      <div className="about-section">
        <h2>About Fadu</h2>
        <p>
          Fadu is a strategic card game that combines elements of skill and luck.
          Players must decide when to play their cards, when to draw, and when to make a call
          claiming they have the lowest sum. Each decision can impact your score and
          standing in the game.
        </p>
        <p>
          This online version allows you to play with friends from anywhere in the world.
          Create a game, invite friends, and enjoy the competition!
        </p>
      </div>
    </div>
  );
};

export default Home;