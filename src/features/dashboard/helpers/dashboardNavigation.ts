export function buildLoginPath(mode: "signin" | "signup", destination: string) {
  const params = new URLSearchParams({ next: destination });
  if (mode === "signup") params.set("mode", "signup");
  return `/login?${params.toString()}`;
}
