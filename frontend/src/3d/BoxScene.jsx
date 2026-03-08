import React, { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Center, ContactShadows, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import API from "../api/axios";

/* ─── Theme-based box colour palette ──────────────────── */
const BOX_THEMES = {
  minimal:  { body: "#f5f0e8", lid: "#e8e0d0", ribbon: "#b0a090", accent: "#d4c4a8" },
  classic:  { body: "#c0392b", lid: "#a93226", ribbon: "#f1c40f", accent: "#e74c3c" },
  luxury:   { body: "#2c3e50", lid: "#1a252f", ribbon: "#f39c12", accent: "#e67e22" },
  premium:  { body: "#6c3483", lid: "#512e5f", ribbon: "#f4d03f", accent: "#d4ac0d" },
  fun:      { body: "#27ae60", lid: "#1e8449", ribbon: "#e74c3c", accent: "#f39c12" },
  romantic: { body: "#e91e63", lid: "#c2185b", ribbon: "#fff", accent: "#f8bbd0" },
};
const defaultTheme = BOX_THEMES.classic;

function getThemeColors(themeName) {
  return BOX_THEMES[themeName] || defaultTheme;
}

// simple error boundary for React components
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("ModelErrorBoundary caught:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <mesh>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial color="red" />
        </mesh>
      );
    }
    return this.props.children;
  }
}

/* ─── Resolve model path to full URL ─────────────────── */
function resolveModelUrl(path) {
  if (!path) return null;
  if (path.startsWith("/")) {
    const serverBase = API.defaults.baseURL.replace(/\/api$/, "");
    return serverBase + path;
  }
  return path;
}

