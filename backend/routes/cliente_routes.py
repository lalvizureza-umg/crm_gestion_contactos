"""
cliente_routes.py - Capa de presentación/API para Clientes
Define los endpoints REST y maneja requests/responses HTTP
"""
from flask import Blueprint, request, jsonify
from services import cliente_service as service
from middleware.auth_middleware import token_required, get_usuario

cliente_bp = Blueprint('clientes', __name__, url_prefix='/api/clientes')


@cliente_bp.route('', methods=['GET'])
@token_required
def get_clientes():
    """GET /api/clientes - Lista clientes con filtros y paginación"""
    result = service.get_all_clientes(
        nombre=request.args.get("nombre") or None,
        documento=request.args.get("documento") or None,
        tipo=request.args.get("tipo") or None,
        page=int(request.args.get("page", 1)),
        per_page=int(request.args.get("limit", 20)),
        search=request.args.get("search") or None
    )
    return jsonify(result)


@cliente_bp.route('/<int:id>', methods=['GET'])
@token_required
def get_cliente(id):
    """GET /api/clientes/:id - Obtiene un cliente por ID"""
    cliente = service.get_cliente_by_id(id)
    if cliente:
        return jsonify(cliente)
    return jsonify({"error": "No encontrado"}), 404


@cliente_bp.route('', methods=['POST'])
@token_required
def create_cliente():
    """POST /api/clientes - Crea un nuevo cliente"""
    data = request.get_json()
    data["usuario"] = get_usuario()
    result = service.create_cliente(data)
    
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 201


@cliente_bp.route('/<int:id>', methods=['PUT'])
@token_required
def update_cliente(id):
    """PUT /api/clientes/:id - Actualiza un cliente"""
    data = request.get_json()
    data["usuario"] = get_usuario()
    result = service.update_cliente(id, data)
    
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


@cliente_bp.route('/<int:id>/inactivar', methods=['PATCH'])
@token_required
def inactivar_cliente(id):
    """PATCH /api/clientes/:id/inactivar - Inactiva un cliente"""
    return jsonify(service.inactivar_cliente(id, get_usuario()))


@cliente_bp.route('/tipos-cliente', methods=['GET'])
@token_required
def get_tipos_cliente():
    """GET /api/clientes/tipos-cliente - Obtiene tipos de cliente"""
    return jsonify(service.get_tipos_cliente())


@cliente_bp.route('/tipos-contacto', methods=['GET'])
@token_required
def get_tipos_contacto():
    """GET /api/clientes/tipos-contacto - Obtiene tipos de contacto"""
    return jsonify(service.get_tipos_contacto())


@cliente_bp.route('/stats', methods=['GET'])
@token_required
def get_stats_clientes():
    """GET /api/clientes/stats - Obtiene estadísticas de clientes"""
    return jsonify(service.get_stats_clientes())
