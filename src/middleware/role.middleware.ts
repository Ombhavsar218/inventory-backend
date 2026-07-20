import { Request, Response, NextFunction } from "express";

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;
    if (!roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "Access denied. You do not have the required role.",
      });
      return;
    }
    next();
  };
}
