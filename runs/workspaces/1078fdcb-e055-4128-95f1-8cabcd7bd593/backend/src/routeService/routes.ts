import express from 'express';
import { routePlanController } from '../controller';

const router = express.Router();

// GET /route_plans - Retrieve all route plans for a user
router.get('/', routePlanController.getAllRoutePlans);

// POST /route_plans - Create a new route plan
router.post('/', routePlanController.createRoutePlan);

export default router;