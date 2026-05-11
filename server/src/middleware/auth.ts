import { NextFunction, Request, Response } from "express";

import {
  adminSessionCookieName,
  type AdminJwtPayload,
  parseCookieHeader,
  verifyAdminSessionToken,
} from "../lib/adminSession";

export interface AuthenticatedRequest extends Request {
  user?: AdminJwtPayload;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const token = parseCookieHeader(req.headers.cookie).get(adminSessionCookieName);
  const jwtSecret = process.env.JWT_SECRET;

  if (!token) {
    res.status(401).json({
      message: "Unauthorized.",
    });
    return;
  }

  if (!jwtSecret) {
    res.status(500).json({
      message: "JWT secret is not configured",
    });
    return;
  }

  try {
    const decodedToken = verifyAdminSessionToken(token, jwtSecret);

    if (!decodedToken) {
      res.status(401).json({
        message: "Unauthorized.",
      });
      return;
    }

    req.user = decodedToken;
    next();
  } catch {
    res.status(401).json({
      message: "Unauthorized.",
    });
  }
};
