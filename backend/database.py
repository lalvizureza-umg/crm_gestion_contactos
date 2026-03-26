"""
database.py - Conexión a SQL Server con pymssql
"""

import pymssql
from config import DB_CONFIG


def get_connection():
    return pymssql.connect(
        server=DB_CONFIG['server'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['username'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['database'],
        charset='UTF-8',
    )
