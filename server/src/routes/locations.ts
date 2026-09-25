import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { db } from '../db/client.js';
import { locations } from '../db/schema.js';

const router = Router();

// Rate limit: 10 submissions per IP per 15 minutes
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this address, try again later' },
});

const newLocationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

router.post(
  '/',
  submitLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = newLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid location payload', details: parsed.error.flatten() });
    }

    const [created] = await db.insert(locations).values({
      name: parsed.data.name,
      description: parsed.data.description || null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    }).returning();

    res.status(201).json(created);
  })
);

export default router;
