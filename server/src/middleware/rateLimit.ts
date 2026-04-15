import { NextFunction, Request, Response } from "express";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  message: string;
};

function getRateLimitKey(req: Request): string {
  return req.ip || "unknown";
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const { windowMs, maxRequests, message } = options;
  const rateLimitStore = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = getRateLimitKey(req);
    const existingEntry = rateLimitStore.get(key);

    if (!existingEntry || existingEntry.resetAt <= now) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (existingEntry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existingEntry.resetAt - now) / 1000));

      res.setHeader("Retry-After", retryAfterSeconds.toString());
      res.status(429).json({
        message,
      });
      return;
    }

    existingEntry.count += 1;
    next();
  };
}
