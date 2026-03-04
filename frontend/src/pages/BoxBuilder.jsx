import React, { useState, useEffect } from "react";
import { BoxScene } from "../3d/BoxScene";
import API from "../api/axios";
import ProductViewer3D from "../3d/ProductViewer3D";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

/* ── tiny CSS injected once ── */
const BB_STYLE = `
@keyframes bb-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes bb-pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(231,76,60,0.4)} 50%{box-shadow:0 0 0 8px rgba(231,76,60,0)} }
.bb-card:hover   { border-color:#e74c3c !important; transform:translateY(-2px); box-shadow:0 6px 24px rgba(231,76,60,0.18) !important; }
.bb-item:hover   { border-color:#e74c3c !important; transform:translateY(-2px); box-shadow:0 4px 16px rgba(231,76,60,0.14) !important; }
.bb-chip-del:hover { background:#e74c3c !important; color:#fff !important; }
.bb-tab-btn:hover  { opacity:0.85; }
.bb-pill { cursor:pointer; border:none; border-radius:99px; padding:4px 11px; font-size:0.69rem; font-weight:700; transition:all 0.18s; white-space:nowrap; }
.bb-pill:hover { filter:brightness(1.15); }
`;

const CATALOG_BOXES = [
  { id: "b1", name: "Gift Box Large", color: "#d4a574", size: [4, 2, 4] },
];

