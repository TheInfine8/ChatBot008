import React, { forwardRef, useState, useEffect } from 'react';
import './ChatWindow.css';
import io from 'socket.io-client';

// Move socket initialization outside the component to prevent reconnections
const socket = io('https://chatbot008backend.onrender.com', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

const ChatWindow = forwardRef((props, ref) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Map usernames to userId keys (this should match your backend)
  const userIdMap = {
    Titan: 'user1',
    Dcathelon: 'user2',
    DRL: 'user3',
  };

  // Get logged-in user from localStorage (simulate with localStorage)
  const loggedInUser = localStorage.getItem('loggedInUser');
  const loggedInUserId = userIdMap[loggedInUser]; // Map the username to the correct userId

  useEffect(() => {
    if (!loggedInUserId) {
      alert('Invalid user! Please log in again.');
      return;
    }

    // Join the user's room when the component mounts
    socket.emit('join', loggedInUserId);

    // Listen for incoming messages from the server (from Teams)
    socket.on('chat message', (message) => {
      console.log('Message from Teams:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Cleanup when the component is unmounted
    return () => {
      socket.off('chat message');
      socket.disconnect();
    };
  }, [loggedInUserId]); // Dependency array includes loggedInUserId, so it runs whenever it changes

  const handleSend = async () => {
    if (input.trim() && loggedInUserId) {
      const newMessage = { user: true, text: input };
      setMessages([...messages, newMessage]);
      setInput('');

      try {
        const response = await fetch('https://chatbot008backend.onrender.com/send-to-teams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            userId: loggedInUserId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Message sent successfully to Teams:', responseData);
      } catch (error) {
        console.error('Error sending message:', error.message);
        alert(`Message could not be sent: ${error.message}`);
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

