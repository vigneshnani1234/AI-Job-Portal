import Card from '../components/Card'; // Adjust path if you placed JobCard elsewhere
// import './App.css'; // App.css is likely imported in App.jsx, styles will cascade
import { useEffect, useState } from 'react'; // Importing useEffect and useState from React
function Index() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // For better error display

  useEffect(() => {
    fetch("http://localhost:5002/api/fetch_jobs")
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => { // Try to parse error JSON from backend
            throw new Error(errData.error || `HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(data => {
        if (data && data.jobs && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        } else {
          console.error("Fetched data is not in the expected format or jobs array is missing:", data);
          setJobs([]);
          setError("Could not load job listings in the expected format.");
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching jobs:", error);
        setError(error.message || "Failed to fetch job listings.");
        setJobs([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="App"><p>Loading jobs...</p></div>;
  }

  if (error) {
    return <div className="App"><p>Error: {error}</p></div>;
  }

  return (
    <div className="App"> {/* This class might already have some base styling from App.css */}
      <h1>Job Listings</h1>
      {jobs.length === 0 ? (
        <p>No jobs available at the moment. Please try again later.</p>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <Card key={job.id || job.redirect_url} job={job} /> // Use job.id from Adzuna for a stable key
          ))}
        </div>
      )}
    </div>
  );
}

export default Index;