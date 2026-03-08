/*
 * Checkout – Modern checkout with Visa card preview
 * The card mockup updates live as the user types.
 */

import { useState, useMemo } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

/* city → delivery days mapping (Lebanon) */
const CITY_DAYS = {
  saida: 1,
  beirut: 3,
  tyre: 2,
  zahle: 3,
  tripoli: 4,
  akkar: 4,
  baalbek: 4,
};
const CITIES = Object.keys(CITY_DAYS);

/* given a city, return the delivery date string (YYYY-MM-DD) */
const getDeliveryDate = (city) => {
  const days = CITY_DAYS[city.toLowerCase()];
  if (!days) return "";
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

/* format card number with spaces every 4 digits */
const fmtCard = (v) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

/* format expiry as MM/YY */
const fmtExpiry = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
};

export default function Checkout() {
  const { totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  /* delivery form */
  const [delivery, setDelivery] = useState({
    name: "", phone: "", city: "", address: "", date: "",
  });

  /* card form */
  const [card, setCard] = useState({
    number: "", holder: "", expiry: "", cvv: "",
  });
  const [flipped, setFlipped] = useState(false);

  const [payMethod, setPayMethod] = useState("card"); // card | cod
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleDelivery = (e) => {
    const { name, value } = e.target;
    if (name === "city") {
      const date = getDeliveryDate(value);
      setDelivery({ ...delivery, city: value, date });
    } else {
      setDelivery({ ...delivery, [name]: value });
    }
  };

  /* human-readable delivery estimate */
  const deliveryDays = CITY_DAYS[delivery.city.toLowerCase()] || null;

  const handleCard = (e) => {
    const { name, value } = e.target;
    if (name === "number") setCard({ ...card, number: fmtCard(value) });
    else if (name === "expiry") setCard({ ...card, expiry: fmtExpiry(value) });
    else if (name === "cvv") setCard({ ...card, cvv: value.replace(/\D/g, "").slice(0, 3) });
    else setCard({ ...card, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await API.post("/orders", { delivery });
      await clearCart();
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Checkout failed");
    }
  };

  /* ── Success screen ─────────────────────────── */
  if (success) {
    return (
      <div className="page confirmation">
        <div className="confirm-icon">✅</div>
        <h2>Order Placed!</h2>
        <p>Your gift is on its way. Thank you for using Gifty!</p>
        <button className="btn btn-primary" onClick={() => navigate("/orders")}>
          View My Orders
        </button>
      </div>
    );
  }

  const displayNumber = card.number || "•••• •••• •••• ••••";
  const displayHolder = card.holder || "YOUR NAME";
  const displayExpiry = card.expiry || "MM/YY";

  return (
    <div className="page checkout-page">
      <div className="checkout-header">
        <h2>💳 Secure Checkout</h2>
        <p className="page-subtitle">Complete your order — ${totalPrice.toFixed(2)}</p>
      </div>

      <div className="checkout-layout">
        {/* ── Left: Card preview + payment method ──── */}
        <div className="checkout-card-section">
          {/* Visa card mockup */}
          <div className={`credit-card-wrapper ${flipped ? "flipped" : ""}`}>
            {/* Front */}
            <div className="credit-card cc-front">
              <div className="cc-row-top">
                <div className="cc-chip">
                  <div className="cc-chip-line"></div>
                  <div className="cc-chip-line"></div>
                  <div className="cc-chip-line"></div>
                </div>
                <div className="cc-brand">VISA</div>
              </div>
              <div className="cc-number">{displayNumber}</div>
              <div className="cc-row-bottom">
                <div className="cc-field">
                  <span className="cc-label">Card Holder</span>
                  <span className="cc-value">{displayHolder}</span>
                </div>
                <div className="cc-field">
                  <span className="cc-label">Expires</span>
                  <span className="cc-value">{displayExpiry}</span>
                </div>
              </div>
            </div>
            {/* Back */}
            <div className="credit-card cc-back">
              <div className="cc-mag-strip"></div>
              <div className="cc-cvv-strip">
                <span className="cc-cvv-label">CVV</span>
                <span className="cc-cvv-value">{card.cvv || "•••"}</span>
              </div>
              <div className="cc-back-brand">VISA</div>
            </div>
          </div>

          {/* Payment method toggle */}
          <div className="pay-method-toggle">
            <button
              className={`pay-tab ${payMethod === "card" ? "active" : ""}`}
              onClick={() => setPayMethod("card")}
              type="button"
            >💳 Credit Card</button>
            <button
              className={`pay-tab ${payMethod === "cod" ? "active" : ""}`}
              onClick={() => setPayMethod("cod")}
              type="button"
            >🚚 Cash on Delivery</button>
          </div>

          {/* Card inputs (only when card) */}
          {payMethod === "card" && (
            <div className="card-fields">
              <div className="card-field-full">
                <label>Card Number</label>
                <input
                  name="number"
                  placeholder="1234 5678 9012 3456"
                  value={card.number}
                  onChange={handleCard}
                  onFocus={() => setFlipped(false)}
                  maxLength={19}
                />
              </div>
              <div className="card-field-full">
                <label>Cardholder Name</label>
                <input
                  name="holder"
                  placeholder="John Doe"
                  value={card.holder}
                  onChange={handleCard}
                  onFocus={() => setFlipped(false)}
                />
              </div>
              <div className="card-field-row">
                <div className="card-field-half">
                  <label>Expiry</label>
                  <input
                    name="expiry"
                    placeholder="MM/YY"
                    value={card.expiry}
                    onChange={handleCard}
                    onFocus={() => setFlipped(false)}
                    maxLength={5}
                  />
                </div>
                <div className="card-field-half">
                  <label>CVV</label>
                  <input
                    name="cvv"
                    placeholder="123"
                    value={card.cvv}
                    onChange={handleCard}
                    onFocus={() => setFlipped(true)}
                    maxLength={3}
                    type="password"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Delivery + submit ────────────── */}
        <div className="checkout-delivery-section">
          <h3>📦 Delivery Details</h3>
          {error && <p className="msg error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="checkout-form-grid">
              <div className="field-group">
                <label>Full Name</label>
                <input name="name" placeholder="John Doe"
                  value={delivery.name} onChange={handleDelivery} required />
              </div>
              <div className="field-group">
                <label>Phone</label>
                <input name="phone" placeholder="+1 234 567 8900"
                  value={delivery.phone} onChange={handleDelivery} required />
              </div>
              <div className="field-group">
                <label>City</label>
                <select name="city" value={delivery.city} onChange={handleDelivery} required>
                  <option value="">Select city…</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label>Delivery Date</label>
                <input name="date" type="date"
                  value={delivery.date} readOnly />
                {deliveryDays && (
                  <span className="delivery-estimate">
                    Estimated {deliveryDays} day{deliveryDays > 1 ? "s" : ""} delivery
                  </span>
                )}
              </div>
              <div className="field-group full-width">
                <label>Full Address</label>
                <input name="address" placeholder="123 Gift Avenue, Suite 4"
                  value={delivery.address} onChange={handleDelivery} required />
              </div>
            </div>

            {/* Order summary strip */}
            <div className="order-summary-strip">
              <div className="oss-row">
                <span>Subtotal</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="oss-row">
                <span>Shipping</span>
                <span className="oss-free">FREE</span>
              </div>
              <div className="oss-row oss-total">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg checkout-submit">
              {payMethod === "card" ? "💳 Pay Now" : "🚚 Place Order (COD)"}  ·  ${totalPrice.toFixed(2)}
            </button>

            {/* Payment partner logos */}
            <div className="payment-partners">
              <span className="pp-label">We accept</span>
              <div className="pp-logos">
                <svg className="pp-logo" viewBox="0 0 60 20" width="60" height="20"><rect rx="3" width="60" height="20" fill="#635BFF"/><text x="30" y="14" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="sans-serif">Stripe</text></svg>
                <svg className="pp-logo" viewBox="0 0 70 20" width="70" height="20"><rect rx="3" width="70" height="20" fill="#003087"/><text x="35" y="14" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="sans-serif">PayPal</text></svg>
                <svg className="pp-logo" viewBox="0 0 60 20" width="60" height="20"><rect rx="3" width="60" height="20" fill="#1A1F71"/><text x="30" y="14" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="sans-serif">VISA</text></svg>
                <svg className="pp-logo" viewBox="0 0 80 20" width="80" height="20"><rect rx="3" width="80" height="20" fill="#EB001B"/><text x="40" y="14" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="sans-serif">Mastercard</text></svg>
              </div>
            </div>

            <div className="checkout-trust">
              <span>🔒 256-bit SSL Encryption</span>
              <span>✓ Secure Checkout</span>
              <span>↩ Easy Returns</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
