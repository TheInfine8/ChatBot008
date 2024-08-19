import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import ChatToggle from './components/ChatbotToggle';

const App = () => {
  const [user, setUser] = useState(localStorage.getItem('loggedInUser') || ''); // State for storing the logged-in user
  const [isChatOpen, setIsChatOpen] = useState(false); // State for chat window visibility
  const chatWindowRef = useRef(null); // Ref to detect clicks outside the chat window

  // Toggle the chat window open/close state
  const toggleChatWindow = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Close the chat window when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(event.target)) {
        setIsChatOpen(false);
      }
    };

    if (isChatOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatOpen]);

  // Handle user logout
  const handleLogout = () => {
    localStorage.removeItem('loggedInUser'); // Clear logged-in user
    setUser(''); // Clear user state
    setIsChatOpen(false); // Close chat window if open
  };

  return (
    <div className="App">
      {!user ? (
        <Login setUser={setUser} />
      ) : (
        <>
          {/* Header with Logout button */}
          <div className="header">
            <h2>Welcome, {user}!</h2>
            <button onClick={handleLogout}>Logout</button> {/* Logout button */}
          </div>

          {/* Show the chat toggle when the user is logged in */}
          {!isChatOpen && <ChatToggle toggleChatWindow={toggleChatWindow} />}
          {/* Show ChatWindow when the toggle is clicked */}
          {isChatOpen && (
            <div ref={chatWindowRef}>
              <ChatWindow />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;



