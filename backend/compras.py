"""
compras.py - Módulo compras a proveedores
"""
from database import get_connection


def _row_compra(r):
    return {
        "id_compra":     r[0],
        "id_proveedor":  r[1],
        "proveedor":     r[2],
        "fecha_compra":  r[3].strftime("%Y-%m-%d") if r[3] else None,
        "productos":     r[4],
        "monto_total":   float(r[5]),
        "estado_pago":   r[6],
        "notas":         r[7],
        "fecha_creacion":r[8].strftime("%Y-%m-%d %H:%M:%S") if r[8] else None,
    }


def get_all_compras(proveedor=None, estado_pago=None, page=1, per_page=20):
    conn   = get_connection()
    cursor = conn.cursor()

    where  = ["1=1"]
    params = []
    if proveedor:
        where.append("p.nombre_empresa LIKE %s")
        params.append(f"%{proveedor}%")
    if estado_pago:
        where.append("c.estado_pago = %s")
        params.append(estado_pago)

    where_str = " AND ".join(where)
    offset    = (page - 1) * per_page

    cursor.execute(f"""
        SELECT COUNT(*) FROM compras_proveedor c
        JOIN proveedores p ON c.id_proveedor = p.id_proveedor
        WHERE {where_str}
    """, params)
    total = cursor.fetchone()[0]

    cursor.execute(f"""
        SELECT c.id_compra, c.id_proveedor, p.nombre_empresa,
               c.fecha_compra, c.productos, c.monto_total,
               c.estado_pago, c.notas, c.fecha_creacion
        FROM compras_proveedor c
        JOIN proveedores p ON c.id_proveedor = p.id_proveedor
        WHERE {where_str}
        ORDER BY c.fecha_creacion DESC
        OFFSET {offset} ROWS FETCH NEXT {per_page} ROWS ONLY
    """, params)

    rows = cursor.fetchall()
    conn.close()
    return {"compras": [_row_compra(r) for r in rows],
            "total": total, "page": page, "per_page": per_page}


def get_compra_by_id(id_compra):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id_compra, c.id_proveedor, p.nombre_empresa,
               c.fecha_compra, c.productos, c.monto_total,
               c.estado_pago, c.notas, c.fecha_creacion
        FROM compras_proveedor c
        JOIN proveedores p ON c.id_proveedor = p.id_proveedor
        WHERE c.id_compra = %s
    """, [id_compra])
    r = cursor.fetchone()
    conn.close()
    return _row_compra(r) if r else None


def create_compra(data):
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.callproc('sp_registrar_compra_proveedor', [
        int(data.get("id_proveedor", 0)),
        data.get("fecha_compra") or None,
        data.get("productos", ""),
        float(data.get("monto_total", 0)),
        data.get("estado_pago", "Pendiente"),
        data.get("notas") or None,
        data.get("usuario", "sistema"),
    ])
    row    = cursor.fetchone()
    conn.commit()
    conn.close()
    if row and isinstance(row[0], int):
        return {"id_compra": row[0], "mensaje": row[1]}
    return {"error": row[1] if row else "Error desconocido"}


def update_estado_pago(id_compra, estado_pago, usuario="sistema"):
    if estado_pago not in ("Pagado", "Pendiente"):
        return {"error": "Estado de pago inválido."}
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE compras_proveedor
        SET estado_pago = %s, fecha_modificacion = GETDATE(),
            usuario_modificacion = %s
        WHERE id_compra = %s
    """, [estado_pago, usuario, id_compra])
    conn.commit()
    conn.close()
    return {"mensaje": f"Compra marcada como {estado_pago}."}


def get_stats_compras():
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*), ISNULL(SUM(monto_total),0) FROM compras_proveedor")
    r1 = cursor.fetchone()
    cursor.execute("SELECT COUNT(*) FROM compras_proveedor WHERE estado_pago='Pendiente'")
    pendientes = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM compras_proveedor WHERE estado_pago='Pagado'")
    pagadas = cursor.fetchone()[0]
    conn.close()
    return {
        "total_compras":  r1[0],
        "monto_total":    float(r1[1]),
        "pendientes":     pendientes,
        "pagadas":        pagadas,
    }
