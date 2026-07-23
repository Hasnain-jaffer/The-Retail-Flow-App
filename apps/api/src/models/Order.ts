import mongoose, { Schema, InferSchemaType } from "mongoose";

// Items are embedded rather than a separate collection (unlike the old
// Postgres orderItems table) — MongoDB documents are naturally suited to
// "an order and its line items are one aggregate", and it removes the
// need for a join on every single order read.
const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String }, // snapshot of the product name at time of sale
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending", "processing", "completed", "cancelled"], default: "pending" },
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String },
  notes: { type: String },
  items: { type: [orderItemSchema], default: [] },
}, { timestamps: true });

export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: mongoose.Types.ObjectId };
export const Order = mongoose.model("Order", orderSchema);
