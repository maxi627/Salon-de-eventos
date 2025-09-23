import os

# La importación de 'Client' se elimina de aquí
from pushover import Client


class PushNotificationService:
    def __init__(self):
        self.user_key = os.getenv('PUSHOVER_USER_KEY')
        self.api_token = os.getenv('PUSHOVER_API_TOKEN')
        
        if not self.user_key or not self.api_token:
            print("ADVERTENCIA: Las claves de Pushover no están configuradas. Las notificaciones push están deshabilitadas.")
            self.client = None
        else:
            # Así se inicializa correctamente el cliente en esta versión
            self.client = Client(self.user_key, api_token=self.api_token)

    def send_notification(self, message, title="Alerta de Salón de Eventos"):
        """
        Envía una notificación push si el servicio está configurado.
        """
        if self.client:
            try:
                # El método para enviar el mensaje se mantiene igual
                self.client.send_message(message, title=title)
                print(f"Notificación push enviada: '{title}'")
                return True
            except Exception as e:
                print(f"ERROR al enviar notificación push: {e}")
                return False
        return False