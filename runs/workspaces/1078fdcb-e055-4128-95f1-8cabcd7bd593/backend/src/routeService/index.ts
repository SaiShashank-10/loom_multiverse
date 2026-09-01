import express from 'express';
import { RoutePlanController } from './routes';

const router = express.Router();

// Define routes for route planning service
router.get('/route_plans', RoutePlanController.getAllRoutePlans);
router.post('/route_plans', RoutePlanController.createRoutePlan);

export default router;