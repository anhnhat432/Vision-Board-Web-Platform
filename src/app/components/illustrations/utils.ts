import { type SVGProps, useId } from "react";

export interface AmbientIllustrationProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

export function useIllustrationId(prefix: string) {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}
