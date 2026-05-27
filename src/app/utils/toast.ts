import { toast as sonnerToast } from "sonner";

export function toastSuccess(message: string, options?: Parameters<typeof sonnerToast.success>[1]) {
  return sonnerToast.success(message, options);
}

export function toastError(message: string, options?: Parameters<typeof sonnerToast.error>[1]) {
  return sonnerToast.error(message, options);
}

export function toastWarning(message: string, options?: Parameters<typeof sonnerToast.warning>[1]) {
  return sonnerToast.warning(message, options);
}

export function toastInfo(message: string, options?: Parameters<typeof sonnerToast.info>[1]) {
  return sonnerToast.info(message, options);
}
