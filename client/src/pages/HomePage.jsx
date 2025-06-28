import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { FaMusic, FaPlus, FaSignInAlt, FaUsers, FaWaveSquare, FaPlayCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';

const HomePage = () => {
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [socketError, setSocketError] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const socket = useSocket();
  const navigate = useNavigate();

  // Check socket connection status
  useEffect(() => {
    if (socket) {
      setIsConnecting(false);
      
      socket.on('connect', () => {
        console.log('Socket connected!');
        setSocketError('');
      });
      
      socket.on('connect_error', (err) => {
        console.error('Connection error:', err.message);
        setSocketError('Failed to connect to server. Please try again.');
      });
    }
  }, [socket]);

  const createRoom = () => {
    if (!socket || !socket.connected) {
      setSocketError('Not connected to server. Please refresh the page.');
      return;
    }
    
    socket.emit('create_room', roomName, (response) => {
      if (typeof response === 'string') {
        navigate(`/room/${response}`);
      } else if (response && response.error) {
        setSocketError(response.error);
      } else {
        setSocketError('Failed to create room. Please try again.');
      }
    });
  };

  const joinRoom = () => {
    if (!roomId) {
      setSocketError('Please enter a Room ID');
      return;
    }
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 overflow-hidden relative">
      {/* Floating bubbles */}
      <div className="absolute top-1/4 left-1/4 w-24 h-24 rounded-full bg-gradient-to-r from-amber-300/20 to-orange-300/20 blur-xl animate-float"></div>
      <div className="absolute top-1/3 right-1/3 w-16 h-16 rounded-full bg-gradient-to-r from-teal-300/20 to-emerald-300/20 blur-xl animate-float-delay"></div>
      <div className="absolute bottom-1/4 right-1/4 w-20 h-20 rounded-full bg-gradient-to-r from-rose-300/20 to-pink-300/20 blur-xl animate-float"></div>
      
      {/* Floating music notes */}
      <motion.div 
        className="absolute top-1/4 left-1/4"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <FaMusic className="text-amber-500/30 text-4xl" />
      </motion.div>
      <motion.div 
        className="absolute top-1/3 right-1/3"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
      >
        <FaMusic className="text-teal-500/30 text-5xl" />
      </motion.div>
      <motion.div 
        className="absolute bottom-1/4 right-1/4"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
      >
        <FaMusic className="text-rose-500/30 text-3xl" />
      </motion.div>
      
      <div className="relative z-10 w-full max-w-4xl p-6">
        <div className="text-center mb-10">
          <motion.div 
            className="inline-flex items-center justify-center p-4 rounded-full mb-4 shadow-lg"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
<img src='/ChatGPT_Image_Jun_28__2025__03_01_55_PM-removebg-preview.png' alt='akm' 
              className='w-32'/>          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Synchronous
            </span>
          </h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Collaborative music listening in perfect sync
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Room Card */}
          <motion.div 
            className="bg-white rounded-2xl p-6 border border-amber-100 shadow-lg"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-full mr-4 shadow-md">
                <FaPlus className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Create a Room</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              Start a new listening session and invite friends to join
            </p>
            
            {/* <div className="mb-4">
              <label className="block text-gray-700 text-sm mb-2">Room Name</label>
              <input
                type="text"
                placeholder="e.g. Chill Vibes"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-amber-50 border border-amber-200 text-gray-800 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div> */}
            
            <button
              onClick={createRoom}
              disabled={isConnecting}
              className={`w-full py-3 rounded-lg text-white font-medium transition-all duration-300 flex items-center justify-center ${
                isConnecting 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
            >
              {isConnecting ? (
                <>
                  <span className="animate-pulse">Connecting</span>
                  <span className="ml-2 animate-pulse">...</span>
                </>
              ) : (
                <>
                  Create Room
                  <FaPlus className="ml-2" />
                </>
              )}
            </button>
          </motion.div>
          
          {/* Join Room Card */}
          <motion.div 
            className="bg-white rounded-2xl p-6 border border-teal-100 shadow-lg"
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-3 rounded-full mr-4 shadow-md">
                <FaUsers className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Join a Room</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              Enter a room ID to join an existing listening session
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm mb-2">Room ID</label>
              <input
                type="text"
                placeholder="e.g. ABC123"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="w-full bg-teal-50 border border-teal-200 text-gray-800 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={joinRoom}
              className="w-full py-3 rounded-lg text-white font-medium transition-all duration-300 flex items-center justify-center bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Join Room
              <FaSignInAlt className="ml-2" />
            </button>
          </motion.div>
        </div>
        
        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            className="bg-white p-5 rounded-xl border border-amber-100 shadow-md"
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-3">
              <FaUsers className="text-amber-600" />
            </div>
            <h3 className="text-gray-800 font-medium mb-2">Real-time Sync</h3>
            <p className="text-gray-600 text-sm">
              Perfect synchronization across all devices
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-white p-5 rounded-xl border border-teal-100 shadow-md"
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-3">
              <FaMusic className="text-teal-600" />
            </div>
            <h3 className="text-gray-800 font-medium mb-2">Huge Music Library</h3>
            <p className="text-gray-600 text-sm">
              Access millions of songs from YouTube
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-white p-5 rounded-xl border border-rose-100 shadow-md"
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="bg-gradient-to-r from-rose-500/10 to-pink-500/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-3">
              <FaWaveSquare className="text-rose-600" />
            </div>
            <h3 className="text-gray-800 font-medium mb-2">No Setup Needed</h3>
            <p className="text-gray-600 text-sm">
              Start listening instantly - no accounts required
            </p>
          </motion.div>
        </div>
        
        {/* Error Message */}
        {socketError && (
          <motion.div 
            className="mt-6 bg-rose-100 p-4 rounded-xl border border-rose-300 text-rose-700 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {socketError}
          </motion.div>
        )}
        
        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Connect with friends. Listen together. Anywhere.</p>
        </div>
      </div>
      
      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        
        @keyframes float-delay {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delay {
          animation: float-delay 10s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default HomePage;