import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** IntersectionObserver threshold. Default 0.15 = 15% of element visible. */
  threshold?: number;
  /** IntersectionObserver rootMargin. Default trims the bottom 10% so reveals fire before the element fully enters. */
  rootMargin?: string;
  /** When true (default), stop observing after the first intersection. */
  once?: boolean;
}

/**
 * P2-01 Motion Design System.
 *
 * Returns a ref to attach to an element + a boolean indicating whether
 * the element is currently inside the viewport. SSR-safe and degrades to
 * "always in view" when IntersectionObserver is unavailable.
 *
 * @example
 * const { ref, inView } = useInView<HTMLDivElement>();
 * return <div ref={ref} className={inView ? "motion-reveal" : "opacity-0"} />;
 */
export function useInView<T extends Element>(opts: UseInViewOptions = {}) {
  const { threshold = 0.15, rootMargin = "0px 0px -10% 0px", once = true } = opts;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
