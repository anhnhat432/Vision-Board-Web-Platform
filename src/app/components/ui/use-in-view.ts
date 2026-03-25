import { useEffect, useState } from "react";

interface UseInViewOptions {
  amount?: number;
  margin?: string;
  once?: boolean;
}

export function useInView<T extends HTMLElement>({
  amount = 0.24,
  margin = "0px 0px -10% 0px",
  once = true,
}: UseInViewOptions = {}) {
  const [node, setNode] = useState<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.unobserve(entry.target);
          return;
        }

        if (!once) {
          setIsInView(false);
        }
      },
      {
        threshold: amount,
        rootMargin: margin,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [amount, margin, node, once]);

  return {
    isInView,
    ref: setNode,
  };
}
