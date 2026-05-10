import { test, expect } from "@playwright/test"

test("guest can access home page", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveURL("/")

  await expect(
    page.getByRole("heading", { name: "WeddingOS" })
  ).toBeVisible()

  await expect(
    page.getByRole("button", { name: "Começar" })
  ).toBeVisible()
})