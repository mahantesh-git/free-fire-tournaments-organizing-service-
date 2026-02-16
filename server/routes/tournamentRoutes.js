import express from 'express';
import * as tournamentController from '../controllers/tournamentController.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';

const router = express.Router();

router.post('/', auditMiddleware('CREATE_TOURNAMENT', 'TOURNAMENT'), tournamentController.createTournament);
router.get('/', tournamentController.getTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.put('/:id', auditMiddleware('UPDATE_TOURNAMENT', 'TOURNAMENT'), tournamentController.updateTournament);
router.delete('/:id', auditMiddleware('DELETE_TOURNAMENT', 'TOURNAMENT'), tournamentController.deleteTournament);

export default router;
