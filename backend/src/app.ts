import express = require('express');
import type { Request, Response } from 'express';
import cors = require('cors');
import dotenv = require('dotenv');

import authRouter from './routes/auth';
import ticketsRouter from './routes/tickets';
import {
  requireAuth,
  requireTenant,
  type AuthenticatedRequest,
} from './middleware/auth';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(authRouter);
app.use(ticketsRouter);

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', service: 'DeskOps Ticketing Core' });
});

app.get('/api/v1/me', requireAuth, requireTenant, (req, res) => {
  const auth = (req as AuthenticatedRequest).auth!;

  res.status(200).json({
    userId: auth.userId,
    organisationId: res.locals.organisationId,
    role: auth.role,
  });
});

export default app;