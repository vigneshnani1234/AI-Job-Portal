# flask_server/pages/extract.py
import PyPDF2

def extract_text_from_pdf(file_stream, logger):
    # ... (your existing code, ensure it uses the passed logger) ...
    try:
        pdf_reader = PyPDF2.PdfReader(file_stream)
        text_parts = [page.extract_text() for page in pdf_reader.pages if page.extract_text()]
        if not text_parts:
            logger.warning("No text extracted from PDF or PDF is empty.")
            return ""
        return "\n".join(text_parts).strip()
    except Exception as e:
        logger.error(f"Error reading PDF: {e}", exc_info=True)
        raise ValueError(f"Could not process PDF: {e}")