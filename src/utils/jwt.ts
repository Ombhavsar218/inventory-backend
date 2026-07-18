import jwt from "jsonwebtoken";
import config from "@/config";

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export function generateToken(payload: JwtPayload): string {
  return (jwt.sign as Function)(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  }) as string;
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
