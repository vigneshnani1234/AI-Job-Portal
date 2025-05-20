# flask_server/pages/load_model.py
# (Your existing load_bert_model function)
def load_bert_model(logger):
    sbert_model_instance = None
    model_loaded_flag = False
    try:
        from sentence_transformers import SentenceTransformer
        model_loaded_flag = True 
    except ImportError:
        logger.warning("`sentence_transformers` library not found. SBERT features unavailable.")
        return None, False 

    if model_loaded_flag:
        try:
            model_name = 'all-MiniLM-L6-v2'
            logger.info(f"Loading Sentence Transformer model: {model_name}...")
            sbert_model_instance = SentenceTransformer(model_name)
            logger.info("Sentence Transformer model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load Sentence Transformer model: {e}", exc_info=True)
            sbert_model_instance = None
            model_loaded_flag = False
    return sbert_model_instance, model_loaded_flag