import { expect, test } from "@playwright/test";

test("floating inspector filters experiments, exposes provenance, and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?exp.arrival-flow=control&guide=on");
  await page.waitForLoadState("networkidle");

  const launcher = page.getByRole("button", { name: "Decision inspector", exact: true });
  const panel = page.getByRole("complementary", { name: "Decision inspector" });
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(launcher).toBeInViewport();
  await launcher.click();
  await expect(panel).toBeVisible();
  await expect(launcher).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("searchbox", { name: "Filter experiments" })).toBeFocused();
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  expect(
    await page.evaluate(
      () =>
        document.querySelector(".inspector-body")!.scrollHeight >
        document.querySelector(".inspector-body")!.clientHeight,
    ),
  ).toBe(true);

  await page.getByRole("searchbox", { name: "Filter experiments" }).fill("arrival");
  await expect(page.locator(".inspector-experiment")).toHaveCount(1);
  await page.getByLabel("arrival-flow assignment").selectOption("treatment");
  await expect(page.locator(".hero")).toHaveAttribute("data-hero-layout", "split");
  await expect(page.locator(".inspector-experiment")).toContainText("Assigned: treatment");
  await page.locator(".inspector-decisions summary").click();
  await expect(page.locator(".decision-list")).toContainText(
    "experiment: arrival-flow / treatment",
  );
  await page.getByRole("searchbox", { name: "Filter experiments" }).fill("not-registered");
  await expect(page.getByText(/No experiments match/)).toBeVisible();
  await page.getByRole("searchbox", { name: "Filter experiments" }).press("Escape");
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();
  await launcher.click();
  await page.getByRole("searchbox", { name: "Filter experiments" }).fill("");
  await page.getByRole("button", { name: "Close decision inspector" }).click();
  await expect(launcher).toBeFocused();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Destinations" })
    .click();
  await expect(page).toHaveURL(/exp.arrival-flow=treatment/);
  await expect(page.locator(".compact-card")).toHaveCount(7);
  await expect(page.locator(".destination-intro .planning-prompt")).toBeVisible();
  await expect(launcher).toHaveAttribute("aria-expanded", "false");
});

test("server decisions stay isolated between visitors and refresh from URL navigation", async ({
  browser,
}) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await first.goto("/?exp.arrival-flow=treatment");
    await second.goto("/?exp.arrival-flow=control");
    await expect(first.locator(".hero")).toHaveAttribute("data-hero-layout", "split");
    await expect(second.locator(".hero")).toHaveAttribute("data-hero-layout", "immersive");

    await first.getByRole("button", { name: "Decision inspector", exact: true }).click();
    await first.getByLabel("arrival-flow assignment").selectOption("control");
    await expect(first.locator(".hero")).toHaveAttribute("data-hero-layout", "immersive");
    await expect(second.locator(".hero")).toHaveAttribute("data-hero-layout", "immersive");
    await second.getByRole("button", { name: "Decision inspector", exact: true }).click();
    await second.getByLabel("arrival-flow assignment").selectOption("treatment");
    await expect(second.locator(".hero")).toHaveAttribute("data-hero-layout", "split");
    await expect(first.locator(".hero")).toHaveAttribute("data-hero-layout", "immersive");
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
