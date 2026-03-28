const page = await browser.getPage("pt-study-a11y-meta");

async function loadAtViewport(width, height) {
  await page.setViewportSize({ width, height });
  await page.goto("http://127.0.0.1:5000/", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

await loadAtViewport(1280, 900);

const metadata = await page.evaluate(() => {
  const description = document
    .querySelector('meta[name="description"]')
    ?.getAttribute("content") || "";
  const viewport = document
    .querySelector('meta[name="viewport"]')
    ?.getAttribute("content") || "";

  return {
    title: document.title,
    description,
    viewport,
  };
});

if (metadata.title !== "PT Study Brain") {
  throw new Error(`Unexpected document.title: ${metadata.title}`);
}

if (!metadata.description) {
  throw new Error("Meta description is missing");
}

if (metadata.viewport.includes("maximum-scale=1")) {
  throw new Error(`Viewport still blocks zoom: ${metadata.viewport}`);
}

await loadAtViewport(390, 844);

const mobileBrand = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll("span"));
  const shortBrand = spans.find((element) =>
    (element.textContent || "").trim() === "PT STUDY",
  );
  const fullBrand = spans.find((element) =>
    (element.textContent || "").trim() === "TREY'S STUDY SYSTEM",
  );

  return {
    shortBrand: shortBrand ? shortBrand.textContent.trim() : "",
    fullBrand: fullBrand ? fullBrand.textContent.trim() : "",
  };
});

if (mobileBrand.shortBrand !== "PT STUDY") {
  throw new Error(`Expected mobile short brand, got: ${JSON.stringify(mobileBrand)}`);
}

const mobileHeaderPath = await saveScreenshot(
  await page.screenshot({ fullPage: false }),
  "mobile-header.png",
);

await loadAtViewport(1920, 1080);

const desktopBrand = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll("span"));
  const fullBrand = spans.find((element) =>
    (element.textContent || "").trim() === "TREY'S STUDY SYSTEM",
  );

  return fullBrand ? fullBrand.textContent.trim() : "";
});

if (desktopBrand !== "TREY'S STUDY SYSTEM") {
  throw new Error(`Expected desktop full brand, got: ${desktopBrand}`);
}

const desktopHeaderPath = await saveScreenshot(
  await page.screenshot({ fullPage: false }),
  "desktop-header.png",
);

console.log(
  JSON.stringify(
    {
      metadata,
      mobileBrand,
      mobileHeaderPath,
      desktopBrand,
      desktopHeaderPath,
    },
    null,
    2,
  ),
);
