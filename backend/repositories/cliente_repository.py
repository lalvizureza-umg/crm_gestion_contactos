"""
cliente_repository.py - Capa de acceso a datos para Clientes
Solo contiene queries SQL y mapeo de datos
"""
from database import get_connection


def _row_to_dict(row):
    """Mapea una fila de la DB a un diccionario de cliente"""
    return {
        "id_cliente":               row[0],
        "nombre_razon_social":      row[1],
        "documento_identificacion": row[2],
        "tipo":                     row[3],
        "estado":                   row[4],
        "fecha_nacimiento":         row[5].strftime("%Y-%m-%d") if row[5] else None,
        "correo":                   row[6],
        "notificacion_email":       bool(row[7]),
        "notificacion_sms":         bool(row[8]),
        "fecha_creacion":           row[9].strftime("%Y-%m-%d %H:%M:%S") if row[9] else None,
    }


def find_all(where_clauses, params, offset, per_page):
    """Obtiene clientes con filtros y paginación"""
    conn = get_connection()
    cursor = conn.cursor()
    
    where_str = " AND ".join(where_clauses) if where_clauses else "1=1"
    
    cursor.execute(f"SELECT COUNT(*) FROM clientes WHERE {where_str}", params)
    total = cursor.fetchone()[0]
    
    cursor.execute(f"""
        SELECT id_cliente, nombre_razon_social, documento_identificacion,
               tipo, estado, fecha_nacimiento, correo,
               notificacion_email, notificacion_sms, fecha_creacion
        FROM clientes WHERE {where_str}
        ORDER BY fecha_creacion DESC
        OFFSET {offset} ROWS FETCH NEXT {per_page} ROWS ONLY
    """, params)
    
    rows = cursor.fetchall()
    conn.close()
    
    return [_row_to_dict(r) for r in rows], total


def find_by_id(id_cliente):
    """Busca un cliente por su ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id_cliente, nombre_razon_social, documento_identificacion,
               tipo, estado, fecha_nacimiento, correo,
               notificacion_email, notificacion_sms, fecha_creacion
        FROM clientes WHERE id_cliente = %s
    """, [id_cliente])
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return None
    
    cliente = _row_to_dict(row)
    
    cursor.execute("""
        SELECT id_contacto, nombre_contacto, tipo_contacto, descripcion,
               correo, telefono, estado
        FROM contactos_cliente WHERE id_cliente = %s
    """, [id_cliente])
    
    cliente["contactos"] = [
        {
            "id_contacto": c[0],
            "nombre_contacto": c[1],
            "tipo_contacto": c[2],
            "descripcion": c[3],
            "correo": c[4],
            "telefono": c[5],
            "estado": c[6]
        }
        for c in cursor.fetchall()
    ]
    
    conn.close()
    return cliente


def insert(data):
    """Inserta un nuevo cliente usando stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_registrar_cliente', [
        data.get("nombre_razon_social", ""),
        data.get("documento_identificacion", ""),
        data.get("tipo", "Cliente"),
        data.get("estado", "Activo"),
        data.get("fecha_nacimiento") or None,
        data.get("correo") or None,
        1 if data.get("notificacion_email") else 0,
        1 if data.get("notificacion_sms") else 0,
        data.get("usuario", "sistema"),
    ])
    row = cursor.fetchone()
    id_cliente = row[0] if row and isinstance(row[0], int) else None
    mensaje = row[1] if row else None
    
    conn.commit()
    conn.close()
    return id_cliente, mensaje


def insert_contacto(id_cliente, contacto, usuario):
    """Inserta un contacto para un cliente"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_agregar_contacto', [
        id_cliente,
        contacto.get("nombre_contacto", "Contacto"),
        contacto.get("tipo_contacto", "Teléfono"),
        contacto.get("descripcion", ""),
        contacto.get("correo") or None,
        contacto.get("telefono") or None,
        usuario,
    ])
    cursor.fetchall()
    conn.commit()
    conn.close()


def update(id_cliente, data):
    """Actualiza un cliente existente usando stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_actualizar_cliente', [
        id_cliente,
        data.get("nombre_razon_social", ""),
        data.get("documento_identificacion", ""),
        data.get("tipo", "Cliente"),
        data.get("estado", "Activo"),
        data.get("fecha_nacimiento") or None,
        data.get("correo") or None,
        1 if data.get("notificacion_email") else 0,
        1 if data.get("notificacion_sms") else 0,
        data.get("usuario", "sistema"),
    ])
    row = cursor.fetchone()
    id_result = row[0] if row and isinstance(row[0], int) else None
    mensaje = row[1] if row else None
    
    conn.commit()
    conn.close()
    return id_result, mensaje


def update_contacto(contacto, usuario):
    """Actualiza un contacto existente"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_actualizar_contacto', [
        contacto["id_contacto"],
        contacto.get("nombre_contacto", "Contacto"),
        contacto.get("tipo_contacto", "Teléfono"),
        contacto.get("descripcion", ""),
        contacto.get("correo") or None,
        contacto.get("telefono") or None,
        contacto.get("estado", "Activo"),
        usuario,
    ])
    cursor.fetchall()
    conn.commit()
    conn.close()


def set_inactive(id_cliente, usuario):
    """Inactiva un cliente usando stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_inactivar_cliente', [id_cliente, usuario])
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return row


def find_cumpleaneros_mes():
    """Obtiene los cumpleañeros del mes actual"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT nombre_razon_social,
               DAY(fecha_nacimiento) AS dia,
               YEAR(GETDATE()) - YEAR(fecha_nacimiento) AS edad
        FROM clientes
        WHERE MONTH(fecha_nacimiento) = MONTH(GETDATE())
          AND fecha_nacimiento IS NOT NULL
          AND estado = 'Activo'
        ORDER BY DAY(fecha_nacimiento)
    """)
    rows = cursor.fetchall()
    conn.close()
    return [{"nombre": r[0], "dia": r[1], "edad": r[2]} for r in rows]


def get_stats():
    """Obtiene estadísticas generales de clientes y proveedores"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM clientes WHERE estado='Activo' AND tipo='Cliente'")
    activos = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM clientes WHERE estado='Inactivo'")
    inactivos = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM clientes WHERE tipo='Prospecto'")
    prospectos = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM proveedores WHERE estado='Activo'")
    prov_activos = cursor.fetchone()[0]
    
    conn.close()
    return {
        "clientes_activos": activos,
        "clientes_inactivos": inactivos,
        "prospectos": prospectos,
        "proveedores_activos": prov_activos,
    }


def get_stats_clientes():
    """Obtiene estadísticas específicas de clientes"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT COUNT(*) FROM clientes 
        WHERE estado = 'Activo' AND tipo = 'Cliente'
    """)
    total_activos = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT COUNT(*) FROM clientes 
        WHERE estado = 'Inactivo' AND tipo = 'Cliente'
    """)
    total_inactivos = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT COUNT(*) FROM clientes 
        WHERE tipo = 'Prospecto'
    """)
    total_prospectos = cursor.fetchone()[0]
    
    conn.close()
    return {
        "total_activos": total_activos,
        "total_inactivos": total_inactivos,
        "total_prospectos": total_prospectos
    }
