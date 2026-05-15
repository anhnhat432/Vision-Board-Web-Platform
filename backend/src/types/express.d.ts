export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        emailVerified?: boolean;
        role?: string;
      };
      firebaseToken?: {
        uid: string;
        email?: string;
        name?: string;
        emailVerified?: boolean;
        role?: string;
      };
    }
  }
}
