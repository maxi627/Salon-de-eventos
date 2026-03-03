import os
import smtplib
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from weasyprint import HTML


class NotificationService:
    def __init__(self):
        # Configuración desde variables de entorno para mayor seguridad
        self.smtp_server = os.getenv('SMTP_SERVER')
        self.smtp_port = os.getenv('SMTP_PORT')
        self.sender_email = os.getenv('SENDER_EMAIL')
        self.sender_password = os.getenv('SENDER_APP_PASSWORD')
        
        # Correo del administrador (leído desde .env en la KVM)
        self.admin_email = os.getenv('ADMIN_EMAIL') 
        
        # Verificación de configuración completa
        self.is_configured = all([
            self.smtp_server, 
            self.smtp_port, 
            self.sender_email, 
            self.sender_password,
            self.admin_email
        ])

    def send_email_confirmation(self, to_email: str, user_name: str, event_date: str, html_contract: str):
        if not self.is_configured:
            print("ERROR: El servicio de email no está configurado correctamente en las variables de entorno.")
            return False

        if not to_email:
            print(f"ALERTA: No se pudo enviar email a {user_name} porque no tiene correo registrado.")
            return False

        try:
            # 1. Generar el PDF a partir del contenido HTML definitivo (confirmado por admin)
            pdf_bytes = HTML(string=html_contract).write_pdf()

            # 2. Guardar copia física en el servidor (KVM) para respaldo legal
            safe_user_name = user_name.replace(" ", "_")
            # Usamos un prefijo 'definitivo' para diferenciarlo de cualquier borrador previo
            file_name = f"contrato_confirmado_{safe_user_name}_{event_date.replace('/', '-')}.pdf"
            file_path = os.path.join("uploads/contratos", file_name)
            
            # Asegurar que la ruta de destino exista en la KVM
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, "wb") as f:
                f.write(pdf_bytes)

            # 3. Preparar el correo electrónico
            message = MIMEMultipart("mixed")
            message["Subject"] = f"Reserva Confirmada - Contrato Definitivo - {event_date}"
            message["From"] = self.sender_email
            message["To"] = to_email
            
            # Copia oculta (BCC) para vos (eulamaxi1@gmail.com configurado en .env)
            message["Bcc"] = self.admin_email 

            # Cuerpo del mensaje adaptado al flujo de confirmación manual
            email_body_html = f"""
            <html>
                <body style="font-family: sans-serif; color: #333; line-height: 1.5;">
                    <h2 style="color: #2c3e50;">¡Tu reserva ha sido confirmada satisfactoriamente!</h2>
                    <p>Hola, <strong>{user_name}</strong>,</p>
                    <p>Nos complace informarte que tu reserva para el día <strong>{event_date}</strong> ha sido confirmada por la administración.</p>
                    <p>Adjuntamos el <strong>Contrato de Alquiler Definitivo</strong>, el cual incluye la capacidad acordada y las cláusulas legales aceptadas. Este documento sirve como comprobante legal de tu evento.</p>
                    <p>Recordá que podés contactarnos por WhatsApp 24 o 48 horas antes para coordinar los detalles finales del ingreso al salón.</p>
                    <br>
                    <p>¡Gracias por elegirnos para tu evento!</p>
                    <hr style="border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 0.8em; color: #7f8c8d;">Este es un mensaje automático, por favor no lo respondas.</p>
                </body>
            </html>
            """
            message.attach(MIMEText(email_body_html, "html"))
            
            # Adjuntar el contrato PDF definitivo
            adjunto = MIMEApplication(pdf_bytes, _subtype="pdf")
            adjunto.add_header('Content-Disposition', 'attachment', filename=file_name)
            message.attach(adjunto)

            # 4. Enviar el correo utilizando SSL
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(self.smtp_server, int(self.smtp_port), context=context) as server:
                server.login(self.sender_email, self.sender_password)
                
                # Lista de destinatarios: usuario + administrador (BCC)
                recipients = [to_email, self.admin_email]
                server.sendmail(self.sender_email, recipients, message.as_string())
            
            print(f"ÉXITO: Contrato definitivo guardado en {file_path} y enviado a {to_email} (BCC a admin).")
            return True

        except Exception as e:
            print(f"ERROR en send_email_confirmation: {e}")
            return False

    def send_password_reset_email(self, to_email: str, user_name: str, reset_link: str):
        if not self.is_configured:
            print("ERROR: El servicio de email no está configurado.")
            return False

        message = MIMEMultipart("alternative")
        message["Subject"] = "Restablece tu contraseña - Salón de Eventos"
        message["From"] = self.sender_email
        message["To"] = to_email

        email_body_html = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2 style="color: #2c3e50;">Solicitud de cambio de contraseña</h2>
                <p>Hola, {user_name},</p>
                <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
                <p style="margin: 30px 0;">
                    <a href="{reset_link}" style="padding: 12px 25px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Restablecer Contraseña
                    </a>
                </p>
                <p style="color: #7f8c8d; font-size: 0.9em;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
                <p style="color: #e74c3c; font-size: 0.8em;"><em>Nota: El enlace expirará en 10 minutos por motivos de seguridad.</em></p>
            </body>
        </html>
        """
        message.attach(MIMEText(email_body_html, "html"))
        
        context = ssl.create_default_context()
        try:
            with smtplib.SMTP_SSL(self.smtp_server, int(self.smtp_port), context=context) as server:
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, to_email, message.as_string())
            print(f"ÉXITO: Email de reseteo enviado a {to_email}")
            return True
        except Exception as e:
            print(f"ERROR al enviar email de reseteo: {e}")
            return False