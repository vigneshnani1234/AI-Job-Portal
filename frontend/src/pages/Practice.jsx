// src/pages/PracticePage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
// import './PracticePage.css'; // Create this CSS file

const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // --- State ---
  const [jobDetailsFromState, setJobDetailsFromState] = useState(null); // To store job details passed from CheckJobPage
  const [interviewQuestions, setInterviewQuestions] = useState([]); // [{id: 1, type: 'technical', question: '...', answer: ''}, ...]
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [errorQuestions, setErrorQuestions] = useState('');
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null); // { score: 85, feedback: "..." }
  const [errorEvaluation, setErrorEvaluation] = useState('');

  // --- Effect to get job details from navigation state ---
  useEffect(() => {
    if (location.state?.jobDetails) {
      setJobDetailsFromState(location.state.jobDetails);
      // Fetch questions when jobDetails are available
      fetchInterviewQuestions(location.state.jobDetails);
    } else {
      // Handle case where user navigates directly to /practice without job context
      setErrorQuestions("No job context provided. Please select a job first to get practice questions.");
      // Optionally, redirect or show a link to go back
      // navigate('/');
    }
  }, [location.state]);

  // --- Fetch Interview Questions ---
  const fetchInterviewQuestions = async (jobDetails) => {
    setIsLoadingQuestions(true);
    setErrorQuestions('');
    setInterviewQuestions([]); // Clear previous questions

    if (!jobDetails || (!jobDetails.title && !jobDetails.description)) {
        setErrorQuestions("Cannot fetch questions without job title or description.");
        setIsLoadingQuestions(false);
        return;
    }

    try {
      const payload = {
        job_role: jobDetails.title || "General Role", // Use title as primary role identifier
        context_keywords: jobDetails.description ? jobDetails.description.slice(0, 1000) : "", // Send a snippet of JD
        // You can add more parameters, like number of questions per category
        num_technical: 4,
        num_behavioral: 3,
        num_situational: 3,
      };

      console.log("Fetching questions with payload:", payload);
      const response = await fetch('http://localhost:5002/api/generate_interview_questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      // Assuming data.questions is { technical_questions: [], behavioral_questions: [], situational_questions: [] }
      let allQuestions = [];
      let idCounter = 1;
      if (data.questions) {
        for (const category in data.questions) {
          data.questions[category].forEach(q_text => {
            allQuestions.push({ id: idCounter++, type: category.replace('_questions', ''), question: q_text, answer: '' });
          });
        }
      }
      setInterviewQuestions(allQuestions);
      if (allQuestions.length === 0) {
        setErrorQuestions("No questions were generated. Try a different job or context.");
      }

    } catch (err) {
      console.error("Error fetching interview questions:", err);
      setErrorQuestions(err.message || "Failed to fetch interview questions.");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // --- Handle Answer Change ---
  const handleAnswerChange = (questionId, value) => {
    setInterviewQuestions(prevQuestions =>
      prevQuestions.map(q =>
        q.id === questionId ? { ...q, answer: value } : q
      )
    );
  };

  // --- Handle Submit Answers for Evaluation ---
  const handleSubmitAnswers = async () => {
    setIsSubmittingAnswers(true);
    setErrorEvaluation('');
    setEvaluationResult(null);

    // Basic check if any answers are provided
    const answeredQuestions = interviewQuestions.filter(q => q.answer.trim() !== '');
    if (answeredQuestions.length === 0) {
        setErrorEvaluation("Please answer at least one question before submitting.");
        setIsSubmittingAnswers(false);
        return;
    }

    // Prepare payload for backend evaluation
    const evaluationPayload = {
      job_details: jobDetailsFromState, // Send full job details for context
      questions_and_answers: interviewQuestions.map(({ id, type, question, answer }) => ({ id, type, question, answer })),
    };

    try {
      console.log("Submitting answers for evaluation:", evaluationPayload);
      // IMPORTANT: This will be a NEW backend endpoint
      const response = await fetch('http://localhost:5002/api/evaluate_answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluationPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      // Assuming backend returns { score: number, feedback: string, detailed_feedback: [...] }
      setEvaluationResult(data);

    } catch (err) {
      console.error("Error submitting answers for evaluation:", err);
      setErrorEvaluation(err.message || "Failed to get evaluation from the server.");
    } finally {
      setIsSubmittingAnswers(false);
    }
  };


  // --- Render ---
  if (isLoadingQuestions) {
    return <div className="practice-page-container loading"><p>Loading interview questions...</p></div>;
  }

  if (errorQuestions && interviewQuestions.length === 0) {
    return (
      <div className="practice-page-container error">
        <p className="error-message">{errorQuestions}</p>
        <Link to="/" className="button">Back to Job Listings</Link>
      </div>
    );
  }

  return (
    <div className="practice-page-container">
      <div className="practice-header">
        <button onClick={() => navigate(-1)} className="button back-button-practice">
          ← Back to Job Details
        </button>
        <h1>Interview Practice</h1>
        {jobDetailsFromState?.title && (
          <p className="job-context">
            Practicing for: <strong>{jobDetailsFromState.title}</strong>
            {jobDetailsFromState.company?.display_name && ` at ${jobDetailsFromState.company.display_name}`}
          </p>
        )}
      </div>

      {interviewQuestions.length > 0 ? (
        <div className="questions-list">
          {interviewQuestions.map((q) => (
            <div key={q.id} className="question-item">
              <p className="question-text"><strong>{q.id}. ({q.type})</strong> {q.question}</p>
              <textarea
                value={q.answer}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder="Type your answer here..."
                rows="4"
                className="answer-textarea"
                disabled={isSubmittingAnswers}
              />
            </div>
          ))}
          <button
            onClick={handleSubmitAnswers}
            disabled={isSubmittingAnswers || interviewQuestions.every(q => q.answer.trim() === '')}
            className="button submit-answers-button"
          >
            {isSubmittingAnswers ? 'Evaluating...' : 'Submit Answers for Evaluation'}
          </button>
          {errorEvaluation && <p className="error-message evaluation-error">{errorEvaluation}</p>}
        </div>
      ) : (
        !isLoadingQuestions && <p>No questions loaded. Try returning to the job details page.</p>
      )}

      {evaluationResult && (
        <div className="evaluation-result-section">
          <h2>Evaluation Result</h2>
          <p className="score">Overall Score: <strong>{evaluationResult.score !== undefined ? `${evaluationResult.score.toFixed(0)}%` : "N/A"}</strong></p>
          {evaluationResult.feedback && <p className="feedback"><strong>General Feedback:</strong> {evaluationResult.feedback}</p>}
          {/* You could add more detailed feedback display here if the backend provides it */}
          {evaluationResult.detailed_feedback && evaluationResult.detailed_feedback.length > 0 && (
            <div className="detailed-feedback">
                <h4>Detailed Feedback:</h4>
                <ul>
                    {evaluationResult.detailed_feedback.map((item, index) => (
                        <li key={index}><strong>Q{item.question_id || index + 1}:</strong> {item.feedback_text}</li>
                    ))}
                </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Practice;