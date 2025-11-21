import express from "express";
import Conductor from "../models/Conductor.js";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Add conductor
router.post("/", async (req, res) => {
  try {
    const c = new Conductor(req.body);
    await c.save();
    res.json({ message: "Conductor added successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get conductors with optional search & role filter
router.get("/", async (req, res) => {
  try {
    const { search, role } = req.query;
    let query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { name: new RegExp(search, "i") },
      { phone: search },
      { rollNo: search }
    ];
    const conductors = await Conductor.find(query);
    res.json(conductors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update conductor
router.put("/:id", async (req, res) => {
  try {
    await Conductor.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: "Conductor updated successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete conductor
router.delete("/:id", async (req, res) => {
  try {
    await Conductor.findByIdAndDelete(req.params.id);
    res.json({ message: "Conductor deleted successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Import Excel
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    await Conductor.insertMany(data);
    fs.unlinkSync(req.file.path);
    res.json({ message: "Conductors uploaded successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Export Excel
router.get("/export", async (req, res) => {
  try {
    const conductors = await Conductor.find({},{__v:false});
    const ws = XLSX.utils.json_to_sheet(conductors.map(c => c.toObject()));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Conductors");
    const filePath = "uploads/conductors.xlsx";
    XLSX.writeFile(wb, filePath);
    res.download(filePath, "conductors.xlsx", () => fs.unlinkSync(filePath));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
