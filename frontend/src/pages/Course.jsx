import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// import './CoursePredictPage.css'; // Ensure this CSS exists if needed

// VVVVVV DEFINE API_BASE_URL USING THE ENVIRONMENT VARIABLE VVVVVV
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002'; // Fallback for local dev
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

const Course = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [jobDetails, setJobDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.jobDetails) {
      setJobDetails(location.state.jobDetails);
    } else {
      console.warn("CoursePredictPage: Job details not found in location state.");
      setError("Job details are missing. Please navigate from a specific job page to get course recommendations.");
    }
  }, [location.state]);

  const handleGetPredictions = async () => {
    if (!jobDetails || (!jobDetails.title && !jobDetails.description)) {
      setError("Cannot get predictions without job title or description.");
      return;
    }

    setIsLoading(true);
    setError('');
    setPredictions([]);

    const requestData = {
      job_title: jobDetails.title || "",
      job_description: jobDetails.description || "",
    };

    console.log("Sending to backend for course prediction:", requestData);

    try {
      // VVVVVV USE THE API_BASE_URL VARIABLE VVVVVV
      const response = await fetch(`${API_BASE_URL}/api/course_predict`, {
      // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `HTTP error! status: ${response.status}`);
      }
      
      if (responseData.courses && Array.isArray(responseData.courses)) {
        setPredictions(responseData.courses);
        if (responseData.courses.length === 0 && responseData.message) {
            // Display message from backend if no courses found but request was successful
            setError(responseData.message);
        }
      } else {
        setPredictions([]);
        setError(responseData.message || "Received unexpected data format for courses.");
      }

    } catch (err) {
      console.error("Error fetching course predictions:", err);
      setError(err.message || "Failed to fetch course predictions.");
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (error && !jobDetails) { // If critical error (no job details passed)
    return (
      <div className="course-predict-page-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p className="error-message" style={{ color: 'red', marginBottom: '20px' }}>{error}</p>
        <button onClick={() => navigate('/')} className="button">Go to Home</button>
      </div>
    );
  }
  
  return (
    <div className="course-predict-page-container" style={{ padding: '20px', maxWidth: '900px', margin: '20px auto' }}>
      <button onClick={() => navigate(-1)} className="button back-button" style={{ marginBottom: '20px' }}>
        ← Back
      </button>

      <h2>Course Recommendations</h2>

      {jobDetails ? (
        <div className="job-details-summary" style={{ marginBottom: '30px', padding: '15px', border: '1px solid #eee', borderRadius: '8px', background: '#f9f9f9' }}>
          <h3>For Job: {jobDetails.title || 'N/A'}</h3>
          {jobDetails.company?.display_name && <p><strong>Company:</strong> {jobDetails.company.display_name}</p>}
          <h4>Job Description (for context):</h4>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '150px', overflowY: 'auto', background: '#fff', padding: '10px', border: '1px solid #ddd', fontSize: '0.9em' }}>
            {jobDetails.description ? (jobDetails.description.substring(0, 500) + (jobDetails.description.length > 500 ? '...' : '')) : 'No description provided.'}
          </pre>
        </div>
      ) : (
        <p>Loading job details or navigate from a job to see recommendations...</p>
      )}

      <button
        onClick={handleGetPredictions}
        disabled={isLoading || !jobDetails}
        // className="button get-predictions-button" // Added class back
        style={{ display: 'block', margin: '0 auto 20px auto', padding: '12px 25px', fontSize: '16px' }}
      >
        {isLoading ? 'Fetching Courses...' : 'Get Course Recommendations'}
      </button>

      {error && !isLoading && <p className="error-message" style={{ color: 'red', textAlign: 'center', marginTop: '15px' }}>{error}</p>}

      {!isLoading && predictions.length === 0 && jobDetails && !error && (
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
            Click the button above to see course recommendations for this job.
        </p>
      )}

      {predictions.length > 0 && (
        <div className="predictions-results" style={{marginTop: '30px'}}>
          <h3>Recommended Courses:</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {predictions.map((course, index) => ( // Added index for key fallback
              <li key={course.id || `course-${index}`} style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '15px', marginBottom: '10px', background: 'white' }}>
                <h4>
                  <a href={course.url || '#!'} target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: '#007bff'}}>
                    {course.name || 'Unnamed Course'}
                  </a>
                </h4>
                {course.platform && <p><strong>Platform:</strong> {course.platform}</p>}
                {course.relevance && <p><strong>Relevance Score:</strong> {course.relevance}</p>}
                {/* You can add more details from the 'course' object if available */}
                {/* e.g., course.description_snippet, course.skills_taught */}
                {course.description_snippet && <p style={{fontSize: '0.9em', color: '#555'}}>{course.description_snippet}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Course;