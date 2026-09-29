import { expect, test } from "@playwright/test";

test("SSR and navigation render the same selected treatment without hydration errors", async ({
  browser,
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/?exp.arrival-flow=control&exp.destination-density=control&country=US&offers=off",
  );
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".hero")).toHaveAttribute("data-hero-layout", "immersive");
  await expect(page.locator(".hero")).toHaveAttribute("data-search-layout", "overlay");
  await expect(page.locator(".destination-grid")).toHaveAttribute("data-columns", "three");
  await expect(page.locator(".image-card")).toHaveCount(6);
  await expect(page.locator(".hotel-card")).toHaveCount(3);
  await expect(page.locator(".offers")).toHaveCount(0);
  await page.getByRole("button", { name: "Decision inspector", exact: true }).click();
  await page.locator(".inspector-decisions summary").click();

  await page.getByLabel("arrival-flow assignment").selectOption("treatment");
  await expect(page.locator(".hero")).toHaveAttribute("data-hero-layout", "split");
  await page.getByLabel("destination-density assignment").selectOption("treatment");
  await expect(page.locator(".hero")).toHaveAttribute("data-hero-layout", "split");
  await expect(page.locator(".hero")).toHaveAttribute("data-search-layout", "inline");
  await expect(page.locator(".compact-card")).toHaveCount(6);
  await expect(page.locator(".destination-grid")).toHaveAttribute("data-columns", "two");
  await expect(page.locator(".decision-list")).toContainText(
    "experiment: arrival-flow / treatment",
  );
  await expect(page.locator(".decision-list")).toContainText(
    "experiment: destination-density / treatment",
  );

  await page.getByLabel("Visitor country").selectOption("IN");
  await expect(page.getByLabel("Visitor country")).toHaveValue("IN");
  await page.getByLabel("Seasonal offers flag").selectOption("on");
  await expect(page.locator(".offers")).toBeVisible();
  await expect(page.locator(".decision-list")).toContainText("rule: india-seasonal-offers");
  await page.getByLabel("Seasonal offers flag").selectOption("off");
  await expect(page.locator(".offers")).toHaveCount(0);
  await page.getByLabel("Seasonal offers flag").selectOption("on");
  await expect(page.locator(".offers")).toBeVisible();
  await page.getByLabel("Visitor country").selectOption("US");
  await expect(page.locator(".offers")).toHaveCount(0);
  await page.getByLabel("Visitor country").selectOption("IN");
  await expect(page.locator(".offers")).toBeVisible();

  await page.locator("#destination-select").selectOption("kyoto");
  await page.getByRole("button", { name: /Explore stays/ }).click();
  await expect(page).toHaveURL(/destination=kyoto/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Decision inspector", exact: true }).click();
  await page.locator(".inspector-decisions summary").click();
  await expect(page.locator(".compact-card")).toHaveCount(1);
  await expect(page.locator(".destination-grid")).toHaveAttribute("data-columns", "two");
  await expect(page.getByLabel("Visitor country")).toHaveValue("IN");
  await page.getByLabel("arrival-flow assignment").selectOption("control");
  await expect(
    page.locator(".inspector-experiment").filter({ hasText: "arrival-flow" }),
  ).toContainText("Assigned: control");
  await expect(page.locator(".image-card")).toHaveCount(1);
  await expect(page).toHaveURL(/destination=kyoto/);

  await page.goto("/destinations?destination=not-a-place&exp.arrival-flow=invalid");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Decision inspector/ }).click();
  await expect(page.getByText("No destination found")).toBeVisible();
  await expect(page.getByText(/Ignored invalid overrides/)).toContainText(
    "exp.arrival-flow=invalid",
  );
  await page.getByRole("link", { name: /Clear destination filter/ }).click();
  await expect(page.locator(".destination-card")).toHaveCount(7);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home" })
    .click();
  await expect(page.getByRole("heading", { name: /Go somewhere/ })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Destinations" })
    .click();
  await expect(page.locator(".destination-card")).toHaveCount(7);
  expect(errors).toEqual([]);

  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const ssrPage = await noJs.newPage();
  await ssrPage.goto(
    "/?exp.arrival-flow=treatment&exp.destination-density=treatment&country=IN&offers=on",
  );
  await expect(ssrPage.getByRole("heading", { name: /Go somewhere/ })).toBeVisible();
  await expect(ssrPage.locator(".compact-card")).toHaveCount(6);
  await expect(ssrPage.locator(".offers")).toBeVisible();
  await ssrPage.goto("/destinations");
  await expect(ssrPage.locator(".destination-card")).toHaveCount(7);
  await noJs.close();
});

test("cookie keeps auto assignments across reload and mobile grid fits viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Decision inspector", exact: true }).click();
  const assigned = await page.locator(".inspector-assignment").allTextContents();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Decision inspector", exact: true }).click();
  await expect(page.locator(".inspector-assignment")).toHaveText(assigned);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Destinations" })
    .click();
  await expect(page.locator(".destination-card")).toHaveCount(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
