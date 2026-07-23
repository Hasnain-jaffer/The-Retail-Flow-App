import mongoose, { Schema, InferSchemaType } from "mongoose";

const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  cost: { type: Number },
  stock: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 10 },
  image: { type: String },
  barcode: { type: String },
  weight: { type: Number },
  dimensions: { type: Schema.Types.Mixed },
  supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
}, { timestamps: true });

// Virtual status, derived from stock rather than stored — avoids the two
// ever silently disagreeing (e.g. stock updated but status forgotten).
productSchema.virtual("status").get(function (this: any) {
  if (this.stock === 0) return "out_of_stock";
  if (this.stock <= this.minStock) return "low_stock";
  return "in_stock";
});
productSchema.set("toJSON", { virtuals: true });

export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: mongoose.Types.ObjectId };
export const Product = mongoose.model("Product", productSchema);
