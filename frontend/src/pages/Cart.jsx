/*
 * Cart Page
 * ---------
 * Left side:  list of cart items with quantity controls
 * Right side: 3D gift box preview (the cool part!)
 */

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import CartItem from "../components/CartItem";
import BoxScene from "../3d/BoxScene";

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
            <BoxScene items={cart.items} />
          </div>
        )}
      </div>
    </div>
  );
}
