import "./App.css";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Box,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import {
  CuboidCollider,
  Physics,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import * as THREE from "three";

function App() {
  const forward = useRef(false);
  const backward = useRef(false);
  const left = useRef(false);
  const right = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [activeControls, setActiveControls] = useState<{
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  }>({
    forward: false,
    backward: false,
    left: false,
    right: false
  });

  useEffect(() => {
    const ws: WebSocket | null = new WebSocket("ws://192.168.86.134:8081");
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

    return () => {
      ws?.close?.();
    };
  }, []);

  function CarTrack() {
    const gltf = useGLTF("/models/track/scene.gltf");
    const car = useGLTF("/models/car/scene.gltf");
    const cube = useRef<RapierRigidBody>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const isOnFloor = useRef(true);
    const moveSpeed = useRef(25);
    const [isCarMoving, setIsCarMoving] = useState(false);

    const handleMovement = (
      fwd: boolean,
      back: boolean,
      left: boolean,
      right: boolean
    ) => {
      if (!cube.current) return;

      const car = cube.current;
      const currentLinvel = car.linvel();
      const carRotation = car.rotation();

      const turnSpeed = 4;

      const forwardPressed = fwd;
      const backPressed = back;
      const rightPressed = right;
      const leftPressed = left;

      // --- Steering (Angular Velocity) ---
      const newAngvel = { x: 0, y: 0, z: 0 };
      if (leftPressed) {
        newAngvel.y = turnSpeed;
      } else if (rightPressed) {
        newAngvel.y = -turnSpeed;
      }
      car.setAngvel(newAngvel, true);

      // --- Forward/Backward (Linear Velocity) ---
      const forwardVector = new THREE.Vector3(0, 0, -1);
      forwardVector.applyQuaternion(carRotation);

      const newLinvel = new THREE.Vector3();
      if (forwardPressed) {
        newLinvel.x = forwardVector.x * moveSpeed.current;
        newLinvel.z = forwardVector.z * moveSpeed.current;
        moveSpeed.current += 0.1;
        setIsCarMoving(true);
      } else if (backPressed) {
        newLinvel.x = -forwardVector.x * moveSpeed.current * 0.5;
        newLinvel.z = -forwardVector.z * moveSpeed.current * 0.5;
        moveSpeed.current -= 0.5;
        setIsCarMoving(true);
      } else {
        moveSpeed.current = 25;
        setIsCarMoving(false);
      }

      car.setLinvel(
        { x: newLinvel.x, y: currentLinvel.y, z: newLinvel.z },
        true
      );
    };

    useFrame((state, delta) => {
      console.log(
        forward.current,
        backward.current,
        left.current,
        right.current
      );

      handleMovement(
        forward.current,
        backward.current,
        left.current,
        right.current
      );

      // --- MODIFIED: CAMERA FOLLOW LOGIC ---
      if (cube.current && cameraRef.current) {
        const carPosition = cube.current.translation();
        const carRotation = cube.current.rotation();

        // Car Position: fA {x: -23.721988677978516, y: -1.5489084720611572, z: 6.1412034034729}

        const cameraOffset = new THREE.Vector3(0, 15, 18);

        cameraOffset.applyQuaternion(carRotation);

        cameraOffset.add(carPosition);

        cameraRef.current.position.lerp(cameraOffset, delta * 5);

        const lookAtOffset = new THREE.Vector3(0, 2, -10);

        lookAtOffset.applyQuaternion(carRotation);

        lookAtOffset.add(carPosition);

        cameraRef.current.lookAt(lookAtOffset);
      }
    });

    return (
      <>
        <ambientLight intensity={2} />
        <directionalLight position={[-10, 10, 0]} intensity={0.4} />

        {/* <OrbitControls /> */}

        <RigidBody
          ref={cube}
          type="dynamic"
          lockRotations
          mass={5}
          colliders="cuboid"
          position={[30, 0.5, 5]}
          rotation={[0, Math.PI / 2, 0]}
          onCollisionEnter={({ other }) => {
            if (other.rigidBodyObject?.name === "floor")
              isOnFloor.current = true;
          }}
          onCollisionExit={({ other }) => {
            if (other.rigidBodyObject?.name === "floor")
              isOnFloor.current = false;
          }}
        >
          <primitive object={car.scene} scale={2} />
        </RigidBody>

        <RigidBody type="fixed" name="track" colliders="trimesh" friction={3}>
          <primitive object={gltf.scene} scale={1} />
        </RigidBody>
        {/* <RigidBody type="fixed" name="track" colliders="trimesh" friction={1}>
          <Box castShadow position={[0, 0, 0]} args={[1000, 1, 1000]}></Box>
        </RigidBody> */}

        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[0, 10, 15]}
          fov={60}
        />
      </>
    );
  }

  const sendJoystickState = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "joystick",
          payload: {
            x: 0,
            y: 0,
            angle: 0,
            distance: 0,
            forward: forward.current,
            backward: backward.current,
            left: left.current,
            right: right.current,
            steer: 0,
          },
        })
      );
    }
  };

  return (
    <>
      <Canvas
        className="hidden md:block oberflow-hidden"
        shadows
        camera={{ position: [10, 10, 10], fov: 30 }}
      >
        <color attach="background" args={["#3498db"]} />
        <Suspense fallback={null}>
          <Physics>
            {/* <BoxGame /> */}
            <CarTrack />
          </Physics>
        </Suspense>
      </Canvas>
      <div className="md:hidden w-full h-screen bg-slate-950 overflow-hidden touch-none">
        <div className="flex flex-col h-full justify-between text-white">
          {/* Up-Down Buttons */}
          <div className="w-full mt-10 p-4 flex justify-center gap-2 align-middle">
            <div
              className={`border p-10 text-4xl  ${activeControls.backward && "bg-slate-600"} transition-colors duration-150 cursor-pointer select-none`}
              onTouchStart={() => {
                backward.current = true;
                sendJoystickState();
                setActiveControls(prev => ({ ...prev, backward: true }));
              }}
              onTouchEnd={() => {
                backward.current = false;
                sendJoystickState();
                setActiveControls(prev => ({ ...prev, backward: false }));
              }}
            >{`<`}</div>
            <div
              className={`border p-10 text-4xl  ${activeControls.forward && "bg-slate-600"} transition-colors duration-150 cursor-pointer select-none`}
              onTouchStart={() => {
                forward.current = true;
                sendJoystickState();
                setActiveControls(prev => ({ ...prev, forward: true }));
              }}
              onTouchEnd={() => {
                forward.current = false;
                sendJoystickState();
                setActiveControls(prev => ({ ...prev, forward: false }));
              }}
            >{`>`}</div>
          </div>

          {/* Left-Right Buttons */}
          <div className="w-full mb-20 p-4 flex flex-col gap-2 items-center">
            <div className="flex flex-col gap-2 items-center">
              <div
                onTouchStart={() => {
                  left.current = true;
                  sendJoystickState();
                  setActiveControls(prev => ({ ...prev, left: true }));
                }}
                onTouchEnd={() => {
                  left.current = false;
                  sendJoystickState();
                  setActiveControls(prev => ({ ...prev, left: false }));
                }}
               className={`border p-10 text-4xl rotate-90 ${activeControls.left && "bg-slate-600"} transition-colors duration-150 cursor-pointer select-none`}
              >{`<`}</div>
              <div
                onTouchStart={() => {
                  right.current = true;
                  sendJoystickState();
                  setActiveControls(prev => ({ ...prev, right: true }));
                }}
                onTouchEnd={() => {
                  right.current = false;
                  sendJoystickState();
                  setActiveControls(prev => ({ ...prev, right: false }));
                }}
                 className={`border p-10 text-4xl rotate-90 ${activeControls.right && "bg-slate-600"} transition-colors duration-150 cursor-pointer select-none`}
              >{`>`}</div>
            </div>
          </div>
        </div>
      </div>
      {/* <div className="text-white hidden md:block">
          <div className="my-joystick-container"></div>
        </div> */}
    </>
  );
}

export default App;
