import express from 'express';
import { accommodationController } from '../controllers';

const router = express.Router();

// GET /accommodations/:routePlanId - Retrieve accommodation recommendations for a specific route plan
router.get('/:routePlanId', accommodationController.getAccommodations);

// POST /accommodations - Create a new accommodation recommendation
router.post('/', accommodationController.createAccommodation);

export default router;