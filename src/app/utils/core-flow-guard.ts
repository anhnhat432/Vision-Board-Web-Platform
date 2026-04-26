import type { LifeArea, UserData } from "./storage-types";

type LifeBalanceUserData = Pick<UserData, "currentWheelOfLife" | "onboardingCompleted">;

export function hasRealLifeBalance(userData: LifeBalanceUserData | null | undefined): boolean {
  return Boolean(userData?.onboardingCompleted && userData.currentWheelOfLife.some((area) => area.score > 0));
}

export function getScoredLifeArea(userData: LifeBalanceUserData, areaName: string): LifeArea | null {
  const area = userData.currentWheelOfLife.find((item) => item.name === areaName);
  return area && area.score > 0 ? area : null;
}
