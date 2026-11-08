import html
import os
import smtplib
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid

from weasyprint import HTML
from werkzeug.utils import secure_filename

from app.utils.storage import upload_bytes_to_r2

SENDER_NAME = "Salón de Eventos"


class NotificationService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER')
        self.smtp_port = os.getenv('SMTP_PORT')
        self.sender_email = os.getenv('SENDER_EMAIL')
        self.sender_password = os.getenv('SENDER_APP_PASSWORD')


        self.admin_email = os.getenv('ADMIN_EMAIL')

        self.is_configured = all([
            self.smtp_server,
            self.smtp_port,
            self.sender_email,
            self.sender_password,
            self.admin_email
        ])

    def _nuevo_mensaje(self, to_email: str, asunto: str, cuerpo_html: str, cuerpo_texto: str, adjuntos=()):
        """
        Arma el correo con versión de texto plano y HTML, remitente con nombre, Date y Message-ID
        (la falta de cualquiera de estas cosas suma puntos de spam). Con adjuntos, el
        multipart/alternative va dentro de un multipart/mixed.
        """
        alternativa = MIMEMultipart("alternative")
        alternativa.attach(MIMEText(cuerpo_texto, "plain", "utf-8"))
        alternativa.attach(MIMEText(cuerpo_html, "html", "utf-8"))

        if adjuntos:
            message = MIMEMultipart("mixed")
            message.attach(alternativa)
            for adjunto in adjuntos:
                message.attach(adjunto)
        else:
            message = alternativa

        message["Subject"] = asunto
        message["From"] = formataddr((SENDER_NAME, self.sender_email))
        message["To"] = to_email
        message["Date"] = formatdate(localtime=True)
        message["Message-ID"] = make_msgid(domain=self.sender_email.split("@")[-1])
        return message

    def _enviar(self, message, destinatarios):
        # Los destinatarios en copia oculta van sólo en la lista de envío, nunca en una cabecera Bcc
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(self.smtp_server, int(self.smtp_port), context=context) as server:
            server.login(self.sender_email, self.sender_password)
            server.sendmail(self.sender_email, destinatarios, message.as_string())

    def send_email_confirmation(self, to_email: str, user_name: str, event_date: str, html_contract: str):
        if not self.is_configured:
            print("ERROR: El servicio de email no está configurado correctamente en las variables de entorno.")
            return False

        if not to_email:
            print(f"ALERTA: No se pudo enviar email a {user_name} porque no tiene correo registrado.")
            return False

        try:
            # 1. Generar el PDF en memoria RAM (Bytes)
            pdf_bytes = HTML(string=html_contract).write_pdf()

            # 2. Respaldo legal en LA NUBE (Adiós KVM local)
            # secure_filename evita que el nombre del usuario altere la ruta del objeto en R2 (ej. "../")
            safe_user_name = secure_filename(user_name.replace(" ", "_")) or "cliente"
            file_name = f"contrato_confirmado_{safe_user_name}_{event_date.replace('/', '-')}.pdf"

            # Mandamos los bytes a Cloudflare R2
            contrato_url = upload_bytes_to_r2(pdf_bytes, file_name, folder="contratos_definitivos")

            if contrato_url:
                print(f"Respaldo legal guardado exitosamente en la nube: {contrato_url}")
            else:
                print("Advertencia: No se pudo subir el respaldo del contrato a la nube.")

            # 3. Preparar el correo electrónico
            email_body_html = f"""
            <html>
                <body style="font-family: sans-serif; color: #333; line-height: 1.5;">
                    <h2 style="color: #2c3e50;">¡Tu reserva ha sido confirmada satisfactoriamente!</h2>
                    <p>Hola, <strong>{html.escape(user_name)}</strong>,</p>
                    <p>Nos complace informarte que tu reserva para el día <strong>{html.escape(event_date)}</strong> ha sido confirmada por la administración.</p>
                    <p>Adjuntamos el <strong>Contrato de Alquiler Definitivo</strong>, el cual incluye la capacidad acordada y las cláusulas legales aceptadas. Este documento sirve como comprobante legal de tu evento.</p>
                    <p>Recordá que podés contactarnos por WhatsApp 24 o 48 horas antes para coordinar el ingreso al salón.</p>
                    <br>
                    <p>¡Gracias por elegirnos para tu evento!</p>
                    <hr style="border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 0.8em; color: #7f8c8d;">Este es un mensaje automático, por favor no lo respondas.</p>
                </body>
            </html>
            """
            email_body_texto = (
                "¡Tu reserva ha sido confirmada satisfactoriamente!\n\n"
                f"Hola, {user_name}:\n\n"
                f"Nos complace informarte que tu reserva para el día {event_date} ha sido confirmada por la administración.\n\n"
                "Adjuntamos el Contrato de Alquiler Definitivo, el cual incluye la capacidad acordada y las cláusulas "
                "legales aceptadas. Este documento sirve como comprobante legal de tu evento.\n\n"
                "Recordá que podés contactarnos por WhatsApp 24 o 48 horas antes para coordinar el ingreso al salón.\n\n"
                "¡Gracias por elegirnos para tu evento!\n\n"
                "--\nEste es un mensaje automático, por favor no lo respondas.\n"
            )

            # Adjuntar el contrato PDF (directamente desde la memoria RAM, sin leer el disco)
            adjunto = MIMEApplication(pdf_bytes, _subtype="pdf")
            adjunto.add_header('Content-Disposition', 'attachment', filename=file_name)

            message = self._nuevo_mensaje(
                to_email,
                f"Reserva Confirmada - Contrato Definitivo - {event_date}",
                email_body_html,
                email_body_texto,
                adjuntos=[adjunto],
            )

            # 4. Enviar el correo (el admin recibe una copia oculta)
            self._enviar(message, [to_email, self.admin_email])

            print(f"ÉXITO: Contrato enviado a {to_email} (BCC a admin).")
            return True

        except Exception as e:
            print(f"ERROR en send_email_confirmation: {e}")
            return False
    def send_password_reset_email(self, to_email: str, user_name: str, reset_link: str):
        if not self.is_configured:
            print("ERROR: El servicio de email no está configurado.")
            return False

        email_body_html = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2 style="color: #2c3e50;">Solicitud de cambio de contraseña</h2>
                <p>Hola, {html.escape(user_name)},</p>
                <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
                <p style="margin: 30px 0;">
                    <a href="{html.escape(reset_link)}" style="padding: 12px 25px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Restablecer Contraseña
                    </a>
                </p>
                <p style="color: #7f8c8d; font-size: 0.9em;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
                <p style="color: #e74c3c; font-size: 0.8em;"><em>Nota: El enlace expirará en 10 minutos por motivos de seguridad.</em></p>
            </body>
        </html>
        """
        email_body_texto = (
            "Solicitud de cambio de contraseña\n\n"
            f"Hola, {user_name}:\n\n"
            "Hemos recibido una solicitud para restablecer tu contraseña. Para continuar, abrí este enlace:\n\n"
            f"{reset_link}\n\n"
            "Si no solicitaste este cambio, puedes ignorar este correo de forma segura.\n"
            "Nota: El enlace expirará en 10 minutos por motivos de seguridad.\n"
        )
        message = self._nuevo_mensaje(
            to_email, "Restablece tu contraseña - Salón de Eventos", email_body_html, email_body_texto
        )

        try:
            self._enviar(message, [to_email])
            print(f"ÉXITO: Email de reseteo enviado a {to_email}")
            return True
        except Exception as e:
            print(f"ERROR al enviar email de reseteo: {e}")
            return False
    def send_arrepentimiento_code_email(self, to_email: str, user_name: str, event_date: str, codigo: str = None, motivo_rechazo: str = None):
        """
        Envía el código para confirmar la cancelación por arrepentimiento,
        o el motivo por el que la cancelación automática no corresponde.
        """
        if not self.is_configured:
            print("ERROR: El servicio de email no está configurado.")
            return False

        if codigo:
            cuerpo = f"""
                <p>Recibimos una solicitud para cancelar tu reserva del <strong>{html.escape(event_date)}</strong> mediante el botón de arrepentimiento.</p>
                <p>Para confirmarla, ingresá este código en la página de cancelación:</p>
                <p style="font-size: 2em; font-weight: bold; letter-spacing: 6px; margin: 25px 0;">{html.escape(codigo)}</p>
                <p style="color: #e74c3c; font-size: 0.9em;"><em>El código vence en 15 minutos.</em></p>
            """
            cuerpo_texto = (
                f"Recibimos una solicitud para cancelar tu reserva del {event_date} mediante el botón de arrepentimiento.\n\n"
                "Para confirmarla, ingresá este código en la página de cancelación:\n\n"
                f"    {codigo}\n\n"
                "El código vence en 15 minutos.\n"
            )
        else:
            cuerpo = f"""
                <p>Recibimos una solicitud para cancelar tu reserva del <strong>{html.escape(event_date)}</strong> mediante el botón de arrepentimiento, pero no es posible procesarla automáticamente:</p>
                <p><em>{html.escape(motivo_rechazo or '')}</em></p>
            """
            cuerpo_texto = (
                f"Recibimos una solicitud para cancelar tu reserva del {event_date} mediante el botón de arrepentimiento, "
                "pero no es posible procesarla automáticamente:\n\n"
                f"{motivo_rechazo or ''}\n"
            )

        email_body_html = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2 style="color: #2c3e50;">Cancelación de reserva</h2>
                <p>Hola, {html.escape(user_name)},</p>
                {cuerpo}
                <p style="color: #7f8c8d; font-size: 0.9em;">Si no hiciste esta solicitud, ignorá este correo: tu reserva sigue vigente.</p>
            </body>
        </html>
        """
        email_body_texto = (
            "Cancelación de reserva\n\n"
            f"Hola, {user_name}:\n\n"
            f"{cuerpo_texto}\n"
            "Si no hiciste esta solicitud, ignorá este correo: tu reserva sigue vigente.\n"
        )
        message = self._nuevo_mensaje(
            to_email, f"Solicitud de cancelación - Reserva del {event_date}", email_body_html, email_body_texto
        )

        try:
            self._enviar(message, [to_email])
            print(f"ÉXITO: Email de arrepentimiento enviado a {to_email}")
            return True
        except Exception as e:
            print(f"ERROR al enviar email de arrepentimiento: {e}")
            return False

    def send_reintegro_email(self, to_email: str, user_name: str, event_date: str, file_bytes: bytes, file_name: str):
        if not self.is_configured:
            print("ERROR: El servicio de email no está configurado.")
            return False

        try:
            # Cuerpo del mensaje
            email_body_html = f"""
            <html>
                <body style="font-family: sans-serif; color: #333; line-height: 1.5;">
                    <h2 style="color: #2c3e50;">Comprobante de Devolución de Seña</h2>
                    <p>Hola, <strong>{html.escape(user_name)}</strong>,</p>
                    <p>Te informamos que hemos procesado correctamente la devolución correspondiente a la cancelación de tu reserva para el día <strong>{html.escape(event_date)}</strong>.</p>
                    <p>Adjunto a este correo encontrarás el comprobante de la transferencia.</p>
                    <br>
                    <p>Esperamos poder acompañarte en futuros eventos.</p>
                    <p>Saludos cordiales,<br><strong>El equipo del Salón</strong></p>
                    <hr style="border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 0.8em; color: #7f8c8d;">Este es un mensaje automático, por favor no lo respondas.</p>
                </body>
            </html>
            """
            email_body_texto = (
                "Comprobante de Devolución de Seña\n\n"
                f"Hola, {user_name}:\n\n"
                "Te informamos que hemos procesado correctamente la devolución correspondiente a la cancelación "
                f"de tu reserva para el día {event_date}.\n\n"
                "Adjunto a este correo encontrarás el comprobante de la transferencia.\n\n"
                "Esperamos poder acompañarte en futuros eventos.\n\n"
                "Saludos cordiales,\nEl equipo del Salón\n\n"
                "--\nEste es un mensaje automático, por favor no lo respondas.\n"
            )

            # Adjuntar el archivo directamente desde los bytes (funciona para PDF, PNG, JPG)
            adjunto = MIMEApplication(file_bytes)
            adjunto.add_header('Content-Disposition', 'attachment', filename=file_name)

            message = self._nuevo_mensaje(
                to_email,
                f"Comprobante de Devolución - Reserva del {event_date}",
                email_body_html,
                email_body_texto,
                adjuntos=[adjunto],
            )

            # Enviar el correo
            self._enviar(message, [to_email])

            print(f"ÉXITO: Comprobante de reintegro enviado a {to_email}")
            return True

        except Exception as e:
            print(f"ERROR al enviar comprobante de reintegro: {e}")
            return False
