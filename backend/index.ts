import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";

interface JoystickState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

// Default state
let joystickState: JoystickState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint for debugging
app.get("/joystick", (req, res) => {
  res.json(joystickState);
});


const wss = new WebSocketServer({ port: 8081 });

wss.on("connection", (socket) => {
  console.log("A device connected!");

  // Send initial state
  socket.send(JSON.stringify({ type: "state", payload: joystickState }));

  socket.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

     
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
