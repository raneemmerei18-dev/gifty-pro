/*
 * Cart Context
 * ------------
 * Provides cart state and operations globally.
 * Any component can use:  const { cart, addToCart, totalPrice, ... } = useCart();
 *
 * The cart syncs with the backend – every operation sends an API call
 * and updates local state with the response.
 */

import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], giftBox: null });

  // Fetch cart whenever user logs in or out
  useEffect(() => {
    if (user) {
      API.get("/cart")
        .then((res) => setCart(res.data))
        .catch(() => {});
    } else {
      setCart({ items: [], giftBox: null });
    }
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    const res = await API.post("/cart/add", { productId, quantity });
    setCart(res.data);
  };

  const updateQuantity = async (productId, quantity) => {
    const res = await API.put("/cart/update", { productId, quantity });
    setCart(res.data);
  };

  const removeItem = async (productId) => {
    const res = await API.delete(`/cart/remove/${productId}`);
    setCart(res.data);
  };

  const setGiftBox = async (giftBoxId) => {
    const res = await API.put("/cart/giftbox", { giftBoxId });
    setCart(res.data);
  };

  const clearCart = async () => {
    try { await API.delete("/cart/clear"); } catch {}
    setCart({ items: [], giftBox: null });
  };

  // Computed values
  const itemCount  = cart.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const itemsTotal = cart.items?.reduce(
    (sum, i) => sum + (i.product?.price || 0) * i.quantity, 0
  ) || 0;
  const totalPrice = itemsTotal + (cart.giftBox?.basePrice || 0);

  return (
    <CartContext.Provider
      value={{
        cart, addToCart, updateQuantity,
        removeItem, setGiftBox, clearCart,
        itemCount, totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
