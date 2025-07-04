// // server.js
// require('dotenv').config();
// const express    = require('express');
// const cors       = require('cors');
// const http       = require('http');
// const socketIo   = require('socket.io');
// const axios      = require('axios');
// const path       = require('path');

// const app  = express();
// const PORT = process.env.PORT || 5000;
// const HOST = '0.0.0.0';

// // CORS: only your frontend
// app.use(cors({
//   origin: [process.env.FRONTEND_URL,'http://localhost:5173'], 
//   methods: ['GET','POST'],
//   credentials: true
// }));

// // Logger
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

// // In‑memory rooms
// const rooms = new Map();
// const genId = () => Math.random().toString(36).substring(2,8).toUpperCase();
// const getPos = ({ isPlaying, position, timestamp }= {}) => {
//   if (!timestamp) return 0;
//   const elapsed = isPlaying ? (Date.now() - timestamp)/1000 : 0;
//   return position + elapsed;
// };

// // YouTube API
// const YT_KEY = process.env.YOUTUBE_API_KEY;
// const YT_URL = 'https://www.googleapis.com/youtube/v3/search';

// app.get('/api/search', async (req, res) => {
//   const q = req.query.q;
//   if (!q) return res.json([]);
//   try {
//     const { data } = await axios.get(YT_URL, {
//       params: {
//         part:       'snippet',
//         q:          `${q} official music video`,
//         type:       'video',
//         videoCategoryId: '10',
//         maxResults: 10,
//         key:        YT_KEY
//       }
//     });
//     const tracks = data.items.map(i => ({
//       id:      i.id.videoId,
//       title:   i.snippet.title,
//       artist:  i.snippet.channelTitle,
//       artwork: i.snippet.thumbnails.high?.url || i.snippet.thumbnails.default.url,
//       url:     `https://www.youtube.com/watch?v=${i.id.videoId}`
//     }));
//     res.json(tracks);
//   } catch (e) {
//     console.error('YT search error:', e.message);
//     res.status(500).json({ error: 'search failed' });
//   }
// });

// // Serve React build
// app.use(express.static(path.join(__dirname, 'client/build')));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
// });

// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: { origin:[ process.env.FRONTEND_URL,'http://localhost:5173' ], methods: ['GET','POST'] }
// });

// const broadcastSync = roomId => {
//   const room = rooms.get(roomId);
//   if (!room) return;
//   io.to(roomId).emit('sync_playback', {
//     position:  getPos(room.playback),
//     timestamp: Date.now(),
//     isPlaying: room.playback.isPlaying
//   });
// };

// const startSync = roomId => {
//   const room = rooms.get(roomId);
//   if (!room || room.syncInterval) return;
//   room.syncInterval = setInterval(() => broadcastSync(roomId), 100);
// };

// const stopSync = roomId => {
//   const room = rooms.get(roomId);
//   if (room && room.syncInterval) {
//     clearInterval(room.syncInterval);
//     room.syncInterval = null;
//   }
// };

// io.on('connection', socket => {
//   let currentRoom = null;

//   socket.on('create_room', (name, cb) => {
//     const id = genId();
//     rooms.set(id, {
//       id,
//       name: name||`Room ${id}`,
//       playback: { isPlaying:false, position:0, timestamp:Date.now() },
//       users: new Set([socket.id]),
//       admin: socket.id,
//       syncInterval: null
//     });
//     socket.join(id);
//     currentRoom = id;
//     cb?.(id);
//   });

//   socket.on('join_room', (id, cb) => {
//     const room = rooms.get(id);
//     if (!room) return cb?.({ error:'Room not found' });
//     room.users.add(socket.id);
//     socket.join(id);
//     currentRoom = id;
//     if (room.users.size===1) startSync(id);
//     cb?.({
//       roomId: id,
//       roomName: room.name,
//       playback: room.playback,
//       isAdmin: room.admin===socket.id
//     });
//     socket.to(id).emit('user_joined', socket.id);
//   });

//   const adminAction = (evt, fn) => {
//     socket.on(evt, data => {
//       const room = rooms.get(currentRoom);
//       if (!room || room.admin!==socket.id) return;
//       fn(room, data);
//       socket.to(currentRoom).emit(evt, data);
//       broadcastSync(currentRoom);
//     });
//   };

//   adminAction('select_song', (room, song) => {
//     room.currentSong = song;
//     room.playback = { isPlaying:true, position:0, timestamp:Date.now() };
//   });
//   adminAction('play', room => {
//     room.playback = { ...room.playback, isPlaying:true, timestamp:Date.now() };
//   });
//   adminAction('pause', room => {
//     const elapsed = (Date.now()-room.playback.timestamp)/1000;
//     room.playback = {
//       isPlaying:false,
//       position: room.playback.position + elapsed,
//       timestamp: Date.now()
//     };
//   });
//   adminAction('seek', (room, pos) => {
//     room.playback = { ...room.playback, position:pos, timestamp:Date.now() };
//   });

//   socket.on('disconnect', () => {
//     const room = rooms.get(currentRoom);
//     if (!room) return;
//     room.users.delete(socket.id);
//     if (room.admin===socket.id && room.users.size>0) {
//       room.admin = [...room.users][0];
//       io.to(currentRoom).emit('admin_changed', room.admin);
//     }
//     if (room.users.size===0) {
//       stopSync(currentRoom);
//       rooms.delete(currentRoom);
//     } else {
//       socket.to(currentRoom).emit('user_left', socket.id);
//     }
//   });
// });

