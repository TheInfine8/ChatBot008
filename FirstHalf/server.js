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
    origin: 'https://frontendchatbot.onrender.com',
    methods: ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Set up Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: 'https://frontendchatbot.onrender.com',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 90000,
  pingInterval: 30000,
});

// Body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mock user data to simulate different users
const users = {
  user1: { id: 1, email: 'Titan@example.com', name: 'Titan' },
  user2: { id: 2, email: 'DCathelon@example.com', name: 'DCathelon' },
  user3: { id: 3, email: 'DRL@example.com', name: 'DRL' },
};

// In-memory store for messages and conversation ID mapping
const messageStore = {
  user1: [],
  user2: [],
  user3: [],
};

const threadToUserMap = {};

// Helper function to dynamically map Teams conversation ID to chatbot users
const mapTeamsUserToChatbotUser = (conversationId) => {
  return threadToUserMap[conversationId] || null;
};

// Route to fetch the last 50 messages for a user
app.get('/get-messages/:userId', (req, res) => {
  const { userId } = req.params;
  if (userId in users) {
    const messages = messageStore[userId] || [];
    res.status(200).json({ messages });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

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
    // Add the message to the message store
    messageStore[userId].push({ user: true, text: message });

    const response = await axios.post(TEAMS_WEBHOOK_URL, {
      text: `Message from ${user.name} (${user.email}): ${message}`,
    });

    // Get the conversation ID from Teams and store it dynamically for the user
    let conversationId = response.data.conversation.id.split(';')[0];
    threadToUserMap[conversationId] = userId;

    console.log(`Mapped conversationId ${conversationId} to userId ${userId}`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message to Teams:', error);
    res.status(500).json({ error: 'Failed to send message to Teams' });
  }
});

// Route to receive messages from Microsoft Teams
app.post('/receive-from-teams', (req, res) => {
  try {
    console.log(
      'Raw Payload received from Teams:',
      JSON.stringify(req.body, null, 2)
    );

    const conversationId = req.body.conversation.id.split(';')[0];
    const htmlContent =
      req.body.text ||
      (req.body.attachments && req.body.attachments[0]?.content);
    const textContent = htmlContent.replace(/<\/?[^>]+(>|$)/g, ''); // Strip HTML tags

    const chatbotUserId = mapTeamsUserToChatbotUser(conversationId);
    if (!chatbotUserId) {
      throw new Error('Unable to map conversation to chatbot user.');
    }

    // Emit the message to the correct user
    messageStore[chatbotUserId].push({ user: false, text: textContent });
    io.to(chatbotUserId).emit('chat message', {
      user: false,
      text: textContent,
    });

    res.status(200).json({ text: 'Message received by the website' });
  } catch (error) {
    console.error('Error processing the request:', error.message);
    res
      .status(500)
      .json({ error: 'Internal Server Error', details: error.message });
  }
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('join', (userId) => {
    console.log(`User ${userId} joined room`);
    socket.join(userId); // Assign user to a specific room
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${reason}`);
  });
});

// Start the server
const port = process.env.PORT || 5002;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
