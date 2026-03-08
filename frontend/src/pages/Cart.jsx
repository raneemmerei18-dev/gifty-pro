/*
 * Cart Page
 * ---------
 * Left side:  list of cart items with quantity controls
 * Right side: 3D gift box preview (the cool part!)
 */

import { Suspense, useRef, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import CartItem from "../components/CartItem";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, Text, Center, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import API from "../api/axios";

/* ─── Resolve model URL ──────────────────────────────── */
function resolveModelUrl(path) {
  if (!path) return null;
  if (path.startsWith("/")) {
    const serverBase = API.defaults.baseURL.replace(/\/api$/, "");
    return serverBase + path;
  }
  return path;
}

/* ─── Item colors ────────────────────────────────────── */
const ITEM_COLORS = [
  "#ff6b6b", "#48dbfb", "#ff9ff3", "#feca57",
  "#54a0ff", "#5f27cd", "#01a3a4", "#f368e0",
];

/* ─── Load a GLTF model and auto-fit within box bounds ─ */
const BOX_W = 1.8;   // usable interior width
const BOX_H = 1.0;   // max item height inside box
const BOX_D = 1.8;   // usable interior depth

function BoundedItemModel({ path, baseScale, position, maxW, maxH, maxD }) {
  const url = resolveModelUrl(path);
  const [error, setError] = useState(false);
  const groupRef = useRef();

  const gltf = useLoader(
    GLTFLoader,
    url || "data:model/gltf-binary;base64,",
    (loader) => {
      loader.manager.onError = () => setError(true);
    }
  );

  /* Compute the scale that fits the model within the allowed bounds */
  const fitScale = useMemo(() => {
    if (!gltf?.scene || !url || error) return baseScale || 0.5;
    const clone = gltf.scene.clone();
    clone.scale.setScalar(baseScale || 1);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());

    const allowW = maxW || 0.55;
    const allowH = maxH || BOX_H;
    const allowD = maxD || 0.55;

    const sx = size.x > 0 ? allowW / size.x : 1;
    const sy = size.y > 0 ? allowH / size.y : 1;
    const sz = size.z > 0 ? allowD / size.z : 1;
    const fit = Math.min(sx, sy, sz, 1); // never scale up

    return (baseScale || 1) * fit;
  }, [gltf, baseScale, maxW, maxH, maxD, url, error]);

  if (!url || error) return null;

  return (
    <group position={position} ref={groupRef}>
      <primitive object={gltf.scene.clone()} scale={fitScale} castShadow />
    </group>
  );
}

/* ─── Fallback cube for items without models ─────────── */
function FallbackItem({ position, name, color, size }) {
  return (
    <group position={position}>
      <RoundedBox args={size} radius={0.03} smoothness={4} castShadow>
        <meshPhysicalMaterial color={color} roughness={0.3} metalness={0.08} clearcoat={0.7} />
      </RoundedBox>
      <RoundedBox args={[size[0] + 0.005, 0.02, size[2] + 0.005]} radius={0.005} position={[0, size[1] / 2 + 0.01, 0]}>
        <meshStandardMaterial color="#fff" transparent opacity={0.4} />
      </RoundedBox>
      {name && (
        <Text position={[0, size[1] / 2 + 0.06, 0]} fontSize={0.06} color="#555" anchorY="bottom" maxWidth={0.5}>
          {name.slice(0, 12)}
        </Text>
      )}
    </group>
  );
}

