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

        pdf_bytes = HTML(string=html_contract).write_pdf()
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
        
        adjunto = MIMEApplication(pdf_bytes, _subtype="pdf")
        adjunto.add_header('Content-Disposition', 'attachment', filename='contrato_reserva.pdf')
        message.attach(adjunto)

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

    # --- NUEVO MÉTODO PARA EMAIL DE RESETEO ---
    def send_password_reset_email(self, to_email: str, user_name: str, reset_link: str):
        if not self.is_configured:
            print("ERROR: El servicio de email no está configurado.")
            return False

        message = MIMEMultipart("alternative")
        message["Subject"] = "Restablece tu contraseña para Salón de Eventos"
        message["From"] = self.sender_email
        message["To"] = to_email

        email_body_html = f"""
        <html><body>
            <h2>Solicitud de cambio de contraseña</h2>
            <p>Hola, {user_name},</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
            <p style="margin: 20px 0;">
                <a href="{reset_link}" style="padding: 12px 20px; background-color: #c3a177; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Restablecer Contraseña
                </a>
            </p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
            <p><em>El enlace expirará en 10 minutos.</em></p>
        </body></html>
        """
        message.attach(MIMEText(email_body_html, "html"))
        
        context = ssl.create_default_context()
        try:
            with smtplib.SMTP_SSL(self.smtp_server, int(self.smtp_port), context=context) as server:
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, to_email, message.as_string())
            print(f"Email de reseteo de contraseña enviado a {to_email}")
            return True
        except Exception as e:
            print(f"ERROR al enviar email de reseteo: {e}")
            return False