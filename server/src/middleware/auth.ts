import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

interface AdminJwtPayload extends JwtPayload {
  role?: string;
  username?: string;
  adminId?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AdminJwtPayload;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      message: "JWT secret is not configured",
    });
    return;
  }

  try {
    const decodedToken = jwt.verify(token, jwtSecret);

    if (typeof decodedToken === "string" || decodedToken.role !== "admin") {
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
