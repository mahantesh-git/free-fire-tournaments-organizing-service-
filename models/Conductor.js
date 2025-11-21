import mongoose from "mongoose";

const conductorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  rollNo: { type: String, required: true },
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Conductor", conductorSchema);
