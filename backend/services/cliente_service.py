"""
cliente_service.py - Capa de lógica de negocio para Clientes
Contiene validaciones, transformaciones y orquestación de repositorios
"""
from repositories import cliente_repository as repo


def get_all_clientes(nombre=None, documento=None, tipo=None, page=1, per_page=20, search=None):
    """
    Obtiene todos los clientes con filtros opcionales y paginación.
    
    Args:
        nombre: Filtro por nombre/razón social (parcial)
        documento: Filtro por documento de identificación (parcial)
        tipo: Filtro por tipo (Cliente/Prospecto)
        page: Número de página (default 1)
        per_page: Resultados por página (default 20)
        search: Búsqueda general en nombre o documento
    
    Returns:
        dict con clientes, meta de paginación y datos legacy
    """
    where_clauses = ["1=1"]
    params = []
    
    if search:
        where_clauses.append("(nombre_razon_social LIKE %s OR documento_identificacion LIKE %s)")
        params.append(f"%{search}%")
        params.append(f"%{search}%")
    else:
        if nombre:
            where_clauses.append("nombre_razon_social LIKE %s")
            params.append(f"%{nombre}%")
        if documento:
            where_clauses.append("documento_identificacion LIKE %s")
            params.append(f"%{documento}%")
    
    if tipo:
        where_clauses.append("tipo = %s")
        params.append(tipo)
    
    offset = (page - 1) * per_page
    clientes, total = repo.find_all(where_clauses, params, offset, per_page)
    
    total_pages = (total + per_page - 1) // per_page if total > 0 else 1
    
    return {
        "data": clientes,
        "meta": {
            "total": total,
            "page": page,
            "limit": per_page,
            "total_pages": total_pages,
            "has_next_page": page < total_pages,
            "has_previous_page": page > 1
        },
        "clientes": clientes,
        "total": total,
        "page": page,
        "per_page": per_page
    }


def get_cliente_by_id(id_cliente):
    """
    Obtiene un cliente por su ID con sus contactos.
    
    Args:
        id_cliente: ID del cliente
    
    Returns:
        dict con datos del cliente y contactos, o None si no existe
    """
    return repo.find_by_id(id_cliente)


def create_cliente(data):
    """
    Crea un nuevo cliente con sus contactos.
    
    Args:
        data: dict con los datos del cliente
            - nombre_razon_social (requerido)
            - documento_identificacion (requerido)
            - tipo (opcional, default 'Cliente')
            - estado (opcional, default 'Activo')
            - fecha_nacimiento (opcional)
            - correo (opcional)
            - notificacion_email (opcional)
            - notificacion_sms (opcional)
            - contactos (opcional, lista de contactos)
            - usuario (opcional, default 'sistema')
    
    Returns:
        dict con id_cliente y mensaje, o error
    """
    id_cliente, mensaje = repo.insert(data)
    
    if id_cliente:
        usuario = data.get("usuario", "sistema")
        for contacto in data.get("contactos", []):
            if contacto.get("descripcion", "").strip():
                repo.insert_contacto(id_cliente, contacto, usuario)
        
        return {"id_cliente": id_cliente, "mensaje": mensaje}
    
    return {"error": mensaje or "Error desconocido"}


def update_cliente(id_cliente, data):
    """
    Actualiza un cliente existente y sus contactos.
    
    Args:
        id_cliente: ID del cliente a actualizar
        data: dict con los datos a actualizar
    
    Returns:
        dict con id_cliente y mensaje, o error
    """
    id_result, mensaje = repo.update(id_cliente, data)
    
    if id_result:
        usuario = data.get("usuario", "sistema")
        for contacto in data.get("contactos", []):
            if contacto.get("id_contacto"):
                repo.update_contacto(contacto, usuario)
            elif contacto.get("descripcion", "").strip():
                repo.insert_contacto(id_cliente, contacto, usuario)
        
        return {"id_cliente": id_result, "mensaje": mensaje}
    
    return {"error": mensaje or "Error desconocido"}


def inactivar_cliente(id_cliente, usuario="sistema"):
    """
    Inactiva un cliente.
    
    Args:
        id_cliente: ID del cliente
        usuario: Usuario que realiza la acción
    
    Returns:
        dict con mensaje de éxito o error
    """
    row = repo.set_inactive(id_cliente, usuario)
    return {"mensaje": row[1]} if row else {"error": "Error al inactivar"}


def get_cumpleaneros_mes():
    """
    Obtiene los clientes que cumplen años en el mes actual.
    
    Returns:
        Lista de cumpleañeros con nombre, día y edad
    """
    return repo.find_cumpleaneros_mes()


def get_stats():
    """
    Obtiene estadísticas generales para el dashboard.
    
    Returns:
        dict con conteos de clientes activos, inactivos, prospectos y proveedores
    """
    return repo.get_stats()


def get_stats_clientes():
    """
    Obtiene estadísticas específicas de clientes.
    
    Returns:
        dict con total_activos, total_inactivos, total_prospectos
    """
    return repo.get_stats_clientes()


def get_tipos_cliente():
    """
    Obtiene los tipos de cliente disponibles.
    
    Returns:
        Lista de tipos con id y descripción
    """
    return [
        {"id": 1, "descripcion": "Cliente"},
        {"id": 2, "descripcion": "Prospecto"}
    ]


def get_tipos_contacto():
    """
    Obtiene los tipos de contacto disponibles.
    
    Returns:
        Lista de tipos con id y descripción
    """
    return [
        {"id": 1, "descripcion": "Teléfono"},
        {"id": 2, "descripcion": "Celular"},
        {"id": 3, "descripcion": "Email"},
        {"id": 4, "descripcion": "Dirección"},
        {"id": 5, "descripcion": "Fax"},
        {"id": 6, "descripcion": "Página web"}
    ]
