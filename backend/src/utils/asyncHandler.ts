import type { NextFunction, Request, Response } from "express";

export function asyncHandler<
  TRequest extends Request = Request,
  TResponse extends Response = Response,
>(
  handler: (
    req: TRequest,
    res: TResponse,
    next: NextFunction,
  ) => Promise<unknown>,
) {
  return (req: TRequest, res: TResponse, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
