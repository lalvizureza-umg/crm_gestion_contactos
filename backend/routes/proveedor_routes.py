"""
proveedor_routes.py - Capa de presentación/API para Proveedores
Define los endpoints REST y maneja requests/responses HTTP
"""
from flask import Blueprint, request, jsonify
from services import proveedor_service as service
from middleware.auth_middleware import token_required, get_usuario

proveedor_bp = Blueprint('proveedores', __name__, url_prefix='/api/proveedores')


@proveedor_bp.route('/categorias', methods=['GET'])
@token_required
def get_categorias():
    """GET /api/proveedores/categorias - Obtiene todas las categorías"""
    return jsonify(service.get_categorias())


@proveedor_bp.route('', methods=['GET'])
@token_required
def get_proveedores():
    """GET /api/proveedores - Lista proveedores con filtros y paginación"""
    result = service.get_all_proveedores(
        nombre=request.args.get("nombre") or None,
        nit=request.args.get("nit") or None,
        categoria=request.args.get("categoria") or None,
        page=int(request.args.get("page", 1))
    )
    return jsonify(result)


@proveedor_bp.route('/<int:id>', methods=['GET'])
@token_required
def get_proveedor(id):
    """GET /api/proveedores/:id - Obtiene un proveedor por ID"""
    proveedor = service.get_proveedor_by_id(id)
    if proveedor:
        return jsonify(proveedor)
    return jsonify({"error": "No encontrado"}), 404


@proveedor_bp.route('', methods=['POST'])
@token_required
def create_proveedor():
    """POST /api/proveedores - Crea un nuevo proveedor"""
    data = request.get_json()
    data["usuario"] = get_usuario()
    result = service.create_proveedor(data)
    
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 201


@proveedor_bp.route('/<int:id>', methods=['PUT'])
@token_required
def update_proveedor(id):
    """PUT /api/proveedores/:id - Actualiza un proveedor"""
    data = request.get_json()
    data["usuario"] = get_usuario()
    result = service.update_proveedor(id, data)
    
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


@proveedor_bp.route('/<int:id>/inactivar', methods=['PATCH'])
@token_required
def inactivar_proveedor(id):
    """PATCH /api/proveedores/:id/inactivar - Inactiva un proveedor"""
    body = request.get_json() or {}
    result = service.inactivar_proveedor(id, body.get("motivo", ""), get_usuario())
    
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


@proveedor_bp.route('/<int:id>/activar', methods=['PATCH'])
@token_required
def activar_proveedor(id):
    """PATCH /api/proveedores/:id/activar - Activa un proveedor"""
    return jsonify(service.activar_proveedor(id, get_usuario()))


@proveedor_bp.route('/<int:id>', methods=['DELETE'])
@token_required
def eliminar_proveedor(id):
    """DELETE /api/proveedores/:id - Elimina un proveedor"""
    result = service.eliminar_proveedor(id, get_usuario())
    
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)
