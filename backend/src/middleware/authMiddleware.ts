import { adminAuth } from "../config/firebase";
import { createAuthMiddleware, requireEmailVerified } from "./authMiddlewareCore";

export const authMiddleware = createAuthMiddleware(adminAuth);
export { requireEmailVerified };
