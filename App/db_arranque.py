from sqlalchemy import inspect, text

# Columnas agregadas a tablas que ya existen en producción. El proyecto no usa migraciones y
# create_all() solo crea tablas nuevas: estas se agregan al arrancar si faltan.
# (tabla, columna, tipo en PostgreSQL, tipo en otros motores)
COLUMNAS_NUEVAS = [
    ("fecha", "valor_oferta", "DOUBLE PRECISION", "REAL"),
]


def agregar_columnas_faltantes(db):
    """Agrega las columnas de COLUMNAS_NUEVAS que falten. Devuelve las que agregó ("tabla.columna")."""
    inspector = inspect(db.engine)
    tablas = set(inspector.get_table_names())
    agregadas = []
    with db.engine.begin() as conexion:
        for tabla, columna, tipo_pg, tipo_otro in COLUMNAS_NUEVAS:
            if tabla not in tablas:
                continue
            if columna in {c["name"] for c in inspector.get_columns(tabla)}:
                continue
            tipo = tipo_pg if db.engine.dialect.name == "postgresql" else tipo_otro
            conexion.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {columna} {tipo}"))
            agregadas.append(f"{tabla}.{columna}")
    return agregadas


def crear_tablas_sin_conexiones_abiertas(db):
    """
    Crea las tablas que falten, agrega las columnas nuevas y cierra las conexiones que esos pasos
    dejaron en el pool.

    main.py hace esto en el proceso principal, antes de que gunicorn cree los workers (fork).
    Si alguna conexión quedara abierta, todos los workers la heredarían y compartirían el mismo
    socket de Postgres: con pedidos simultáneos las respuestas se mezclan (errores 500, filas de
    otra consulta, logins rechazados con la contraseña correcta). Cerrándolas acá, cada worker
    abre las suyas.
    """
    db.create_all()
    agregar_columnas_faltantes(db)
    db.engine.dispose()
