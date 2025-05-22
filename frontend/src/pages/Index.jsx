import React, { useEffect, useState } from 'react'; // Combined React import
import Card from '../components/Card'; // Adjust path if you placed Card elsewhere

// VVVVVV DEFINE API_BASE_URL USING THE ENVIRONMENT VARIABLE VVVVVV
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002'; // Fallback for local dev
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

function Index() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true); // Ensure loading is true at the start of fetch
    setError(null);   // Clear previous errors

    // VVVVVV USE THE API_BASE_URL VARIABLE VVVVVV
    fetch(`${API_BASE_URL}/api/fetch_jobs`) // Assuming /api/fetch_jobs is correct
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.error || `HTTP error! status: ${res.status}`);
          }).catch(() => { // Fallback if error response is not JSON
            throw new Error(`HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(data => {
        if (data && data.jobs && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        } else {
          console.error("Fetched data is not in the expected format or jobs array is missing:", data);
          setJobs([]); // Set to empty array on malformed data
          setError("Could not load job listings in the expected format.");
        }
      })
      .catch(error => {
        console.error("Error fetching jobs:", error);
        setError(error.message || "Failed to fetch job listings.");
        setJobs([]); // Set to empty array on error
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="App"><p>Loading jobs...</p></div>; // Consider a more specific loading class or component
  }

  if (error) {
    return <div className="App"><p>Error: {error}</p></div>; // Consider a more specific error class or component
  }

  return (
    <div className="App"> {/* Using "App" class, ensure it has appropriate styles */}
      <h1>Job Listings</h1>
      {jobs.length === 0 ? (
        <p>No jobs available at the moment. Please try again later.</p>
      ) : (
        <div className="job-list"> {/* Consider styling for job-list */}
          {jobs.map((job) => (
            <Card key={job.id || job.redirect_url} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Index;