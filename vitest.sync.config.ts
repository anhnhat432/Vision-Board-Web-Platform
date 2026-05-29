import { defineVisionBoardVitestConfig } from "./vitest.shared";
import { syncTestPatterns } from "./vitest.test-groups";

export default defineVisionBoardVitestConfig({
  include: syncTestPatterns,
});
