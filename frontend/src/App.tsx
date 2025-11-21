import "./App.css";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import MobileControls from "./components/MobileControls";
import CarTrack from "./components/CarTrack";
import { QRCodeSVG } from "qrcode.react";

function App() {
  const forward = useRef<boolean>(false);
  const backward = useRef<boolean>(false);
  const left = useRef<boolean>(false);
  const right = useRef<boolean>(false);
  const [room, setRoom] = useState<string>("");
  const BE_URL = "car-game-react-thereejs.onrender.com";
  const FE_URL = "https://f1-car-gamee.netlify.app/";
  const [showInfo, setShowInfo] = useState<boolean>(true);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const path = window.location.pathname.replace("/", "");

    async function init() {
      let roomCode = path;

      // If URL has no code or invalid length — create a room
      if (!roomCode || roomCode.length !== 5) {
        const res = await fetch(`https://${BE_URL}/create-room`);
        const data = await res.json();
        roomCode = data.room;

        // Update browser URL with new room
        window.history.pushState({}, "", `/${roomCode}`);
      }

      // Set state to just the room code
      setRoom(FE_URL + roomCode);

      const ws = new WebSocket(`wss://${BE_URL}/${roomCode}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "state") {
          const s = msg.payload;
          forward.current = s.forward;
          backward.current = s.backward;
          left.current = s.left;
          right.current = s.right;
        }
      };
    }

    init();
  }, []);

  /** Send movement state */
  const sendJoystickState = (
    f: boolean,
    b: boolean,
    l: boolean,
    r: boolean
  ) => {
    forward.current = f;
    backward.current = b;
    left.current = l;
    right.current = r;
    console.log("Sending joystick state:", { f, b, l, r });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "joystick",
          payload: {
            forward: forward.current,
            backward: backward.current,
            left: left.current,
            right: right.current,
          },
        })
      );
    }
  };

  return (
    <>
      {/* Desktop 3D Scene */}
      <Canvas
        className="hidden md:block oberflow-hidden"
        shadows
        camera={{ position: [10, 10, 10], fov: 30 }}
      >
        <color attach="background" args={["#3498db"]} />
        <Suspense fallback={null}>
          <Physics>
            <CarTrack
              forward={forward}
              backward={backward}
              left={left}
              right={right}
            />
          </Physics>
        </Suspense>
      </Canvas>

      {showInfo && (
        <div className="hidden md:block absolute top-4 left-4">
          <div className="flex p-2 flex-col rounded-2xl bg-white gap-1 shadow">
            <div className="flex justify-between items-center">
              <p>Scan Below</p>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="px-1 rounded cursor-pointer border text-2xl text-red-500 bg-white hover:bg-gray-100"
              >
                X
              </button>
            </div>
            <QRCodeSVG value={room} marginSize={5} />
            <p className="text-black">Or connect here: {room}</p>
          </div>
        </div>
      )}

      {/* Toggle button "!" */}
      {!showInfo && (
        <div className="hidden md:block absolute top-4 left-4">
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="px-2 py-1 rounded cursor-pointer border text-2xl text-yellow-500 bg-white hover:bg-gray-100 shadow"
          >
            Info
          </button>
        </div>
      )}

      {/* Mobile Controls */}
      <MobileControls
        sendJoystickState={(f: boolean, b: boolean, l: boolean, r: boolean) =>
          sendJoystickState(f, b, l, r)
        }
      />
    </>
  );
}

export default App;
