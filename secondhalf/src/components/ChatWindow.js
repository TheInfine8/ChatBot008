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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Mapping of user roles to user IDs
  const userIdMap = {
    Titan: 'user1',
    Dcathelon: 'user2',
    DRL: 'user3',
  };

  // Retrieve the logged-in user from localStorage
  const loggedInUser = localStorage.getItem('loggedInUser');
  const loggedInUserId = userIdMap[loggedInUser]; // Map the username to the correct userId

  useEffect(() => {
    if (!loggedInUserId) {
      console.error('Invalid user! Please log in again.');
      alert('Invalid user! Please log in again.');
      return;
    }

    console.log(`Attempting to join room with userId: ${loggedInUserId}`);

    // Attempt to join the user's room
    socket.emit('join', loggedInUserId, (ack) => {
      if (ack) {
        console.log('Join event acknowledgment:', ack);
      } else {
        console.warn('Join event did not return an acknowledgment.');
      }
    });

    // Listen for incoming messages from the server (from Teams)
    socket.on('chat message', (message) => {
      console.log('Message from Teams received:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Listen for connection status
    socket.on('connect', () => {
      console.log('WebSocket connected successfully');
    });

    socket.on('disconnect', (reason) => {
      console.warn('WebSocket disconnected:', reason);
    });

    // Handle any errors in the connection
    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    socket.on('reconnect_error', (err) => {
      console.error('WebSocket reconnection error:', err);
    });

    // Cleanup on component unmount
    return () => {
      socket.off('chat message');
      socket.disconnect();
    };
  }, [loggedInUserId]);

  // Function to send a message
  const handleSend = async () => {
    if (input.trim() && loggedInUserId) {
      const newMessage = { user: true, text: input };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
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
