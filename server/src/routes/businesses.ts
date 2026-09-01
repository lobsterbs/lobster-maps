import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sql, eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { db } from '../db/client.js';
import { businesses } from '../db/schema.js';

const router = Router();

// Stopgap, not a fix: this is a public write endpoint with no auth
// (see README "Known gaps" — LobsterID is the real fix). Until that's
// wired in, this just stops a naive bot from spamming unlimited rows,
// it does nothing about a client that rotates IPs or a human abusing
// it slowly. 10 submissions per IP per 15 minutes.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this address, try again later' },
});

const newBusinessSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(100),
  address: z.string().min(1).max(300),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().max(50).optional(),
  website: z.string().url().max(300).optional(),
  hours: z.record(z.string()).optional(),
  imageUrls: z.array(z.string().url().max(500)).max(5).optional(),
});

// Express 4 doesn't catch rejected promises from async handlers on its
// own — an unhandled rejection here (e.g. the DB being unreachable)
// crashes the whole process, taking the MCP endpoint and the frontend
// down with it, not just this one request. Confirmed this the hard way
// by actually running it against a bad DATABASE_URL, not just reading
// the code. This wrapper forwards failures to Express's error handler
// instead.
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// GET /api/businesses?bbox=minLng,minLat,maxLng,maxLat
// Used by the map to load pins for whatever's currently in view.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { bbox } = req.query;

    if (typeof bbox === 'string') {
      const parts = bbox.split(',').map(Number);
      if (parts.length !== 4 || parts.some(Number.isNaN)) {
        return res.status(400).json({ error: 'bbox must be "minLng,minLat,maxLng,maxLat"' });
      }
      const [minLng, minLat, maxLng, maxLat] = parts;

      // Relies on the generated `geog` column + GIST index from db/postgis.sql
      const result = await db.execute(sql`
        SELECT id, name, category, address, latitude, longitude, verified
        FROM businesses
        WHERE geog && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::geography
        LIMIT 500
      `);
      return res.json(result.rows);
    }

    const rows = await db.select().from(businesses).limit(100);
    res.json(rows);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(businesses).where(eq(businesses.id, req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  })
);

router.post(
  '/',
  submitLimiter,
  asyncHandler(async (req, res) => {
    const parsed = newBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid business payload', details: parsed.error.flatten() });
    }

    const [created] = await db.insert(businesses).values(parsed.data).returning();
    res.status(201).json(created);
  })
);

export default router;
