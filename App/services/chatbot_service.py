import re

from app.chatbot_logic.faq_data import DEFAULT_ANSWER, FAQS


class ChatbotService:
    def get_response(self, user_message: str) -> str:
        """
        Encuentra la respuesta más relevante de FAQS basada en un sistema de puntuación de palabras clave.
        """
        user_message = user_message.lower()
        # Limpiar el mensaje para una mejor coincidencia
        user_message = ''.join(c for c in user_message if c.isalnum() or c.isspace())

        best_match = None
        highest_score = 0

        for faq in FAQS:
            current_score = 0
            for keyword in faq["keywords"]:
                # Usamos re.search con \b para buscar la palabra completa
                if re.search(r'\b' + keyword + r'\b', user_message):
                    current_score += 1
            
            if current_score > highest_score:
                highest_score = current_score
                best_match = faq

        if best_match:
            return best_match["answer"]
        
        return DEFAULT_ANSWER