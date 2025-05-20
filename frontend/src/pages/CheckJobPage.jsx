


import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import './CheckJobPage.css'; // Make sure this file exists and is styled properly
import './Practice.css';

const CheckJobPage = () => {
  const { jobId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // --- States for Match Scorer ---
  const [jobDetails, setJobDetails] = useState(null);
  const [resumeFileForScorer, setResumeFileForScorer] = useState(null);
  const [isLoadingScorer, setIsLoadingScorer] = useState(false);
  const [score, setScore] = useState(null);
  const [errorScorer, setErrorScorer] = useState('');

  // --- States for Resume Generator ---
  const [resumeFileForGenerator, setResumeFileForGenerator] = useState(null);
  const [isLoadingGenerator, setIsLoadingGenerator] = useState(false);
  const [generatedResume, setGeneratedResume] = useState('');
  const [errorGenerator, setErrorGenerator] = useState('');

  useEffect(() => {
    if (location.state?.jobDetails) {
      setJobDetails(location.state.jobDetails);
    } else {
      console.warn(`Job details not found in location state for ID: ${jobId}. Consider fetching.`);
      setErrorScorer(`Job details for ID ${jobId} not found. Please navigate from a job listing.`);
      setErrorGenerator(`Job details for ID ${jobId} not found. Cannot generate role-specific resume without job context.`);
    }
  }, [location.state, jobId]);

  // --- Handlers for Match Scorer ---
  const handleFileChangeForScorer = (event) => {
    const file = event.target.files[0];
    if (file) {
      setResumeFileForScorer(file);
      setErrorScorer('');
      setScore(null);
    } else {
      setResumeFileForScorer(null);
    }
  };

  const handleGetScore = async () => {
    if (!resumeFileForScorer) {
      setErrorScorer("Please upload a resume file for scoring first.");
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
      const response = await fetch('http://localhost:5002/api/match_score', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setScore(data.match_score);
    } catch (err) {
      console.error("Error getting score:", err);
      setErrorScorer(err.message || "Failed to get score from the server.");
    } finally {
      setIsLoadingScorer(false);
    }
  };

  // --- Handlers for Resume Generator ---
  const handleFileChangeForGenerator = (event) => {
    const file = event.target.files[0];
    if (file) {
      setResumeFileForGenerator(file);
      setErrorGenerator('');
      setGeneratedResume('');
    } else {
      setResumeFileForGenerator(null);
    }
  };

  const handleGenerateResume = async () => {
    if (!resumeFileForGenerator) {
      setErrorGenerator("Please upload your base resume file first.");
      return;
    }
    if (!jobDetails?.description && !jobDetails?.title) {
      setErrorGenerator("Job details (title or description) are missing. Cannot tailor resume.");
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
      const response = await fetch('http://localhost:5002/api/generate_resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedResume(data.generated_resume_text);
    } catch (err) {
      console.error("Error generating resume:", err);
      setErrorGenerator(err.message || "Failed to generate resume from the server.");
    } finally {
      setIsLoadingGenerator(false);
    }
  };

  // --- Handler for Navigating to Course Prediction ---
  const handleNavigateToCoursePredict = () => {
    if (jobDetails) {
      navigate('/course_predict', { state: { jobDetails: jobDetails } });
    } else {
      // This case should ideally be prevented by disabling the button
      console.error("Job details not available to navigate to course prediction.");
      alert("Job details are not loaded. Cannot find related courses.");
    }
  };


  // --- Conditional Rendering ---
  if (!jobDetails && !errorScorer && !errorGenerator) {
    return <div className="check-job-page-container"><p>Loading job details...</p></div>;
  }

  if ((errorScorer && !jobDetails) || (errorGenerator && !jobDetails)) {
    const commonError = errorScorer || errorGenerator;
    return (
      <div className="check-job-page-container error-container">
        <p className="error-message">{commonError}</p>
        <button onClick={() => navigate('/')} className="button">Go to Job Listings</button>
      </div>
    );
  }

  return (
    <div >
      {/* --- TOP NAVIGATION BUTTONS --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={handleNavigateToCoursePredict}
          className="button practice-nav-button"          disabled={!jobDetails}
          style={{ marginRight: '10px', marginBottom: '10px' }} // Added margin for spacing
        >
          Get Related Courses
        </button>
        <button
          onClick={() => navigate('/practice', { state: { jobDetails: jobDetails } })}
          className="button practice-nav-button"
          disabled={!jobDetails}
          style={{ marginBottom: '10px' }} // Added margin for spacing
        >
          Practice Interview for this Job →
        </button>
      </div>

      <div className="page-wrapper">
        {/* Resume Match Scorer Section */}
        <div className="check-job-page-container feature-section">
          <div className="feature-header">
            <button onClick={() => navigate(-1)} className="button back-button">← Back</button>
            <h2>Resume Match Scorer</h2>
          </div>

          {jobDetails && (
            <div className="job-details-section">
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
            <p className="resume-instructions">Upload your resume file to see how well it matches this job.</p>
            <input
              type="file"
              onChange={handleFileChangeForScorer}
              className="file-input"
              disabled={isLoadingScorer}
            />
            {resumeFileForScorer && <p className="file-name">Selected: {resumeFileForScorer.name}</p>}
          </div>

          <button
            onClick={handleGetScore}
            disabled={isLoadingScorer || !resumeFileForScorer || !jobDetails}
            className="button get-score-button"
          >
            {isLoadingScorer ? 'Calculating Score...' : 'Get Score'}
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
        <div className="check-job-page-container feature-section">
          <div className="feature-header">
            <h2>Role-Specific Resume Generator</h2>
          </div>

          <p>Tailor your resume for the job: <strong>{jobDetails?.title || "Selected Job"}</strong></p>

          <div className="resume-upload-section">
            <h4>Upload Your Base Resume</h4>
            <p className="resume-instructions">
              Provide your current resume. The AI will attempt to modify it to better fit the job details above.
            </p>
            <input
              type="file"
              onChange={handleFileChangeForGenerator}
              className="file-input"
              disabled={isLoadingGenerator}
            />
            {resumeFileForGenerator && <p className="file-name">Selected: {resumeFileForGenerator.name}</p>}
          </div>

          <button
            onClick={handleGenerateResume}
            disabled={isLoadingGenerator || !resumeFileForGenerator || !jobDetails}
            className="button practice-nav-button"
          >
            {isLoadingGenerator ? 'Generating Resume...' : 'Generate Tailored Resume'}
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