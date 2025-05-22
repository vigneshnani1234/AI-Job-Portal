// src/pages/WelcomePage.jsx (or Welcome.jsx)
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';
// You can also add a console.log here to see what it resolves to during local dev vs build
// console.log("API_BASE_URL initialized to:", API_BASE_URL);

const Welcome = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const oauthError = queryParams.get('error');
    if (oauthError) {
      let errorMessage = 'An unknown login error occurred.';
      if (oauthError === 'oauth_failed') {
        errorMessage = 'Google login process failed. Please try again.';
      } else if (oauthError === 'user_info_failed') {
        errorMessage = 'Could not retrieve user information from Google after login. Please try again.';
      } else if (oauthError === 'nonce_error') {
        errorMessage = 'A security check (nonce) failed during login. Please try again.';
      } else if (oauthError === 'oauth_config_error') {
        errorMessage = 'Login system configuration error. Please contact support.';
      }
      setError(errorMessage);
      // Determine current path for history replacement
      const currentPath = location.pathname === '/' && !location.search ? '/' : '/welcome';
      window.history.replaceState({}, document.title, currentPath);
    }
  }, [location.search, location.pathname]); // Added pathname for robustness

  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      try {
        // *** USE API_BASE_URL HERE ***
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Auth status check failed with status: ${response.status}` }));
          throw new Error(errorData.message || `Auth status check failed: ${response.statusText}`);
        }

        const data = await response.json();
        setIsLoggedIn(data.logged_in);
        if (data.logged_in && data.user) {
          setUser(data.user);
          setError('');
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error checking auth status:", err);
        if (!error && !(new URLSearchParams(location.search).get('error'))) {
            setError('Could not verify login status. Please ensure the backend is running or try refreshing.');
        }
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, [location.search]); // Re-check on location.search change

  const handleLogin = () => {
    setError('');
    // *** USE API_BASE_URL HERE ***
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  const handleGetStarted = () => {
    navigate('/index');
  };

  const handleLogout = () => {
    setError('');
    setIsLoading(true);
    // *** USE API_BASE_URL HERE ***
    window.location.href = `${API_BASE_URL}/auth/logout`;
  };

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', fontSize: '18px' }}>Authenticating...</div>;
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1>Welcome to Your Job Portal!</h1>
      {error && <p style={{ color: 'red', fontWeight: 'bold', marginTop: '20px' }}>Error: {error}</p>}
      {isLoggedIn && user ? (
        <div style={{ marginTop: '30px' }}>
          <p style={{ fontSize: '20px' }}>Hello, <strong>{user.name || user.email}</strong>!</p>
          {user.profile_pic && (
            <img 
              src={user.profile_pic} 
              alt="Profile" 
              style={{ borderRadius: '50%', width: '100px', height: '100px', margin: '15px auto', display: 'block', border: '2px solid #ddd' }} 
            />
          )}
          <button 
            onClick={handleGetStarted} 
            style={{ padding: '12px 25px', fontSize: '18px', margin: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Get Started & View Jobs
          </button>
          <button 
            onClick={handleLogout} 
            style={{ padding: '12px 25px', fontSize: '18px', margin: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '30px' }}>
          <p style={{ fontSize: '18px' }}>Please log in to access all features.</p>
          <button 
            onClick={handleLogin} 
            style={{ padding: '12px 25px', fontSize: '18px', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
          >
            {/* Image for Google logo was commented out, keeping it that way */}
            Login with Google
          </button>
        </div>
      )}
    </div>
  );
}
export default Welcome;