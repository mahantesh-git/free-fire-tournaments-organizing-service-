import express from 'express';
import * as duoController from '../controllers/duoController.js';

const router = express.Router();

// POST /api/duos/register — Register a single duo team
router.post('/register', duoController.registerDuo);

// GET /api/duos?tournamentId=xxx — Get all duos (optionally by tournament)
router.get('/', duoController.getDuos);

// DELETE /api/duos/:id — Delete a duo team
router.delete('/:id', duoController.deleteDuo);

// POST /api/duos/bulk-import — Bulk import duos from parsed XLSX data
router.post('/bulk-import', duoController.bulkImportDuos);

export default router;
