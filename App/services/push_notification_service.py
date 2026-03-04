import os

import requests


class PushNotificationService:
    def __init__(self):
        # Configuralas en tu .env de la KVM
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.chat_id = os.getenv('TELEGRAM_CHAT_ID')
        
        self.is_configured = all([self.bot_token, self.chat_id])
        if not self.is_configured:
            print("ADVERTENCIA: Telegram no configurado. Alertas deshabilitadas.")

    def send_notification(self, message, title="🔔 Alerta de Salón"):
        """Envía una notificación gratuita vía Telegram Bot"""
        if not self.is_configured:
            return False

        # Formateamos el mensaje para que quede prolijo
        texto_final = f"*{title}*\n\n{message}"
        
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": texto_final,
            "parse_mode": "Markdown" # Para que el título salga en negrita
        }

        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                print(f"Notificación Telegram enviada")
                return True
            else:
                print(f"Error Telegram: {response.text}")
                return False
        except Exception as e:
            print(f"ERROR en Telegram Service: {e}")
            return False