/* ─── Safe GLTF Model loader ────────────────────────── */
function SafeModel({ path, scale, position, rotation }) {
  const url = resolveModelUrl(path);
  const [error, setError] = useState(false);

  const gltf = useLoader(
    GLTFLoader,
    url || "data:model/gltf-binary;base64,",
    (loader) => {
      loader.manager.onError = (u) => {
        console.error("Error loading model at", u);
        setError(true);
      };
    }
  );

  if (!url || error) {
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      <Center top>
        <primitive
          object={gltf.scene.clone()}
          scale={scale || 1}
          castShadow
        />
      </Center>
    </group>
  );
}
/* ─── Procedural 3D gift box (no .glb needed) ─────── */
function ProceduralBox({ size = [1.5, 1, 1.5], theme = "classic", position = [0, 0, 0] }) {
  const t = getThemeColors(theme);
  const W = size[0];
  const H = size[1];
  const D = size[2];
  const wallH = H * 0.75;
  const lidH  = H * 0.15;
  const baseH = H * 0.1;
  const baseY = position[1] + baseH / 2;
  const wallY = position[1] + baseH + wallH / 2;
  const lidY  = position[1] + baseH + wallH + lidH / 2;

  return (
    <group position={position}>
      {/* Base */}
      <RoundedBox args={[W, baseH, D]} radius={0.03} position={[0, baseH / 2, 0]} receiveShadow castShadow>
        <meshPhysicalMaterial color={t.body} roughness={0.4} metalness={0.08} />
      </RoundedBox>
      {/* Walls */}
      <RoundedBox args={[W, wallH, D]} radius={0.03} position={[0, baseH + wallH / 2, 0]} castShadow>
        <meshPhysicalMaterial color={t.body} roughness={0.35} metalness={0.06} transparent opacity={0.85} />
      </RoundedBox>
      {/* Lid */}
      <RoundedBox args={[W + 0.06, lidH, D + 0.06]} radius={0.04} position={[0, baseH + wallH + lidH / 2, 0]} castShadow>
        <meshPhysicalMaterial color={t.lid} roughness={0.3} metalness={0.1} clearcoat={0.5} />
      </RoundedBox>
      {/* Ribbon horizontal */}
      <RoundedBox args={[W + 0.08, 0.04, 0.1]} radius={0.01} position={[0, baseH + wallH + lidH + 0.02, 0]}>
        <meshPhysicalMaterial color={t.ribbon} roughness={0.3} metalness={0.1} clearcoat={0.6} />
      </RoundedBox>
      {/* Ribbon vertical */}
      <RoundedBox args={[0.1, 0.04, D + 0.08]} radius={0.01} position={[0, baseH + wallH + lidH + 0.02, 0]}>
        <meshPhysicalMaterial color={t.ribbon} roughness={0.3} metalness={0.1} clearcoat={0.6} />
      </RoundedBox>
      {/* Bow knot */}
      <mesh position={[0, baseH + wallH + lidH + 0.08, 0]} castShadow scale={[1, 0.65, 1]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshPhysicalMaterial color={t.accent} roughness={0.25} metalness={0.1} clearcoat={0.8} />
      </mesh>
      {/* Bow loops */}
      <mesh position={[-0.12, baseH + wallH + lidH + 0.1, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <torusGeometry args={[0.1, 0.025, 8, 16, Math.PI]} />
        <meshPhysicalMaterial color={t.ribbon} roughness={0.3} clearcoat={0.6} />
      </mesh>
      <mesh position={[0.12, baseH + wallH + lidH + 0.1, 0]} rotation={[0, Math.PI, -Math.PI / 6]} castShadow>
        <torusGeometry args={[0.1, 0.025, 8, 16, Math.PI]} />
        <meshPhysicalMaterial color={t.ribbon} roughness={0.3} clearcoat={0.6} />
      </mesh>
      {/* Ribbon draping down front/back */}
      <RoundedBox args={[0.08, wallH + baseH, 0.01]} radius={0.003} position={[0, (wallH + baseH) / 2, D / 2 + 0.005]}>
        <meshPhysicalMaterial color={t.ribbon} roughness={0.35} transparent opacity={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.08, wallH + baseH, 0.01]} radius={0.003} position={[0, (wallH + baseH) / 2, -D / 2 - 0.005]}>
        <meshPhysicalMaterial color={t.ribbon} roughness={0.35} transparent opacity={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.01, wallH + baseH, 0.08]} radius={0.003} position={[W / 2 + 0.005, (wallH + baseH) / 2, 0]}>
        <meshPhysicalMaterial color={t.ribbon} roughness={0.35} transparent opacity={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.01, wallH + baseH, 0.08]} radius={0.003} position={[-W / 2 - 0.005, (wallH + baseH) / 2, 0]}>
        <meshPhysicalMaterial color={t.ribbon} roughness={0.35} transparent opacity={0.7} />
      </RoundedBox>
    </group>
  );
}

/* ─── Fallback product item (coloured cube when no .glb) ─ */
const ITEM_COLORS = ["#ff6b6b","#48dbfb","#ff9ff3","#feca57","#54a0ff","#5f27cd","#01a3a4","#f368e0"];
function FallbackProductCube({ position, name, index = 0, rotation }) {
  const color = ITEM_COLORS[index % ITEM_COLORS.length];
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      <RoundedBox args={[0.35, 0.35, 0.35]} radius={0.04} castShadow>
        <meshPhysicalMaterial color={color} roughness={0.3} metalness={0.05} clearcoat={0.6} />
      </RoundedBox>
      {name && (
        <Text position={[0, 0.28, 0]} fontSize={0.07} color="#fff" anchorY="bottom" maxWidth={0.6}>
          {name.slice(0, 14)}
        </Text>
      )}
    </group>
  );
}

