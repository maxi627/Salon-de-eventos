def detectar_tipo_archivo(file) -> tuple[str, str]:
    """
    Detecta el tipo real de un archivo por sus "magic bytes" (no confía en la extensión
    ni en el Content-Type que envía el navegador).
    Devuelve (extension, mime_type) o lanza ValueError si el formato no está permitido.
    """
    cabecera = file.stream.read(16)
    file.stream.seek(0)

    if cabecera.startswith(b'%PDF-'):
        return 'pdf', 'application/pdf'
    if cabecera.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png', 'image/png'
    if cabecera.startswith(b'\xff\xd8\xff'):
        return 'jpg', 'image/jpeg'
    if cabecera[:4] == b'RIFF' and cabecera[8:12] == b'WEBP':
        return 'webp', 'image/webp'

    raise ValueError("Formato de archivo no permitido. Subí un PDF, JPG, PNG o WEBP.")
