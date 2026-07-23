import mongoose, { Schema, InferSchemaType } from "mongoose";

const customerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyTier: { type: String, enum: ["bronze", "silver", "gold", "platinum"], default: "bronze" },
  totalSpent: { type: Number, default: 0 },
  orderCount: { type: Number, default: 0 },
  address: { type: Schema.Types.Mixed },
  notes: { type: String },
}, { timestamps: true });

export type CustomerDoc = InferSchemaType<typeof customerSchema> & { _id: mongoose.Types.ObjectId };
export const Customer = mongoose.model("Customer", customerSchema);
