import type { Request, Response } from "express";

import { orderService } from "../services/orderService";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

export async function createOrder(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.createOrder(user.uid, req.body ?? {});
  res.status(201).json(successResponse(order));
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const orders = await orderService.getUserOrders(user.uid);
  res.status(200).json(successResponse(orders));
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.getOrder(user.uid, req.params.id);
  res.status(200).json(successResponse(order));
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.cancelOrder(user.uid, req.params.id);
  res.status(200).json(successResponse(order));
}

export async function adminGetOrders(req: Request, res: Response): Promise<void> {
  requireAuthUser(req);
  const orders = await orderService.adminGetOrders();
  res.status(200).json(successResponse(orders));
}

export async function adminUpdateOrderStatus(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.adminUpdateStatus(user.uid, req.params.id, req.body ?? {});
  res.status(200).json(successResponse(order));
}
