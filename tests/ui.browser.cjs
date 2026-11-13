// Run against a local HTTP server; see docs/design/README.md.
const { chromium } = require("playwright");
const path = require("node:path");
const output = path.resolve(__dirname, "../docs/design");
const baseURL = process.env.BASE_URL || "http://127.0.0.1:4173";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    ignoreHTTPSErrors: process.env.ALLOW_TEST_PROXY_CERT === "1",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(output, "after-desktop.png"),
    fullPage: true,
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(150);
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
      rtl: document.documentElement.dir,
    }));
    if (dimensions.scroll > width)
      throw Error("Horizontal overflow " + JSON.stringify(dimensions));
    if (width === 390)
      await page.screenshot({
        path: path.join(output, "after-mobile.png"),
        fullPage: true,
      });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (
    (await page
      .locator(".intro-copy")
      .evaluate((e) => getComputedStyle(e).animationName)) !== "none"
  )
    throw Error("Reduced motion failed");
  await page.goto(baseURL);
  await page.keyboard.press("Tab");
  if (
    (await page
      .locator(".skip-link")
      .evaluate((e) => document.activeElement === e)) !== true
  )
    throw Error("Skip link inaccessible");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  if (!page.url().endsWith("#upload")) throw Error("Skip target failed");
  await page.locator("#dropzone").dispatchEvent("drop", {
    dataTransfer: await page.evaluateHandle(() => {
      const d = new DataTransfer();
      d.items.add(new File(["bad"], "notes.txt", { type: "text/plain" }));
      return d;
    }),
  });
  if (!(await page.locator("#status").innerText()).includes("זה לא קובץ"))
    throw Error("Invalid drop not handled");
  await page.locator("#file").setInputFiles({
    name: "sample.webm",
    mimeType: "video/webm",
    buffer: Buffer.from("invalid-video-test"),
  });
  if (!(await page.locator("#fileName").innerText()).includes("sample.webm"))
    throw Error("File selection not reflected");
  if (errors.length)
    throw Error("Uncaught browser errors: " + errors.join("; "));
  console.log(
    JSON.stringify(
      {
        responsive: "320, 390, 768, 1440: no overflow",
        keyboard: "skip link passed",
        motion: "reduced motion passed",
        upload: "file selection and invalid drop passed",
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
})();