// server.listen(PORT, HOST, () =>
//   console.log(`Server listening on http://${HOST}:${PORT}`)
// );
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Enable CORS for all routes
app.use(cors({
  origin: [process.env.FRONTEND_URL,'http://localhost:5173'], // Allow all origins
  methods: ['GET', 'POST']
}));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// In-memory storage for rooms
const rooms = new Map();
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Helper to calculate current position
const getCurrentPosition = (playback) => {
  if (!playback) return 0;
  const elapsed = playback.isPlaying ? (Date.now() - playback.timestamp) / 1000 : 0;
  return playback.position + elapsed;
};

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

// YouTube search endpoint
app.get('/api/search', async (req, res) => {
  console.log('Search request:', req.query);
  const query = req.query.q;
  if (!query) return res.json([]);

  try {
    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        part: 'snippet',
        q: `${query} official music video`,
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults: 10,
        key: YOUTUBE_API_KEY
      }
    });

    const tracks = response.data.items.map(item => {
      const vid = item.id.videoId;
      return {
        id: vid,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        artwork: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        url: `https://www.youtube.com/watch?v=${vid}`
      };
    });

    res.json(tracks);
  } catch (err) {
    console.error('YouTube search error:', err);
    res.json([]);
  }
});

// Fallback to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin:[process.env.FRONTEND_URL,'http://localhost:5173'], methods: ['GET', 'POST'] }
});

// Broadcast sync events to all clients in a room
const broadcastSync = (roomId) => {
  const room = rooms.get(roomId);
  if (!room || !room.playback) return;
  
  const currentPosition = getCurrentPosition(room.playback);
  
  io.to(roomId).emit('sync_playback', {
    position: currentPosition,
    timestamp: Date.now(),
    isPlaying: room.playback.isPlaying
  });
};

// Start sync for a room
const startSyncForRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (!room || room.syncInterval) return;

  room.syncInterval = setInterval(() => broadcastSync(roomId), 100); // Sync every 0.1 seconds
  console.log(`Started sync for room ${roomId}`);
};

// Stop sync for a room
const stopSyncForRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (!room || !room.syncInterval) return;
  
  clearInterval(room.syncInterval);
  room.syncInterval = null;
  console.log(`Stopped sync for room ${roomId}`);
};

// Socket.io collaborative room logic
io.on('connection', socket => {
  console.log('New client connected:', socket.id);
  let currentRoom = null;

  // Create new room
  socket.on('create_room', (roomName, cb) => {
    const roomId = generateRoomId();
    const room = {
      id: roomId,
      name: roomName || `Room ${roomId}`,
      currentSong: null,
      playback: { isPlaying: false, position: 0, timestamp: Date.now() },
      users: new Set([socket.id]),
      admin: socket.id,
      syncInterval: null
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    currentRoom = roomId;
    console.log(`Room created: ${roomId}`);
    
    if (typeof cb === 'function') cb(roomId);
  });

  // Join existing room
  socket.on('join_room', (roomId, cb) => {
    const room = rooms.get(roomId);
    if (!room) {
      if (typeof cb === 'function') cb({ error: 'Room not found' });
      return;
    }
    
    // First user becomes admin
    if (room.users.size === 0) {
      room.admin = socket.id;
    }
    
    room.users.add(socket.id);
    socket.join(roomId);
    currentRoom = roomId;
    
    // Start sync if first user
    if (room.users.size === 1) {
      startSyncForRoom(roomId);
    }
    
    if (typeof cb === 'function') {
      cb({
        roomId,
        roomName: room.name,
        currentSong: room.currentSong,
        playback: room.playback,
        isAdmin: room.admin === socket.id
      });
    }
    
    // Notify other users
    socket.to(roomId).emit('user_joined', socket.id);
    console.log(`${socket.id} joined ${roomId}`);
  });

  // Admin-only actions helper
  const adminAction = (event, handler) => {
    socket.on(event, data => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room || room.admin !== socket.id) return;
      
      handler(room, data);
      socket.to(currentRoom).emit(event, data);
      
      // Immediately sync after admin action
      broadcastSync(currentRoom);
    });
  };

  adminAction('select_song', (room, song) => {
    room.currentSong = song;
    room.playback = { 
      isPlaying: true, 
      position: 0, 
      timestamp: Date.now() 
    };
  });

  adminAction('play', room => {
    room.playback = { 
      isPlaying: true, 
      position: room.playback.position, 
      timestamp: Date.now() 
    };
  });

  adminAction('pause', room => {
    const elapsed = (Date.now() - room.playback.timestamp) / 1000;
    room.playback = { 
      isPlaying: false, 
      position: room.playback.position + elapsed, 
      timestamp: Date.now() 
    };
  });

  adminAction('seek', (room, pos) => {
    room.playback = { 
      isPlaying: room.playback.isPlaying, 
      position: pos, 
      timestamp: Date.now() 
    };
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.users.delete(socket.id);
    
    // Assign new admin if needed
    if (room.admin === socket.id && room.users.size > 0) {
      room.admin = Array.from(room.users)[0];
      io.to(currentRoom).emit('admin_changed', room.admin);
    }
    
    // Delete room if empty
    if (room.users.size === 0) {
      stopSyncForRoom(currentRoom);
      rooms.delete(currentRoom);
      console.log(`Room deleted: ${currentRoom}`);
    } else {
      socket.to(currentRoom).emit('user_left', socket.id);
    }
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
}); 