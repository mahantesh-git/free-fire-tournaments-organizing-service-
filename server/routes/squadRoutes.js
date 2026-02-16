import express from 'express';
import * as squadController from '../controllers/squadController.js';

const router = express.Router();

router.post('/register', squadController.registerSquad);
router.get('/', squadController.getSquads);

export default router;
