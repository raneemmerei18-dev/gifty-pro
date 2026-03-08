/*
 * Order Model
 * -----------
 * Created when a customer completes checkout.
 * Stores a snapshot of the items (name + price at time of purchase),
 * delivery info, and a status that the admin can update.
 */

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Snapshot of purchased items
    items: [
      {
        product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name:     String,
        price:    Number,
        quantity: Number,
      },
    ],

    giftBox: { type: mongoose.Schema.Types.ObjectId, ref: "GiftBox", default: null },

    // Delivery details filled at checkout
    delivery: {
      name:    { type: String, required: true },
      phone:   { type: String, required: true },
      city:    { type: String, required: true },
      address: { type: String, required: true },
      date:    { type: String },
    },

    totalPrice: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "preparing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
