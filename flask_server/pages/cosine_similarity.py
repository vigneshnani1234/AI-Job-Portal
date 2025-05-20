# flask_server/pages/cosine_similarity.py
from sklearn.metrics.pairwise import cosine_similarity
# import numpy as np # Not strictly needed if only using reshape

def calculate_similarity(text1, text2, sbert_model, logger):
    # ... (your existing code, ensure it uses passed sbert_model and logger) ...
    if not sbert_model:
        raise RuntimeError("SBERT model not provided for similarity calculation.")
    try:
        logger.debug("Generating embeddings for similarity.")
        emb1 = sbert_model.encode(text1).reshape(1, -1)
        emb2 = sbert_model.encode(text2).reshape(1, -1)
        score = cosine_similarity(emb1, emb2)[0][0]
        return max(0.0, min(1.0, float(score))) * 100
    except Exception as e:
        logger.error(f"Error in calculate_similarity: {e}", exc_info=True)
        raise RuntimeError(f"Similarity calculation failed: {e}")