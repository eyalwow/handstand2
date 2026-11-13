// Run against a local HTTP server; see docs/design/README.md.
const { chromium } = require("playwright");
const path = require("node:path");
const output = path.resolve(__dirname, "../docs/design");
const baseURL = process.env.BASE_URL || "http://127.0.0.1:4173";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    ignoreHTTPSErrors: process.env.ALLOW_TEST_PROXY_CERT === "1",
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  await page.goto(baseURL);
  const bytes = await page.evaluate(async () => {
    const image = new Image();
    image.src = "tests/fixtures/handstand.webp";
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, 768, 512);
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise(
      (r) =>
        (recorder.onstop = async () =>
          r(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())))),
    );
    recorder.start();
    const timer = setInterval(() => ctx.drawImage(image, 0, 0, 768, 512), 100);
    await new Promise((r) => setTimeout(r, 5500));
    clearInterval(timer);
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());
    return done;
  });
  await page.locator("#file").setInputFiles({
    name: "handstand-fixture.webm",
    mimeType: "video/webm",
    buffer: Buffer.from(bytes),
  });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    const status = await page.locator("#status").innerText();
    console.log(status);
    if (await page.locator("#out").isVisible()) {
      console.log(
        "SUCCESS real video decoded, MediaPipe scan complete, results and replay visible. Score:",
        await page.locator("#score").innerText(),
      );
      await page.locator("#spd").click();
      if (!(await page.locator("#spd").innerText()).includes("0.5"))
        throw Error("Playback speed failed");
      await page.locator("#next").click();
      await page.locator("#prev").click();
      await page.locator("#scrub").evaluate((e) => {
        e.value = "1";
      });
      await page.locator("#scrub").dispatchEvent("input");
      await page.locator("#play").click();
      await page.waitForFunction(
        () => document.getElementById("play").textContent === "עצור",
      );
      if ((await page.locator("#play").innerText()) !== "עצור")
        throw Error("Playback failed");
      await page.locator("#play").click();
      await page.evaluate(() => {
        document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(output, "after-results.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Results overflow on mobile");
      console.log(
        "PASS replay speed, frames, scrubbing, play/pause; mobile results no overflow",
      );
      await page
        .locator("#holdSec")
        .screenshot({ path: path.join(output, "after-results-mobile.png") });
      const chooserEvent = page.waitForEvent("filechooser");
      await page.locator("#newAnalysis").click();
      await chooserEvent;
      if (!(await page.locator("#out").isVisible()))
        throw Error("Cancelling new selection must preserve report");
      console.log(
        "PASS results workspace and new-video selection without losing current report",
      );
      await browser.close();
      return;
    }
    if (/שגיאה|לא זוהתה|לא הצלחנו|יותר מדי זמן|Error/.test(status)) break;
  }
  console.log("Final:", await page.locator("#status").innerText());
  await browser.close();
  process.exitCode = 1;
})();
