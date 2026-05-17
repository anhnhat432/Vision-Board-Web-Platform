import { Link } from "react-router";

interface ReflectionPromptProps {
  currentWeek: number | null;
  reviewHref: string;
}

export function ReflectionPrompt({ currentWeek, reviewHref }: ReflectionPromptProps) {
  return (
    <section className="rounded-card border border-[#F3D9CC] bg-app-warm-soft p-5 md:p-6" aria-labelledby="dashboard-reflection-title">
      <span className="inline-flex rounded-full bg-app-warm-soft px-3 py-1 text-[13px] font-medium text-app-warm ring-1 ring-[#F3D9CC]">
        Đến lúc nhìn lại tuần
      </span>
      <h2 id="dashboard-reflection-title" className="mt-4 font-serif text-[20px] font-medium leading-7 text-[#5C3A2E]">
        Tuần {currentWeek ?? "--"} vừa qua, đâu là khoảnh khắc làm bạn tự hào nhất?
      </h2>
      <Link
        to={reviewHref}
        className="mt-5 inline-flex rounded-lg bg-app-warm px-3.5 py-2 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#c56b4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
      >
        Mở review →
      </Link>
    </section>
  );
}
