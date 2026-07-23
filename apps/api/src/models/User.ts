import mongoose, { Schema, InferSchemaType } from "mongoose";

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ["admin", "manager", "staff", "viewer"], default: "viewer" },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model("User", userSchema);
