import express = require('express');
import { prisma } from '../db';
import { requireAuth, requireTenant } from '../middleware/auth';

const router = express.Router();

router.get(
  '/api/v1/tickets/:id',
  requireAuth,
  requireTenant,
  async (req, res) => {
    const organisationId = res.locals.organisationId as string;

    const ticketId = req.params.id;

    if (typeof ticketId !== 'string') {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        organisationId,
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    res.status(200).json(ticket);
  },
);

export default router;