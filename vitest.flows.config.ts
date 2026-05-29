import { defineVisionBoardVitestConfig } from "./vitest.shared";
import { flowTestPatterns } from "./vitest.test-groups";

export default defineVisionBoardVitestConfig({
  include: flowTestPatterns,
});
