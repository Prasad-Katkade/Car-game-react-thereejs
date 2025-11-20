import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";

// ---------------------------
// STORED JOYSTICK STATE
// ---------------------------
interface JoystickState {
  x: number;
  y: number;
  angle: number;
  distance: number;

  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

// Default state
let joystickState: JoystickState = {
  x: 0,
  y: 0,
  angle: 0,
  distance: 0,
  forward: false,
  backward: false,
  left: false,
  right: false,
};

// ---------------------------
// EXPRESS SERVER
// ---------------------------
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint for debugging
app.get("/joystick", (req, res) => {
  res.json(joystickState);
});

// ---------------------------
// WEBSOCKET SERVER
// ---------------------------
const wss = new WebSocketServer({ port: 8081 });

wss.on("connection", (socket) => {
  console.log("A device connected!");

  // Send initial state
  socket.send(JSON.stringify({ type: "state", payload: joystickState }));

  socket.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // Expect data format:
      // { x, y, angle, distance, forward, backward, left, right }
      if (data.type === "joystick") {
        joystickState = {
          ...joystickState,
          ...data.payload,
        };

        console.log("Updated joystick:", joystickState);

        // Broadcast new joystick state to ALL clients (optional)
        wss.clients.forEach((client) => {
          if (client !== socket && client.readyState === 1) {
            client.send(
              JSON.stringify({ type: "state", payload: joystickState })
            );
          }
        });
      }
    } catch (err) {
      console.error("Invalid WS message:", err);
    }
  });

  socket.on("close", () => {
    console.log("Client disconnected.");
  });
});

// HTTP server
const PORT = 8080;
app.listen(PORT, () => console.log(`HTTP server on http://localhost:${PORT}`));

console.log("WebSocket server running on ws://localhost:8081");
