import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import './CheckJobPage.css';
import './Practice.css'; // Assuming this is for some shared button styles or similar

// VVVVVV DEFINE API_BASE_URL USING THE ENVIRONMENT VARIABLE VVVVVV
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002'; // Fallback for local dev
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

const CheckJobPage = () => {
  const { jobId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [jobDetails, setJobDetails] = useState(null);
  const [resumeFileForScorer, setResumeFileForScorer] = useState(null);
  const [isLoadingScorer, setIsLoadingScorer] = useState(false);
  const [score, setScore] = useState(null);
  const [errorScorer, setErrorScorer] = useState('');

  const [resumeFileForGenerator, setResumeFileForGenerator] = useState(null);
  const [isLoadingGenerator, setIsLoadingGenerator] = useState(false);
  const [generatedResume, setGeneratedResume] = useState('');
  const [errorGenerator, setErrorGenerator] = useState('');

  useEffect(() => {
    if (location.state?.jobDetails) {
      setJobDetails(location.state.jobDetails);
    } else {
      console.warn(`Job details for ID ${jobId} not found in location state. This page might not function fully.`);
      // Set errors more gently if page can still be partially useful or avoid breaking
      const errorMessage = `Job details for ID ${jobId} not found. Please navigate from a job listing.`;
      setErrorScorer(errorMessage);
      setErrorGenerator(errorMessage + " Cannot generate resume without job context.");
    }
  }, [location.state, jobId]);

  const handleFileChangeForScorer = (event) => {
    const file = event.target.files[0];
    setResumeFileForScorer(file || null);
    if (file) {
      setErrorScorer('');
      setScore(null);
    }
  };

  const handleGetScore = async () => {
    if (!resumeFileForScorer) {
      setErrorScorer("Please upload a resume file for scoring.");
      return;
    }
    if (!jobDetails?.description) {
      setErrorScorer("Job description is missing for scoring.");
      return;
    }

    setIsLoadingScorer(true);
    setErrorScorer('');
    setScore(null);

    const formData = new FormData();
    formData.append('resume_file', resumeFileForScorer);
    formData.append('job_description_text', jobDetails.description);

    try {
      // VVVVVV USE THE API_BASE_URL VARIABLE VVVVVV
      const response = await fetch(`${API_BASE_URL}/api/match_score`, {
      // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        method: 'POST',
        body: formData,
        // Note: 'Content-Type' for FormData is set automatically by the browser
      });

      const responseData = await response.json(); // Try to get JSON regardless of ok status for error messages
      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status} ${response.statusText}`);
      }
      setScore(responseData.match_score);
    } catch (err) {
      console.error("Error getting score:", err);
      setErrorScorer(err.message || "Failed to get score from the server.");
    } finally {
      setIsLoadingScorer(false);
    }
  };

  const handleFileChangeForGenerator = (event) => {
    const file = event.target.files[0];
    setResumeFileForGenerator(file || null);
    if (file) {
      setErrorGenerator('');
      setGeneratedResume('');
    }
  };

  const handleGenerateResume = async () => {
    if (!resumeFileForGenerator) {
      setErrorGenerator("Please upload your base resume file.");
      return;
    }
    if (!jobDetails?.description && !jobDetails?.title) {
      setErrorGenerator("Job details (title or description) are missing.");
      return;
    }

    setIsLoadingGenerator(true);
    setErrorGenerator('');
    setGeneratedResume('');

    const formData = new FormData();
    formData.append('base_resume_file', resumeFileForGenerator);
    if (jobDetails?.title) formData.append('target_job_title', jobDetails.title);
    if (jobDetails?.description) formData.append('target_job_description', jobDetails.description);

    try {
      // VVVVVV USE THE API_BASE_URL VARIABLE VVVVVV
      const response = await fetch(`${API_BASE_URL}/api/generate_resume`, {
      // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status} ${response.statusText}`);
      }
      setGeneratedResume(responseData.generated_resume_text);
    } catch (err) {
      console.error("Error generating resume:", err);
      setErrorGenerator(err.message || "Failed to generate resume from the server.");
    } finally {
      setIsLoadingGenerator(false);
    }
  };

  const handleNavigateToCoursePredict = () => {
    if (jobDetails) {
      navigate('/course_predict', { state: { jobDetails: jobDetails } });
    } else {
      alert("Job details are not loaded. Cannot find related courses.");
    }
  };

  if (!jobDetails && (errorScorer || errorGenerator)) {
     // If jobDetails failed to load from state, this is a more critical issue
     const criticalError = errorScorer || errorGenerator;
     return (
       <div className="check-job-page-container error-container">
         <p className="error-message">{criticalError}</p>
         <button onClick={() => navigate('/')} className="button">Go to Job Listings</button>
       </div>
     );
  }
  
  if (!jobDetails && !errorScorer && !errorGenerator) {
    return <div className="check-job-page-container"><p>Loading job details or select a job...</p></div>;
  }

  return (
    <div className="check-job-page-wrapper"> {/* Added a wrapper for better structure */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', padding: '0 10px' }}>
        <button
          onClick={handleNavigateToCoursePredict}
          // className="button course-predict-nav-button" // Use specific class if different style
          disabled={!jobDetails}
          style={{ marginRight: '10px', marginBottom: '10px' }}
        >
          Get Related Courses
        </button>
        <button
          onClick={() => navigate('/practice', { state: { jobDetails: jobDetails } })}
          // className="button practice-nav-button"
          disabled={!jobDetails}
          style={{ marginBottom: '10px' }}
        >
          Practice Interview for this Job →
        </button>
      </div>

      <div className="page-content-flex"> {/* For side-by-side layout if desired */}
        {/* Resume Match Scorer Section */}
        <div className="feature-section resume-scorer-section"> {/* More specific class */}
          <div className="feature-header">
            <button onClick={() => navigate(-1)} className="button back-button">← Back</button>
            <h2>Resume Match Scorer</h2>
          </div>

          {jobDetails && (
            <div className="job-details-summary-section"> {/* Renamed for clarity */}
              <h3>Job: {jobDetails.title || 'N/A'}</h3>
              <p className="company-location">
                {jobDetails.company?.display_name && <span>{jobDetails.company.display_name}</span>}
                {jobDetails.company?.display_name && jobDetails.location?.display_name && " - "}
                {jobDetails.location?.display_name && <span>{jobDetails.location.display_name}</span>}
              </p>
              <div className="job-description-container">
                <h4>Job Description (for scoring)</h4>
                <pre className="job-description-text">{jobDetails.description || 'No description provided.'}</pre>
              </div>
            </div>
          )}

          <div className="resume-upload-section">
            <h4>Upload Resume for Scoring</h4>
            <input type="file" onChange={handleFileChangeForScorer} className="file-input" disabled={isLoadingScorer} />
            {resumeFileForScorer && <p className="file-name">Selected: {resumeFileForScorer.name}</p>}
          </div>

          <button onClick={handleGetScore} disabled={isLoadingScorer || !resumeFileForScorer || !jobDetails} className="button get-score-button">
            {isLoadingScorer ? 'Calculating...' : 'Get Score'}
          </button>

          {score !== null && (
            <div className="score-display-section">
              <h4>Your Match Score:</h4>
              <p className="score-value">{score.toFixed(2)}%</p>
            </div>
          )}
          {errorScorer && !score && <p className="error-message">{errorScorer}</p>}
        </div>

        {/* Role-Specific Resume Generator Section */}
        <div className="feature-section resume-generator-section"> {/* More specific class */}
          <div className="feature-header">
            <h2>Role-Specific Resume Generator</h2>
          </div>
          {jobDetails && <p>Tailor your resume for: <strong>{jobDetails.title || "Selected Job"}</strong></p>}

          <div className="resume-upload-section">
            <h4>Upload Your Base Resume</h4>
            <input type="file" onChange={handleFileChangeForGenerator} className="file-input" disabled={isLoadingGenerator}/>
            {resumeFileForGenerator && <p className="file-name">Selected: {resumeFileForGenerator.name}</p>}
          </div>

          <button onClick={handleGenerateResume} disabled={isLoadingGenerator || !resumeFileForGenerator || !jobDetails} className="button generate-resume-button"> {/* Specific class */}
            {isLoadingGenerator ? 'Generating...' : 'Generate Tailored Resume'}
          </button>

          {generatedResume && (
            <div className="generated-resume-section">
              <h4>AI-Generated Resume:</h4>
              <pre className="generated-resume-text">{generatedResume}</pre>
            </div>
          )}
          {errorGenerator && !generatedResume && <p className="error-message">{errorGenerator}</p>}
        </div>
      </div>
    </div>
  );
};

export default CheckJobPage;