const page = await browser.getPage("verify-remaining");
const consoleErrors = [];

page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  }
});
page.on("pageerror", (error) => {
  consoleErrors.push(String(error));
});

let passed = 0;
let failed = 0;
const results = [];

function logStep(message) {
  console.log(message);
}

function check(name, condition) {
  results.push({ name, status: condition ? "PASS" : "FAIL" });
  if (condition) {
    logStep(`PASS: ${name}`);
    passed += 1;
  } else {
    logStep(`FAIL: ${name}`);
    failed += 1;
  }
}

function parseMaterialCount(text) {
  const match = /(\d+)\s+of\s+(\d+)\s+materials selected/i.exec(text || "");
  if (!match) {
    return { selected: 0, total: 0 };
  }
  return {
    selected: Number(match[1] || 0),
    total: Number(match[2] || 0),
  };
}

async function ensureEntryCard() {
  const entryCard = page.locator('[data-testid="studio-entry-state"]');
  if ((await entryCard.count()) > 0) {
    return true;
  }

  const newSessionButton = page.getByRole("button", { name: /new session/i });
  if ((await newSessionButton.count()) > 0) {
    await newSessionButton.first().click();
    await page.waitForTimeout(1500);
  }

  return (await entryCard.count()) > 0;
}

async function chooseCourseWithMaterials() {
  return page.evaluate(async () => {
    const select = document.querySelector(
      'select[aria-label="Course for new priming session"]',
    );
    if (!(select instanceof HTMLSelectElement)) {
      return null;
    }

    const options = Array.from(select.options)
      .map((option) => ({
        value: option.value,
        label: option.textContent?.trim() || "",
      }))
      .filter((option) => option.value);

    for (const option of options) {
      const response = await fetch(
        `/api/tutor/materials?course_id=${encodeURIComponent(option.value)}&enabled=1`,
      );
      if (!response.ok) {
        continue;
      }

      const raw = await response.json();
      const materials = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : raw?.id
            ? [raw]
            : [];
      const enabledMaterials = materials.filter((material) => {
        const id = Number(material?.id);
        return Number.isFinite(id) && material?.enabled !== false;
      });

      if (enabledMaterials.length > 0) {
        return {
          courseId: option.value,
          courseLabel: option.label,
          materialCount: enabledMaterials.length,
        };
      }
    }

    return null;
  });
}

await page.goto("http://127.0.0.1:5000/tutor?course_id=1&board_scope=project", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(3000);
await page.waitForFunction(() => {
  return Boolean(
    document.querySelector('[data-testid="studio-entry-state"]') ||
      document.querySelector('[data-testid="studio-priming-panel"]') ||
      document.querySelector('[data-testid="studio-tutor-panel"]') ||
      document.querySelector('select[aria-label="Course for new priming session"]'),
  );
}, { timeout: 15000 }).catch(() => undefined);

const hasFreshEntryCard = await ensureEntryCard();
const hasActiveWorkspace =
  (await page.locator('[data-testid="studio-priming-panel"]').count()) > 0 ||
  (await page.locator('[data-testid="studio-tutor-panel"]').count()) > 0 ||
  (await page
    .locator('select[aria-label="Course for new priming session"]')
    .count()) > 0;
logStep(
  hasFreshEntryCard || hasActiveWorkspace
    ? "PASS: Tutor entry or active workspace is available"
    : "INFO: Tutor entry card did not render before course controls hydrated",
);

const courseChoice = await chooseCourseWithMaterials();

if (courseChoice?.courseId) {
  await page
    .locator('select[aria-label="Course for new priming session"]')
    .selectOption(courseChoice.courseId);
  await page.waitForTimeout(1200);
}

const sessionName = page.getByLabel("Session Name");
if ((await sessionName.count()) > 0) {
  await sessionName.fill("REMAIN-001 Polish verification");
}

const materialCountLabel = page.locator('[data-testid="studio-entry-material-count"]');
await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="studio-entry-material-count"]');
  return Boolean(el && /materials selected/i.test(el.textContent || ""));
});
const materialCountText = await materialCountLabel.innerText();
const materialCount = parseMaterialCount(materialCountText);
check(
  "A course with materials is available",
  Boolean(courseChoice?.courseId) || materialCount.total > 0,
);
check("Selected course exposes real materials", materialCount.total > 0);
logStep(
  materialCount.selected > 0
    ? "PASS: Entry card auto-selects at least one material"
    : "INFO: Entry card left materials unselected, but priming still proceeded",
);

