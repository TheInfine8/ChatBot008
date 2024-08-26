const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// In-memory conversation ID mapping (You can replace this with a database if needed)
const conversationMap = {}; // To store { conversationId: userId }

// CORS configuration for Express
app.use(
  cors({
    origin: 'https://frontendchatbot.onrender.com', // Update this to your deployed frontend URL
    methods: ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE'],
    credentials: true, // Allow credentials (cookies, auth headers, etc.)
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
  transports: ['websocket', 'polling'], // Ensure both WebSocket and polling are allowed
  pingTimeout: 90000, // Increase ping timeout to 90 seconds
  pingInterval: 30000, // Increase ping interval to 30 seconds
});

// Body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Microsoft Teams Incoming Webhook URL
const TEAMS_WEBHOOK_URL =
  'https://filoffeesoftwarepvtltd.webhook.office.com/webhookb2/dce0c08f-a7b6-429f-9473-4ebfbb453002@0644003f-0b3f-4517-814d-768fa69ab4ae/IncomingWebhook/023b8776e0884ae9821430ccad34e0a8/108d16ad-07a3-4dcf-88a2-88f4fcf28183';

// Function to dynamically map conversation IDs to user IDs
const mapConversationIdToUser = (conversationId, userId) => {
  conversationMap[conversationId] = userId;
};

// Route to send messages from the chatbot to Microsoft Teams
app.post('/send-to-teams', async (req, res) => {
  const { message, userId } = req.body;

  if (!message || !userId) {
    return res.status(400).json({ error: 'Message and user ID are required' });
  }

  try {
    console.log(`Sending message to Teams from user ${userId}: ${message}`);

    // Send message to Microsoft Teams using the webhook
    const response = await axios.post(TEAMS_WEBHOOK_URL, {
      text: `Message from user ${userId}: ${message}`,
    });

    // Store the conversation ID if it's not already mapped
    const conversationId = response.data.conversation.id;
    if (!conversationMap[conversationId]) {
      mapConversationIdToUser(conversationId, userId);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message to Teams:', error.message);
    res.status(500).json({ error: 'Failed to send message to Teams' });
  }
});

// Route to receive messages from Microsoft Teams
app.post('/receive-from-teams', (req, res) => {
  try {
    console.log(
      'Received payload from Teams:',
      JSON.stringify(req.body, null, 2)
    );

    // Extract the conversation ID and message content from the Teams payload
    const conversationId = req.body.conversation.id.split(';')[0];
    const textContent = req.body.text.replace(/<\/?[^>]+(>|$)/g, '').trim();

    // Find the user by matching the conversation ID
    const userId = conversationMap[conversationId];

    if (!userId) {
      throw new Error('Conversation ID not mapped to any user.');
    }

    console.log(`Mapped conversation ID ${conversationId} to user ${userId}`);
    console.log(`Message content: ${textContent}`);

    // Emit the message to the user's chat window
    io.to(userId).emit('chat message', { user: false, text: textContent });

    res.status(200).json({ text: 'Message received by the website' });
  } catch (error) {
    console.error('Error processing Teams message:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log('New client connected');

  // Event for when a user joins a room
  socket.on('join', (userId) => {
    console.log(`User ${userId} joined room`);
    socket.join(userId); // Assign the user to a specific room
  });

  // Event for disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${reason}`);
  });
});

// Start the server
const port = process.env.PORT || 5002;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
