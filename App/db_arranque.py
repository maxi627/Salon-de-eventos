def crear_tablas_sin_conexiones_abiertas(db):
    """
    Crea las tablas que falten y cierra las conexiones que ese paso dejó en el pool.

    main.py hace esto en el proceso principal, antes de que gunicorn cree los workers (fork).
    Si alguna conexión quedara abierta, todos los workers la heredarían y compartirían el mismo
    socket de Postgres: con pedidos simultáneos las respuestas se mezclan (errores 500, filas de
    otra consulta, logins rechazados con la contraseña correcta). Cerrándolas acá, cada worker
    abre las suyas.
    """
    db.create_all()
    db.engine.dispose()