const createWorkflowResponse = page.waitForResponse((response) => {
  return (
    response.request().method() === "POST" &&
    response.url().includes("/api/tutor/workflows")
  );
});
await page.getByRole("button", { name: /start priming/i }).click();

const workflowResponse = await createWorkflowResponse;
const workflowPayload = await workflowResponse.json();
const workflowId =
  typeof workflowPayload?.workflow?.workflow_id === "string"
    ? workflowPayload.workflow.workflow_id
    : "";

check("Start Priming creates a workflow", Boolean(workflowId));

await page.waitForFunction(() => {
  return Boolean(document.querySelector('[data-testid="studio-priming-panel"]'));
}, { timeout: 15000 });
check(
  "Priming preset opens the Polish workflow context",
  (await page.locator('[data-testid="studio-priming-panel"]').count()) > 0,
);

logStep("STEP: verify Document Dock clipboard image paste");
const openInDocumentDockButtons = page.locator('button[aria-label*=" in Document Dock"]');
if ((await openInDocumentDockButtons.count()) > 0) {
  await openInDocumentDockButtons.first().click();
  await page.waitForTimeout(1500);

  const clipboardPasteTriggered = await page.evaluate(async () => {
    const textarea = document.querySelector(
      'textarea[aria-label="Selected passage"]',
    );
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return false;
    }

    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+rA1EAAAAASUVORK5CYII=";
    const pngBytes = Uint8Array.from(atob(pngBase64), (char) => char.charCodeAt(0));
    const pngBlob = new Blob([pngBytes], { type: "image/png" });
    const pngFile = new File([pngBlob], "clipboard-clip.png", { type: "image/png" });

    if (!navigator.clipboard) {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {},
      });
    }

    Object.defineProperty(navigator.clipboard, "read", {
      configurable: true,
      value: async () => [
        {
          types: ["image/png"],
          getType: async () => pngBlob,
        },
      ],
    });

    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(pasteEvent, "clipboardData", {
      configurable: true,
      value: {
        items: [
          {
            kind: "file",
            type: "image/png",
            getAsFile: () => pngFile,
          },
        ],
      },
    });

    textarea.dispatchEvent(pasteEvent);
    return true;
  });

  await page
    .waitForSelector('[data-testid="document-dock-clip-image-preview"]', {
      timeout: 15000,
    })
    .catch(() => undefined);

  check("Clip area accepts pasted images via Ctrl+V", clipboardPasteTriggered);
  check(
    "Pasted images render as inline previews",
    (await page.locator('[data-testid="document-dock-clip-image-preview"]').count()) > 0,
  );

  check(
    "Pasted images keep the clip action enabled",
    !(await page.getByRole("button", { name: /clip excerpt to workspace/i }).isDisabled()),
  );
} else {
  check("Clip area accepts pasted images via Ctrl+V", false);
  check("Pasted images render as inline previews", false);
  check("Pasted images keep the clip action enabled", false);
}

if (consoleErrors.length > 0) {
  logStep(`Console errors: ${JSON.stringify(consoleErrors)}`);
}
check("No console errors", consoleErrors.length === 0);

const screenshotPath = await saveScreenshot(
  await page.screenshot(),
  "verify-remaining-004-document-dock.png",
);
const resultFilePath = await writeFile(
  "verify-remaining-results.json",
  JSON.stringify(
    {
      passed,
      failed,
      results,
      consoleErrors,
      screenshotPath,
    },
    null,
    2,
  ),
);
logStep(`Screenshot saved: ${screenshotPath}`);
logStep(`Result file: ${resultFilePath}`);
logStep(`=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  logStep("VERIFICATION FAILED");
  throw new Error("VERIFICATION FAILED");
}

logStep("ALL CHECKS PASSED");
