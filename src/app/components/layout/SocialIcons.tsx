import type { SVGProps } from "react";
import { Facebook, Instagram } from "lucide-react";

type SocialIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export function TikTokIcon({ size = 18, ...props }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19.5 6.5a5 5 0 0 1-3.5-1.5V15a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V2h3a5 5 0 0 0 3.5 3.5z" />
    </svg>
  );
}

export function InstagramIcon({ size = 18, ...props }: SocialIconProps) {
  return <Instagram size={size} aria-hidden="true" {...props} />;
}

export function FacebookIcon({ size = 18, ...props }: SocialIconProps) {
  return <Facebook size={size} aria-hidden="true" {...props} />;
}
