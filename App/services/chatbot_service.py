import os

from flask import current_app  # <--- Para acceder a la config de Flask
from google.cloud import dialogflow
from google.oauth2 import service_account  # <--- Agrega esta importación


class ChatbotService:
    def __init__(self):
        # 1. Sacamos las credenciales y el ID del proyecto desde la configuración de Flask
        self.credentials_info = current_app.config.get('GOOGLE_CREDENTIALS')
        self.project_id = self.credentials_info.get('project_id') if self.credentials_info else None
        self.language_code = 'es'

        # 2. Creamos el objeto de credenciales de Google a partir del diccionario
        if self.credentials_info:
            self.credentials = service_account.Credentials.from_service_account_info(self.credentials_info)
        else:
            self.credentials = None

    def get_response(self, user_message: str, user_id: str = "usuario_anonimo") -> str:
        if not self.project_id or not self.credentials:
            print("ERROR: Credenciales de Google no configuradas correctamente.")
            return "Lo siento, tengo un problema de configuración."

        try:
            # 3. Pasamos las credenciales explícitamente al cliente
            session_client = dialogflow.SessionsClient(credentials=self.credentials)
            session = session_client.session_path(self.project_id, user_id)

            text_input = dialogflow.TextInput(text=user_message, language_code=self.language_code)
            query_input = dialogflow.QueryInput(text=text_input)

            response = session_client.detect_intent(request={"session": session, "query_input": query_input})

            return response.query_result.fulfillment_text

        except Exception as e:
            print(f"Error conectando con Dialogflow: {e}")
            return "Lo siento, tuve un problema conectando con mi servidor."