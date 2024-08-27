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
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Set up Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: 'https://frontendchatbot.onrender.com', // Your frontend's URL
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 90000, // Increase ping timeout to 60 seconds
  pingInterval: 30000, // Increase ping interval to 25 seconds
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

// In-memory store for messages
const messageStore = {
  user1: [],
  user2: [],
  user3: [],
};

// Object to store mapping of thread IDs to chatbot user IDs
const threadToUserMap = {};

// Helper function to map Teams conversation ID to chatbot users
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

// Route to test backend connection
app.get('/test-connection', (req, res) => {
  res.status(200).send('Backend is reachable');
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

    // Extract the conversationId from the response or set it dynamically based on the user
    let conversationId = response.data.id || `19:${userId}@thread.tacv2`;

    // Update threadToUserMap
    threadToUserMap[conversationId] = userId;

    console.log(`Mapped conversationId ${conversationId} to userId ${userId}`);
    console.log('Updated threadToUserMap:', threadToUserMap);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message to Teams:', error);
    res.status(500).json({ error: 'Failed to send message to Teams' });
  }
});


// Route to receive messages from Microsoft Teams
app.post('/receive-from-teams', (req, res) => {
  try {
    console.log('Raw Payload received from Teams:', JSON.stringify(req.body, null, 2));

    const conversationId = req.body.conversation.id.split(';')[0];
    const htmlContent = req.body.text || (req.body.attachments && req.body.attachments[0]?.content);
    const textContent = htmlContent.replace(/<\/?[^>]+(>|$)/g, ''); // Strip HTML tags

    console.log('Extracted message content:', textContent);
    console.log('Conversation ID:', conversationId);

    const chatbotUserId = mapTeamsUserToChatbotUser(conversationId);

    if (!chatbotUserId) {
      throw new Error('Invalid payload: Unable to map conversation to chatbot user.');
    }

    // Emit the message to the correct chatbot user based on conversation ID
    if (textContent && chatbotUserId) {
      messageStore[chatbotUserId].push({ user: false, text: textContent });
      io.to(chatbotUserId).emit('chat message', {
        user: false,
        text: textContent,
      });
      console.log(`Emitted message to room ${chatbotUserId}: ${textContent}`);
    } else {
      console.log('No matching user found for this conversation. Message not emitted.');
    }

    res.status(200).json({ text: 'Message received by the website' });
  } catch (error) {
    console.error('Error processing the request:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


// Handle undefined routes with a JSON 404 response
app.use((req, res) => {
  res.status(404).json({ error: 'Resource not found' });
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (userId) => {
    console.log(`User ${userId} joined room`);
    socket.join(userId); // Assign user to a specific room
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${reason}`); // Log reason for disconnection
  });
});

// Start the server
const port = process.env.PORT || 5002; // Use Render-assigned port or default to 5002
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
