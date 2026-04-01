const BASE_URL = "http://127.0.0.1:5000/tutor?board_scope=project";
const page = await browser.getPage("verify-prime-006");
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

function log(message) {
  console.log(message);
}

function check(name, condition, details = undefined) {
  if (condition) {
    passed += 1;
    log(`PASS: ${name}`);
    return;
  }

  failed += 1;
  log(`FAIL: ${name}${details ? ` :: ${details}` : ""}`);
}

async function ensureEntryCard() {
  const entryCard = page.locator('[data-testid="studio-entry-state"]');
  if ((await entryCard.count()) > 0) {
    return entryCard;
  }

  const newSessionButton = page.getByRole("button", { name: /^new session$/i });
  if ((await newSessionButton.count()) > 0) {
    await newSessionButton.first().click();
    await page.waitForTimeout(1200);
  }

  await page.waitForSelector('[data-testid="studio-entry-state"]', {
    timeout: 15000,
  });
  return entryCard;
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
      if (!response.ok) continue;

      const raw = await response.json();
      const materials = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
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

async function setReactInputValue(selector, value) {
  return page.evaluate(
    ({ targetSelector, nextValue }) => {
      const element = document.querySelector(targetSelector);
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        return false;
      }
      const prototype =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(element, nextValue);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { targetSelector: selector, nextValue: value },
  );
}

async function openSession() {
  const entryCard = await ensureEntryCard();
  check("Tutor entry card is available", (await entryCard.count()) > 0);
  await page.waitForFunction(() => {
    const select = document.querySelector('select[aria-label="Course for new priming session"]');
    return select instanceof HTMLSelectElement && select.options.length > 1;
  }, { timeout: 30000 });

  const courseChoice = await chooseCourseWithMaterials();
  check(
    "A course with enabled materials is available",
    Boolean(courseChoice?.courseId),
    courseChoice ? JSON.stringify(courseChoice) : "no eligible course",
  );
  if (!courseChoice?.courseId) {
    throw new Error("No course with materials available for PRIME-006 verification");
  }

  await page
    .locator('select[aria-label="Course for new priming session"]')
    .selectOption(courseChoice.courseId);
  await page.waitForTimeout(1200);

  check(
    "Session name can be populated",
    await setReactInputValue('input[aria-label="Session Name"]', "PRIME-006 verification"),
  );

  const createWorkflowResponse = page.waitForResponse((response) => {
    return (
      response.request().method() === "POST" &&
      response.url().includes("/api/tutor/workflows")
    );
  });

  await page.getByRole("button", { name: /start priming/i }).click();
  await createWorkflowResponse;
  await page.waitForSelector('[data-testid="studio-priming-panel"]', {
    timeout: 20000,
  });
}

async function installPrimingAssistStub() {
  await page.evaluate(() => {
    if (window.__prime006StubInstalled) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input);
      if (!url.includes("/priming-assist")) {
        return originalFetch(input, init);
      }

      const requestText =
        typeof init?.body === "string"
          ? init.body
          : input instanceof Request
            ? await input.clone().text()
            : "";
      const body = requestText ? JSON.parse(requestText) : {};
      const materialIds = Array.isArray(body.material_ids)
        ? body.material_ids.filter((value) => Number.isFinite(Number(value))).map(Number)
        : [101];
      const methodId =
        Array.isArray(body.priming_method_ids) && body.priming_method_ids.length > 0
          ? String(body.priming_method_ids[0])
          : "M-PRE-008";
      const methodName = "Structural Extraction";
      const mermaidSource =
        "graph TD\n  A[Cardiac Output] --> B[Stroke Volume]\n  A --> C[Heart Rate]";
      const mermaid = `\`\`\`mermaid\n${mermaidSource}\n\`\`\``;
      const updatedAt = new Date().toISOString();

      const methodRun = {
        method_id: methodId,
        method_name: methodName,
        output_family: "notes",
        outputs: {
          map: mermaid,
          follow_up_targets: ["Pressure-flow relationships"],
        },
        source_ids: materialIds,
        status: "complete",
        updated_at: updatedAt,
      };

      const source_inventory = materialIds.map((materialId, index) => ({
        id: materialId,
        title: `Verification Material ${index + 1}`,
        source_path: `/tmp/verification-material-${materialId}.txt`,
        content_type: "txt",
        priming_output: {
          material_id: materialId,
          title: `Verification Material ${index + 1}`,
          source_path: `/tmp/verification-material-${materialId}.txt`,
          summary: null,
          concepts: [],
          terminology: [],
          root_explanation: mermaid,
          gaps: ["Pressure-flow relationships"],
          learning_objectives: [],
          updated_at: updatedAt,
        },
        method_outputs: [methodRun],
      }));

      return new Response(
        JSON.stringify({
          source_inventory,
          priming_method_runs: [methodRun],
          aggregate: {
            summaries: [],
            concepts: [],
            terminology: [],
            root_explanations: source_inventory.map((item) => ({
              material_id: item.id,
              title: item.title,
              text: mermaid,
            })),
            identified_gaps: source_inventory.map((item) => ({
              material_id: item.id,
              title: item.title,
              gap: "Pressure-flow relationships",
            })),
            learning_objectives: [],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    window.__prime006StubInstalled = true;
  });
}

async function selectOnlyMethod(methodId) {
  await page.waitForFunction((targetMethodId) => {
    const cards = Array.from(
      document.querySelectorAll('[data-testid="priming-method-card"][data-method-id]'),
    );
    return cards.some((card) => card.getAttribute("data-method-id") === targetMethodId);
  }, methodId, { timeout: 60000 });
  const updated = await page.evaluate((targetMethodId) => {
    const cards = Array.from(
      document.querySelectorAll('[data-testid="priming-method-card"][data-method-id]'),
    );
    for (const card of cards) {
      const cardMethodId = card.getAttribute("data-method-id");
      const selected = card.getAttribute("data-selected") === "true";
      if (cardMethodId === targetMethodId && !selected) {
        card.click();
      } else if (cardMethodId !== targetMethodId && selected) {
        card.click();
      }
    }
    return cards.some((card) => card.getAttribute("data-method-id") === targetMethodId);
  }, methodId);

  check(`${methodId} card is available`, updated);
  await page.waitForTimeout(500);
}

async function runMethod(methodId) {
  await selectOnlyMethod(methodId);

  check(
    `Run button enabled for ${methodId}`,
    await page.getByTestId("priming-run-button").isEnabled(),
  );

  await page.getByTestId("priming-run-button").click();
  await page.waitForSelector('[data-testid="priming-result-block"]', { timeout: 120000 });
  await page.waitForTimeout(2500);
  check(`${methodId} priming result blocks render`, true);
}

async function verifyConceptMapButtonsAndGraphTool() {
  await runMethod("M-PRE-008");

  const buttonLabels = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll('[data-testid="priming-result-block"] button'),
    ).map((button) => button.textContent?.trim() || "");
  });

  check(
    "Priming concept map shows a View as Text button",
    buttonLabels.some((label) => /view as text/i.test(label)),
    JSON.stringify(buttonLabels),
  );
  check(
    "Priming concept map shows an Open in Graph Tool button",
    buttonLabels.some((label) => /open in graph tool/i.test(label)),
    JSON.stringify(buttonLabels),
  );

  await page.getByRole("button", { name: /open in graph tool/i }).click();

  await page.waitForSelector('[data-testid="studio-workspace-panel"]', {
    timeout: 20000,
  });
  await page.waitForTimeout(4000);

  const graphState = await page.evaluate(() => ({
    workspaceOpen: Boolean(document.querySelector('[data-testid="studio-workspace-panel"]')),
    conceptTabSelected:
      document
        .querySelector('[data-testid="studio-workspace-tab-concept-map"]')
        ?.getAttribute("aria-selected") === "true",
    nodeCount: document.querySelectorAll(
      ".react-flow__node, .react-flow__node-default, .react-flow [data-id]",
    ).length,
    graphText:
      document.querySelector('[data-testid="studio-workspace-panel"]')?.textContent || "",
  }));

  check(
    "Workspace panel opens after Open in Graph Tool",
    graphState.workspaceOpen,
    JSON.stringify(graphState),
  );
  check(
    "Concept Map tab is active after Open in Graph Tool",
    graphState.conceptTabSelected,
    JSON.stringify(graphState),
  );
  check(
    "Graph tool renders concept map nodes",
    graphState.nodeCount > 0 || /cardiac output|stroke volume|heart rate/i.test(graphState.graphText),
    JSON.stringify(graphState),
  );
}

await page.goto(BASE_URL, { waitUntil: "networkidle" });
await installPrimingAssistStub();
await openSession();
await verifyConceptMapButtonsAndGraphTool();

check(
  "No console errors were emitted during verification",
  consoleErrors.length === 0,
  consoleErrors.join(" | "),
);

log(`RESULT: ${passed} passed, ${failed} failed`);
await page.close();

if (failed > 0) {
  throw new Error(`PRIME-006 verification failed with ${failed} failing checks`);
}
