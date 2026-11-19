"""
Servidor WebSocket en FastAPI para el Módulo de Chat en Tiempo Real
Proyecto: ConsultasIUB (MiTutoría) - Parcial II (50%)
Cumple con la gestión de conexiones/desconexiones y broadcast instantáneo a clientes conectados.
"""

from datetime import datetime
import json
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ConsultasIUB - API WebSocket Chat",
    description="Servidor WebSocket en tiempo real para comunicación entre estudiantes, docentes y coordinadores.",
    version="2.0.0"
)

# Habilitar CORS para permitir conexión desde el frontend Angular (localhost:4200 y producción)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    """
    Gestiona las conexiones WebSocket activas, el registro de usuarios en línea
    y la distribución (broadcast) automática de mensajes sin recargar la página.
    """
    def __init__(self):
        # Lista de sockets activos
        self.active_connections: List[WebSocket] = []
        # Diccionario para asociar cada socket a los datos del usuario autenticado
        self.user_data: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Nueva conexión aceptada. Total conectados: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> Optional[dict]:
        user = self.user_data.pop(websocket, None)
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Conexión cerrada. Total conectados: {len(self.active_connections)}")
        return user

    def register_user(self, websocket: WebSocket, user_info: dict):
        self.user_data[websocket] = user_info

    def get_online_users(self) -> List[dict]:
        return list(self.user_data.values())

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def broadcast(self, message: dict, exclude: Optional[WebSocket] = None):
        """
        Distribuye automáticamente el mensaje a todos los clientes conectados.
        """
        payload_str = json.dumps(message)
        dead_connections = []
        for connection in self.active_connections:
            if connection != exclude:
                try:
                    await connection.send_text(payload_str)
                except Exception as e:
                    print(f"[WS] Error enviando a un cliente: {e}")
                    dead_connections.append(connection)

        # Limpiar sockets que hayan fallado
        for dead in dead_connections:
            self.disconnect(dead)


manager = ConnectionManager()


@app.get("/")
def read_root():
    return {
        "sistema": "ConsultasIUB - Módulo de Chat WebSocket",
        "estado": "Activo",
        "version": "2.0.0",
        "websocket_endpoint": "ws://localhost:8000/ws",
        "usuarios_conectados": len(manager.active_connections)
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "tiempo": datetime.now().isoformat(),
        "clientes_activos": len(manager.active_connections),
        "usuarios_en_linea": manager.get_online_users()
    }


@app.websocket("/ws")
async def websocket_chat_endpoint(websocket: WebSocket):
    """
    Endpoint principal WebSocket.
    Maneja el ciclo de vida completo:
    1. Conexión y aceptación de handshake.
    2. Envío/Recepción de mensajes en tiempo real.
    3. Distribución (broadcast) automática a todos los usuarios conectados.
    4. Notificación de conexión y desconexión de usuarios.
    """
    await manager.connect(websocket)

    try:
        # Enviar confirmación de bienvenida y lista actual de usuarios conectados
        await manager.send_personal_message({
            "tipo": "lista_usuarios",
            "usuarios": manager.get_online_users(),
            "timestamp": datetime.now().isoformat()
        }, websocket)

        while True:
            # Esperar mensajes enviados por el cliente Angular
            data_raw = await websocket.receive_text()
            try:
                data = json.loads(data_raw)
            except json.JSONDecodeError:
                data = {"tipo": "mensaje", "contenido": data_raw}

            tipo = data.get("tipo", "mensaje")

            # 1. Registro de Presencia (Usuario se conecta)
            if tipo == "usuario_conectado":
                usr = data.get("usuario", {})
                if usr:
                    manager.register_user(websocket, usr)
                    # Notificar a los demás clientes que ingresó un nuevo usuario
                    await manager.broadcast({
                        "tipo": "usuario_conectado",
                        "usuario": usr,
                        "usuarios": manager.get_online_users(),
                        "timestamp": datetime.now().isoformat()
                    }, exclude=websocket)

            # 2. Envío de Mensaje de Chat en Tiempo Real
            elif tipo == "mensaje":
                # Reenviar el mensaje a todos los clientes (broadcast automático)
                await manager.broadcast(data, exclude=websocket)

            # 3. Heartbeat / Ping
            elif tipo == "ping":
                await manager.send_personal_message({
                    "tipo": "pong",
                    "timestamp": datetime.now().isoformat()
                }, websocket)

    except WebSocketDisconnect:
        # Gestión adecuada de desconexión
        usr_desconectado = manager.disconnect(websocket)
        if usr_desconectado:
            await manager.broadcast({
                "tipo": "usuario_desconectado",
                "usuario": usr_desconectado,
                "usuarios": manager.get_online_users(),
                "timestamp": datetime.now().isoformat()
            })
    except Exception as e:
        print(f"[WS] Excepción inesperada: {e}")
        usr_desconectado = manager.disconnect(websocket)
        if usr_desconectado:
            await manager.broadcast({
                "tipo": "usuario_desconectado",
                "usuario": usr_desconectado,
                "usuarios": manager.get_online_users(),
                "timestamp": datetime.now().isoformat()
            })


if __name__ == "__main__":
    import uvicorn
    print("==================================================================")
    print("🚀 Servidor FastAPI WebSocket iniciando en http://localhost:8000")
    print("   Endpoint WebSocket activo: ws://localhost:8000/ws")
    print("==================================================================")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
