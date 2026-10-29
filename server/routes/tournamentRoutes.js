import express from 'express';
import * as tournamentController from '../controllers/tournamentController.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';

const router = express.Router();

router.post('/', auditMiddleware('CREATE_TOURNAMENT', 'TOURNAMENT'), tournamentController.createTournament);
router.get('/', tournamentController.getTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.put('/:id', auditMiddleware('UPDATE_TOURNAMENT', 'TOURNAMENT'), tournamentController.updateTournament);
router.delete('/:id', auditMiddleware('DELETE_TOURNAMENT', 'TOURNAMENT'), tournamentController.deleteTournament);

// Tournament Standings Routes
router.get('/:id/standings', tournamentController.getTournamentStandings);
router.post('/:id/standings/generate', auditMiddleware('GENERATE_STANDINGS', 'TOURNAMENT'), tournamentController.generateTournamentStandings);

// Qualification Cutoff & Verification Routes
router.get('/:id/qualification', tournamentController.getQualificationStatus);
router.put('/:id/qualification', auditMiddleware('UPDATE_QUALIFICATION', 'TOURNAMENT'), tournamentController.updateQualificationCutoff);

export default router;
