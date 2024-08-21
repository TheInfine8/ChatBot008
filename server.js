const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS configuration for Express
app.use(
  cors({
    origin: 'https://frontendchatbot.onrender.com', // Update this to your deployed frontend URL
    methods: ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE'],
    credentials: true, // Allow credentials (cookies, auth headers, etc.)
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  })
);

// Set up Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: 'https://frontendchatbot.onrender.com', // Your frontend's URL
    methods: ['GET', 'POST'],
    credentials: true, // Allow credentials (cookies, auth headers, etc.)
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  },
  transports: ['websocket', 'polling'], // Ensure both WebSocket and polling are allowed
});

// Body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Microsoft Teams Incoming Webhook URL (for Outgoing Webhook from Teams)
const TEAMS_WEBHOOK_URL =
  'https://filoffeesoftwarepvtltd.webhook.office.com/webhookb2/dce0c08f-a7b6-429f-9473-4ebfbb453002@0644003f-0b3f-4517-814d-768fa69ab4ae/IncomingWebhook/023b8776e0884ae9821430ccad34e0a8/108d16ad-07a3-4dcf-88a2-88f4fcf28183';

// Mock user data to simulate different users
const users = {
  user1: { id: 1, email: 'Titan@example.com', name: 'Titan' },
  user2: { id: 2, email: 'DCathelon@example.com', name: 'DCathelon' },
  user3: { id: 3, email: 'DRL@example.com', name: 'DRL' },
};

// Helper function to map Teams users to chatbot users
const mapTeamsUserToChatbotUser = (teamsUser) => {
  const userMap = {
    'titan@example.com': 'user1',
    'dcathelon@example.com': 'user2',
    'drl@example.com': 'user3',
  };
  return userMap[teamsUser.email] || null;
};

// Route to send messages from the website's chatbot to Microsoft Teams
app.post('/send-to-teams', async (req, res) => {
  const { message, userId } = req.body;

  if (!message || !userId) {
    return res.status(400).json({ error: 'Message and user ID are required' });
  }

  const user = users[userId];

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    console.log(`Message being sent to Teams from ${user.email}:`, message);

    // Send the message to Microsoft Teams using the incoming webhook
    const response = await axios.post(TEAMS_WEBHOOK_URL, {
      text: `Message from ${user.name} (${user.email}): ${message}`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message to Teams:', error);
    res.status(500).json({ error: 'Failed to send message to Teams' });
  }
});

// Route to receive messages from Microsoft Teams (Outgoing Webhook)
app.post('/receive-from-teams', (req, res) => {
  console.log('Payload received from Teams:', req.body);

  const { content, fromUser } = req.body;
  const text = content;
  const user = fromUser;

  // Map Teams user to chatbot user
  const chatbotUserId = mapTeamsUserToChatbotUser(user);

  if (text && chatbotUserId) {
    // Emit the message to the correct chatbot user room
    io.to(chatbotUserId).emit('chat message', { user: false, text });
    console.log(
      `Message from Teams: ${text} forwarded to chatbot user: ${chatbotUserId}`
    );
  }

  res.status(200).json({ text: 'Message received by the website' });
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (userId) => {
    console.log(`User ${userId} joined room`);
    socket.join(userId); // Assign user to a specific room
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const port = process.env.PORT || 5002; // Use Render-assigned port or default to 5002
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
