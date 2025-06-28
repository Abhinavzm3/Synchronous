import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import ReactPlayer from 'react-player/youtube';
import axios from 'axios';
import { FaYoutube, FaPlay, FaPause, FaUsers, FaVolumeUp, FaSyncAlt, FaSearch, FaMusic } from 'react-icons/fa';
import { MdClose, MdQueueMusic } from 'react-icons/md';
import { motion } from 'framer-motion';

const RoomPage = () => {
  const { roomId } = useParams();
  const socket = useSocket();
  const navigate = useNavigate();
  const playerRef = useRef(null);
  
  const [roomInfo, setRoomInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [playback, setPlayback] = useState({ 
    isPlaying: false, 
    position: 0, 
    timestamp: Date.now() 
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [users, setUsers] = useState([]);
  const [roomError, setRoomError] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [lastSync, setLastSync] = useState(0);
  const [syncError, setSyncError] = useState(0);
  const [showUserList, setShowUserList] = useState(false);
  const [volume, setVolume] = useState(80);
  const syncThreshold = 1.5;

  // Detect mobile view on mount
  useEffect(() => {
    setIsMounted(true);
    setMobileView(window.innerWidth <= 768);
    
    const handleResize = () => {
      setMobileView(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main room join effect
  useEffect(() => {
    if (!socket || !isMounted) return;
    
    const handleRoomJoined = (data) => {
      setRoomInfo({
        id: roomId,
        name: data.roomName,
        currentSong: data.currentSong
      });
      setIsAdmin(data.isAdmin);
      setPlayback(data.playback);
      setUsers([socket.id]);
      
      // Initialize current time
      if (data.playback.isPlaying) {
        const elapsed = (Date.now() - data.playback.timestamp) / 1000;
        setCurrentTime(data.playback.position + elapsed);
      } else {
        setCurrentTime(data.playback.position);
      }
    };
    
    const handleUserJoined = (userId) => {
      setUsers(prev => [...prev, userId]);
    };
    
    const handleUserLeft = (userId) => {
      setUsers(prev => prev.filter(id => id !== userId));
    };
    
    const handleAdminChanged = (adminId) => {
      setIsAdmin(adminId === socket.id);
    };
    
    const handlePlaybackUpdate = (action, data) => {
      switch (action) {
        case 'select_song':
          setRoomInfo(prev => ({ ...prev, currentSong: data }));
          setPlayback({ 
            isPlaying: true, 
            position: 0, 
            timestamp: Date.now() 
          });
          setCurrentTime(0);
          setIsPlayerReady(false);
          
          // Force player to reload
          setTimeout(() => {
            if (playerRef.current) {
              playerRef.current.seekTo(0, 'seconds');
            }
          }, 500);
          break;
          
        case 'play':
          setPlayback(prev => ({ 
            ...prev, 
            isPlaying: true, 
            timestamp: Date.now() 
          }));
          break;
          
        case 'pause':
          const elapsed = (Date.now() - playback.timestamp) / 1000;
          setPlayback(prev => ({
            ...prev,
            isPlaying: false,
            position: prev.position + elapsed,
            timestamp: Date.now()
          }));
          break;
          
        case 'seek':
          setPlayback(prev => ({
            ...prev,
            position: data,
            timestamp: Date.now()
          }));
          setCurrentTime(data);
          if (playerRef.current) {
            playerRef.current.seekTo(data, 'seconds');
          }
          break;
          
        default:
          break;
      }
    };

    // Sync event handler
    const handleSyncPlayback = (data) => {
      // Calculate actual server position at this moment
      const serverElapsed = data.isPlaying ? (Date.now() - data.timestamp) / 1000 : 0;
      const serverPosition = data.position + serverElapsed;
      
      // Calculate our current position
      const localElapsed = playback.isPlaying ? (Date.now() - playback.timestamp) / 1000 : 0;
      const localPosition = playback.position + localElapsed;
      
      // Calculate drift
      const drift = Math.abs(serverPosition - localPosition);
      setSyncError(drift);
      
      // Correct if drift is beyond threshold
      if (drift > syncThreshold) {
        setCurrentTime(serverPosition);
        if (playerRef.current) {
          playerRef.current.seekTo(serverPosition, 'seconds');
        }
        
        // Update playback state to match server
        setPlayback({
          isPlaying: data.isPlaying,
          position: serverPosition,
          timestamp: Date.now()
        });
      }
      
      setLastSync(Date.now());
    };
    
    socket.emit('join_room', roomId, (response) => {
      if (response.error) {
        setRoomError(response.error);
        setTimeout(() => navigate('/'), 2000);
      } else {
        handleRoomJoined(response);
      }
    });
    
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('admin_changed', handleAdminChanged);
    socket.on('select_song', (data) => handlePlaybackUpdate('select_song', data));
    socket.on('play', () => handlePlaybackUpdate('play'));
    socket.on('pause', () => handlePlaybackUpdate('pause'));
    socket.on('seek', (data) => handlePlaybackUpdate('seek', data));
    socket.on('sync_playback', handleSyncPlayback);
    
    return () => {
      if (!socket) return;
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('admin_changed', handleAdminChanged);
      socket.off('select_song');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('sync_playback', handleSyncPlayback);
    };
  }, [socket, roomId, navigate, playback.timestamp, isMounted]);

  // Sync current time
  useEffect(() => {
    let interval;
    if (playback.isPlaying) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - playback.timestamp) / 1000;
        setCurrentTime(playback.position + elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [playback]);

  // Handle search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const searchTimer = setTimeout(() => {
      performSearch();
    }, 500);
    
    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  const performSearch = async () => {
    setSearchError('');
    setIsSearching(true);
    
    try {
      const response = await axios.get(`http://192.168.163.241:5000/api/search?q=${encodeURIComponent(searchQuery)}`);
      const results = Array.isArray(response.data) ? response.data : [];
      setSearchResults(results);
      
      if (results.length === 0) {
        setSearchError('No results found. Try different keywords.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Search service is currently unavailable. Please try again later.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSong = (song) => {
    if (socket) {
      socket.emit('select_song', song);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const handlePlay = () => {
    if (socket && isAdmin) {
      // Calculate accurate position
      const elapsed = playback.isPlaying ? 
        (Date.now() - playback.timestamp) / 1000 : 0;
      const currentPosition = playback.position + elapsed;
      
      socket.emit('play');
      setCurrentTime(currentPosition);
    }
  };

  const handlePause = () => {
    if (socket && isAdmin) {
      const elapsed = (Date.now() - playback.timestamp) / 1000;
      const currentPosition = playback.position + elapsed;
      
      socket.emit('pause');
      setCurrentTime(currentPosition);
    }
  };

  const handleSeek = (newPosition) => {
    if (socket && isAdmin) {
      socket.emit('seek', newPosition);
      setCurrentTime(newPosition);
    }
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle player ready event
  const handlePlayerReady = () => {
    setIsPlayerReady(true);
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, 'seconds');
    }
  };

  // Handle player start for mobile autoplay
  const handlePlayerStart = () => {
    if (!playback.isPlaying && isAdmin) {
      handlePlay();
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
  };

  if (roomError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 p-4">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl text-center max-w-md border border-amber-200">
          <div className="bg-red-500 text-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <MdClose size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Room Error</h2>
          <p className="text-red-500 text-lg mb-6">{roomError}</p>
          <p className="text-gray-600 mb-6">Redirecting to home page...</p>
          <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 text-gray-800 overflow-hidden relative">
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-gradient-to-r from-amber-200/30 to-orange-200/30 blur-xl animate-float"></div>
      <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-gradient-to-r from-teal-200/30 to-emerald-200/30 blur-xl animate-float-delay"></div>
      <div className="absolute bottom-1/4 left-1/3 w-28 h-28 rounded-full bg-gradient-to-r from-rose-200/30 to-pink-200/30 blur-xl animate-float"></div>
      
      {/* Floating music notes */}
      <motion.div 
        className="absolute top-1/4 left-1/4"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <FaMusic className="text-amber-400/40 text-4xl" />
      </motion.div>
      <motion.div 
        className="absolute top-1/3 right-1/3"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
      >
        <FaMusic className="text-teal-400/40 text-5xl" />
      </motion.div>

      {/* Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-sm p-4 shadow-md rounded-b-xl"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="  mr-1 ">
              <img src='/ChatGPT_Image_Jun_28__2025__03_01_55_PM-removebg-preview.png' alt='akm' 
              className='w-24'/>
             
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold truncate max-w-[120px] md:max-w-xs">
                {roomInfo?.name || 'Music Room'}
              </h1>
              <div className="text-xs text-amber-600 flex items-center">
                Room ID: {roomId}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div 
              className="relative group"
              onClick={() => setShowUserList(!showUserList)}
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-xl cursor-pointer shadow-md hover:shadow-lg transition">
                <div className="flex items-center text-white">
                  <span className="mr-2">{users.length}</span>
                  <FaUsers />
                </div>
              </div>
              
              {showUserList && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-10 border border-amber-100">
                  <div className="p-3 font-medium text-sm border-b border-amber-100 bg-amber-50 rounded-t-xl">Users in Room</div>
                  <div className="max-h-60 overflow-y-auto">
                    {users.map((user, index) => (
                      <motion.div 
                        key={index}
                        className="p-3 flex items-center hover:bg-amber-50 transition"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="bg-gradient-to-r from-amber-400 to-orange-400 w-8 h-8 rounded-full flex items-center justify-center mr-2 text-white">
                          <span className="text-sm">U{index+1}</span>
                        </div>
                        <span className="truncate">{user}</span>
                        {isAdmin && user === socket.id && (
                          <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-1 rounded-full">Admin</span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gradient-to-r from-teal-400 to-emerald-400 text-white px-3 py-1 rounded-full text-sm font-medium shadow-md">
              <FaSyncAlt className="inline mr-1" />
              <span>{syncError.toFixed(1)}s</span>
            </div>
            
            {isAdmin && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-md">
                Admin
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto p-4 max-w-4xl">
        {/* Now Playing Section */}
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-amber-100 shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col md:flex-row">
            {roomInfo?.currentSong?.artwork ? (
              <div className="mb-4 md:mb-0 md:mr-6 flex-shrink-0">
                <div className="rounded-xl w-full aspect-square max-w-[200px] overflow-hidden shadow-lg border-2 border-amber-100">
                  <img 
                    src={roomInfo.currentSong.artwork} 
                    alt="Album cover" 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              </div>
            ) : (
              <motion.div 
                className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-dashed border-amber-200 rounded-xl w-full aspect-square max-w-[200px] flex items-center justify-center mb-4 md:mb-0 md:mr-6"
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="text-amber-400 text-center">
                  <div className="text-5xl mb-2"><img src='/ChatGPT_Image_Jun_28__2025__03_01_55_PM-removebg-preview.png' alt='akm' 
              className='w-38'/></div>
                </div>
              </motion.div>
            )}
            
            <div className="flex-1">
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-1 truncate text-gray-800">
                  {roomInfo?.currentSong?.title || 'Select a song to play'}
                </h2>
                <p className="text-orange-600 truncate">
                  {roomInfo?.currentSong?.artist || 'Music Room'}
                </p>
              </div>
              
              {/* Player */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <motion.button
                    onClick={handlePlay}
                    disabled={!isAdmin || playback.isPlaying || !roomInfo?.currentSong}
                    className={`p-3 rounded-full shadow-md ${
                      playback.isPlaying || !isAdmin || !roomInfo?.currentSong
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg'
                    } transition-all duration-300`}
                    whileHover={{ scale: !playback.isPlaying && isAdmin && roomInfo?.currentSong ? 1.1 : 1 }}
                  >
                    <FaPlay />
                  </motion.button>
                  
                  <motion.button
                    onClick={handlePause}
                    disabled={!isAdmin || !playback.isPlaying}
                    className={`p-3 rounded-full shadow-md ${
                      !playback.isPlaying || !isAdmin
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg'
                    } transition-all duration-300`}
                    whileHover={{ scale: playback.isPlaying && isAdmin ? 1.1 : 1 }}
                  >
                    <FaPause />
                  </motion.button>
                  
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>
                        {playerRef.current ? 
                          formatTime(playerRef.current.getDuration()) : '0:00'
                        }
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={playerRef.current ? playerRef.current.getDuration() : 100}
                      value={currentTime}
                      onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                      onMouseUp={() => handleSeek(currentTime)}
                      onTouchEnd={() => handleSeek(currentTime)}
                      className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <FaVolumeUp className="text-amber-500" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hidden player for audio control */}
        <div className="hidden">
          <ReactPlayer
            ref={playerRef}
            url={roomInfo?.currentSong?.url}
            playing={playback.isPlaying}
            volume={volume / 100}
            controls={false}
            width="100%"
            height="40px"
            onReady={handlePlayerReady}
            onStart={handlePlayerStart}
            onProgress={({ playedSeconds }) => {
              // Only update if we're not correcting
              if (Math.abs(playedSeconds - currentTime) < 2) {
                setCurrentTime(playedSeconds);
              }
            }}
            onSeek={seekTo => {
              if (isAdmin) {
                handleSeek(seekTo);
              }
            }}
            config={{
              youtube: {
                playerVars: { 
                  modestbranding: 1,
                  rel: 0,
                  showinfo: 0,
                  autoplay: 1,
                  playsinline: 1
                }
              }
            }}
          />
        </div>

        {/* Search Section for Admin */}
        {isAdmin && (
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 shadow-lg mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <FaSearch className="mr-2 text-amber-500" />
                Search Songs
              </h2>
              <div className="flex items-center bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm shadow-md">
                <FaYoutube className="mr-1" />
                <span>YouTube</span>
              </div>
            </div>
            
            <div className="flex mb-4">
              <input
                type="text"
                placeholder="Search for songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                className="flex-grow bg-amber-50 border border-amber-200 text-gray-800 px-4 py-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-inner"
              />
              <motion.button
                onClick={performSearch}
                disabled={isSearching || !searchQuery.trim()}
                className={`bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 rounded-r-lg transition flex items-center justify-center shadow-md ${
                  isSearching || !searchQuery.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                }`}
                whileHover={{ scale: !isSearching && searchQuery.trim() ? 1.05 : 1 }}
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Search'
                )}
              </motion.button>
            </div>
            
            {searchError && (
              <div className="bg-red-100 p-3 rounded-lg mb-4 text-red-600 text-center border border-red-200">
                {searchError}
              </div>
            )}
            
            {isSearching ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {searchResults.map((song) => (
                  <motion.div 
                    key={song.id} 
                    className="bg-gradient-to-br from-amber-50 to-orange-50 hover:bg-amber-100 backdrop-blur-sm border border-amber-200 rounded-xl p-4 cursor-pointer transition-all duration-300"
                    onClick={() => handleSelectSong(song)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex">
                      {song.artwork ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden mr-4 flex-shrink-0 border border-amber-200">
                          <img 
                            src={song.artwork} 
                            alt="Album cover" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-dashed border-amber-200 rounded-lg w-16 h-16 mr-4 flex items-center justify-center">
                          <div className="text-3xl text-amber-400">♪</div>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold truncate text-gray-800">{song.title}</h3>
                        <p className="text-sm text-orange-600 truncate">{song.artist}</p>
                        <div className="mt-2">
                          <span className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 text-xs px-2 py-1 rounded">
                            Select
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="text-center py-8">
                <div className="inline-block bg-gradient-to-r from-amber-200 to-orange-200 p-4 rounded-full mb-4">
                  <FaSearch className="text-amber-600 text-3xl" />
                </div>
                <p className="text-gray-600">No results found</p>
                <p className="text-gray-500 text-sm mt-2">Try different keywords</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-block bg-gradient-to-r from-amber-200 to-orange-200 p-4 rounded-full mb-4">
                  <FaYoutube className="text-amber-600 text-3xl" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-gray-800">Search for music</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Use the search bar above to find songs on YouTube. Select a song to play it in the room for everyone.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Sync Status Card */}
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-amber-100 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100 shadow-sm"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 rounded-lg mr-4">
                  <FaSyncAlt className="text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-600">Sync Status</h4>
                  <p className={`text-lg font-bold ${syncError > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {syncError > 1 ? 'Adjusting' : 'In Sync'}
                  </p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100 shadow-sm"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 rounded-lg mr-4">
                  <FaUsers className="text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-600">Listeners</h4>
                  <p className="text-lg font-bold text-gray-800">{users.length}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100 shadow-sm"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 rounded-lg mr-4">
                  <FaVolumeUp className="text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-600">Volume</h4>
                  <p className="text-lg font-bold text-gray-800">{volume}%</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-6 text-center text-gray-600 text-sm">
        <div className="container mx-auto">
          <p className="flex items-center justify-center">
            <FaMusic className="mr-2 text-amber-500" />
            Collaborative Music Room • All devices synchronized
          </p>
          <p className="mt-2">Room ID: {roomId}</p>
        </div>
      </footer>

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
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(253, 230, 138, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.7);
        }
        
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
        
        .animate-progress {
          animation: progress 2s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default RoomPage;