import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { db } from '../db/client.js';
import { issues } from '../db/schema.js';

const router = Router();

// Rate limit: 10 submissions per IP per 15 minutes
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this address, try again later' },
});

const newIssueSchema = z.object({
  type: z.enum(['Road damage', 'Blocked path', 'Missing data', 'Business info wrong', 'Other']),
  description: z.string().min(1).max(2000),
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
    const parsed = newIssueSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid issue payload', details: parsed.error.flatten() });
    }

    const [created] = await db.insert(issues).values({
      type: parsed.data.type,
      description: parsed.data.description,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    }).returning();

    res.status(201).json(created);
  })
);

export default router;
