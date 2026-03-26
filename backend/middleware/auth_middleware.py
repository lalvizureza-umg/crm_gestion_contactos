"""
auth_middleware.py - Middleware de autenticación JWT
"""
from functools import wraps
from flask import request, jsonify
import jwt
from config import SECRET_KEY


def token_required(f):
    """Decorator para proteger endpoints con JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token de autenticación requerido'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
        
        return f(*args, **kwargs)
    return decorated


def get_usuario():
    """Obtiene el usuario del token JWT"""
    return getattr(request, 'current_user', {}).get('username', 'sistema')