/* ─── Gift box with real items inside ────────────────── */
function GiftBoxPreview({ items = [], giftBox }) {
  const groupRef = useRef();
  const boxColor = giftBox?.color || "#d4a574";
  const ribbonColor = "#e74c3c";

  /* Slow auto-rotate */
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.2;
  });

  /* Expand items by quantity & compute positions */
  const expandedItems = useMemo(() => {
    const flat = [];
    items.forEach((item) => {
      const qty = item.quantity || 1;
      for (let q = 0; q < qty; q++) flat.push(item);
    });
    return flat;
  }, [items]);

  const itemPositions = useMemo(() => {
    const n = expandedItems.length;
    if (n === 0) return [];
    const cols = Math.min(n, 3);
    const rows = Math.ceil(n / cols);
    // Shrink cells when more items to avoid crowding
    const scaleFactor = n <= 3 ? 1 : n <= 6 ? 0.8 : 0.65;
    const cellW = 0.55 * scaleFactor;
    const cellD = 0.55 * scaleFactor;
    // Max dimension each item is allowed
    const itemMaxW = (BOX_W / cols) * 0.85;
    const itemMaxD = (BOX_D / rows) * 0.85;
    const itemMaxH = BOX_H * (n <= 3 ? 0.85 : 0.7);

    return expandedItems.map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * cellW;
      const z = (row - (rows - 1) / 2) * cellD;
      const sizeVar = 0.26 * scaleFactor;
      const h = 0.30 * scaleFactor;
      return { x, z, size: [sizeVar, h, sizeVar], color: ITEM_COLORS[i % ITEM_COLORS.length], maxW: itemMaxW, maxH: itemMaxH, maxD: itemMaxD };
    });
  }, [expandedItems]);

  const W = 2, H = 1.2, TOP = H / 2, BOT = -0.6;

  return (
    <group ref={groupRef}>
      {/* Box base */}
      <RoundedBox args={[W, 0.12, W]} radius={0.03} position={[0, BOT, 0]} receiveShadow>
        <meshPhysicalMaterial color={boxColor} roughness={0.4} metalness={0.1} />
      </RoundedBox>

      {/* Box walls (transparent) */}
      {[[0, 0, W / 2, 0], [0, 0, -W / 2, Math.PI], [-W / 2, 0, 0, Math.PI / 2], [W / 2, 0, 0, -Math.PI / 2]].map(([x, y, z, ry], i) => (
        <mesh key={`w${i}`} position={[x, 0, z]} rotation={[0, ry, 0]}>
          <planeGeometry args={[W, H]} />
          <meshPhysicalMaterial color={boxColor} transparent opacity={0.18} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Wireframe edges */}
      <mesh>
        <boxGeometry args={[W, H, W]} />
        <meshBasicMaterial color={boxColor} wireframe transparent opacity={0.3} />
      </mesh>

      {/* Ribbon cross on top */}
      <RoundedBox args={[W + 0.06, 0.035, 0.12]} radius={0.01} position={[0, TOP + 0.018, 0]}>
        <meshPhysicalMaterial color={ribbonColor} roughness={0.35} metalness={0.08} clearcoat={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.035, W + 0.06]} radius={0.01} position={[0, TOP + 0.018, 0]}>
        <meshPhysicalMaterial color={ribbonColor} roughness={0.35} metalness={0.08} clearcoat={0.6} />
      </RoundedBox>

      {/* Ribbon draping down sides */}
      {[
        { p: [0, 0, W / 2 + 0.008], a: [0.1, H, 0.01] },
        { p: [0, 0, -(W / 2 + 0.008)], a: [0.1, H, 0.01] },
        { p: [W / 2 + 0.008, 0, 0], a: [0.01, H, 0.1] },
        { p: [-(W / 2 + 0.008), 0, 0], a: [0.01, H, 0.1] },
      ].map(({ p, a }, i) => (
        <RoundedBox key={`rd${i}`} args={a} radius={0.004} position={p}>
          <meshPhysicalMaterial color="#b0383a" roughness={0.35} clearcoat={0.5} />
        </RoundedBox>
      ))}

      {/* Bow knot */}
      <mesh position={[0, TOP + 0.09, 0]} castShadow scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshPhysicalMaterial color="#b0383a" roughness={0.25} clearcoat={0.8} />
      </mesh>
      {/* Bow loops */}
      <mesh position={[-0.15, TOP + 0.12, 0]} rotation={[0, 0, Math.PI / 5]} castShadow>
        <torusGeometry args={[0.1, 0.028, 8, 16, Math.PI]} />
        <meshPhysicalMaterial color={ribbonColor} roughness={0.3} clearcoat={0.6} />
      </mesh>
      <mesh position={[0.15, TOP + 0.12, 0]} rotation={[0, Math.PI, -Math.PI / 5]} castShadow>
        <torusGeometry args={[0.1, 0.028, 8, 16, Math.PI]} />
        <meshPhysicalMaterial color={ribbonColor} roughness={0.3} clearcoat={0.6} />
      </mesh>

      {/* Floor glow */}
      <mesh position={[0, BOT - 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial color="#e74c3c" transparent opacity={0.04} />
      </mesh>

      {/* ── Items inside the box ── */}
      <group>
        {expandedItems.map((item, i) => {
          const ip = itemPositions[i];
          if (!ip) return null;
          const product = item.product;
          // Place items sitting on the box floor
          const floorY = BOT + 0.57;
          const pos = [ip.x, floorY, ip.z];

          if (product?.modelPath) {
            return (
              <Suspense key={`item-${i}`} fallback={
                <FallbackItem position={pos} name={product.name} color={ip.color} size={ip.size} />
              }>
                <BoundedItemModel
                  path={product.modelPath}
                  baseScale={product.scale || 0.5}
                  position={pos}
                  maxW={ip.maxW}
                  maxH={ip.maxH}
                  maxD={ip.maxD}
                />
              </Suspense>
            );
          }
          return (
            <FallbackItem key={`item-${i}`} position={pos} name={product?.name} color={ip.color} size={ip.size} />
          );
        })}
      </group>

      {/* Empty state */}
      {items.length === 0 && (
        <Text position={[0, 0, 0]} fontSize={0.14} color="#aaa" anchorY="middle">
          Add items to see them here!
        </Text>
      )}
    </group>
  );
}

export default function Cart() {
  const { cart, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="page">
        <p>Please <Link to="/login">login</Link> to see your cart.</p>
      </div>
    );
  }

  return (
    <div className="page cart-page">
      <div className="cart-layout">
        {/* ── Left: Cart Items ────────────────────────── */}
        <div className="cart-list">
          <h2>Your Cart</h2>

          {cart.items?.length === 0 && !cart.giftBox ? (
            <p className="muted">
              Your cart is empty. <Link to="/products">Browse gifts</Link>
            </p>
          ) : (
            <>
              {/* Gift box row */}
              {cart.giftBox && (
                <div className="cart-giftbox-row">
                  <span className="cgb-icon">📦</span>
                  <div className="cgb-info">
                    <span className="cgb-name">{cart.giftBox.name}</span>
                    <span className="cgb-tag">Gift Box</span>
                  </div>
                  <span className="cgb-price">${(cart.giftBox.basePrice || 0).toFixed(2)}</span>
                </div>
              )}

              {cart.items.map((item) => (
                <CartItem key={item._id} item={item} />
              ))}

              <div className="cart-summary">
                {cart.giftBox && (
                  <p className="total" style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "2px" }}>
                    Items: <strong>${(totalPrice - (cart.giftBox?.basePrice || 0)).toFixed(2)}</strong>
                    &nbsp;&nbsp;Box: <strong>${(cart.giftBox?.basePrice || 0).toFixed(2)}</strong>
                  </p>
                )}
                <p className="total">
                  Total: <strong>${totalPrice.toFixed(2)}</strong>
                </p>
                <div className="cart-actions">
                  <button className="btn btn-secondary" onClick={clearCart}>
                    Clear Cart
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate("/checkout")}
                  >
                    Checkout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right: 3D Gift Box Preview ──────────────── */}
        {cart.items?.length > 0 && (
          <div className="cart-3d">
            <h3>🎁 Gift Box Preview</h3>
            <div style={{ width: "100%", height: 380, borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg, #fdf6f0 0%, #fef0e6 100%)" }}>
              <Canvas
                shadows
                camera={{ position: [3, 3.5, 3], fov: 42 }}
                style={{ width: "100%", height: "100%" }}
              >
                <Suspense fallback={null}>
                  <ambientLight intensity={0.9} />
                  <pointLight position={[5, 8, 5]} intensity={1.2} castShadow />
                  <directionalLight position={[-3, 5, -3]} intensity={0.4} />
                  <GiftBoxPreview items={cart.items} giftBox={cart.giftBox} />
                  <ContactShadows position={[0, -0.66, 0]} opacity={0.35} scale={5} blur={2.5} />
                  <Environment preset="city" />
                </Suspense>
                <OrbitControls
                  enablePan={false}
                  enableZoom={true}
                  minDistance={2.5}
                  maxDistance={7}
                  minPolarAngle={Math.PI / 6}
                  maxPolarAngle={Math.PI / 2.2}
                  autoRotate={false}
                />
              </Canvas>
            </div>
            <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 8 }}>
              🖱️ Drag to rotate • Scroll to zoom
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
