import express from "express";
import Player from "../models/Player.js";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Add player
router.post("/", async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    res.json({ message: "Player added successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get players (with optional search)
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? {
      $or: [
        { name: new RegExp(search, "i") },
        { phone: search },
        { ffid: search }
      ]
    } : {};
    const players = await Player.find(query);
    res.json(players);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update player
router.put("/:id", async (req, res) => {
  try {
    await Player.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: "Player updated successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete player
router.delete("/:id", async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ message: "Player deleted successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Upload Excel
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    await Player.insertMany(data);
    fs.unlinkSync(req.file.path);
    res.json({ message: "Players uploaded successfully" });
  } catch (err) {res.status(500).json({ message: err.message }); }
});

// Download Excel
router.get("/export", async (req, res) => {
  try {
    const players = await Player.find();
    const ws = XLSX.utils.json_to_sheet(players.map(p => p.toObject()));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Players");
    const filePath = "uploads/players.xlsx";
    XLSX.writeFile(wb, filePath);
    res.download(filePath, "players.xlsx", () => fs.unlinkSync(filePath));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
