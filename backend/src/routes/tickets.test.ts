import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request = require('supertest');
import bcrypt = require('bcryptjs');

import app from '../app';
import { prisma } from '../db';

const password = 'test-password-for-this-run';
const suffix = `${Date.now()}`;

let organisationAId = '';
let organisationBId = '';
let ticketBId = '';
let emailA = '';

describe('tenant ticket isolation', () => {
  before(async () => {
    emailA = `org-a-${suffix}@example.test`;

    const organisationA = await prisma.organisation.create({
      data: {
        name: `Test Org A ${suffix}`,
        users: {
          create: {
            email: emailA,
            passwordHash: await bcrypt.hash(password, 10),
            role: 'ADMIN',
            name: 'Org A test admin',
            skills: [],
          },
        },
      },
    });
    organisationAId = organisationA.id;

    const organisationB = await prisma.organisation.create({
      data: { name: `Test Org B ${suffix}` },
    });
    organisationBId = organisationB.id;

    const ticketB = await prisma.ticket.create({
      data: {
        organisationId: organisationBId,
        propertyId: 'property-b',
        unitId: 'unit-b',
        residentId: 'resident-b',
        title: 'Private ticket belonging to Org B',
        description: 'Created for the tenant isolation test',
      },
    });
    ticketBId = ticketB.id;
  });

  after(async () => {
    if (ticketBId) {
      await prisma.ticket.deleteMany({ where: { id: ticketBId } });
    }

    const organisationIds = [organisationAId, organisationBId].filter(
      (id) => id !== '',
    );

    if (organisationIds.length > 0) {
      await prisma.user.deleteMany({
        where: { organisationId: { in: organisationIds } },
      });

      await prisma.organisation.deleteMany({
        where: { id: { in: organisationIds } },
      });
    }

    await prisma.$disconnect();
  });

  it('returns 404 when Org A requests Org B’s ticket', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: emailA, password });

    assert.equal(login.status, 200);
    assert.equal(typeof login.body.token, 'string');

    const response = await request(app)
      .get(`/api/v1/tickets/${ticketBId}`)
      .set('Authorization', `Bearer ${login.body.token}`);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'NOT_FOUND' });
  });
});