function DragGhost({ data, onDrop, onCancel }) {
  const groupRef      = useRef();
  const { raycaster } = useThree();
  const hasMoved      = useRef(false);
  // initialise startXY from the coords captured at the original mousedown
  const startXY       = useRef(
    data._startX != null ? { x: data._startX, y: data._startY } : null
  );

  useFrame(() => {
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const targetPos  = new THREE.Vector3();
    raycaster.ray.intersectPlane(floorPlane, targetPos);
    if (groupRef.current) {
      groupRef.current.position.set(targetPos.x, 0.05, targetPos.z);
    }
  });

  useEffect(() => {
    hasMoved.current = false;

    const handleMove = (e) => {
      if (!hasMoved.current) {
        if (!startXY.current) {
          // first move event — use this as the reference point
          startXY.current = { x: e.clientX, y: e.clientY };
        } else {
          const dx = e.clientX - startXY.current.x;
          const dy = e.clientY - startXY.current.y;
          if (Math.hypot(dx, dy) > 6) hasMoved.current = true;
        }
      }
    };
    const handleUp = () => {
      if (hasMoved.current && groupRef.current) {
        onDrop(groupRef.current.position.toArray());
      } else {
        onCancel();
      }
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup",   handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup",   handleUp);
    };
  }, [onDrop, onCancel]);

  return (
    <group ref={groupRef}>
      <Suspense fallback={<mesh><sphereGeometry args={[0.2]} /><meshStandardMaterial color="yellow" /></mesh>}>
        {(() => {
          const rotation = data.rotation || [0, 0, 0];
          if (data.isBox) {
            return data.modelPath ? (
              <ModelErrorBoundary>
                <SafeModel path={data.modelPath} scale={data.scale} position={[0, 0, 0]} rotation={rotation} />
              </ModelErrorBoundary>
            ) : (
              <ProceduralBox size={data.size || [1.5, 1, 1.5]} theme={data.theme || "classic"} position={[0, 0, 0]} />
            );
          }
          return data.modelPath ? (
            <ModelErrorBoundary>
              <SafeModel path={data.modelPath} scale={data.scale} position={[0, 0, 0]} rotation={rotation} />
            </ModelErrorBoundary>
          ) : (
            <FallbackProductCube position={[0, 0, 0]} name={data.name} rotation={rotation} />
          );
        })()}
      </Suspense>
    </group>
  );
}

/* ─── Selection ring around selected items ────────────── */
function SelectionRing({ position }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.5;
  });
  return (
    <group position={position} ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshBasicMaterial color="#e74c3c" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ─── Rotation Gizmo for selected items ───────────────── */
function RotationGizmo({ position, onRotate }) {
  const handleClick = (axis, dir) => (e) => {
    e.stopPropagation();
    onRotate(axis, dir);
  };

  const y = position[1] + 1.4;

  return (
    <group position={[position[0], y, position[2]]}>
      {/* Left arrow (rotate Y left) */}
      <group position={[-0.55, 0, 0]} onClick={handleClick("y", 1)}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.12, 0.3, 12]} />
          <meshStandardMaterial color="#48dbfb" emissive="#48dbfb" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.2, 0, 0]}>
          <boxGeometry args={[0.15, 0.06, 0.06]} />
          <meshStandardMaterial color="#48dbfb" emissive="#48dbfb" emissiveIntensity={0.3} />
        </mesh>
        {/* Invisible hit area */}
        <mesh visible={false}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      {/* Right arrow (rotate Y right) */}
      <group position={[0.55, 0, 0]} onClick={handleClick("y", -1)}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.12, 0.3, 12]} />
          <meshStandardMaterial color="#48dbfb" emissive="#48dbfb" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[-0.2, 0, 0]}>
          <boxGeometry args={[0.15, 0.06, 0.06]} />
          <meshStandardMaterial color="#48dbfb" emissive="#48dbfb" emissiveIntensity={0.3} />
        </mesh>
        <mesh visible={false}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      {/* Label */}
      <Text position={[0, 0.32, 0]} fontSize={0.12} color="#48dbfb" anchorY="bottom" fontWeight="bold">
        ↺ Rotate ↻
      </Text>
    </group>
  );
}

