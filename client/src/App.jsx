import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
   <>
    <SocketProvider> 
      <Router>
        <Routes>
          <Route path="/" element={<HomePage/>} />
          <Route path="/room/:roomId" element={<RoomPage/>} />
        </Routes>
      </Router>
    </SocketProvider></>
  );
}

export default App;