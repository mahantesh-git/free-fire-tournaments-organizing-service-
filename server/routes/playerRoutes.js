import express from "express";
import multer from "multer";
import {
    addPlayer,
    getPlayers,
    updatePlayer,
    deletePlayer,
    importPlayers,
    exportPlayers,
} from "../controllers/playerController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Player routes
router.post("/", addPlayer);
router.get("/", getPlayers);
router.put("/:id", updatePlayer);
router.delete("/:id", deletePlayer);
router.post("/import", upload.single("file"), importPlayers);
router.get("/export", exportPlayers);

export default router;
