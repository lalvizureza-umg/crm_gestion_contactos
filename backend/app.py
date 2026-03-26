"""
app.py - API REST Backend - CRM Ing Software
Arquitectura separada: Este servidor solo expone endpoints API
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta
from config import SECRET_KEY, DEBUG, CORS_ORIGINS

# Middleware de autenticación
from middleware.auth_middleware import token_required, get_usuario

# Módulos legacy (pendientes de migrar a 3 capas)
import auth as auth_mod
import empleados as empleados_mod
import compras as compras_mod

# Services (para endpoints que aún no tienen blueprint propio)
from services import cliente_service

# Blueprints (arquitectura 3 capas)
from routes.proveedor_routes import proveedor_bp
from routes.cliente_routes import cliente_bp

app = Flask(__name__)
app.secret_key = SECRET_KEY

# Habilitar CORS para permitir llamadas desde el frontend
CORS(app, origins=CORS_ORIGINS, supports_credentials=True)

# Registrar Blueprints
app.register_blueprint(proveedor_bp)
app.register_blueprint(cliente_bp)


# ══════════════════════════════════════════════════════════════
# JWT Authentication
# ══════════════════════════════════════════════════════════════

def generate_token(user_data):
    """Genera un JWT token para el usuario"""
    payload = {
        'username': user_data['username'],
        'nombre': user_data['nombre'],
        'rol': user_data['rol'],
        'exp': datetime.utcnow() + timedelta(hours=8)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


# ══════════════════════════════════════════════════════════════
# Health Check
# ══════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "API Backend funcionando correctamente"})


# ══════════════════════════════════════════════════════════════
# Auth Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json() or {}
    username = data.get("username", "")
    password = data.get("password", "")
    
    usuario, error = auth_mod.verificar_login(username, password)
    
    if usuario:
        token = generate_token(usuario)
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "username": usuario['username'],
                "nombre": usuario['nombre'],
                "rol": usuario['rol']
            }
        })
    
    return jsonify({"error": error or "Credenciales incorrectas"}), 401


@app.route("/api/auth/verify", methods=["GET"])
@token_required
def api_verify_token():
    return jsonify({
        "valid": True,
        "user": request.current_user
    })


# ══════════════════════════════════════════════════════════════
# Dashboard Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/dashboard/stats", methods=["GET"])
@token_required
def api_stats():
    stats = cliente_service.get_stats()
    stats.update(empleados_mod.get_stats_empleados())
    stats.update(compras_mod.get_stats_compras())
    return jsonify(stats)


@app.route("/api/dashboard/cumpleaneros", methods=["GET"])
@token_required
def api_cumpleaneros():
    return jsonify(cliente_service.get_cumpleaneros_mes())


# ══════════════════════════════════════════════════════════════
# Empleados Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/dependencias", methods=["GET"])
@token_required
def api_get_dependencias():
    return jsonify(empleados_mod.get_all_dependencias())


@app.route("/api/dependencias", methods=["POST"])
@token_required
def api_create_dependencia():
    data = request.get_json()
    data["usuario"] = get_usuario()
    r = empleados_mod.create_dependencia(data)
    return (jsonify(r), 400) if "error" in r else (jsonify(r), 201)


@app.route("/api/empleados", methods=["GET"])
@token_required
def api_get_empleados():
    return jsonify(empleados_mod.get_all_empleados(
        nombre=request.args.get("nombre") or None,
        dependencia=request.args.get("dependencia") or None,
        estado=request.args.get("estado") or None,
        page=int(request.args.get("page", 1))
    ))


@app.route("/api/empleados/<int:id>", methods=["GET"])
@token_required
def api_get_empleado(id):
    d = empleados_mod.get_empleado_by_id(id)
    return jsonify(d) if d else (jsonify({"error": "No encontrado"}), 404)


@app.route("/api/empleados", methods=["POST"])
@token_required
def api_create_empleado():
    data = request.get_json()
    data["usuario"] = get_usuario()
    r = empleados_mod.create_empleado(data)
    return (jsonify(r), 400) if "error" in r else (jsonify(r), 201)


@app.route("/api/empleados/<int:id>", methods=["PUT"])
@token_required
def api_update_empleado(id):
    data = request.get_json()
    data["usuario"] = get_usuario()
    r = empleados_mod.update_empleado(id, data)
    return (jsonify(r), 400) if "error" in r else jsonify(r)


@app.route("/api/empleados/<int:id>/reasignar", methods=["PATCH"])
@token_required
def api_reasignar(id):
    data = request.get_json()
    data["usuario"] = get_usuario()
    r = empleados_mod.reasignar_dependencia(id, data)
    return (jsonify(r), 400) if "error" in r else jsonify(r)


# ══════════════════════════════════════════════════════════════
# Compras Endpoints
# ══════════════════════════════════════════════════════════════

@app.route("/api/compras", methods=["GET"])
@token_required
def api_get_compras():
    return jsonify(compras_mod.get_all_compras(
        proveedor=request.args.get("proveedor") or None,
        estado_pago=request.args.get("estado_pago") or None,
        page=int(request.args.get("page", 1))
    ))


@app.route("/api/compras/<int:id>", methods=["GET"])
@token_required
def api_get_compra(id):
    d = compras_mod.get_compra_by_id(id)
    return jsonify(d) if d else (jsonify({"error": "No encontrado"}), 404)


@app.route("/api/compras", methods=["POST"])
@token_required
def api_create_compra():
    data = request.get_json()
    data["usuario"] = get_usuario()
    r = compras_mod.create_compra(data)
    return (jsonify(r), 400) if "error" in r else (jsonify(r), 201)


@app.route("/api/compras/<int:id>/estado", methods=["PATCH"])
@token_required
def api_estado_compra(id):
    body = request.get_json() or {}
    r = compras_mod.update_estado_pago(id, body.get("estado_pago", ""), get_usuario())
    return (jsonify(r), 400) if "error" in r else jsonify(r)


# ══════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  CRM Ing Software - API Backend")
    print("  Servidor corriendo en: http://localhost:5000")
    print("  Endpoints disponibles en: /api/*")
    print("=" * 60)
    app.run(debug=DEBUG, host="0.0.0.0", port=5000)
