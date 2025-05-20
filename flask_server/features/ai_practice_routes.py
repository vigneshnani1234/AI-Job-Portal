# flask_server/features/ai_practice_routes.py
from flask import Blueprint, request, jsonify, current_app
from ..pages.ai_utils import generate_interview_questions_llm, evaluate_single_answer_llm

ai_practice_bp = Blueprint('ai_practice', __name__, url_prefix='/api')

@ai_practice_bp.route('/generate_interview_questions', methods=['POST'])
def generate_questions_route():
    data = request.get_json()
    job_role = data.get('job_role')
    if not job_role: return jsonify({"error": "Job role required"}), 400
    
    try:
        questions = generate_interview_questions_llm(
            job_role,
            data.get('context_keywords', ''),
            current_app.logger,
            num_technical=data.get('num_technical', 3),
            num_behavioral=data.get('num_behavioral', 2),
            num_situational=data.get('num_situational', 2),
            model="tinyllama" # Or from config
        )
        return jsonify({"questions": questions})
    except ConnectionError as ce:
        current_app.logger.error(f"Ollama connection error in generate_questions: {ce}")
        return jsonify({"error": "AI service (Ollama) connection failed."}), 503
    except Exception as e:
        current_app.logger.error(f"Error generating questions: {e}", exc_info=True)
        return jsonify({"error": f"Question generation failed: {str(e)}"}), 500

@ai_practice_bp.route('/evaluate_answers', methods=['POST'])
def evaluate_answers_route_handler():
    data = request.get_json()
    job_details = data.get('job_details')
    q_and_a = data.get('questions_and_answers')

    if not job_details or not q_and_a: return jsonify({"error": "Missing data"}), 400
    job_title = job_details.get("title", "General Role")
    job_desc = (job_details.get("description") or "")[:300] # Snippet

    results = []
    total_score_sum = 0
    evaluated_count = 0
    try:
        for item in q_and_a:
            q_text = item.get("question")
            answer = item.get("answer")
            if not q_text or not answer:
                results.append({"question_id": item.get("id"), "score": 0, "feedback_text": "Not answered."})
                continue
            
            eval_result = evaluate_single_answer_llm(job_title, job_desc, q_text, answer, current_app.logger, model="tinyllama")
            results.append({"question_id": item.get("id"), **eval_result})
            total_score_sum += eval_result.get("score", 0)
            evaluated_count +=1
        
        avg_score = (total_score_sum / evaluated_count) if evaluated_count > 0 else 0
        # Simple overall feedback based on average
        overall_fb = f"Overall average score: {avg_score:.0f}%. "
        if avg_score > 75: overall_fb += "Strong performance!"
        elif avg_score > 50: overall_fb += "Good effort, room to improve."
        else: overall_fb += "Needs significant improvement."

        return jsonify({
            "score": avg_score,
            "feedback": overall_fb,
            "detailed_feedback": results
        })
    except ConnectionError as ce:
        current_app.logger.error(f"Ollama connection error in evaluate_answers: {ce}")
        return jsonify({"error": "AI service (Ollama) connection failed."}), 503
    except Exception as e:
        current_app.logger.error(f"Error evaluating answers: {e}", exc_info=True)
        return jsonify({"error": f"Answer evaluation failed: {str(e)}"}), 500