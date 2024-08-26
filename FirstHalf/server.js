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
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'], // Ensure both WebSocket and polling are allowed
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

// Object to store mapping of thread IDs to chatbot user IDs
const threadToUserMap = {};

// Helper function to map Teams conversation ID to chatbot users
const mapTeamsUserToChatbotUser = (conversationId) => {
  return threadToUserMap[conversationId] || null;
};

// Route to test backend connection
app.get('/test-connection', (req, res) => {
  res.status(200).send('Backend is reachable');
});

// Route to test Socket.IO connection by emitting a message to a user
app.get('/test-socket', (req, res) => {
  const testMessage = 'Test message from backend';
  const testUserId = 'user1'; // Change to 'user2' or 'user3' to test for other users

  // Emit the test message to the specific user room
  io.to(testUserId).emit('chat message', { user: false, text: testMessage });

  console.log(`Test message emitted to room ${testUserId}: ${testMessage}`);
  res.status(200).send(`Test message sent to ${testUserId}`);
});

// Route to get the last 40-50 messages for a specific user (Updation 1)
app.get('/get-messages/:userId', (req, res) => {
  const { userId } = req.params;

  // Simulate fetching messages from a database or memory
  const messages = []; // Add logic to fetch stored messages for the user

  if (userId in users) {
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

    // Assign the correct conversation ID based on the userId
    let conversationId;
    if (userId === 'user1') {
      conversationId = '19:a705dff9e44740a787d8e1813a38a2dd@thread.tacv2'; // Titan's conversationId
    } else if (userId === 'user2') {
      conversationId = '19:bxxxx@thread.tacv2'; // Dcathelon's conversationId
    } else if (userId === 'user3') {
      conversationId = '19:cxxxx@thread.tacv2'; // DRL's conversationId
    }

    console.log(`Assigned conversationId ${conversationId} for user ${userId}`);

    // Store the mapping of conversation ID to the chatbot user
    threadToUserMap[conversationId] = userId;
    console.log(`Mapped conversationId ${conversationId} to userId ${userId}`);
    console.log('Current threadToUserMap:', threadToUserMap); // Log the current state of the map

    // Send the message to Microsoft Teams using the incoming webhook
    await axios.post(TEAMS_WEBHOOK_URL, {
      text: `Message from ${user.name} (${user.email}): ${message}`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending message to Teams:', error);
    res.status(500).json({ error: 'Failed to send message to Teams' });
  }
});


// Route to receive messages from Microsoft Teams (Outgoing Webhook) - Updation 2
app.post('/receive-from-teams', (req, res) => {
  try {
    // Log the full payload received from Teams
    console.log('Raw Payload received from Teams:', JSON.stringify(req.body, null, 2));

    // Extract the conversation ID and message content from the Teams payload
    const conversationId = req.body.conversation.id.split(';')[0]; // Extract conversation ID before any message ID
    const htmlContent = req.body.text || (req.body.attachments && req.body.attachments[0]?.content);
    const textContent = htmlContent.replace(/<\/?[^>]+(>|$)/g, ''); // Strip HTML tags

    console.log('Extracted message content:', textContent);
    console.log('Conversation ID:', conversationId);
    console.log('Current threadToUserMap:', threadToUserMap);  // Log the current map here

    // Check if this conversationId is mapped to a specific chatbot user
    const chatbotUserId = threadToUserMap[conversationId];

    if (!chatbotUserId) {
      throw new Error(`Invalid payload: Unable to map conversation to chatbot user. Conversation ID: ${conversationId}`);
    }

    console.log(`Mapped conversationId ${conversationId} to chatbot userId: ${chatbotUserId}`);

    // Emit the message to the correct chatbot user based on conversation ID
    if (textContent && chatbotUserId) {
      io.to(chatbotUserId).emit('chat message', {
        user: false,
        text: textContent,
      });
      console.log(`Emitted message to room ${chatbotUserId}: ${textContent}`);
    } else {
      console.log('No matching user found for this conversation. Message not emitted.');
    }

    // Send a success response to Teams
    res.status(200).json({ text: 'Message received by the website' });
  } catch (error) {
    // Log the error with detailed information
    console.error('Error processing the request:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

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
