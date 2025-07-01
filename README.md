<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
 
</head>
<body>

  <h1>Synchronous - Collaborative Music Listening App</h1>
  <p><a href="https://synchronous-xt28.vercel.app/" target="_blank">https://synchronous-xt28.vercel.app/</a></p>

  <p><strong>Synchronous</strong> is a real-time collaborative music listening application built with the MERN stack (MongoDB, Express, React, Node.js). It allows multiple users to join a virtual room and listen to music simultaneously, with perfect synchronization across all devices.</p>

  <h2>🎵 Key Features</h2>
  <h3>Real-time Synchronization</h3>
  <ul>
    <li>All users hear the music at exactly the same time</li>
    <li>Automatic drift correction maintains perfect sync</li>
    <li>Adaptive latency compensation for different network conditions</li>
  </ul>

  <h3>🚪 Room Management</h3>
  <ul>
    <li>Create unique music rooms with custom names</li>
    <li>Join existing rooms with a simple ID</li>
    <li>See all participants in real-time</li>
  </ul>

  <h3>🎚️ Admin Controls</h3>
  <ul>
    <li>First user becomes room admin</li>
    <li>Search and select songs from YouTube's vast library</li>
    <li>Play, pause, and seek through tracks</li>
    <li>Control playback for all participants</li>
  </ul>

  <h3>📱 Mobile-Optimized</h3>
  <ul>
    <li>Fully responsive design works on all devices</li>
    <li>Touch-friendly controls for mobile users</li>
    <li>Mobile-specific audio optimizations</li>
  </ul>

  <h3>⚡ Performance Optimized</h3>
  <ul>
    <li>Efficient WebSocket communication</li>
    <li>Adaptive quality based on network conditions</li>
    <li>Minimal resource consumption</li>
  </ul>

  <h2>🛠 Technologies Used</h2>
  <h3>Frontend:</h3>
  <ul>
    <li>React (v18)</li>
    <li>React Router (v6)</li>
    <li>Socket.IO Client</li>
    <li>React Player</li>
    <li>Axios</li>
    <li>Tailwind CSS</li>
  </ul>

  <h3>Backend:</h3>
  <ul>
    <li>Node.js (v18+)</li>
    <li>Express.js</li>
    <li>Socket.IO</li>
    <li>Axios (for YouTube API)</li>
    <li>Cors</li>
  </ul>

  <h2>🚀 Getting Started</h2>
  <h3>Prerequisites</h3>
  <ul>
    <li>Node.js (v18 or higher)</li>
    <li>npm (v8 or higher)</li>
    <li>YouTube API Key (free tier)</li>
  </ul>

  <h3>Installation</h3>
  <pre><code>git clone https://github.com/your-username/synchronous-music-app.git
cd synchronous-music-app</code></pre>

  <h4>Set up backend:</h4>
  <pre><code>cd backend
npm install</code></pre>

  <h4>Set up frontend:</h4>
  <pre><code>cd ../client
npm install</code></pre>

  <h4>Configure environment variables:</h4>
  <p>Create a <code>.env</code> file in the <code>backend</code> directory:</p>
  <pre><code>YOUTUBE_API_KEY=your_youtube_api_key
PORT=5000</code></pre>

  <h4>Run the application:</h4>
  <p>Start backend:</p>
  <pre><code>cd backend
node server.js</code></pre>

  <p>Start frontend in a new terminal:</p>
  <pre><code>cd client
npm start</code></pre>

  <h2>🧭 Usage Guide</h2>

  <h3>Creating a Room</h3>
  <ul>
    <li>Go to the homepage</li>
    <li>Click "Create a Room"</li>
    <li>Optionally enter a room name</li>
    <li>You'll be redirected to your new room as the admin</li>
  </ul>

  <h3>Joining a Room</h3>
  <ul>
    <li>Get the room ID from a friend</li>
    <li>Enter it in the "Join a Room" field</li>
    <li>Click "Join Room"</li>
  </ul>

  <h3>Room Controls (Admin Only)</h3>
  <ul>
    <li>Search for songs: Use the search bar to find YouTube videos</li>
    <li>Play/Pause: Control playback for everyone</li>
    <li>Seek: Drag the progress bar to skip to any part of the song</li>
    <li>Volume: Adjust volume using the slider</li>
  </ul>

  <h3>As a Participant</h3>
  <ul>
    <li>Listen to music in perfect sync with others</li>
    <li>See what song is currently playing</li>
    <li>View other participants in the room</li>
  </ul>

  <h2>🛠 Troubleshooting</h2>

  <p><strong>Problem:</strong> Songs don't play in sync<br>
  <strong>Solution:</strong> Check your network connection. The app automatically corrects drift over time.</p>

  <p><strong>Problem:</strong> Can't find songs in search<br>
  <strong>Solution:</strong> Ensure you have a valid YouTube API key in your <code>.env</code> file</p>

  <p><strong>Problem:</strong> Mobile playback issues<br>
  <strong>Solution:</strong> Make sure "Auto-Play" is enabled in your mobile browser settings</p>

</body>
</html>
