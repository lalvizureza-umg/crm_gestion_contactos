"""
empleados.py - Módulo empleados y dependencias
"""
from database import get_connection


def get_all_dependencias():
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id_dependencia, nombre_dependencia, estado FROM dependencias ORDER BY nombre_dependencia")
    rows = cursor.fetchall()
    conn.close()
    return [{"id_dependencia": r[0], "nombre_dependencia": r[1], "estado": r[2]} for r in rows]


def create_dependencia(data):
    conn   = get_connection()
    cursor = conn.cursor()
    nombre = data.get("nombre_dependencia", "").strip()
    if not nombre:
        conn.close()
        return {"error": "El nombre de la dependencia es obligatorio."}
    if cursor.execute("SELECT COUNT(*) FROM dependencias WHERE nombre_dependencia = %s", [nombre]):
        pass
    cursor.execute("SELECT COUNT(*) FROM dependencias WHERE nombre_dependencia = %s", [nombre])
    if cursor.fetchone()[0] > 0:
        conn.close()
        return {"error": "Ya existe una dependencia con ese nombre."}
    cursor.execute("""
        INSERT INTO dependencias (nombre_dependencia, usuario_creacion)
        VALUES (%s, %s)
    """, [nombre, data.get("usuario", "sistema")])
    cursor.execute("SELECT SCOPE_IDENTITY()")
    new_id = int(cursor.fetchone()[0])
    conn.commit()
    conn.close()
    return {"id_dependencia": new_id, "mensaje": "Dependencia creada exitosamente."}


def _row_emp(r):
    return {
        "id_empleado":      r[0],
        "numero_empleado":  r[1],
        "dpi":              r[2],
        "nombre_completo":  r[3],
        "cargo":            r[4],
        "id_dependencia":   r[5],
        "dependencia":      r[6],
        "estado":           r[7],
        "fecha_nacimiento": r[8].strftime("%Y-%m-%d") if r[8] else None,
        "correo":           r[9],
        "telefono":         r[10],
        "direccion":        r[11],
        "fecha_creacion":   r[12].strftime("%Y-%m-%d %H:%M:%S") if r[12] else None,
    }


def get_all_empleados(nombre=None, dependencia=None, estado=None, page=1, per_page=20):
    conn   = get_connection()
    cursor = conn.cursor()

    where  = ["1=1"]
    params = []
    if nombre:
        where.append("e.nombre_completo LIKE %s")
        params.append(f"%{nombre}%")
    if dependencia:
        where.append("e.id_dependencia = %s")
        params.append(int(dependencia))
    if estado:
        where.append("e.estado = %s")
        params.append(estado)

    where_str = " AND ".join(where)
    offset    = (page - 1) * per_page

    cursor.execute(f"""
        SELECT COUNT(*) FROM empleados e WHERE {where_str}
    """, params)
    total = cursor.fetchone()[0]

    cursor.execute(f"""
        SELECT e.id_empleado, e.numero_empleado, e.dpi, e.nombre_completo,
               e.cargo, e.id_dependencia,
               ISNULL(d.nombre_dependencia, 'Sin asignar') AS dependencia,
               e.estado, e.fecha_nacimiento, e.correo, e.telefono,
               e.direccion, e.fecha_creacion
        FROM empleados e
        LEFT JOIN dependencias d ON e.id_dependencia = d.id_dependencia
        WHERE {where_str}
        ORDER BY e.fecha_creacion DESC
        OFFSET {offset} ROWS FETCH NEXT {per_page} ROWS ONLY
    """, params)

    rows = cursor.fetchall()
    conn.close()
    return {"empleados": [_row_emp(r) for r in rows],
            "total": total, "page": page, "per_page": per_page}


def get_empleado_by_id(id_empleado):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id_empleado, e.numero_empleado, e.dpi, e.nombre_completo,
               e.cargo, e.id_dependencia,
               ISNULL(d.nombre_dependencia,'Sin asignar'),
               e.estado, e.fecha_nacimiento, e.correo, e.telefono,
               e.direccion, e.fecha_creacion
        FROM empleados e
        LEFT JOIN dependencias d ON e.id_dependencia = d.id_dependencia
        WHERE e.id_empleado = %s
    """, [id_empleado])
    r = cursor.fetchone()

    # Historial
    historial = []
    if r:
        cursor.execute("""
            SELECT h.fecha_movimiento,
                   ISNULL(do.nombre_dependencia,'Inicio') AS origen,
                   dd.nombre_dependencia AS destino,
                   h.motivo, h.usuario
            FROM historial_dependencia h
            LEFT JOIN dependencias do ON h.id_dependencia_origen  = do.id_dependencia
            JOIN  dependencias dd ON h.id_dependencia_destino = dd.id_dependencia
            WHERE h.id_empleado = %s
            ORDER BY h.fecha_movimiento DESC
        """, [id_empleado])
        for h in cursor.fetchall():
            historial.append({
                "fecha":   h[0].strftime("%Y-%m-%d %H:%M") if h[0] else None,
                "origen":  h[1], "destino": h[2],
                "motivo":  h[3], "usuario": h[4],
            })

    conn.close()
    if not r:
        return None
    emp = _row_emp(r)
    emp["historial"] = historial
    return emp


def create_empleado(data):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_registrar_empleado', [
        data.get("numero_empleado", ""),
        data.get("dpi", ""),
        data.get("nombre_completo", ""),
        data.get("cargo") or None,
        int(data["id_dependencia"]) if data.get("id_dependencia") else None,
        data.get("fecha_nacimiento") or None,
        data.get("correo") or None,
        data.get("telefono") or None,
        data.get("direccion") or None,
        data.get("usuario", "sistema"),
    ])
    row    = cursor.fetchone()
    conn.commit()
    conn.close()
    if row and isinstance(row[0], int):
        return {"id_empleado": row[0], "mensaje": row[1]}
    return {"error": row[1] if row else "Error desconocido"}


def update_empleado(id_empleado, data):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_actualizar_empleado', [
        id_empleado,
        data.get("nombre_completo", ""),
        data.get("cargo") or None,
        data.get("fecha_nacimiento") or None,
        data.get("correo") or None,
        data.get("telefono") or None,
        data.get("direccion") or None,
        data.get("estado", "Activo"),
        data.get("usuario", "sistema"),
    ])
    row    = cursor.fetchone()
    conn.commit()
    conn.close()
    if row and isinstance(row[0], int):
        return {"id_empleado": row[0], "mensaje": row[1]}
    return {"error": row[1] if row else "Error desconocido"}


def reasignar_dependencia(id_empleado, data):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_reasignar_dependencia', [
        id_empleado,
        int(data.get("id_dependencia_nueva", 0)),
        data.get("motivo", ""),
        data.get("usuario", "sistema"),
    ])
    row    = cursor.fetchone()
    conn.commit()
    conn.close()
    if row and isinstance(row[0], int):
        return {"mensaje": row[1]}
    return {"error": row[1] if row else "Error desconocido"}


def get_stats_empleados():
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM empleados WHERE estado='Activo'")
    activos = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM empleados WHERE estado='Inactivo'")
    inactivos = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM dependencias WHERE estado='Activo'")
    deps = cursor.fetchone()[0]
    conn.close()
    return {"activos": activos, "inactivos": inactivos, "dependencias": deps}
