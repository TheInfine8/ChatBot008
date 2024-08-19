import React, { forwardRef, useState, useEffect } from 'react';
import './ChatWindow.css';
import io from 'socket.io-client';

// Move socket initialization outside the component to prevent reconnections
const socket = io('http://localhost:5002', {
  withCredentials: true, // Ensure credentials are sent with requests
  transports: ['websocket', 'polling'], // Enable fallback to polling if WebSocket isn't available
});

const ChatWindow = forwardRef((props, ref) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Map usernames to userId keys (this should match your backend)
  const userIdMap = {
    'Titan': 'user1',
    'Dcathelon': 'user2',
    'DRL': 'user3',
  };

  // Get logged-in user from localStorage (simulate with localStorage)
  const loggedInUser = localStorage.getItem('loggedInUser');
  const loggedInUserId = userIdMap[loggedInUser]; // Map the username to the correct userId

  useEffect(() => {
    // Ensure useEffect is always called, but validate the loggedInUser within the effect
    if (!loggedInUserId) {
      alert('Invalid user! Please log in again.');
      return;
    }

    // Listen for incoming messages from the server
    socket.on('chat message', (message) => {
      console.log('Message from Teams:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Cleanup when the component is unmounted
    return () => {
      socket.off('chat message'); // Remove event listener
      socket.disconnect(); // Disconnect socket
    };
  }, [loggedInUserId]); // Dependency array includes loggedInUserId, so it runs whenever it changes

  const handleSend = async () => {
    if (input.trim() && loggedInUserId) {
      const newMessage = { user: true, text: input };
      setMessages([...messages, newMessage]);
      setInput('');

      try {
        // Send the message to your backend along with the mapped userId
        const response = await fetch('http://localhost:5002/send-to-teams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            userId: loggedInUserId, // Send mapped userId
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message to Teams');
        }

        const responseData = await response.json();
        console.log('Message sent successfully to Teams:', responseData);
      } catch (error) {
        console.error('Error sending message:', error);
      }

      // Optionally simulate a response from the chatbot
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { user: false, text: 'This is a response from the chatbot.' },
        ]);
      }, 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend(); // Trigger the handleSend function when Enter is pressed
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
          onKeyPress={handleKeyPress} // Add keypress listener for Enter key
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
});

// Adding displayName for better debugging and to satisfy ESLint
ChatWindow.displayName = 'ChatWindow';

export default ChatWindow;

