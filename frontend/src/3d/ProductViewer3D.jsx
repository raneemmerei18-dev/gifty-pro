/*
 * ProductViewer3D
 * ---------------
 * A compact 3D viewer for a single product.
 * - If the product has a modelPath  → loads & auto-spins the GLTF model
 * - Otherwise                       → shows a cute spinning gift-box geometry
 *
 * Props:
 *   modelPath  – string | "" (e.g. "/models/bar.glb")
 *   scale      – number (default 1)
 *   color      – fallback box color
 */

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Center, Environment, OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";
import API from "../api/axios";

/* ─── Auto-rotating wrapper ─────────────────────────── */
function Spinner({ children }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.9;
  });
  return <group ref={ref}>{children}</group>;
}

/* ─── Fallback gift-box shape (when no model) ────────── */
function FallbackBox({ color = "#e74c3c" }) {
  const base = useRef();
  const lid  = useRef();
  useFrame((_, delta) => {
    if (base.current) base.current.rotation.y += delta * 0.9;
  });

  const mat = (c) => (
    <meshPhysicalMaterial
      color={c}
      roughness={0.3}
      metalness={0.05}
      clearcoat={0.8}
      clearcoatRoughness={0.2}
    />
  );

  return (
    <group>
      {/* base */}
      <group ref={base}>
        <mesh position={[0, -0.15, 0]} castShadow>
          <boxGeometry args={[1, 0.7, 1]} />
          {mat(color)}
        </mesh>
        {/* ribbon V */}
        <mesh position={[0, -0.145, 0]} castShadow>
          <boxGeometry args={[0.12, 0.72, 1.02]} />
          <meshStandardMaterial color="#fff" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, -0.145, 0]} castShadow>
          <boxGeometry args={[1.02, 0.72, 0.12]} />
          <meshStandardMaterial color="#fff" transparent opacity={0.55} />
        </mesh>
        {/* lid */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[1.06, 0.18, 1.06]} />
          {mat(new THREE.Color(color).lerp(new THREE.Color("#000"), 0.12).getStyle())}
        </mesh>
        {/* bow loops */}
        <mesh position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 8]} castShadow>
          <torusGeometry args={[0.22, 0.045, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[0, Math.PI, -Math.PI / 8]} castShadow>
          <torusGeometry args={[0.22, 0.045, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      </group>
    </group>
  );
}

/* ─── GLTF model loader ──────────────────────────────── */
function GltfModel({ url, scale }) {
  const { scene } = useLoader(GLTFLoader, url);
  return (
    <Spinner>
      <Center>
        <primitive object={scene.clone()} scale={scale || 1} castShadow />
      </Center>
    </Spinner>
  );
}

/* ─── Error boundary ─────────────────────────────────── */
import React from "react";
class Boundary extends React.Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) return <FallbackBox color="#e74c3c" />;
    return this.props.children;
  }
}

/* ─── Main export ────────────────────────────────────── */
export default function ProductViewer3D({ modelPath, scale = 1, color = "#e74c3c" }) {
  // Build full URL if path is relative
  let url = null;
  if (modelPath) {
    url = modelPath.startsWith("/")
      ? API.defaults.baseURL.replace(/\/api$/, "") + modelPath
      : modelPath;
  }

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      camera={{ position: [0, 1.2, 3], fov: 40 }}
      shadows
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 5, 3]} intensity={1.4} castShadow />

      <Suspense fallback={<FallbackBox color={color} />}>
        {url ? (
          <Boundary>
            <GltfModel url={url} scale={scale} />
          </Boundary>
        ) : (
          <FallbackBox color={color} />
        )}
      </Suspense>

      <Environment preset="city" />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
    </Canvas>
  );
}
