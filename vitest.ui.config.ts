import { baseTestExclude, defineVisionBoardVitestConfig } from "./vitest.shared";
import { flowTestPatterns, syncTestPatterns, uiTestPatterns } from "./vitest.test-groups";

export default defineVisionBoardVitestConfig({
  include: uiTestPatterns,
  exclude: [...baseTestExclude, ...flowTestPatterns, ...syncTestPatterns],
});
