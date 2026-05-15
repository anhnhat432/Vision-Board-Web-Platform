import { Navigate } from "react-router";

export function MockBillingCheckout() {
  return <Navigate to="/billing/confirm" replace />;
}
