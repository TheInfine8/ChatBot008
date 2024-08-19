import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Login.css'; // Import the CSS file for styling

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');

  const handleLogin = () => {
    const validUsers = {
      Titan: 'Titan',
      Dcathelon: 'Cathelon',
      DRL: 'DRL',
    };

    if (validUsers[email]) {
      localStorage.setItem('loggedInUser', email);
      setUser(email);
    } else {
      alert(
        'Invalid user! Please enter a valid username (Titan, Dcathelon, DRL)'
      );
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome Back!</h2>
        <input
          type="text"
          className="login-input"
          placeholder="Enter your username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="login-button" onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
};

Login.propTypes = {
  setUser: PropTypes.func.isRequired,
};

export default Login;
