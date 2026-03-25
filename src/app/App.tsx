import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <RouterProvider
      router={router}
      fallbackElement={
        <div className="app-shell loading-stage flex min-h-screen items-center justify-center px-6">
          <div className="glass-surface relative w-full max-w-xl rounded-[36px] p-8 text-center sm:p-10">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/74 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Vision Board OS
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
              Chúng mình đang dựng không gian tiếp theo cho bạn.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500 sm:text-base">
              Một nhịp chuyển ngắn để trang tiếp theo mở ra mượt hơn, sáng hơn và đúng cảm xúc hơn.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          </div>
        </div>
      }
    />
  );
}
