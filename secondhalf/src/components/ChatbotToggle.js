import React, { useState, useEffect, useRef } from 'react';
import './ChatbotToggle.css';
import ChatWindow from './ChatWindow';

const ChatbotToggle = () => {
  const [isOpen, setIsOpen] = useState(false); // To track whether the chat window is open or closed
  const chatWindowRef = useRef(null); // To track the chat window DOM element

  // Toggle chat window visibility
  const toggleChat = () => setIsOpen(!isOpen);

  // Handle clicks outside the chat window to close it
  const handleClickOutside = (event) => {
    if (chatWindowRef.current && !chatWindowRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      {/* Chat toggle button */}
      {!isOpen && (
        <div className="chat-toggle" onClick={toggleChat}>
          <img
            src="https://miro.medium.com/v2/resize:fit:640/format:webp/1*lyyXmbeoK5JiIBNCnzzjjg.png" // Replace with your chat icon image path
            alt="Chat Icon"
            className="chat-icon"
          />
          <p className="chat-label">Hey, I am LinkMaster</p>
        </div>
      )}
      {/* Chat window */}
      {isOpen && <div ref={chatWindowRef}><ChatWindow /></div>}
    </>
  );
};

export default ChatbotToggle;
