import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to /feasibility...');
  await page.goto('http://localhost:5173/feasibility');
  
  // seed state to force result page
  await page.evaluate(() => {
    const result = {
      resultType: "realistic",
      resultTitle: "Test Result",
      resultSummary: "Test Summary",
      recommendation: "Test Recommendation",
      readinessScore: 10,
      adjustedScore: 10,
      wheelScore: 5,
      diagnosticScore: 5,
      maxDiagnosticScore: 10,
      axisScores: [],
      bottleneck: { axis: "time", label: "Time", score: 2, action: "Fix time" },
      planLoad: "balanced",
      weeklyCapacity: "medium",
      firstWeekGuidance: "Start slow",
      scopeRecommendation: "Small scope",
      smartGoalQualityLevel: "okay",
    };
    localStorage.setItem("pending_feasibility_result", JSON.stringify(result));
    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
  });

  await page.reload();
  
  const content = await page.content();
  if (content.includes('Mục tiêu này đủ thực tế') || content.includes('Test Result')) {
    console.log('SUCCESS: Feasibility result page rendered');
  } else {
    console.log('FAILED: Feasibility result page NOT rendered');
    await page.screenshot({ path: 'feasibility-debug.png', fullPage: true });
  }

  await browser.close();
})();
