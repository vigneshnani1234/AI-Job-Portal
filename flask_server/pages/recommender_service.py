# flask_server/pages/recommender_service.py
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
import os
import re
import logging

# Configure logging for this module
logger = logging.getLogger(__name__)
# If you run app.py, Flask's logger might take precedence or need configuration
# to see these logs. For direct testing of this file, this basicConfig works.
if not logger.handlers: # Avoid adding multiple handlers if imported multiple times or by different modules
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# --- Configuration for Model Paths ---
# Get the directory where this script (recommender_service.py) is located
# current_script_dir = /path/to/your_project_root/flask_server/pages
CURRENT_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) #pages directory

# Go one level up to get the flask_server directory
# flask_server_dir = /path/to/your_project_root/flask_server
FLASK_SERVER_DIR = os.path.dirname(CURRENT_SCRIPT_DIR) #flask directory

# Go one level up from flask_server_dir to get the project_root_dir
# project_root_dir = /path/to/your_project_root
PROJECT_ROOT_DIR = os.path.dirname(FLASK_SERVER_DIR) #jobber directory

# Now construct the path to the ML_prediction directory
MODEL_DIR_NAME = 'ML prediction' # Your model directory name
MODEL_DIR_PATH = os.path.join(PROJECT_ROOT_DIR, MODEL_DIR_NAME)

VECTORIZER_PATH = os.path.join(MODEL_DIR_PATH, 'tfidf_vectorizer.joblib')
COURSE_MATRIX_PATH = os.path.join(MODEL_DIR_PATH, 'course_tfidf_matrix.joblib')
COURSE_METADATA_PATH = os.path.join(MODEL_DIR_PATH, 'course_metadata.joblib')

# --- Global variables to hold loaded model components within this module ---
_tfidf_vectorizer = None
_course_tfidf_matrix = None
_course_metadata_df = None
_model_loaded_successfully = False

# --- Helper Function for Basic Text Cleaning ---
def _clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# --- Function to load model components ---
def load_model_components():
    global _tfidf_vectorizer, _course_tfidf_matrix, _course_metadata_df, _model_loaded_successfully
    
    logger.info(f"Attempting to load course recommender model components from: {MODEL_DIR_PATH}")
    try:
        if not os.path.isdir(MODEL_DIR_PATH):
            logger.error(f"Model directory not found: {MODEL_DIR_PATH}")
            _model_loaded_successfully = False
            return False
        if not all([os.path.exists(p) for p in [VECTORIZER_PATH, COURSE_MATRIX_PATH, COURSE_METADATA_PATH]]):
            logger.error(f"One or more model files are missing from {MODEL_DIR_PATH}.")
            logger.info(f"  Vectorizer exists: {os.path.exists(VECTORIZER_PATH)} (Path: {VECTORIZER_PATH})")
            logger.info(f"  Matrix exists: {os.path.exists(COURSE_MATRIX_PATH)} (Path: {COURSE_MATRIX_PATH})")
            logger.info(f"  Metadata exists: {os.path.exists(COURSE_METADATA_PATH)} (Path: {COURSE_METADATA_PATH})")
            _model_loaded_successfully = False
            return False

        _tfidf_vectorizer = joblib.load(VECTORIZER_PATH)
        _course_tfidf_matrix = joblib.load(COURSE_MATRIX_PATH)
        _course_metadata_df = joblib.load(COURSE_METADATA_PATH)
        _model_loaded_successfully = True
        logger.info("Course recommender model components loaded successfully.")
        return True
    except Exception as e:
        logger.error(f"Error loading model components: {e}", exc_info=True)
        _model_loaded_successfully = False
        return False

# --- Function to get the status of the model ---
def get_model_status():
    if _model_loaded_successfully and _tfidf_vectorizer and _course_tfidf_matrix is not None and _course_metadata_df is not None:
        return {"status": "UP", "message": "Model components loaded and ready."}
    else:
        missing_files_details = []
        if not os.path.exists(VECTORIZER_PATH): missing_files_details.append(f'vectorizer (at {VECTORIZER_PATH})')
        if not os.path.exists(COURSE_MATRIX_PATH): missing_files_details.append(f'matrix (at {COURSE_MATRIX_PATH})')
        if not os.path.exists(COURSE_METADATA_PATH): missing_files_details.append(f'metadata (at {COURSE_METADATA_PATH})')
        
        error_message = "Model components not loaded or error during loading."
        if missing_files_details:
            error_message += f" Missing: {'; '.join(missing_files_details)}."
            
        return {"status": "DOWN", "message": error_message}

# --- Function to get course predictions ---
def get_predictions(job_title, job_description, top_n=3):
    if not _model_loaded_successfully:
        logger.warning("Prediction attempted while model not loaded.")
        status = get_model_status()
        return [], status["message"]

    query_text = _clean_text(job_title + " " + job_description)
    if not query_text.strip():
        logger.info(f"Query text became empty after cleaning for job: {job_title}")
        return [], "Query text became empty after cleaning. No recommendations."

    try:
        query_vector = _tfidf_vectorizer.transform([query_text])
        cosine_similarities = cosine_similarity(query_vector, _course_tfidf_matrix).flatten()

        num_courses_to_consider = min(top_n, len(cosine_similarities))
        related_courses_indices = cosine_similarities.argsort()[-num_courses_to_consider:][::-1]
        
        recommendations = []
        for index in related_courses_indices:
            similarity_score = float(cosine_similarities[index])
            
            if similarity_score > 0.01: # Similarity threshold
                course_info = _course_metadata_df.iloc[index]
                recommendations.append({
                    "id": f"course_{index}",
                    "name": course_info.get('course_title', 'N/A'),
                    "url": course_info.get('Course URL', '#'),
                    "platform": "Coursera",
                    "relevance": f"{similarity_score:.2%}",
                    "similarity_score": round(similarity_score, 4),
                    "description_snippet": (course_info.get('course_description', '')[:200] + "...") if course_info.get('course_description') else "No description available.",
                    "skills_taught": course_info.get('course_skills', 'Skills not specified')
                })
        
        if not recommendations:
            logger.info(f"No suitable courses found with similarity > 0.01 for job: {job_title}")
            return [], "No courses found matching your query with sufficient similarity."
            
        return recommendations, "Successfully retrieved recommendations."

    except Exception as e:
        logger.error(f"Error during prediction logic: {e}", exc_info=True)
        return [], f"An internal error occurred in prediction service: {e}"

# --- Load model when this module is imported for the first time ---
if not _model_loaded_successfully:
    # Log the calculated paths for debugging before attempting to load
    logger.info(f"Calculated CURRENT_SCRIPT_DIR: {CURRENT_SCRIPT_DIR}")
    logger.info(f"Calculated FLASK_SERVER_DIR: {FLASK_SERVER_DIR}")
    logger.info(f"Calculated PROJECT_ROOT_DIR: {PROJECT_ROOT_DIR}")
    logger.info(f"Calculated MODEL_DIR_PATH: {MODEL_DIR_PATH}")
    load_model_components()