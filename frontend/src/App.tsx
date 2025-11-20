import "./App.css";
import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import MobileControls from "./components/MobileControls";
import CarTrack from "./components/CarTrack";



function App() {
  const forward = useRef<boolean>(false);
  const backward = useRef<boolean>(false);
  const left = useRef<boolean>(false);
  const right = useRef<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  

  /** WS setup */
  useEffect(() => {
    const ws = new WebSocket("ws://192.168.86.134:8081");
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "state") {
        const s = msg.payload;
        forward.current = s.forward;
        backward.current = s.backward;
        left.current = s.left;
        right.current = s.right;
      }
    };
    return () => ws?.close?.();
  }, []);

  /** Send movement state */
  const sendJoystickState = (f:boolean,b:boolean,l:boolean,r:boolean) => {
    forward.current = f;
    backward.current = b;
    left.current = l;
    right.current = r;
    console.log("Sending joystick state:", {f,b,l,r});
    

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

      {/* Mobile Controls */}
      <MobileControls
        sendJoystickState={(f:boolean,b:boolean,l:boolean,r:boolean)=>sendJoystickState(f,b,l,r)}
      />
    </>
  );
}

export default App;
