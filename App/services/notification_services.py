import os
import smtplib
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from weasyprint import HTML


class NotificationService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER')
        self.smtp_port = os.getenv('SMTP_PORT')
        self.sender_email = os.getenv('SENDER_EMAIL')
        self.sender_password = os.getenv('SENDER_APP_PASSWORD')
        self.is_configured = all([self.smtp_server, self.smtp_port, self.sender_email, self.sender_password])

    def send_email_confirmation(self, to_email: str, user_name: str, event_date: str, html_contract: str):
        if not self.is_configured:
            print("ERROR: El servicio de email no está configurado.")
            return False

        if not to_email:
            print(f"ALERTA: No se pudo enviar email a {user_name} porque no tiene correo.")
            return False

        # --- LÓGICA DEL PDF Y EMAIL ---
        
        # 1. Creamos el PDF en memoria a partir del HTML que recibimos
        pdf_bytes = HTML(string=html_contract).write_pdf()

        # 2. Creamos el mensaje del email
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Confirmación de tu reserva para el {event_date}"
        message["From"] = self.sender_email
        message["To"] = to_email

        email_body_html = f"""
        <html><body>
            <h2>¡Tu reserva ha sido confirmada!</h2>
            <p>Hola, {user_name},</p>
            <p>Adjuntamos una copia en PDF del contrato y los términos y condiciones que has aceptado para tu reserva del día <strong>{event_date}</strong>.</p>
            <p>Puedes contactarnos por WhatsApp 24 o 48 horas antes del evento para coordinar el ingreso.</p>
            <p>¡Gracias por elegirnos!</p>
        </body></html>
        """
        message.attach(MIMEText(email_body_html, "html"))
        
        # 3. Adjuntamos el PDF
        adjunto = MIMEApplication(pdf_bytes, _subtype="pdf")
        adjunto.add_header('Content-Disposition', 'attachment', filename='contrato_reserva.pdf')
        message.attach(adjunto)

        # 4. Enviamos el correo
        context = ssl.create_default_context()
        try:
            with smtplib.SMTP_SSL(self.smtp_server, int(self.smtp_port), context=context) as server:
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, to_email, message.as_string())
            print(f"Email de confirmación con PDF adjunto enviado a {to_email}")
            return True
        except Exception as e:
            print(f"ERROR al enviar email con adjunto: {e}")
            return False