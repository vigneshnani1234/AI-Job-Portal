
COURSE_METADATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'ML prediction', 'course_metadata.joblib')
COURSE_MATRIX_PATH = os.path.join(os.path.dirname(__file__), '..', 'ML prediction', 'course_tfidf_matrix.joblib')
VECTORIZER_PATH = os.path.join(os.path.dirname(__file__), '..', 'ML prediction', 'tfidf_vectorizer.joblib')



def predict_courses(logger):
    global tfidf_vectorizer, course_tfidf_matrix, course_metadata_df

    if tfidf_vectorizer is None or course_tfidf_matrix is None or course_metadata_df is None:
        logger.error("Model components not loaded. Cannot make predictions.")
        return jsonify({"error": "Model not ready. Please try again later."}), 503 # 503 Service Unavailable

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400

        job_title = data.get('job_title', '')
        job_description = data.get('job_description', '')
        top_n = data.get('top_n', 3) # Default to top 3

        if not job_title and not job_description:
            return jsonify({"error": "Job title or job description must be provided"}), 400

        # Combine job title and description to form the query
        query_text = clean_text(job_title + " " + job_description)
        if not query_text.strip():
            app.logger.warning("Query text is empty after cleaning for job: " + job_title)
            return jsonify({"courses": [], "message": "Query text became empty after cleaning. No recommendations."}), 200


        # Transform the query using the loaded vectorizer
        query_vector = tfidf_vectorizer.transform([query_text])

        # Calculate cosine similarity
        cosine_similarities = cosine_similarity(query_vector, course_tfidf_matrix).flatten()

        # Get indices of top_n most similar courses
        # argsort returns indices that would sort the array. We take the last 'top_n' in reverse.
        # Ensure we don't request more courses than available
        num_courses_to_consider = min(top_n, len(cosine_similarities))
        related_courses_indices = cosine_similarities.argsort()[-num_courses_to_consider:][::-1]
        
        recommendations = []
        for index in related_courses_indices:
            similarity_score = float(cosine_similarities[index]) # Ensure it's a Python float for JSON
            
            # Only recommend if there's some meaningful similarity
            # You might need to tune this threshold
            if similarity_score > 0.01:
                course_info = course_metadata_df.iloc[index]
                recommendations.append({
                    "id": f"course_{index}", # A simple unique ID for frontend key
                    "name": course_info.get('course_title', 'N/A'),
                    "url": course_info.get('Course URL', '#'),
                    "platform": "Coursera", # Assuming all are from Coursera for this dataset
                    "relevance": f"{similarity_score:.2%}", # Format as percentage string
                    "similarity_score": round(similarity_score, 4), # Raw score for potential sorting/filtering
                    "description_snippet": (course_info.get('course_description', '')[:200] + "...") if course_info.get('course_description') else "No description available.",
                    "skills_taught": course_info.get('course_skills', 'Skills not specified')
                })
        
        if not recommendations:
            app.logger.info(f"No suitable courses found with similarity > 0.01 for job: {job_title}")
            return jsonify({"courses": [], "message": "No courses found matching your query with sufficient similarity."}), 200

        return jsonify({"courses": recommendations}), 200

    except Exception as e:
        app.logger.error(f"Error during course prediction: {e}", exc_info=True) # Log full traceback
        return jsonify({"error": "An internal error occurred while predicting courses."}), 500

# --- Health Check Endpoint (Optional but good practice) ---

def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# --- Function to load model components at startup ---
def load_model():
    global tfidf_vectorizer, course_tfidf_matrix, course_metadata_df
    print("Loading course recommender model components...")
    try:
        if not all([os.path.exists(p) for p in [VECTORIZER_PATH, COURSE_MATRIX_PATH, COURSE_METADATA_PATH]]):
            app.logger.error("One or more model files are missing. Please ensure the model is trained and files are in the correct location.")
            # You might want to raise an error here or prevent the app from starting
            return False

        tfidf_vectorizer = joblib.load(VECTORIZER_PATH)
        course_tfidf_matrix = joblib.load(COURSE_MATRIX_PATH)
        course_metadata_df = joblib.load(COURSE_METADATA_PATH)
        app.logger.info("Course recommender model components loaded successfully.")
        return True
    except Exception as e:
        app.logger.error(f"Error loading model components: {e}")
        return False

# --- API Endpoint for Course Prediction ---