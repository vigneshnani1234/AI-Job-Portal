// src/pages/WelcomePage.jsx (or Welcome.jsx)
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';
console.log("WELCOME.JSX: API_BASE_URL initialized to:", API_BASE_URL); // Log initial API_BASE_URL

const Welcome = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to handle OAuth errors from URL query parameters
  useEffect(() => {
    console.log("WELCOME.JSX: OAuth error check effect triggered. Location:", location.pathname, location.search);
    const queryParams = new URLSearchParams(location.search);
    const oauthError = queryParams.get('error');
    if (oauthError) {
      let errorMessage = 'An unknown login error occurred.';
      if (oauthError === 'oauth_failed') {
        errorMessage = 'Google login process failed. Please try again.';
      } else if (oauthError === 'user_info_failed') {
        errorMessage = 'Could not retrieve your user information from Google. Please try again.';
      } else if (oauthError === 'nonce_error') {
        errorMessage = 'A security check (nonce) failed during login. Please try again.';
      } else if (oauthError === 'oauth_config_error') {
        errorMessage = 'Login system configuration error. Please contact support.';
      }
      // Only set error if it's a new one, to avoid overwriting something else
      // And only if we are not currently loading auth status (to avoid race conditions with setError)
      if (errorMessage !== error) {
          setError(errorMessage);
      }
      // Clean the URL by removing the error query parameter
      // Ensure this path is correct for where this component is mounted.
      // If Welcome is at '/', then targetPath should be '/'
      const targetPath = location.pathname === '/' && !location.search ? '/' : '/welcome'; 
      window.history.replaceState({}, document.title, targetPath);
    }
  }, [location.search, location.pathname, error]); // Added error to dependency to re-evaluate if error changes

  // Effect to fetch authentication status
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const checkAuthStatus = async () => {
      if (!isMounted) return; // Prevent run if component unmounted
      console.log("WELCOME.JSX: checkAuthStatus effect triggered. Location search:", location.search);
      setIsLoading(true); // Set loading true at the start of this attempt
      // setError(''); // Consider clearing general errors here, but OAuth errors from URL should persist until action
      
      try {
        console.log("WELCOME.JSX: About to FETCH /auth/status from:", `${API_BASE_URL}/auth/status`);
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!isMounted) return; // Check again before state updates

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Auth status check failed (non-JSON error response) with status: ${response.status}` }));
          throw new Error(errorData.message || `Auth status check failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (!isMounted) return; // Check again

        console.log("WELCOME.JSX: Data from /auth/status:", data);

        setIsLoggedIn(data.logged_in);
        if (data.logged_in && data.user) {
          setUser(data.user);
          console.log("WELCOME.JSX: User state SET to:", data.user);
          // Clear error ONLY if it wasn't a persistent oauthError from URL
          // or if the login is now successful, overriding previous errors.
          const queryParams = new URLSearchParams(location.search);
          if (!queryParams.get('error')) { // Only clear if no error in URL
            setError('');
          }
        } else {
          setUser(null);
          console.log("WELCOME.JSX: User state set to null. data.logged_in:", data.logged_in);
          // Do not set an error here if data.logged_in is false, that's the expected state for a non-logged-in user.
          // An error should only be set if the fetch itself fails or if an oauthError was in the URL.
        }
      } catch (err) {
        if (!isMounted) return; // Check again
        console.error("WELCOME.JSX: Error in checkAuthStatus fetch:", err);
        // Only set a generic error if no specific oauthError is already displayed
        // and if the component is still mounted
        const queryParams = new URLSearchParams(location.search);
        if (!error && !queryParams.get('error')) { // Avoid overwriting a more specific error from URL
            setError('Could not verify login status. Please ensure the backend is running or try refreshing.');
        }
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        if (isMounted) {
            setIsLoading(false);
            console.log("WELCOME.JSX: setIsLoading(false) called in finally. Current isLoggedIn:", isLoggedIn); // Log state *before* re-render
        }
      }
    };

    checkAuthStatus();

    return () => {
      isMounted = false; // Cleanup function to set isMounted to false when component unmounts
      console.log("WELCOME.JSX: Auth status effect cleanup (component unmounted or deps changed).");
    };
  // Dependency: location.key could be more reliable than location.search for re-triggering on navigation
  // For now, location.search is fine for post-redirect scenarios.
  // Adding a unique key to the Welcome component in App.jsx if it's re-used can also force remount.
  // Let's try to make it run once on mount and then when location.search changes from an OAuth redirect.
  // For a simple mount-once behavior and then rely on full page reloads/navigation for updates: use `[]`
  // But since redirects add query params, `location.search` is okay.
  }, [location.search]); // Re-check on location.search change (e.g., after redirect with ?error=)

  const handleLogin = () => {
    setError(''); // Clear previous errors
    setIsLoading(true); // Optional: show loading while redirecting
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  const handleGetStarted = () => {
    navigate('/index');
  };

  const handleLogout = () => {
    setError('');
    setIsLoading(true);
    window.location.href = `${API_BASE_URL}/auth/logout`;
  };

  // This log will show the state for the CURRENT render pass
  console.log("WELCOME.JSX: Rendering component. isLoading:", isLoading, "isLoggedIn:", isLoggedIn, "User:", user, "Error:", error);

  if (isLoading) {
    return <div style={{ padding: '20px', textAlign: 'center', fontSize: '18px' }}>Authenticating...</div>;
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1>Welcome to Your Job Portal!</h1>

      {error && <p style={{ color: 'red', fontWeight: 'bold', marginTop: '20px' }}>DEBUG Error Display: {error}</p>}
      
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
            Login with Google
          </button>
        </div>
      )}
    </div>
  );
}
export default Welcome;