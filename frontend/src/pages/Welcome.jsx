// src/pages/WelcomePage.jsx (or Welcome.jsx)
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';
const Welcome = () => { // Using Welcome as per your component name
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
        errorMessage = 'Could not retrieve your user information from Google after login. Please try again.';
      } else if (oauthError === 'nonce_error') {
        errorMessage = 'A security check (nonce) failed during login. Please try again.';
      } else if (oauthError === 'oauth_config_error') {
        errorMessage = 'Login system configuration error. Please contact support.';
      }
      setError(errorMessage);
      window.history.replaceState({}, document.title, "/welcome");
    }
  }, [location.search]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      // Do not clear error here if it came from oauthError,
      // it might be useful for the user to see.
      // The error will be cleared if auth check succeeds.
      try {
        const response = await fetch('http://localhost:5002/auth/status', {
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
          setError(''); // Clear general errors if login is successful
        } else {
          setUser(null);
          // If not logged in, don't clear an existing oauthError.
          // If there was no oauthError but now we find user is not logged in,
          // that's normal, no new error needs to be set here.
        }
      } catch (err) {
        console.error("Error checking auth status:", err);
        // Only set a generic error if no specific oauthError is already present
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
  }, [location.search]); // Removed `error` from dependency array to avoid potential loops if setError is called inside.
                         // location.search will change after login/logout redirects, triggering re-check.

  const handleLogin = () => {
    setError('');
    window.location.href = 'http://localhost:5002/auth/google/login';
  };

  const handleGetStarted = () => {
    navigate('/index');
  };

  // VVVVVV CORRECTED FUNCTION VVVVVV
  const handleLogout = () => {
    setError(''); // Clear errors before logout attempt
    setIsLoading(true); // Show loading indicator for logout
    // The backend will handle session clearing and redirect.
    // The browser will follow the redirect, and then the useEffect
    // for checkAuthStatus will run again due to location.search change (if any)
    // or just to refresh the state based on the new cookie status.
    window.location.href = 'http://localhost:5002/auth/logout';
    // No need for try-catch for window.location.href assignment,
    // and setIsLoading(false) is tricky because the page will navigate away.
  };
  // ^^^^^^ CORRECTED FUNCTION ^^^^^^


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
            {/* <img 
                src="https://developers.google.com/identity/images/g-logo.png" 
                alt="Google sign-in" 
                style={{ marginRight: '12px', width: '24px', height: '24px' }}
            /> */}
            Login with Google
          </button>
        </div>
      )}
    </div>
  );
}
export default Welcome;