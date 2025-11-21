// routes/faceAuthRoutes.js
import express from "express";
import * as faceapi from "face-api.js";
import canvas from "canvas";
import { unlockFaceAccess } from "../middlewares/faceAuthMiddleware.js";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_PATH = path.join(__dirname, "../models");

// Load models once
await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);

// Load your developer reference image
const developerImage = await canvas.loadImage(
  path.join(__dirname, "../public/dev_face.jpg") // <-- your face reference
);
const devDescriptor = await faceapi
  .detectSingleFace(developerImage)
  .withFaceLandmarks()
  .withFaceDescriptor();

router.post("/verify", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });

    const img = await canvas.loadImage(image);
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection)
      return res.status(400).json({ error: "No face detected" });

    const distance = faceapi.euclideanDistance(
      devDescriptor.descriptor,
      detection.descriptor
    );

    console.log("🔍 Face match distance:", distance);

    if (distance < 0.45) {
      unlockFaceAccess();
      return res.json({ success: true, message: "Face verified!" });
    } else {
      return res.status(403).json({ success: false, message: "Face mismatch" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
