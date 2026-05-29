import { defineVisionBoardVitestConfig } from "./vitest.shared";
import { slowTestPatterns } from "./vitest.test-groups";

export default defineVisionBoardVitestConfig({
  include: slowTestPatterns,
});
