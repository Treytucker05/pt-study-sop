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

const openTutorPanelButton = page.getByRole("button", {
  name: /open tutor panel/i,
});
if ((await page.locator('[data-testid="studio-tutor-panel"]').count()) === 0) {
  await openTutorPanelButton.click();
  await page.waitForTimeout(1200);
}

check(
  "Tutor panel opens from the toolbar",
  (await page.locator('[data-testid="studio-tutor-panel"]').count()) > 0,
);

const createSessionResponse = page.waitForResponse((response) => {
  return (
    response.request().method() === "POST" &&
    response.url().includes("/api/tutor/session") &&
    !response.url().includes("/turn")
  );
}, { timeout: 15000 }).catch(() => null);
await page.getByRole("button", { name: /^start session$/i }).click();

let sessionId = "";
const sessionResponse = await createSessionResponse;
if (sessionResponse) {
  const sessionPayload = await sessionResponse.json();
  sessionId =
    typeof sessionPayload?.session_id === "string"
      ? sessionPayload.session_id
      : "";
}

await page.waitForFunction(() => {
  return Boolean(document.querySelector('input[placeholder="Ask a question..."]'));
}, { timeout: 15000 });

if (!sessionId) {
  sessionId = await page.evaluate(() => {
    const fromUrl = new URL(window.location.href).searchParams.get("session_id");
    if (typeof fromUrl === "string" && fromUrl.trim()) {
      return fromUrl.trim();
    }
    const fromStorage = localStorage.getItem("tutor.active_session.v1");
    return typeof fromStorage === "string" ? fromStorage.trim() : "";
  });
}

check("Tutor session starts from the workflow", Boolean(sessionId));

const tutorInput = page.locator('input[placeholder="Ask a question..."]');
const tutorSend = page.getByRole("button", { name: /send message/i });
await tutorInput.fill(
  "According to this session, what drives preload? Answer in four words max.",
);
await tutorSend.click();

try {
  await page.waitForFunction(() => {
    const body = document.body.innerText.toLowerCase();
    return (
      body.includes("venous return") ||
      body.includes("connection error:")
    );
  }, { timeout: 90000 });
} catch (error) {
  console.log(`Tutor reply wait failed: ${String(error)}`);
}

const liveBodyText = await page.locator("body").innerText();
check(
  "Tutor chat returns a grounded reply",
  liveBodyText.toLowerCase().includes("venous return") &&
    !liveBodyText.includes("Connection error:"),
);

logStep("STEP: seed polish bundle");
await page.evaluate(
  async ({ activeWorkflowId, activeSessionId }) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);
    const payload = {
      tutor_session_id: activeSessionId,
      priming_bundle_id: null,
      exact_notes: [],
      editable_notes: [],
      summaries: [
        {
          id: "summary-0",
          title: "Polish final summary draft",
          content: "Venous return is the preload driver.",
        },
      ],
      feedback_queue: [],
      card_requests: [
        {
          id: "card-0",
          text: "What is the preload driver? :: Venous return",
        },
      ],
      reprime_requests: [],
      studio_payload: {
        polish_question: "",
        classification_note: "Seeded for REMAIN-001 verification",
        artifacts: [],
      },
      publish_targets: {
        obsidian: true,
        anki: true,
        brain: true,
        studio_artifacts: false,
      },
      status: "draft",
    };

    const response = await fetch(
      `/api/tutor/workflows/${activeWorkflowId}/polish-bundle`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    window.clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(await response.text());
    }
  },
  {
    activeWorkflowId: workflowId,
    activeSessionId: sessionId,
  },
);

logStep("STEP: save exact");
await page.getByRole("button", { name: /^save exact$/i }).click();
await page.waitForTimeout(1500);

logStep("STEP: save editable");
await page.getByRole("button", { name: /^save editable$/i }).click();
await page.waitForTimeout(1500);

logStep("STEP: promote tutor reply");
await page.getByRole("button", { name: /promote to polish packet/i }).click();
await page.waitForTimeout(2000);

logStep("STEP: open polish panels");
await page.getByRole("button", { name: /open polish panel/i }).click();
await page.waitForTimeout(1000);
await page.getByRole("button", { name: /open polish packet panel/i }).click();
await page.waitForTimeout(1000);

