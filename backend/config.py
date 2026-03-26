"""
config.py - Configuración del Backend API
"""

DB_CONFIG = {
    "server":   "localhost",
    "database": "crm_ing_software",
    "username": "alex",
    "password": "Alejandro11%",
    "port":     1433,
}

SECRET_KEY = "crm_ing_software_secret_2024"
DEBUG = True

# URLs permitidas para CORS (frontend)
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
