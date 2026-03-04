import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, useGLTF, Center, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import API from "../api/axios";

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

// مكون التحميل الآمن
function SafeModel({ path, scale, position }) {
  if (!path) {
    console.warn("SafeModel called without path");
    return null;
  }

  // ensure we load from the backend server if path is relative
  let url = path;
  if (url.startsWith("/")) {
    const serverBase = API.defaults.baseURL.replace(/\/api$/, "");
    url = serverBase + url;
  }
  console.log("SafeModel loading url", url);

  const [error, setError] = React.useState(false);
  // useLoader allows us to attach error handler
  const { scene } = useLoader(
    GLTFLoader,
    url,
    (loader) => {
      loader.manager.onError = (u) => {
        console.error("Error loading model at", u);
        setError(true);
      };
    }
  );

  if (error) {
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  return (
    <group position={position}>
      {/* Center top تجعل أسفل الموديل يلمس النقطة [0,0,0] بالضبط */}
      <Center top>
        <primitive 
          object={scene.clone()} 
          scale={scale || 1} 
          castShadow 
        />
      </Center>
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
        {data.isBox ? (
          data.modelPath ? (
            <ModelErrorBoundary>
              <SafeModel path={data.modelPath} scale={data.scale} position={[0, 0, 0]} />
            </ModelErrorBoundary>
          ) : (
            <mesh>
              <boxGeometry args={[data.size?.[0] || 1, 0.1, data.size?.[2] || 1]} />
              <meshStandardMaterial color={data.color || "#fff"} />
            </mesh>
          )
        ) : (
          <ModelErrorBoundary>
            <SafeModel path={data.modelPath} scale={data.scale} position={[0, 0, 0]} />
          </ModelErrorBoundary>
        )}
      </Suspense>
    </group>
  );
}

export function BoxScene({ activeBox, setActiveBox, items, setItemsInScene, draggedItem, setDraggedItem, onGrab }) {
  const finalizeDrop = (finalPos) => {
    if (!draggedItem) return;
    if (draggedItem.isBox) {
      setActiveBox({ ...draggedItem, pos: finalPos });
    } else {
      setItemsInScene(prev => [...prev, { ...draggedItem, pos: finalPos }]);
    }
    setDraggedItem(null);
  };

  // called when user clicks without dragging — restore the item to where it was
  const cancelDrop = () => {
    if (!draggedItem) return;
    if (draggedItem.pos !== undefined) {
      // item was grabbed from the scene — put it back
      if (draggedItem.isBox) setActiveBox(draggedItem);
      else setItemsInScene(prev => [...prev, draggedItem]);
    }
    // if no pos it was a fresh drag from sidebar — just discard
    setDraggedItem(null);
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "#111" }}>
      <Canvas shadows camera={{ position: [8, 8, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
          <Grid infiniteGrid sectionSize={1} fadeDistance={30} color="#444" />

          {/* العلبة الأساسية */}
          {activeBox && (
            activeBox.modelPath ? (
              <ModelErrorBoundary>
                <group
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (onGrab) onGrab({ ...activeBox, isBox: true, _startX: e.nativeEvent.clientX, _startY: e.nativeEvent.clientY });
                  }}
                >
                  <SafeModel path={activeBox.modelPath} scale={activeBox.scale} position={activeBox.pos || [0,0,0]} />
                </group>
              </ModelErrorBoundary>
            ) : (
              <mesh
                position={activeBox.pos || [0, 0, 0]}
                receiveShadow
                onPointerDown={(e) => { e.stopPropagation(); if (onGrab) onGrab({ ...activeBox, isBox: true, _startX: e.nativeEvent.clientX, _startY: e.nativeEvent.clientY }); }}
              >
                <boxGeometry args={[activeBox.size[0], 0.1, activeBox.size[2]]} />
                <meshStandardMaterial color={activeBox.color} />
              </mesh>
            )
          )}

          {/* المنتجات في المشهد */}
          {items.map((it) => (
            <Suspense key={it.instanceId} fallback={<mesh position={it.pos}><boxGeometry args={[0.2, 0.2, 0.2]} /></mesh>}>
              <group
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (onGrab) onGrab({ ...it, _startX: e.nativeEvent.clientX, _startY: e.nativeEvent.clientY });
                }}
              >
                {it.isBox ? (
                  it.modelPath ? (
                    <ModelErrorBoundary>
                      <SafeModel path={it.modelPath} scale={it.scale} position={it.pos} />
                    </ModelErrorBoundary>
                  ) : (
                    <mesh position={it.pos}>
                      <boxGeometry args={[it.size[0], 0.1, it.size[2]]} />
                      <meshStandardMaterial color={it.color} />
                    </mesh>
                  )
                ) : (
                  <ModelErrorBoundary>
                    <SafeModel path={it.modelPath} scale={it.scale} position={it.pos} />
                  </ModelErrorBoundary>
                )}
              </group>
            </Suspense>
          ))}

          {draggedItem && <DragGhost data={draggedItem} onDrop={finalizeDrop} onCancel={cancelDrop} />}
          
          <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={10} blur={2} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls makeDefault enabled={!draggedItem} />
      </Canvas>
    </div>
  );
}

// helper export for reuse in previews
export { SafeModel };
export default BoxScene;

