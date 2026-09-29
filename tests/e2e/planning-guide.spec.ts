import { expect, test } from "@playwright/test";

test("planning flag gates independent copy-density treatment across routes and card variants", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?guide=on&exp.planning-guide-detail=control&exp.arrival-flow=control");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Decision inspector", exact: true }).click();
  await page.locator(".inspector-decisions summary").click();
  await expect(page.locator(".hero .planning-prompt")).toHaveText(/Plan at your own pace/);
  await expect(page.locator(".destination-card .planning-prompt")).toHaveCount(6);
  await expect(page.locator(".hotel-card .planning-prompt")).toHaveCount(3);
  await expect(page.locator(".planning-prompt-expanded")).toHaveCount(0);
  await expect(page.locator(".decision-list")).toContainText("rule: planning-guide-flag");

  await page.getByLabel("planning-guide-detail assignment").selectOption("treatment");
  await expect(page.locator(".hero .planning-prompt")).toContainText("narrow the collection");
  await expect(page.locator(".planning-prompt-expanded")).toHaveCount(10);
  await expect(page.locator(".decision-list")).toContainText(
    "experiment: planning-guide-detail / treatment",
  );
  await page.locator("#destination-select").selectOption("kyoto");
  await page.getByRole("button", { name: /Explore stays/ }).click();
  await expect(page).toHaveURL(/destination=kyoto/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Decision inspector", exact: true }).click();
  await expect(page.locator(".destination-card .planning-prompt")).toHaveCount(1);
  await expect(page.getByLabel("Planning guide flag")).toHaveValue("on");
  await expect(page.getByLabel("planning-guide-detail assignment")).toHaveValue("treatment");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home" })
    .click();
  await expect(page.locator(".hero .planning-prompt")).toContainText("narrow the collection");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Destinations" })
    .click();
  await expect(page.locator(".destination-intro .planning-prompt")).toContainText("Select a card");
  await expect(page.locator(".image-card .planning-prompt")).toHaveCount(7);
  await page.getByRole("button", { name: "Decision inspector", exact: true }).click();
  await page.locator(".inspector-decisions summary").click();

  await page.getByLabel("arrival-flow assignment").selectOption("treatment");
  await expect(page.locator(".compact-card .planning-prompt")).toHaveCount(7);
  await page.getByLabel("Planning guide flag").selectOption("off");
  await expect(page.locator(".planning-prompt")).toHaveCount(0);
  await expect(page.locator(".decision-list")).toContainText("planningGuide.detail");
  await page.getByLabel("Planning guide flag").selectOption("on");
  await expect(page.locator(".compact-card .planning-prompt")).toHaveCount(7);
  await page.getByRole("link", { name: /Bali Jungle hideaways/ }).click();
  await expect(page).toHaveURL(/destination=bali/);
  await expect(page.getByRole("complementary", { name: "Decision inspector" })).toBeVisible();
  await expect(page.locator(".compact-card .planning-prompt")).toHaveCount(1);
  await expect(page.getByLabel("Planning guide flag")).toHaveValue("on");

  await page.goto("/destinations?destination=kyoto&guide=broken&exp.planning-guide-detail=bad");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Decision inspector/ }).click();
  await expect(page.locator(".planning-prompt")).toHaveCount(0);
  await expect(page.locator(".ignored")).toContainText("guide=broken");
  await expect(page.locator(".ignored")).toContainText("exp.planning-guide-detail=bad");
  await expect(page.locator(".destination-card")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("guided variant is server-rendered and mobile split hero keeps legible cue", async ({
  browser,
}) => {
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await noJs.newPage();
  await page.goto("/?guide=on&exp.planning-guide-detail=treatment&exp.arrival-flow=treatment");
  await expect(page.locator(".hero .planning-prompt")).toContainText("narrow the collection");
  await expect(page.locator(".hero .planning-prompt")).toHaveCSS("color", "rgb(244, 227, 199)");
  await expect(page.locator(".compact-card .planning-prompt")).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.goto("/destinations?guide=on&exp.planning-guide-detail=treatment");
  await expect(page.locator(".destination-intro .planning-prompt")).toBeVisible();
  await expect(page.locator(".destination-card .planning-prompt")).toHaveCount(7);
  await noJs.close();
});
