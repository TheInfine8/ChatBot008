import React, { forwardRef, useState, useEffect } from 'react';
import './ChatWindow.css';
import io from 'socket.io-client';

// WebSocket connection to your backend
const socket = io('https://chatbot008backend.onrender.com', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5, // Limit reconnection attempts
  reconnectionDelay: 2000, // Delay between reconnection attempts
});

const ChatWindow = forwardRef((props, ref) => {
  const [messages, setMessages] = useState([]); // Messages state to store the conversation
  const [input, setInput] = useState(''); // Input field for sending messages

  // Mapping of user roles to user IDs
  const userIdMap = {
    Titan: 'user1',
    Dcathelon: 'user2',
    DRL: 'user3',
  };

  // Retrieve the logged-in user from localStorage
  const loggedInUser = localStorage.getItem('loggedInUser');
  const loggedInUserId = userIdMap[loggedInUser]; // Map the username to the correct userId

  // Fetch the last 50 messages for the user when component mounts
  useEffect(() => {
    if (!loggedInUserId) {
      alert('Invalid user! Please log in again.');
      return;
    }

    // Fetch last 50 messages from the server for the logged-in user
    fetch(
      `https://chatbot008backend.onrender.com/get-messages/${loggedInUserId}`
    )
      .then((response) => response.json())
      .then((data) => setMessages(data.slice(-50))) // Store only the last 50 messages
      .catch((error) => console.error('Error fetching messages:', error));

    console.log(`Attempting to join room with userId: ${loggedInUserId}`);

    // Join the user's room when the component mounts
    socket.emit('join', loggedInUserId, (ack) => {
      console.log('Join event acknowledgment:', ack);
    });

    // Listen for incoming messages from the server (from Teams)
    socket.on('chat message', (message) => {
      console.log('Message from Teams received:', message); // Add detailed logging
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    socket.on('reconnect_error', (err) => {
      console.error('WebSocket reconnection error:', err);
    });

    // Cleanup when the component is unmounted
    return () => {
      socket.off('chat message');
      socket.disconnect();
    };
  }, [loggedInUserId]);

  // Function to send a message
  const handleSend = async () => {
    if (input.trim() && loggedInUserId) {
      const newMessage = { user: true, text: input };
      setMessages([...messages, newMessage]);
      setInput('');

      try {
        const response = await fetch(
          'https://chatbot008backend.onrender.com/send-to-teams',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: input,
              userId: loggedInUserId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        console.log('Message sent successfully');
      } catch (error) {
        console.error('Error sending message:', error.message);
      }
    }
  };

  // Send message on Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chat-window" ref={ref}>
      {/* Message display */}
      <div className="messages-wrapper">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.user ? 'sent' : 'received'}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Input field for sending messages */}
      <div className="input-wrapper">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
});

ChatWindow.displayName = 'ChatWindow';
export default ChatWindow;
