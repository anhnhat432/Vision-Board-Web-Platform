import { baseTestExclude, defineVisionBoardVitestConfig } from "./vitest.shared";
import { syncTestPatterns, unitTestPatterns } from "./vitest.test-groups";

export default defineVisionBoardVitestConfig({
  include: unitTestPatterns,
  exclude: [...baseTestExclude, ...syncTestPatterns],
  fileParallelism: true,
});
