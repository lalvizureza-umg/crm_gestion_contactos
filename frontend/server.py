"""
server.py - Servidor HTTP simple para el Frontend
Ejecuta: python server.py
El frontend estará disponible en: http://localhost:3000
"""

import http.server
import socketserver

PORT = 3000
DIRECTORY = "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Headers para CORS y cache
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print("=" * 60)
        print("  CRM Ing Software - Frontend Server")
        print(f"  Servidor corriendo en: http://localhost:{PORT}")
        print("  Presiona Ctrl+C para detener")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
