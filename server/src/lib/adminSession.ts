import type { CookieOptions } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const adminSessionCookieName = "meshfree_admin_session";
export const adminSessionMaxAgeMs = 60 * 60 * 1000;

export interface AdminJwtPayload extends JwtPayload {
  role?: string;
  username?: string;
  adminId?: number;
}

export function getAdminSessionCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    maxAge: adminSessionMaxAgeMs,
    path: "/api/admin",
    sameSite: "strict",
    secure: isProduction,
  };
}

export function getAdminSessionClearCookieOptions(isProduction: boolean): CookieOptions {
  return {
    ...getAdminSessionCookieOptions(isProduction),
    maxAge: undefined,
  };
}

export function parseCookieHeader(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  for (const cookiePair of cookieHeader.split(";")) {
    const separatorIndex = cookiePair.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = cookiePair.slice(0, separatorIndex).trim();
    const value = cookiePair.slice(separatorIndex + 1).trim();

    if (!name) {
      continue;
    }

    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      cookies.set(name, value);
    }
  }

  return cookies;
}

export function createAdminSessionToken(payload: { adminId: number; username: string }, jwtSecret: string): string {
  return jwt.sign(
    {
      adminId: payload.adminId,
      role: "admin",
      username: payload.username,
    },
    jwtSecret,
    {
      expiresIn: Math.floor(adminSessionMaxAgeMs / 1000),
    },
  );
}

export function verifyAdminSessionToken(token: string, jwtSecret: string): AdminJwtPayload | null {
  const decodedToken = jwt.verify(token, jwtSecret);

  if (
    typeof decodedToken === "string" ||
    decodedToken.role !== "admin" ||
    typeof decodedToken.username !== "string" ||
    typeof decodedToken.adminId !== "number"
  ) {
    return null;
  }

  return decodedToken;
}
