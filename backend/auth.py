"""
auth.py - Autenticación con usuarios en SQL Server
"""
import bcrypt
from database import get_connection


def verificar_login(username, password):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id_usuario, nombre, username, password_hash, rol, estado
        FROM usuarios WHERE username = %s
    """, [username])
    row = cursor.fetchone()

    if not row:
        conn.close()
        return None, "Usuario o contraseña incorrectos."

    id_usuario, nombre, uname, pw_hash, rol, estado = row

    if estado != 'Activo':
        conn.close()
        return None, "Este usuario está inactivo."

    # Verificar contraseña
    try:
        if not bcrypt.checkpw(password.encode('utf-8'), pw_hash.encode('utf-8')):
            conn.close()
            return None, "Usuario o contraseña incorrectos."
    except Exception:
        conn.close()
        return None, "Error al verificar credenciales."

    # Actualizar último acceso
    cursor.execute("""
        UPDATE usuarios SET ultimo_acceso = GETDATE()
        WHERE id_usuario = %s
    """, [id_usuario])
    conn.commit()
    conn.close()

    return {
        "id_usuario": id_usuario,
        "nombre":     nombre,
        "username":   uname,
        "rol":        rol,
    }, None
