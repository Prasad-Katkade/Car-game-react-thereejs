/* eslint-disable @typescript-eslint/no-unused-vars */
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF } from "@react-three/drei";
import {
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { type RefObject, useRef, useState } from "react";
import * as THREE from "three";

interface CarTrackProps {
  forward: RefObject<boolean>;
  backward: RefObject<boolean>;
  left: RefObject<boolean>;
  right: RefObject<boolean>;
}

export default function CarTrack({
  forward,
  backward,
  left,
  right,
}: CarTrackProps) {
  const gltf = useGLTF("/models/track/scene.gltf");
  const carModel = useGLTF("/models/car/scene.gltf");

  const cube = useRef<RapierRigidBody>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  const moveSpeed = useRef(25);
  const isOnFloor = useRef(true);
  const [isCarMoving, setIsCarMoving] = useState(false);

  /** Vehicle Movement Logic */
  const handleMovement = (
    fwd: boolean,
    back: boolean,
    lft: boolean,
    rgt: boolean
  ) => {
    if (!cube.current) return;

    const rb = cube.current;
    const currentVel = rb.linvel();
    const rotation = rb.rotation();
    const turnSpeed = 4;

    const ang = { x: 0, y: 0, z: 0 };
    if (lft) ang.y = turnSpeed;
    else if (rgt) ang.y = -turnSpeed;
    rb.setAngvel(ang, true);

    const forwardVec = new THREE.Vector3(0, 0, -1);
    forwardVec.applyQuaternion(rotation);

    const newVel = new THREE.Vector3();

    if (fwd) {
      newVel.x = forwardVec.x * moveSpeed.current;
      newVel.z = forwardVec.z * moveSpeed.current;
      moveSpeed.current += 0.1;
      setIsCarMoving(true);
    } else if (back) {
      newVel.x = -forwardVec.x * moveSpeed.current * 0.5;
      newVel.z = -forwardVec.z * moveSpeed.current * 0.5;
      moveSpeed.current -= 0.5;
      setIsCarMoving(true);
    } else {
      moveSpeed.current = 25;
      setIsCarMoving(false);
    }

    rb.setLinvel({ x: newVel.x, y: currentVel.y, z: newVel.z }, true);
  };

  /** Camera Follow Logic */
  useFrame((_, delta) => {
    
    handleMovement(
      forward.current,
      backward.current,
      left.current,
      right.current
    );

    console.log( "handle ,movemnet",forward.current,
      backward.current,
      left.current,
      right.current);
    


    if (cube.current && cameraRef.current) {
      const carPos = cube.current.translation();
      const carRot = cube.current.rotation();

      const offset = new THREE.Vector3(0, 15, 18);
      offset.applyQuaternion(carRot);
      offset.add(carPos);

      cameraRef.current.position.lerp(offset, delta * 5);

      const lookOffset = new THREE.Vector3(0, 2, -10);
      lookOffset.applyQuaternion(carRot);
      lookOffset.add(carPos);

      cameraRef.current.lookAt(lookOffset);
    }
  });

  return (
    <>
      <ambientLight intensity={2} />
      <directionalLight position={[-10, 10, 0]} intensity={0.4} />

      <RigidBody
        ref={cube}
        type="dynamic"
        lockRotations
        mass={5}
        colliders="cuboid"
        position={[30, 0.5, 5]}
        rotation={[0, Math.PI / 2, 0]}
        onCollisionEnter={({ other }) => {
          if (other.rigidBodyObject?.name === "floor") {
            isOnFloor.current = true;
          }
        }}
        onCollisionExit={({ other }) => {
          if (other.rigidBodyObject?.name === "floor") {
            isOnFloor.current = false;
          }
        }}
      >
        <primitive object={carModel.scene} scale={2} />
      </RigidBody>

      <RigidBody type="fixed" name="track" colliders="trimesh" friction={3}>
        <primitive object={gltf.scene} scale={1} />
      </RigidBody>

      <PerspectiveCamera ref={cameraRef} makeDefault fov={60} />
    </>
  );
}
