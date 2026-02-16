import express from 'express';
import { registerOrganizer, loginOrganizer, getOrganizerProfile } from '../controllers/organizerController.js';

const router = express.Router();

router.post('/register', registerOrganizer);
router.post('/login', loginOrganizer);
router.get('/me', getOrganizerProfile);

export default router;