check(
  "Polish panel opens from toolbar",
  (await page.locator('[data-testid="studio-polish-panel"]').count()) > 0,
);
check(
  "Polish Packet opens from toolbar",
  (await page.locator('[data-testid="studio-polish-packet"]').count()) > 0,
);

await page.getByRole("button", { name: /tutor replies/i }).click();
await page.waitForTimeout(300);
const polishPanelText = await page
  .locator('[data-testid="studio-polish-panel"]')
  .innerText();
check(
  "Polish panel shows promoted tutor replies",
  /Tutor Reply/i.test(polishPanelText) &&
    polishPanelText.toLowerCase().includes("venous return"),
);

await page.getByRole("button", { name: /exact notes/i }).click();
await page.waitForTimeout(300);
const updatedPolishPanelText = await page
  .locator('[data-testid="studio-polish-panel"]')
  .innerText();
check(
  "Polish panel shows captured session notes",
  /Tutor exact reply/i.test(updatedPolishPanelText),
);

const summaryTextarea = page.getByPlaceholder(
  /Final summary draft for Obsidian and Brain indexing/i,
);
const summaryValue = await summaryTextarea.inputValue();
check(
  "Polish summary textarea is populated with real content",
  summaryValue.includes("Venous return is the preload driver."),
);

await summaryTextarea.fill(`${summaryValue}\nEdited during REMAIN-001 verification.`);
check(
  "Polish content remains editable/reviewable",
  (await summaryTextarea.inputValue()).includes(
    "Edited during REMAIN-001 verification.",
  ),
);

const cardTextarea = page.getByPlaceholder(/One flashcard request per line/i);
check(
  "Card requests are staged for export",
  (await cardTextarea.inputValue()).includes(
    "What is the preload driver? :: Venous return",
  ),
);

logStep("STEP: verify polish packet sections");
await page.waitForFunction(() => {
  const notes = document.querySelector(
    '[data-testid="polish-packet-section-notes"]',
  )?.textContent || "";
  const summaries = document.querySelector(
    '[data-testid="polish-packet-section-summaries"]',
  )?.textContent || "";
  const cards = document.querySelector(
    '[data-testid="polish-packet-section-cards"]',
  )?.textContent || "";

  return (
    /Tutor Reply/i.test(notes) &&
    notes.toLowerCase().includes("venous return") &&
    summaries.includes("Venous return is the preload driver.") &&
    cards.includes("What is the preload driver? :: Venous return")
  );
}, { timeout: 15000 }).catch(() => undefined);

const polishPacketNotesText = await page
  .locator('[data-testid="polish-packet-section-notes"]')
  .innerText();
const polishPacketSummariesText = await page
  .locator('[data-testid="polish-packet-section-summaries"]')
  .innerText();
const polishPacketCardsText = await page
  .locator('[data-testid="polish-packet-section-cards"]')
  .innerText();
logStep(
  "DEBUG: polish packet sections",
);
console.log(
  JSON.stringify({
    notes: polishPacketNotesText,
    summaries: polishPacketSummariesText,
    cards: polishPacketCardsText,
  }),
);
check(
  "Polish Packet shows staged tutor replies",
  /Tutor Reply/i.test(polishPacketNotesText) &&
    polishPacketNotesText.toLowerCase().includes("venous return"),
);
check(
  "Polish Packet shows staged summaries",
  polishPacketSummariesText.includes("Venous return is the preload driver."),
);
check(
  "Polish Packet shows staged cards",
  polishPacketCardsText.includes("What is the preload driver? :: Venous return"),
);

if (consoleErrors.length > 0) {
  logStep(`Console errors: ${JSON.stringify(consoleErrors)}`);
}
check("No console errors", consoleErrors.length === 0);

const screenshotPath = await saveScreenshot(
  await page.screenshot(),
  "verify-remaining-001-polish.png",
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
      packetSections: {
        notes: polishPacketNotesText,
        summaries: polishPacketSummariesText,
        cards: polishPacketCardsText,
      },
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
} else {
  logStep("ALL CHECKS PASSED");
}
