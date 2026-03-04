/*
 * ProductCard Component
 * ---------------------
 * Displays a single product as a card with a live 3D model viewer,
 * name, price, category badge, and an "Add to Cart" button.
 */

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ProductViewer3D from "../3d/ProductViewer3D";

// Map category → accent color for the fallback gift-box
const CATEGORY_COLORS = {
  graduation: "#3498db",
  wedding:    "#e91e8c",
  birthday:   "#f39c12",
  general:    "#e74c3c",
};

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAdd = () => {
    if (!user) return navigate("/login"); // must be logged in
    addToCart(product._id);
  };

  const boxColor = CATEGORY_COLORS[product.category] || "#e74c3c";

  return (
    <div className="product-card">
      {/* 3-D viewer — rotates to show the model (or a gift box if no model) */}
      <div className="product-img" style={{ cursor: "grab" }}>
        <ProductViewer3D
          modelPath={product.modelPath || ""}
          scale={product.scale || 1}
          color={boxColor}
        />
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <span className="badge">{product.category}</span>
        <p className="price">${product.price.toFixed(2)}</p>
        <button onClick={handleAdd} className="btn btn-primary">
          Add to Cart
        </button>
      </div>
    </div>
  );
}
