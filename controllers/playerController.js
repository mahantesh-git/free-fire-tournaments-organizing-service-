import Player from "../models/Player.js";
import XLSX from "xlsx";
import fs from "fs";

// Add player
export const addPlayer = async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();
    
    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('playerAdded', player);
    }
    
    res.json({ message: "Player added successfully", player });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get players (with optional search)
export const getPlayers = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? {
          $or: [
            { name: new RegExp(search, "i") },
            { phone: search },
            { ffid: search },
          ],
        }
      : {};
    const players = await Player.find(query);
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update player
export const updatePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    
    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('playerUpdated', player);
    }
    
    res.json({ message: "Player updated successfully", player });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete player
export const deletePlayer = async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    
    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('playerDeleted', req.params.id);
    }
    
    res.json({ message: "Player deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Import players from Excel
export const importPlayers = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    const players = await Player.insertMany(data);
    fs.unlinkSync(req.file.path);
    
    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('playersImported', players);
    }
    
    res.json({ message: "Players uploaded successfully", count: players.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export players to Excel
export const exportPlayers = async (req, res) => {
  try {
    const players = await Player.find();
    const ws = XLSX.utils.json_to_sheet(players.map((p) => p.toObject()));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Players");
    const filePath = "uploads/players.xlsx";
    XLSX.writeFile(wb, filePath);
    res.download(filePath, "players.xlsx", () => fs.unlinkSync(filePath));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
