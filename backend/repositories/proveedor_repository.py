"""
proveedor_repository.py - Capa de acceso a datos para Proveedores
Solo contiene queries SQL y mapeo de datos
"""
from database import get_connection


def _row_to_dict(row):
    """Mapea una fila de la DB a un diccionario de proveedor"""
    return {
        "id_proveedor":       row[0],
        "nombre_empresa":     row[1],
        "nit":                row[2],
        "id_categoria":       row[3],
        "categoria":          row[4],
        "contacto":           row[5],
        "telefono":           row[6],
        "correo":             row[7],
        "direccion":          row[8],
        "notas":              row[9],
        "estado":             row[10],
        "motivo_inactivacion": row[11],
        "fecha_creacion":     row[12].strftime("%Y-%m-%d %H:%M:%S") if row[12] else None,
    }


def find_all(where_clauses, params, offset, per_page):
    """Obtiene proveedores con filtros y paginación"""
    conn = get_connection()
    cursor = conn.cursor()
    
    where_str = " AND ".join(where_clauses) if where_clauses else "1=1"
    
    cursor.execute(f"""
        SELECT COUNT(*) FROM proveedores p
        JOIN categorias_proveedor c ON p.id_categoria = c.id_categoria
        WHERE {where_str}
    """, params)
    total = cursor.fetchone()[0]
    
    cursor.execute(f"""
        SELECT p.id_proveedor, p.nombre_empresa, p.nit, p.id_categoria,
               c.nombre_categoria, p.contacto, p.telefono, p.correo,
               p.direccion, p.notas, p.estado, p.motivo_inactivacion, p.fecha_creacion
        FROM proveedores p
        JOIN categorias_proveedor c ON p.id_categoria = c.id_categoria
        WHERE {where_str}
        ORDER BY p.fecha_creacion DESC
        OFFSET {offset} ROWS FETCH NEXT {per_page} ROWS ONLY
    """, params)
    
    rows = cursor.fetchall()
    conn.close()
    
    return [_row_to_dict(r) for r in rows], total


def find_by_id(id_proveedor):
    """Busca un proveedor por su ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.id_proveedor, p.nombre_empresa, p.nit, p.id_categoria,
               c.nombre_categoria, p.contacto, p.telefono, p.correo,
               p.direccion, p.notas, p.estado, p.motivo_inactivacion, p.fecha_creacion
        FROM proveedores p
        JOIN categorias_proveedor c ON p.id_categoria = c.id_categoria
        WHERE p.id_proveedor = %s
    """, [id_proveedor])
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def find_all_categorias():
    """Obtiene todas las categorías activas"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id_categoria, nombre_categoria 
        FROM categorias_proveedor 
        WHERE estado='Activo' 
        ORDER BY nombre_categoria
    """)
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "nombre": r[1]} for r in rows]


def insert(data):
    """Inserta un nuevo proveedor usando stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_registrar_proveedor', [
        data.get("nombre_empresa", ""),
        data.get("nit", ""),
        int(data.get("id_categoria", 0)),
        data.get("telefono", ""),
        data.get("contacto") or None,
        data.get("correo") or None,
        data.get("direccion") or None,
        data.get("notas") or None,
        data.get("usuario", "sistema"),
    ])
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return row


def update(id_proveedor, data):
    """Actualiza un proveedor existente usando stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_actualizar_proveedor', [
        id_proveedor,
        data.get("nombre_empresa", ""),
        data.get("nit", ""),
        int(data.get("id_categoria", 0)),
        data.get("telefono", ""),
        data.get("contacto") or None,
        data.get("correo") or None,
        data.get("direccion") or None,
        data.get("notas") or None,
        data.get("usuario", "sistema"),
    ])
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return row


def set_inactive(id_proveedor, motivo, usuario):
    """Inactiva un proveedor usando stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_inactivar_proveedor', [id_proveedor, motivo, usuario])
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return row


def set_active(id_proveedor, usuario):
    """Activa un proveedor usando stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_activar_proveedor', [id_proveedor, usuario])
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return row


def delete(id_proveedor, usuario):
    """Elimina un proveedor usando stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_eliminar_proveedor', [id_proveedor, usuario])
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return row