/* ─── Scene Item wrapper (with pointer interaction) ───── */
function SceneItem({ item, idx, isSelected, onSelect, onGrab }) {
  const [hovered, setHovered] = useState(false);
  const rotation = item.rotation || [0, 0, 0];

  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "auto"; }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button === 2 || e.ctrlKey || e.metaKey) {
          onSelect(item);
          return;
        }
        if (onGrab) onGrab({ ...item, _startX: e.nativeEvent.clientX, _startY: e.nativeEvent.clientY });
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item);
      }}
    >
      {(hovered || isSelected) && <SelectionRing position={item.pos || [0, 0, 0]} />}
      {item.isBox ? (
        item.modelPath ? (
          <ModelErrorBoundary>
            <SafeModel path={item.modelPath} scale={item.scale} position={item.pos} rotation={rotation} />
          </ModelErrorBoundary>
        ) : (
          <ProceduralBox size={item.size || [1.5, 1, 1.5]} theme={item.theme || "classic"} position={item.pos || [0, 0, 0]} />
        )
      ) : (
        item.modelPath ? (
          <ModelErrorBoundary>
            <SafeModel path={item.modelPath} scale={item.scale} position={item.pos} rotation={rotation} />
          </ModelErrorBoundary>
        ) : (
          <FallbackProductCube position={item.pos || [0, 0, 0]} name={item.name} index={idx} rotation={rotation} />
        )
      )}
    </group>
  );
}

export function BoxScene({ activeBox, setActiveBox, items, setItemsInScene, draggedItem, setDraggedItem, onGrab, selectedItemId, onSelectItem, onRotateItem }) {
  const finalizeDrop = useCallback((finalPos) => {
    if (!draggedItem) return;
    if (draggedItem.isBox) {
      setActiveBox({ ...draggedItem, pos: finalPos });
    } else {
      setItemsInScene(prev => [...prev, { ...draggedItem, pos: finalPos }]);
    }
    setDraggedItem(null);
  }, [draggedItem, setActiveBox, setItemsInScene, setDraggedItem]);

  const cancelDrop = useCallback(() => {
    if (!draggedItem) return;
    if (draggedItem.pos !== undefined) {
      if (draggedItem.isBox) setActiveBox(draggedItem);
      else setItemsInScene(prev => [...prev, draggedItem]);
    }
    setDraggedItem(null);
  }, [draggedItem, setActiveBox, setItemsInScene, setDraggedItem]);

  const handleCanvasClick = useCallback(() => {
    if (onSelectItem) onSelectItem(null);
  }, [onSelectItem]);

  const selectedItem = selectedItemId
    ? items.find(it => it.instanceId === selectedItemId)
      || (activeBox && (activeBox.instanceId === selectedItemId || activeBox._id === selectedItemId) ? activeBox : null)
    : null;

  return (
    <div style={{ width: "100%", height: "100%", background: "#111" }}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [8, 8, 8], fov: 45 }}
        onPointerMissed={handleCanvasClick}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
          <Grid infiniteGrid sectionSize={1} fadeDistance={30} color="#444" />

          {/* Active box */}
          {activeBox && (
            <SceneItem
              key={activeBox.instanceId || activeBox._id || "active-box"}
              item={{ ...activeBox, isBox: true }}
              idx={-1}
              isSelected={selectedItemId === (activeBox.instanceId || activeBox._id)}
              onSelect={(it) => onSelectItem && onSelectItem(it.instanceId || it._id)}
              onGrab={(it) => {
                if (onSelectItem) onSelectItem(null);
                onGrab({ ...it, isBox: true });
              }}
            />
          )}

          {/* Items in scene */}
          {items.map((it, idx) => (
            <Suspense key={it.instanceId} fallback={<mesh position={it.pos}><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color="#888" /></mesh>}>
              <SceneItem
                item={it}
                idx={idx}
                isSelected={selectedItemId === it.instanceId}
                onSelect={(sel) => onSelectItem && onSelectItem(sel.instanceId)}
                onGrab={(grabbed) => {
                  if (onSelectItem) onSelectItem(null);
                  onGrab(grabbed);
                }}
              />
            </Suspense>
          ))}

          {/* Rotation gizmo for selected item */}
          {selectedItem && selectedItem.pos && onRotateItem && (
            <RotationGizmo
              position={selectedItem.pos}
              onRotate={(axis, dir) => onRotateItem(selectedItemId, axis, dir)}
            />
          )}

          {draggedItem && <DragGhost data={draggedItem} onDrop={finalizeDrop} onCancel={cancelDrop} />}

          <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={10} blur={2} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls makeDefault enabled={!draggedItem} />
      </Canvas>
    </div>
  );
}

export { SafeModel };
export default BoxScene;

