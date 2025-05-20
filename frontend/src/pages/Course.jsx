import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// Create a new CSS file for this page if needed, e.g.,
// import './CoursePredictPage.css';

const CoursePredictPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [jobDetails, setJobDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState([]); // To store course predictions
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.jobDetails) {
      setJobDetails(location.state.jobDetails);
    } else {
      // If jobDetails are not passed, show an error and option to go back
      console.warn("CoursePredictPage: Job details not found in location state.");
      setError("Job details are missing. Please navigate from a specific job page.");
    }
  }, [location.state]);

  const handleGetPredictions = async () => {
    if (!jobDetails || (!jobDetails.title && !jobDetails.description)) {
      setError("Cannot get predictions without job title or description.");
      return;
    }

    setIsLoading(true);
    setError('');
    setPredictions([]); // Clear previous predictions

    // Prepare data for the backend
    const requestData = {
      job_title: jobDetails.title || "",
      job_description: jobDetails.description || "",
      // You might also want to send user skills from a resume if you implement that
      // user_skills: ["skill1", "skill2"] // Example
    };

    console.log("Sending to backend for course prediction:", requestData);

    try {
      // --- SIMULATE BACKEND CALL ---
      // Replace this with your actual fetch call to your backend endpoint
      // For example:
      const response = await fetch('http://localhost:5002/api/course_predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Server error" }));
        throw new Error(errData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPredictions(data.courses || []); // Assuming backend returns { courses: [...] }

    //   // --- START SIMULATION ---
    //   await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    //   const simulatedData = {
    //     courses: [
    //       { id: 'course1', name: 'Advanced Python for AI', platform: 'Coursera', relevance: 'High', url: '#' },
    //       { id: 'course2', name: 'Machine Learning Fundamentals', platform: 'Udemy', relevance: 'Medium', url: '#' },
    //       { id: 'course3', name: 'Job-specific Skill Workshop: ' + (jobDetails.title || 'Relevant Tech'), platform: 'LinkedIn Learning', relevance: 'High', url: '#' },
    //     ]
    //   };
    //   setPredictions(simulatedData.courses);
    //   // --- END SIMULATION ---

    } catch (err) {
      console.error("Error fetching course predictions:", err);
      setError(err.message || "Failed to fetch course predictions.");
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !jobDetails) { // Critical error: no job details to work with
    return (
      <div className="course-predict-page-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p className="error-message" style={{ color: 'red', marginBottom: '20px' }}>{error}</p>
        <button onClick={() => navigate('/')} className="button">
          Go to Job Listings
        </button>
      </div>
    );
  }
  
  return (
    <div className="course-predict-page-container" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} className="button back-button" style={{ marginBottom: '20px' }}>
        ← Back
      </button>

      <h2>Course Recommendations</h2>

      {jobDetails ? (
        <div className="job-details-summary" style={{ marginBottom: '30px', padding: '15px', border: '1px solid #eee', borderRadius: '8px', background: '#f9f9f9' }}>
          <h3>For Job: {jobDetails.title || 'N/A'}</h3>
          {jobDetails.company?.display_name && <p><strong>Company:</strong> {jobDetails.company.display_name}</p>}
          <h4>Job Description Snippet:</h4>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '150px', overflowY: 'auto', background: '#fff', padding: '10px', border: '1px solid #ddd' }}>
            {jobDetails.description ? (jobDetails.description.substring(0, 400) + (jobDetails.description.length > 400 ? '...' : '')) : 'No description provided.'}
          </pre>
        </div>
      ) : (
        <p>Loading job details...</p>
      )}

      <button
        onClick={handleGetPredictions}
        disabled={isLoading || !jobDetails}
        // className="button get-predictions-button" // Style this class
        style={{ display: 'block', margin: '0 auto 20px auto', padding: '12px 25px', fontSize: '16px' }}
      >
        {isLoading ? 'Fetching Courses...' : 'Get Course Predictions'}
      </button>

      {error && !isLoading && <p className="error-message" style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {predictions.length > 0 && (
        <div className="predictions-results">
          <h3>Recommended Courses:</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {predictions.map(course => (
              <li key={course.id} style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '15px', marginBottom: '10px', background: 'white' }}>
                <h4><a href={course.url || '#'} target="_blank" rel="noopener noreferrer">{course.name}</a></h4>
                <p><strong>Platform:</strong> {course.platform}</p>
                <p><strong>Relevance:</strong> {course.relevance}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && predictions.length === 0 && jobDetails && (
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
            Click "Get Course Predictions" to see recommendations for this job.
        </p>
      )}
    </div>
  );
};

export default CoursePredictPage;