"""
proveedor_service.py - Capa de lógica de negocio para Proveedores
Contiene validaciones, transformaciones y orquestación de repositorios
"""
from repositories import proveedor_repository as repo


def get_all_proveedores(nombre=None, nit=None, categoria=None, page=1, per_page=20):
    """
    Obtiene todos los proveedores con filtros opcionales y paginación.
    
    Args:
        nombre: Filtro por nombre de empresa (parcial)
        nit: Filtro por NIT (parcial)
        categoria: Filtro por nombre de categoría
        page: Número de página (default 1)
        per_page: Resultados por página (default 20)
    
    Returns:
        dict con proveedores, total, page y per_page
    """
    where_clauses = ["1=1"]
    params = []
    
    if nombre:
        where_clauses.append("p.nombre_empresa LIKE %s")
        params.append(f"%{nombre}%")
    if nit:
        where_clauses.append("p.nit LIKE %s")
        params.append(f"%{nit}%")
    if categoria:
        where_clauses.append("c.nombre_categoria = %s")
        params.append(categoria)
    
    offset = (page - 1) * per_page
    proveedores, total = repo.find_all(where_clauses, params, offset, per_page)
    
    return {
        "proveedores": proveedores,
        "total": total,
        "page": page,
        "per_page": per_page
    }


def get_proveedor_by_id(id_proveedor):
    """
    Obtiene un proveedor por su ID.
    
    Args:
        id_proveedor: ID del proveedor
    
    Returns:
        dict con datos del proveedor o None si no existe
    """
    return repo.find_by_id(id_proveedor)


def get_categorias():
    """
    Obtiene todas las categorías de proveedores activas.
    
    Returns:
        Lista de categorías con id y nombre
    """
    return repo.find_all_categorias()


def create_proveedor(data):
    """
    Crea un nuevo proveedor.
    
    Args:
        data: dict con los datos del proveedor
            - nombre_empresa (requerido)
            - nit (requerido)
            - id_categoria (requerido)
            - telefono (requerido)
            - contacto (opcional)
            - correo (opcional)
            - direccion (opcional)
            - notas (opcional)
            - usuario (opcional, default 'sistema')
    
    Returns:
        dict con id_proveedor y mensaje, o error
    """
    row = repo.insert(data)
    
    if row and isinstance(row[0], int):
        return {"id_proveedor": row[0], "mensaje": row[1]}
    return {"error": row[1] if row else "Error desconocido"}


def update_proveedor(id_proveedor, data):
    """
    Actualiza un proveedor existente.
    
    Args:
        id_proveedor: ID del proveedor a actualizar
        data: dict con los datos a actualizar
    
    Returns:
        dict con id_proveedor y mensaje, o error
    """
    row = repo.update(id_proveedor, data)
    
    if row and isinstance(row[0], int):
        return {"id_proveedor": row[0], "mensaje": row[1]}
    return {"error": row[1] if row else "Error desconocido"}


def inactivar_proveedor(id_proveedor, motivo, usuario="sistema"):
    """
    Inactiva un proveedor.
    
    Args:
        id_proveedor: ID del proveedor
        motivo: Motivo de inactivación (requerido)
        usuario: Usuario que realiza la acción
    
    Returns:
        dict con mensaje de éxito o error
    """
    if not motivo or not motivo.strip():
        return {"error": "El motivo de inactivación es obligatorio."}
    
    row = repo.set_inactive(id_proveedor, motivo.strip(), usuario)
    
    if row and isinstance(row[0], int):
        return {"mensaje": row[1]}
    return {"error": row[1] if row else "Error desconocido"}


def activar_proveedor(id_proveedor, usuario="sistema"):
    """
    Activa un proveedor previamente inactivado.
    
    Args:
        id_proveedor: ID del proveedor
        usuario: Usuario que realiza la acción
    
    Returns:
        dict con mensaje de éxito o error
    """
    row = repo.set_active(id_proveedor, usuario)
    return {"mensaje": row[1]} if row else {"error": "Error al activar"}


def eliminar_proveedor(id_proveedor, usuario="sistema"):
    """
    Elimina un proveedor del sistema.
    
    Args:
        id_proveedor: ID del proveedor
        usuario: Usuario que realiza la acción
    
    Returns:
        dict con mensaje de éxito o error
    """
    row = repo.delete(id_proveedor, usuario)
    
    if row and isinstance(row[0], int):
        return {"mensaje": row[1]}
    return {"error": row[1] if row else "Error desconocido"}