export default function BoxBuilder() {
  const { addToCart, setGiftBox } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [itemsInScene, setItemsInScene] = useState([]);
  const [activeBox,    setActiveBox]    = useState(null);
  const [draggedItem,  setDraggedItem]  = useState(null);
  const [products,     setProducts]     = useState([]);
  const [giftboxes,    setGiftboxes]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [adding,       setAdding]       = useState(false);
  const [addMsg,       setAddMsg]       = useState("");
  const [tab,          setTab]          = useState("boxes"); // "boxes" | "items"
  const [boxFilter,    setBoxFilter]    = useState("all");
  const [itemFilter,   setItemFilter]   = useState("all");

  /* reset filter when switching tabs */
  const handleTabSwitch = (t) => { setTab(t); setBoxFilter("all"); setItemFilter("all"); };

  /* inject animation styles once */
  useEffect(() => {
    if (!document.getElementById("bb-injected-style")) {
      const s = document.createElement("style");
      s.id = "bb-injected-style";
      s.textContent = BB_STYLE;
      document.head.appendChild(s);
    }
  }, []);

  // Fetch products from API
  useEffect(() => {
    API.get("/products")
      .then((res) => setProducts(res.data.map((p) => ({ ...p, modelPath: p.modelPath || "", scale: p.scale || 0.05 }))))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));

    API.get("/giftboxes")
      .then((res) => setGiftboxes(res.data.map((b) => ({
        ...b, modelPath: b.modelPath || "", scale: b.scale || 0.05,
        size: b.size || [4, 2, 4], color: b.color || "#d4a574",
      }))))
      .catch(() => setGiftboxes([]));
  }, []);

  const startDragging = (item, isBox = false, e) => {
    if (!isBox && !item.modelPath) return;
    setDraggedItem({ ...item, instanceId: Date.now(), isBox, _startX: e?.clientX, _startY: e?.clientY });
  };

  const grabExisting = (item) => {
    if (item.isBox) setActiveBox(null);
    else setItemsInScene((p) => p.filter((it) => it.instanceId !== item.instanceId));
    setDraggedItem(item);
  };

  const removeBox  = () => setActiveBox(null);
  const removeItem = (instanceId) => setItemsInScene((p) => p.filter((it) => it.instanceId !== instanceId));

  const boxPrice   = activeBox?.basePrice || 0;
  const itemsTotal = itemsInScene.reduce((s, it) => s + (it.price || 0), 0);
  const grandTotal = boxPrice + itemsTotal;
  const canAdd     = activeBox || itemsInScene.length > 0;

  const handleAddToCart = async () => {
    if (!user) return navigate("/login");
    if (!canAdd) return;
    setAdding(true); setAddMsg("");
    try {
      if (activeBox?._id) await setGiftBox(activeBox._id);
      const qtyMap = {};
      for (const it of itemsInScene) qtyMap[it._id] = (qtyMap[it._id] || 0) + 1;
      for (const [id, qty] of Object.entries(qtyMap)) await addToCart(id, qty);
      localStorage.setItem("gifty_scene_snapshot", JSON.stringify({ activeBox, itemsInScene }));
      setAddMsg("✅ Added to cart!");
      setTimeout(() => navigate("/cart"), 900);
    } catch { setAddMsg("❌ Something went wrong."); }
    finally  { setAdding(false); }
  };

  /* ── design tokens ── */
  const C = {
    bg:      "#0d0d14",
    sidebar: "rgba(15,15,26,0.98)",
    card:    "rgba(255,255,255,0.04)",
    border:  "rgba(255,255,255,0.08)",
    red:     "#e74c3c",
    gold:    "#f39c12",
    green:   "#27ae60",
    text:    "#f0f0f5",
    muted:   "#6b6b88",
  };

  const allBoxes = giftboxes.length > 0 ? giftboxes : CATALOG_BOXES;

  /* ── filter helpers ── */
  const CATEGORY_ICONS = { graduation:"🎓", wedding:"💍", birthday:"🎂", general:"🛍️" };
  const THEME_ICONS    = { graduation:"🎓", wedding:"💍", birthday:"🎂", general:"📦", luxury:"✨", kids:"🧸" };

  const boxThemes    = ["all", ...new Set(allBoxes.map((b) => b.theme || "general"))];
  const itemCategories = ["all", ...new Set(products.map((p) => p.category || "general"))];

  const visibleBoxes = boxFilter  === "all" ? allBoxes  : allBoxes.filter((b) => (b.theme||"general")  === boxFilter);
  const visibleItems = itemFilter === "all" ? products  : products.filter((p) => (p.category||"general") === itemFilter);

  return (
    <div style={{ display:"flex", height:"100vh", width:"100vw", background:C.bg, color:C.text, overflow:"hidden", fontFamily:"inherit" }}>

      {/* ════════════════════════ SIDEBAR ════════════════════════ */}
      <div style={{
        width:"300px", background:C.sidebar,
        borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column",
        zIndex:10, overflow:"hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:"20px 20px 14px",
          background:"linear-gradient(135deg,rgba(231,76,60,0.12),rgba(255,112,67,0.06))",
          borderBottom:`1px solid ${C.border}`,
          flexShrink:0,
        }}>
          {/* logo row */}
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px" }}>
            <div style={{
              width:38, height:38, borderRadius:10, flexShrink:0,
              background:"linear-gradient(135deg,#e74c3c,#ff7043)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"1.15rem",
            }}>🎁</div>
            <div>
              <div style={{ fontWeight:800, fontSize:"1.05rem", letterSpacing:"-0.3px" }}>Gift Studio</div>
              <div style={{ fontSize:"0.7rem", color:C.muted }}>Craft the perfect gift</div>
            </div>
          </div>

          {/* progress steps */}
          <div style={{ display:"flex", gap:"8px" }}>
            {[
              { n:"1", label:"Pick Box",   done:!!activeBox },
              { n:"2", label:"Add Items",  done:itemsInScene.length > 0 },
              { n:"3", label:"Checkout",   done:addMsg.startsWith("✅") },
            ].map(({ n, label, done }) => (
              <div key={n} style={{ flex:1 }}>
                <div style={{
                  height:3, borderRadius:99, marginBottom:5,
                  background: done ? C.green : n==="1" && !activeBox ? "rgba(231,76,60,0.4)" : "rgba(255,255,255,0.08)",
                  transition:"background 0.4s",
                }} />
                <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                  <div style={{
                    width:16, height:16, borderRadius:"50%", flexShrink:0,
                    background: done ? C.green : "rgba(255,255,255,0.1)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"0.58rem", fontWeight:800, color: done ? "#fff" : C.muted,
                    transition:"background 0.3s",
                  }}>{done ? "✓" : n}</div>
                  <span style={{ fontSize:"0.62rem", color: done ? C.green : C.muted, fontWeight:600 }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display:"flex", padding:"12px 14px 0", gap:"8px", flexShrink:0 }}>
          {[
            { key:"boxes", icon:"📦", label:"Boxes" },
            { key:"items", icon:"🎀", label:"Items" },
          ].map(({ key, icon, label }) => (
            <button key={key} className="bb-tab-btn" onClick={() => handleTabSwitch(key)} style={{
              flex:1, padding:"8px 0", borderRadius:10, border:"none", cursor:"pointer",
              fontWeight:700, fontSize:"0.8rem",
              background: tab===key ? "linear-gradient(135deg,#e74c3c,#ff7043)" : "rgba(255,255,255,0.05)",
              color: tab===key ? "#fff" : C.muted,
              transition:"all 0.2s",
            }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── Scrollable catalog ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px", display:"flex", flexDirection:"column", gap:"10px" }}>

          {tab === "boxes" && (
            <>
              <div style={{ fontSize:"0.68rem", color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:"2px" }}>
                Drag to place
              </div>

              {/* ── Box theme filter pills ── */}
              {boxThemes.length > 1 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"2px" }}>
                  {boxThemes.map((t) => (
                    <button key={t} className="bb-pill" onClick={() => setBoxFilter(t)} style={{
                      background: boxFilter===t ? "linear-gradient(135deg,#e74c3c,#ff7043)" : "rgba(255,255,255,0.06)",
                      color: boxFilter===t ? "#fff" : C.muted,
                      border: boxFilter===t ? "none" : `1px solid ${C.border}`,
                    }}>
                      {THEME_ICONS[t] || "📦"} {t.charAt(0).toUpperCase()+t.slice(1)}
                      <span style={{ marginLeft:"4px", opacity:0.65, fontSize:"0.62rem" }}>
                        {t==="all" ? allBoxes.length : allBoxes.filter((b)=>(b.theme||"general")===t).length}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {visibleBoxes.length === 0 && (
                <div style={{ textAlign:"center", padding:"20px 0", color:C.muted, fontSize:"0.8rem" }}>No boxes in this theme</div>
              )}
              {visibleBoxes.map((b) => (
                <div
                  key={b._id || b.id}
                  className="bb-card"
                  onMouseDown={(e) => startDragging(b, true, e)}
                  style={{
                    background: C.card, borderRadius:14,
                    border:`1.5px solid ${activeBox?._id===b._id||activeBox?.id===b.id ? C.green : C.border}`,
                    overflow:"hidden", cursor:"grab",
                    transition:"all 0.2s", animation:"bb-fadeIn 0.3s both",
                    boxShadow:"0 2px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  <div style={{ height:118, pointerEvents:"none" }}>
                    <ProductViewer3D modelPath={b.modelPath||""} scale={b.scale||1} color={b.color||"#d4a574"} />
                  </div>
                  <div style={{ padding:"8px 12px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:"0.82rem" }}>📦 {b.name}</div>
                      {b.basePrice > 0 && <div style={{ color:C.gold, fontSize:"0.74rem", fontWeight:700 }}>${b.basePrice.toFixed(2)}</div>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"3px" }}>
                      <div style={{ fontSize:"0.64rem", color:C.muted, background:"rgba(255,255,255,0.05)", padding:"3px 7px", borderRadius:99 }}>drag</div>
                      {b.theme && (
                        <div style={{ fontSize:"0.6rem", color:"rgba(231,76,60,0.75)", background:"rgba(231,76,60,0.08)", padding:"2px 6px", borderRadius:99, border:"1px solid rgba(231,76,60,0.2)" }}>
                          {THEME_ICONS[b.theme]||"📦"} {b.theme}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "items" && (
            <>
              <div style={{ fontSize:"0.68rem", color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:"2px" }}>
                Drag into your box
              </div>

              {/* ── Category filter pills ── */}
              {!loading && itemCategories.length > 1 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"2px" }}>
                  {itemCategories.map((cat) => (
                    <button key={cat} className="bb-pill" onClick={() => setItemFilter(cat)} style={{
                      background: itemFilter===cat ? "linear-gradient(135deg,#e74c3c,#ff7043)" : "rgba(255,255,255,0.06)",
                      color: itemFilter===cat ? "#fff" : C.muted,
                      border: itemFilter===cat ? "none" : `1px solid ${C.border}`,
                    }}>
                      {CATEGORY_ICONS[cat]||"🛍️"} {cat.charAt(0).toUpperCase()+cat.slice(1)}
                      <span style={{ marginLeft:"4px", opacity:0.65, fontSize:"0.62rem" }}>
                        {cat==="all" ? products.length : products.filter((p)=>(p.category||"general")===cat).length}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:C.muted }}>
                  <div style={{ fontSize:"1.4rem", marginBottom:"8px" }}>⏳</div>
                  <div style={{ fontSize:"0.82rem" }}>Loading products…</div>
                </div>
              ) : products.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:C.muted, fontSize:"0.82rem" }}>
                  No products found
                </div>
              ) : visibleItems.length === 0 ? (
                <div style={{ textAlign:"center", padding:"24px 0", color:C.muted, fontSize:"0.8rem" }}>
                  No items in this category
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"9px" }}>
                  {visibleItems.map((p) => (
                    <div
                      key={p._id}
                      className="bb-item"
                      onMouseDown={(e) => startDragging(p, false, e)}
                      style={{
                        background:C.card, borderRadius:12,
                        border:`1px solid ${C.border}`,
                        overflow:"hidden", cursor:"grab",
                        transition:"all 0.2s",
                        boxShadow:"0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      <div style={{ height:86, pointerEvents:"none" }}>
                        <ProductViewer3D modelPath={p.modelPath||""} scale={p.scale||1} color="#e74c3c" />
                      </div>
                      <div style={{ padding:"4px 8px 8px", textAlign:"center" }}>
                        <div style={{ fontSize:"0.67rem", color:"#ccc", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                        <div style={{ color:C.gold, fontSize:"0.69rem", fontWeight:700 }}>${(p.price||0).toFixed(2)}</div>
                        {p.category && (
                          <div style={{ fontSize:"0.58rem", color:"rgba(231,76,60,0.65)", marginTop:"2px" }}>
                            {CATEGORY_ICONS[p.category]||"🛍️"} {p.category}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Tip ── */}
        <div style={{
          margin:"0 14px 14px",
          padding:"9px 12px",
          background:"rgba(231,76,60,0.07)",
          borderRadius:10,
          border:"1px solid rgba(231,76,60,0.18)",
          fontSize:"0.7rem", color:"rgba(231,76,60,0.85)",
          flexShrink:0, lineHeight:1.55,
        }}>
          💡 <b>Step 1:</b> Drag a <b>box</b> onto the stage. <b>Step 2:</b> Drag items inside it. Hit <b>✕</b> in the bar below to remove anything.
        </div>
      </div>

      {/* ════════════════════════ MAIN AREA ════════════════════════ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" }}>

        {/* Empty state overlay */}
        {!activeBox && itemsInScene.length === 0 && !draggedItem && (
          <div style={{
            position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-60%)",
            textAlign:"center", pointerEvents:"none", zIndex:5, animation:"bb-fadeIn 0.6s both",
          }}>
            <div style={{ fontSize:"5rem", opacity:0.12, marginBottom:"12px" }}>🎁</div>
            <div style={{ fontSize:"1.05rem", fontWeight:700, color:"rgba(255,255,255,0.13)" }}>Your stage is empty</div>
            <div style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.07)", marginTop:"6px" }}>Drag a box from the sidebar to begin</div>
          </div>
        )}

        {/* Subtle top gradient accent */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:"3px",
          background:"linear-gradient(90deg,transparent,#e74c3c,#ff7043,transparent)",
          zIndex:6, pointerEvents:"none",
        }} />

        {/* 3-D Scene */}
        <div style={{ flex:1, cursor: draggedItem ? "grabbing" : "default" }}>
          <BoxScene
            activeBox={activeBox}
            setActiveBox={setActiveBox}
            items={itemsInScene}
            setItemsInScene={setItemsInScene}
            draggedItem={draggedItem}
            setDraggedItem={setDraggedItem}
            onGrab={grabExisting}
          />
        </div>

        {/* ════════════ BOTTOM CART BAR ════════════ */}
        <div style={{
          background:"rgba(10,10,18,0.97)",
          backdropFilter:"blur(24px)",
          borderTop:`1px solid ${C.border}`,
          padding:"12px 20px",
          display:"flex", alignItems:"center", gap:"14px",
          flexWrap:"wrap", minHeight:"68px",
          flexShrink:0,
          boxShadow:"0 -4px 32px rgba(0,0,0,0.5)",
        }}>

          {/* Box chip */}
          <div style={{ display:"flex", flexDirection:"column", gap:"3px", minWidth:"110px" }}>
            <span style={{ fontSize:"0.6rem", color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px" }}>Box</span>
            {activeBox ? (
              <div style={{
                display:"flex", alignItems:"center", gap:"6px",
                background:"rgba(39,174,96,0.1)", border:"1px solid rgba(39,174,96,0.28)",
                borderRadius:8, padding:"4px 8px", animation:"bb-fadeIn 0.2s both",
              }}>
                <span style={{ fontSize:"0.76rem", fontWeight:700, color:"#2ecc71" }}>📦 {activeBox.name}</span>
                {activeBox.basePrice > 0 && <span style={{ color:C.gold, fontSize:"0.7rem", fontWeight:700 }}>${activeBox.basePrice.toFixed(2)}</span>}
                <button className="bb-chip-del" onClick={removeBox} title="Remove box" style={{
                  width:17, height:17, borderRadius:"50%",
                  border:"none", background:"rgba(255,255,255,0.1)", color:"#999",
                  cursor:"pointer", fontSize:"0.6rem", fontWeight:800,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.15s", flexShrink:0,
                }}>✕</button>
              </div>
            ) : (
              <span style={{ fontSize:"0.76rem", color:"rgba(255,255,255,0.18)", fontStyle:"italic" }}>None</span>
            )}
          </div>

          <div style={{ width:1, alignSelf:"stretch", background:C.border, flexShrink:0 }} />

          {/* Items chips */}
          <div style={{ flex:1, minWidth:"160px" }}>
            <div style={{ fontSize:"0.6rem", color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"4px" }}>
              Items ({itemsInScene.length})
            </div>
            {itemsInScene.length === 0 ? (
              <span style={{ fontSize:"0.76rem", color:"rgba(255,255,255,0.18)", fontStyle:"italic" }}>No items placed</span>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
                {itemsInScene.map((it) => (
                  <div key={it.instanceId} style={{
                    display:"flex", alignItems:"center", gap:"5px",
                    background:"rgba(231,76,60,0.1)", border:"1px solid rgba(231,76,60,0.22)",
                    borderRadius:8, padding:"3px 7px", animation:"bb-fadeIn 0.2s both",
                  }}>
                    <span style={{ fontSize:"0.73rem", color:C.text, fontWeight:600 }}>{it.name}</span>
                    <span style={{ color:C.gold, fontSize:"0.68rem", fontWeight:700 }}>${(it.price||0).toFixed(2)}</span>
                    <button className="bb-chip-del" onClick={() => removeItem(it.instanceId)} title="Remove" style={{
                      width:16, height:16, borderRadius:"50%",
                      border:"none", background:"rgba(255,255,255,0.08)", color:"#888",
                      cursor:"pointer", fontSize:"0.58rem", fontWeight:800,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"all 0.15s", flexShrink:0,
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ width:1, alignSelf:"stretch", background:C.border, flexShrink:0 }} />

          {/* Total + CTA */}
          <div style={{ display:"flex", alignItems:"center", gap:"16px", flexShrink:0 }}>
            <div>
              <div style={{ fontSize:"0.6rem", color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px" }}>Total</div>
              <div style={{
                fontSize:"1.35rem", fontWeight:900, letterSpacing:"-0.5px",
                background:"linear-gradient(135deg,#f39c12,#e67e22)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              }}>
                ${grandTotal.toFixed(2)}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
              <button
                onClick={handleAddToCart}
                disabled={adding || !canAdd}
                style={{
                  background: !canAdd ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#e74c3c,#ff7043)",
                  color: !canAdd ? "rgba(255,255,255,0.18)" : "#fff",
                  border:"none", borderRadius:11,
                  padding:"10px 22px",
                  fontWeight:800, fontSize:"0.86rem",
                  cursor: !canAdd ? "not-allowed" : "pointer",
                  transition:"all 0.2s",
                  boxShadow: canAdd ? "0 4px 18px rgba(231,76,60,0.35)" : "none",
                  whiteSpace:"nowrap",
                  animation: canAdd && !adding ? "bb-pulse 2.8s infinite" : "none",
                }}
              >
                {adding ? "Adding…" : "🛒 Add to Cart"}
              </button>
              {addMsg && (
                <span style={{
                  fontSize:"0.7rem", fontWeight:700,
                  color: addMsg.startsWith("✅") ? "#2ecc71" : C.red,
                  animation:"bb-fadeIn 0.2s both",
                }}>
                  {addMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}