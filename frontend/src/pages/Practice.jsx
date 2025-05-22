import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
// import './PracticePage.css'; // Ensure this CSS file exists and is imported if needed

// VVVVVV DEFINE API_BASE_URL USING THE ENVIRONMENT VARIABLE VVVVVV
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002'; // Fallback for local dev
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

const Practice = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [jobDetailsFromState, setJobDetailsFromState] = useState(null);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [errorQuestions, setErrorQuestions] = useState('');
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [errorEvaluation, setErrorEvaluation] = useState('');

  useEffect(() => {
    if (location.state?.jobDetails) {
      const jobDetails = location.state.jobDetails;
      setJobDetailsFromState(jobDetails);
      if (jobDetails.title || jobDetails.description) { // Fetch only if essential info is present
        fetchInterviewQuestions(jobDetails);
      } else {
        setErrorQuestions("Job title or description missing, cannot fetch relevant questions.");
      }
    } else {
      setErrorQuestions("No job context provided. Please select a job first.");
    }
  }, [location.state]);

  const fetchInterviewQuestions = async (jobDetails) => {
    setIsLoadingQuestions(true);
    setErrorQuestions('');
    setInterviewQuestions([]);

    try {
      const payload = {
        job_role: jobDetails.title || "General Technical Role",
        context_keywords: jobDetails.description ? jobDetails.description.slice(0, 1000) : "",
        num_technical: 3, // Adjusted defaults
        num_behavioral: 2,
        num_situational: 2,
      };

      // VVVVVV USE THE API_BASE_URL VARIABLE VVVVVV
      const response = await fetch(`${API_BASE_URL}/api/generate_interview_questions`, {
      // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status} ${response.statusText}`);
      }

      let allQuestions = [];
      let idCounter = 1;
      if (responseData.questions) {
        ['technical_questions', 'behavioral_questions', 'situational_questions'].forEach(categoryKey => {
          if (responseData.questions[categoryKey] && Array.isArray(responseData.questions[categoryKey])) {
            responseData.questions[categoryKey].forEach(q_text => {
              allQuestions.push({ 
                id: idCounter++, 
                type: categoryKey.replace('_questions', ''), 
                question: q_text, 
                answer: '' 
              });
            });
          }
        });
      }
      setInterviewQuestions(allQuestions);
      if (allQuestions.length === 0 && !responseData.error) { // Only set this if no error from backend but no questions
        setErrorQuestions("AI did not generate any questions for this role. You can still practice general questions or try another role.");
      }

    } catch (err) {
      console.error("Error fetching interview questions:", err);
      setErrorQuestions(err.message || "Failed to fetch interview questions.");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setInterviewQuestions(prevQuestions =>
      prevQuestions.map(q =>
        q.id === questionId ? { ...q, answer: value } : q
      )
    );
  };

  const handleSubmitAnswers = async () => {
    if (!jobDetailsFromState) {
        setErrorEvaluation("Job details are missing, cannot submit for evaluation.");
        return;
    }
    const answeredQuestions = interviewQuestions.filter(q => q.answer && q.answer.trim() !== '');
    if (answeredQuestions.length === 0) {
      setErrorEvaluation("Please answer at least one question before submitting.");
      return;
    }

    setIsSubmittingAnswers(true);
    setErrorEvaluation('');
    setEvaluationResult(null);

    const evaluationPayload = {
      job_details: { // Send only necessary parts of jobDetails
        title: jobDetailsFromState.title,
        description: jobDetailsFromState.description, // Backend will snippet this
      },
      questions_and_answers: interviewQuestions.map(({ id, type, question, answer }) => ({ id, type, question, answer })),
    };

    try {
      // VVVVVV USE THE API_BASE_URL VARIABLE VVVVVV
      const response = await fetch(`${API_BASE_URL}/api/evaluate_answers`, {
      // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluationPayload),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Server error: ${response.status} ${response.statusText}`);
      }
      setEvaluationResult(responseData);
    } catch (err) {
      console.error("Error submitting answers for evaluation:", err);
      setErrorEvaluation(err.message || "Failed to get evaluation from the server.");
    } finally {
      setIsSubmittingAnswers(false);
    }
  };

  if (!jobDetailsFromState && !errorQuestions && isLoadingQuestions) {
    return <div className="practice-page-container loading"><p>Loading job context...</p></div>;
  }

  if (errorQuestions && interviewQuestions.length === 0) {
    return (
      <div className="practice-page-container error">
        <p className="error-message">{errorQuestions}</p>
        <button onClick={() => navigate('/')} className="button">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="practice-page-container">
      <div className="practice-header">
        <button onClick={() => navigate(-1)} className="button back-button-practice">
          ← Back
        </button>
        <h1>Interview Practice</h1>
        {jobDetailsFromState?.title && (
          <p className="job-context">
            For: <strong>{jobDetailsFromState.title}</strong>
            {jobDetailsFromState.company?.display_name && ` at ${jobDetailsFromState.company.display_name}`}
          </p>
        )}
      </div>

      {isLoadingQuestions && <p>Loading questions...</p>}
      {!isLoadingQuestions && errorQuestions && interviewQuestions.length === 0 && <p className="error-message">{errorQuestions}</p>}
      
      {interviewQuestions.length > 0 ? (
        <div className="questions-list">
          {interviewQuestions.map((q) => (
            <div key={q.id} className="question-item">
              <p className="question-text"><strong>{q.id}. ({q.type})</strong> {q.question}</p>
              <textarea
                value={q.answer}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder="Your answer here..."
                rows="4"
                className="answer-textarea"
                disabled={isSubmittingAnswers}
              />
            </div>
          ))}
          <button
            onClick={handleSubmitAnswers}
            disabled={isSubmittingAnswers || interviewQuestions.every(q => !q.answer || q.answer.trim() === '')}
            className="button submit-answers-button"
          >
            {isSubmittingAnswers ? 'Evaluating...' : 'Submit for Evaluation'}
          </button>
          {errorEvaluation && <p className="error-message evaluation-error">{errorEvaluation}</p>}
        </div>
      ) : (
        !isLoadingQuestions && !errorQuestions && <p>No questions available for this role yet. Check back later or try another role.</p>
      )}

      {evaluationResult && (
        <div className="evaluation-result-section">
          <h2>Evaluation Result</h2>
          <p className="score">Overall Score: <strong>{evaluationResult.score !== undefined ? `${evaluationResult.score.toFixed(0)}%` : "N/A"}</strong></p>
          {evaluationResult.feedback && <p className="feedback"><strong>Feedback:</strong> {evaluationResult.feedback}</p>}
          {evaluationResult.detailed_feedback && evaluationResult.detailed_feedback.length > 0 && (
            <div className="detailed-feedback">
              <h4>Details:</h4>
              <ul>
                {evaluationResult.detailed_feedback.map((item, index) => (
                  <li key={item.question_id || index}>
                    <strong>Q{item.question_id || index + 1} ({item.score !== undefined ? `${item.score}/100` : 'N/A'}):</strong> {item.feedback_text}
                  </li>
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