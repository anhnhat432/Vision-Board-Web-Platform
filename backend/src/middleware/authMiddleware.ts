import { adminAuth } from "../config/firebase";
import { createAuthMiddleware } from "./authMiddlewareCore";

export const authMiddleware = createAuthMiddleware(adminAuth);
