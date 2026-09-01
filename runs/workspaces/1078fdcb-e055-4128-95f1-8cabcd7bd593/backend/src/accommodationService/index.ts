import express from 'express';
import { accommodationRoutes } from './routes';

const accommodationService = express();

accommodationService.use('/accommodations', accommodationRoutes);

export default accommodationService;