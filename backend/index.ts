import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";

interface JoystickState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

const app = express();
app.use(cors());
app.use(express.json());

const rooms: Record<string, Set<any>> = {};
const joystickStates: Record<string, JoystickState> = {};

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

app.get("/create-room", (req, res) => {
  const code = generateRoomCode();
  rooms[code] = new Set();
  joystickStates[code] = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
  res.json({ success: true, room: code });
});

const wss = new WebSocketServer({ noServer: true });
const server = app.listen(8080, () => console.log("HTTP running on 8080"));

server.on("upgrade", (req, socket, head) => {
  const roomCode = (req.url || "/").split("/")[1];

  if (!rooms[roomCode]) {
    socket.write(
      "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n" +
        JSON.stringify({ success: false, error: "Room does not exist" })
    );
    socket.destroy();
    return;
  }

  if (rooms[roomCode].size >= 3) {
    socket.write(
      "HTTP/1.1 403 Forbidden\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n" +
        JSON.stringify({ success: false, error: "Room is full (max 3 players)" })
    );
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.roomCode = roomCode;
    rooms[roomCode].add(ws);
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (socket: any) => {
  const room = socket.roomCode;

  socket.send(
    JSON.stringify({
      success: true,
      type: "state",
      payload: joystickStates[room],
    })
  );

  socket.on("message", (msg: string) => {
    const data = JSON.parse(msg);

    if (data.type === "joystick" && rooms[room] ) {
      joystickStates[room] = { ...joystickStates[room], ...data.payload };

      rooms[room].forEach((client) => {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({
              type: "state",
              payload: joystickStates[room],
            })
          );
        }
      });
    }
  });

  socket.on("close", () => {
    if (!rooms[room]) return;
    rooms[room].delete(socket);
    if (rooms[room].size === 0) {
      delete rooms[room];
      delete joystickStates[room];
    }
  });
});
