import type { ComponentType, SVGProps } from "react";

import {
  LifeAreaCareerIcon,
  LifeAreaFamilyIcon,
  LifeAreaFinanceIcon,
  LifeAreaFunIcon,
  LifeAreaHealthIcon,
  LifeAreaLearningIcon,
  LifeAreaMindIcon,
  LifeAreaRelationshipIcon,
} from "./LifeAreaIcons";

type LifeAreaIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const LIFE_AREA_ICON_MAP: Record<string, LifeAreaIconComponent> = {
  career: LifeAreaCareerIcon,
  finance: LifeAreaFinanceIcon,
  health: LifeAreaHealthIcon,
  education: LifeAreaLearningIcon,
  learning: LifeAreaLearningIcon,
  relationships: LifeAreaRelationshipIcon,
  relationship: LifeAreaRelationshipIcon,
  family: LifeAreaFamilyIcon,
  "personal growth": LifeAreaMindIcon,
  "personal-growth": LifeAreaMindIcon,
  mind: LifeAreaMindIcon,
  leisure: LifeAreaFunIcon,
  recreation: LifeAreaFunIcon,
  fun: LifeAreaFunIcon,
};

export function getLifeAreaIcon(areaName: string | null | undefined): LifeAreaIconComponent {
  const key = String(areaName ?? "")
    .trim()
    .toLowerCase();
  return LIFE_AREA_ICON_MAP[key] ?? LifeAreaMindIcon;
}
