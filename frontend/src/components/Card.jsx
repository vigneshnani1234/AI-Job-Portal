import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Card.css'; // Assuming this is the correct CSS file name

const Card = ({ job }) => {
  if (!job) {
    return null;
  }

  const {
    title,
    company,
    location,
    description,
    created,
    redirect_url,
    id // Adzuna API provides an 'id' for each job
  } = job;

  return (
    <div className="job-card" data-job-id={id}>
      <h2 className="job-card-title">{title || 'Job Title Not Available'}</h2>
      <p className="job-card-company">
        <strong>Company:</strong> {company?.display_name || 'N/A'}
      </p>
      <p className="job-card-location">
        <strong>Location:</strong> {location?.display_name || 'N/A'}
      </p>
      <p className="job-card-description">
        {description ? `${description.slice(0, 120)}...` : 'No description available.'}
      </p>
      <p className="job-card-posted">
        <strong>Posted:</strong> {created ? new Date(created).toLocaleDateString() : 'N/A'}
      </p>

      <div className="job-card-actions">
        {redirect_url && (
          <a
            href={redirect_url}
            target="_blank"
            rel="noopener noreferrer"
            className="job-card-button apply-button" // Changed class for specificity
          >
            Apply Now
          </a>
        )}

        {/* "Check with AI" button using Link */}
        <div>   </div>
        {id && ( // Ensure job.id exists to form the link
          <Link
            to={`/check/${id}`} // Dynamic route with job.id
            state={{ jobDetails: job }} // Pass the entire job object as state
            className="job-card-button ai-check-button" // New class for styling
          >
            Check with AI
          </Link>
        )}
      </div>
    </div>
  );
};

export default Card;