// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext'; // Add this import
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GameLobby from './pages/GameLobby';
import GameRoom from './pages/GameRoom';
import './App.css';

// PrivateRoute component to protect routes
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <GameProvider> {/* Add this wrapper */}
        <Router>
          <div className="app">
            <Navbar />
            <main className="content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/lobby/:id" 
                  element={
                    <PrivateRoute>
                      <GameLobby />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/game/:id" 
                  element={
                    <PrivateRoute>
                      <GameRoom />
                    </PrivateRoute>
                  } 
                />
              </Routes>
            </main>
            <footer className="footer">
              <p>&copy; {new Date().getFullYear()} Fadu Card Game</p>
            </footer>
          </div>
        </Router>
      </GameProvider> {/* Close the wrapper */}
    </AuthProvider>
  );
}

export default App;