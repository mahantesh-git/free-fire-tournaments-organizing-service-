const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const Team = require('../models/Conductor');
const Player = require('../models/Player');
const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const players = [];

    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      const workbook = xlsx.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      for (const row of data) {
        players.push({
          name: row.name || row.Name,
          phone: row.phone || row.Phone,
          freefireId: row.freefireId || row.FreeFireID,
          role: row.role || row.Role || 'Player',
          teamName: row.teamName || row.Team
        });
      }
    } else {
      const content = fs.readFileSync(req.file.path, 'utf8').trim().split(/\r?\n/);
      for (const line of content) {
        const [name, phone, freefireId, role, teamName] = line.split(/[,;\t]+/);
        players.push({ name, phone, freefireId, role, teamName });
      }
    }

    // Delete file after processing
    fs.unlinkSync(req.file.path);

    for (const p of players) {
      let team = null;
      if (p.teamName) {
        team = await Team.findOne({ name: p.teamName }) || new Team({ name: p.teamName });
        await team.save();
      }

      const player = new Player({
        name: p.name,
        phone: p.phone,
        freefireId: p.freefireId,
        role: p.role,
        team: team?._id || null
      });

      await player.save();

      if (team) {
        team.members.push(player._id);
        await team.save();
      }
    }

    res.json({ success: true, message: 'File imported successfully', count: players.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
