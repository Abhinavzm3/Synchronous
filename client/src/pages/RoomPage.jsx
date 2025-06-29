import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import ReactPlayer from 'react-player/youtube';
import axios from 'axios';
import { FaYoutube, FaPlay, FaPause, FaUsers, FaVolumeUp, FaSyncAlt, FaSearch } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

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
      const response = await axios.get(`https://synchronous-lesl.onrender.com/api/search?q=${encodeURIComponent(searchQuery)}`);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-800 p-4">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-xl text-center max-w-md border border-white/20">
          <div className="bg-red-500 text-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <MdClose size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Room Error</h2>
          <p className="text-red-300 text-lg mb-6">{roomError}</p>
          <p className="text-white/80 mb-6">Redirecting to home page...</p>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full animate-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 to-purple-700 p-4 shadow-lg backdrop-blur-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-indigo-600 p-2 rounded-lg mr-3">
              <FaUsers size={20} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold truncate max-w-[120px] md:max-w-xs">
                {roomInfo?.name || 'Music Room'}
              </h1>
              <div className="text-xs text-indigo-200 flex items-center">
                Room ID: {roomId}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div 
              className="relative group"
              onClick={() => setShowUserList(!showUserList)}
            >
              <div className="bg-indigo-600 p-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition">
                <div className="flex items-center">
                  <span className="mr-2">{users.length}</span>
                  <FaUsers />
                </div>
              </div>
              
              {showUserList && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl z-10 border border-gray-700">
                  <div className="p-3 font-medium text-sm border-b border-gray-700">Users in Room</div>
                  <div className="max-h-60 overflow-y-auto">
                    {users.map((user, index) => (
                      <div key={index} className="p-3 flex items-center hover:bg-gray-700/50">
                        <div className="bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                          <span className="text-sm">U{index+1}</span>
                        </div>
                        <span className="truncate">{user}</span>
                        {isAdmin && user === socket.id && (
                          <span className="ml-auto bg-yellow-500 text-black text-xs px-2 py-1 rounded">Admin</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-800/50 p-2 rounded-lg flex items-center text-sm">
              <FaSyncAlt className="mr-1 text-green-400" />
              <span>{syncError.toFixed(1)}s</span>
            </div>
            
            {isAdmin && (
              <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium">
                Admin
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-4xl">
        {/* Now Playing Section */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-700/50 shadow-xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {roomInfo?.currentSong?.artwork ? (
              <div className="mb-4 md:mb-0 md:mr-6 flex-shrink-0">
                <div className="bg-gray-700/30 border-2 border-dashed border-gray-600/50 rounded-xl w-full aspect-square max-w-[200px] overflow-hidden">
                  <img 
                    src={roomInfo.currentSong.artwork} 
                    alt="Album cover" 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-700/30 border-2 border-dashed border-gray-600/50 rounded-xl w-full aspect-square max-w-[200px] flex items-center justify-center mb-4 md:mb-0 md:mr-6">
                <div className="text-gray-500 text-center">
                  <div className="text-5xl mb-2">♪</div>
                  <p className="text-sm">No song playing</p>
                </div>
              </div>
            )}
            
            <div className="flex-1">
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-1 truncate">
                  {roomInfo?.currentSong?.title || 'Select a song to play'}
                </h2>
                <p className="text-purple-300 truncate">
                  {roomInfo?.currentSong?.artist || 'Music Room'}
                </p>
              </div>
              
              {/* Player */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handlePlay}
                    disabled={!isAdmin || playback.isPlaying || !roomInfo?.currentSong}
                    className={`p-3 rounded-full shadow-lg ${
                      playback.isPlaying || !isAdmin || !roomInfo?.currentSong
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } transition-all duration-300 transform hover:scale-105`}
                  >
                    <FaPlay />
                  </button>
                  
                  <button
                    onClick={handlePause}
                    disabled={!isAdmin || !playback.isPlaying}
                    className={`p-3 rounded-full shadow-lg ${
                      !playback.isPlaying || !isAdmin
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    } transition-all duration-300 transform hover:scale-105`}
                  >
                    <FaPause />
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
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
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <FaVolumeUp className="text-gray-400" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

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
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <FaSearch className="mr-2 text-indigo-400" />
                Search Songs
              </h2>
              <div className="flex items-center bg-red-600/20 px-3 py-1 rounded-full text-sm">
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
                className="flex-grow bg-gray-700/50 border border-gray-600/50 text-white px-4 py-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={performSearch}
                disabled={isSearching || !searchQuery.trim()}
                className={`bg-indigo-600 text-white px-5 rounded-r-lg transition ${
                  isSearching || !searchQuery.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
                } flex items-center justify-center`}
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Search'
                )}
              </button>
            </div>
            
            {searchError && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-300 p-3 rounded-lg mb-4 text-center">
                {searchError}
              </div>
            )}
            
            {isSearching ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {searchResults.map((song) => (
                  <div 
                    key={song.id} 
                    className="bg-gray-700/30 hover:bg-indigo-900/20 backdrop-blur-sm border border-gray-600/50 rounded-xl p-4 cursor-pointer transition-all duration-300 transform hover:scale-[1.02]"
                    onClick={() => handleSelectSong(song)}
                  >
                    <div className="flex">
                      {song.artwork ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden mr-4 flex-shrink-0">
                          <img 
                            src={song.artwork} 
                            alt="Album cover" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-600/30 border-2 border-dashed border-gray-500/50 rounded-lg w-16 h-16 mr-4 flex items-center justify-center">
                          <div className="text-3xl">♪</div>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold truncate">{song.title}</h3>
                        <p className="text-sm text-purple-300 truncate">{song.artist}</p>
                        <div className="mt-2">
                          <span className="bg-indigo-600/30 text-indigo-300 text-xs px-2 py-1 rounded">
                            Select
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-400">No results found</p>
                <p className="text-gray-500 text-sm mt-2">Try different keywords</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-block bg-gradient-to-r from-indigo-500 to-purple-500 p-4 rounded-full mb-4">
                  <FaYoutube size={32} />
                </div>
                <h3 className="text-xl font-medium mb-2">Search for music</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Use the search bar above to find songs on YouTube. Select a song to play it in the room for everyone.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sync Status Card */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-5 mt-6 border border-gray-700/50 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600/50">
              <div className="flex items-center">
                <div className="bg-indigo-600/20 p-3 rounded-lg mr-4">
                  <FaSyncAlt className="text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-400">Sync Status</h4>
                  <p className={`text-lg font-bold ${syncError > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {syncError > 1 ? 'Adjusting' : 'In Sync'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600/50">
              <div className="flex items-center">
                <div className="bg-purple-600/20 p-3 rounded-lg mr-4">
                  <FaUsers className="text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-400">Listeners</h4>
                  <p className="text-lg font-bold text-white">{users.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600/50">
              <div className="flex items-center">
                <div className="bg-green-600/20 p-3 rounded-lg mr-4">
                  <FaVolumeUp className="text-green-400" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-400">Volume</h4>
                  <p className="text-lg font-bold text-white">{volume}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-6 text-center text-gray-500 text-sm">
        <div className="container mx-auto">
          <p>Collaborative Music Room • All devices synchronized</p>
          <p className="mt-2">Room ID: {roomId}</p>
        </div>
      </footer>

      {/* Custom Scrollbar Style */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
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