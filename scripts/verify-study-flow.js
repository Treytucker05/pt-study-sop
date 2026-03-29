const page = await browser.getPage("study-flow");
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

function check(name, condition) {
  if (condition) {
    console.log(`PASS: ${name}`);
    passed += 1;
  } else {
    console.log(`FAIL: ${name}`);
    failed += 1;
  }
}

async function seedTutorSessionWithPrimedContext() {
  return page.evaluate(async () => {
    const materialsResponse = await fetch("/api/tutor/materials?course_id=1&enabled=1");
    if (!materialsResponse.ok) {
      throw new Error(`Failed to load materials: ${materialsResponse.status}`);
    }

    const rawMaterials = await materialsResponse.json();
    const materials = Array.isArray(rawMaterials)
      ? rawMaterials
      : Array.isArray(rawMaterials?.items)
        ? rawMaterials.items
        : rawMaterials?.id
          ? [rawMaterials]
          : [];
    const materialIds = materials
      .map((material) => Number(material?.id))
      .filter((value) => Number.isFinite(value))
      .slice(0, 1);

    const createSessionResponse = await fetch("/api/tutor/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_id: 1,
        topic: "Study 004 seeded session",
        mode: "Core",
        content_filter: {
          material_ids: materialIds,
          accuracy_profile: "balanced",
        },
        packet_context:
          "Priming summary: Venous return is the preload driver. " +
          "Method result: Cardiac output equals stroke volume times heart rate.",
      }),
    });

    if (!createSessionResponse.ok) {
      throw new Error(await createSessionResponse.text());
    }

    const session = await createSessionResponse.json();
    return {
      sessionId: typeof session?.session_id === "string" ? session.session_id : "",
      materialCount: materialIds.length,
    };
  });
}

const seededSession = await seedTutorSessionWithPrimedContext();
console.log("Seeded Tutor session:", JSON.stringify(seededSession));
check("Seeded Tutor session created", Boolean(seededSession?.sessionId));
check("Seeded Tutor session carries material scope", (seededSession?.materialCount || 0) > 0);

await page.goto(
  `http://127.0.0.1:5000/tutor?course_id=1&session_id=${seededSession.sessionId}`,
  { waitUntil: "networkidle" },
);
await page.waitForTimeout(4000);

const openTutorButton = page.getByRole("button", { name: /open tutor panel/i });
if (await openTutorButton.count() > 0) {
  await openTutorButton.click();
  await page.waitForTimeout(1500);
}

const tutorChatInput = page.locator('input[placeholder="Ask a question..."]');
const tutorSendButton = page.getByRole("button", { name: /send message/i });
check("Tutor panel chat input exists", await tutorChatInput.count() > 0);
check("Tutor panel send button exists", await tutorSendButton.count() > 0);

const tutorPrompt =
  "According to the priming summary in this session, what is the preload driver? Answer in four words max.";
if (await tutorChatInput.count() > 0 && await tutorSendButton.count() > 0) {
  await tutorChatInput.fill(tutorPrompt);
  await tutorSendButton.click();
  check("Tutor panel message sent", true);
} else {
  check("Tutor panel message sent", false);
}

try {
  await page.waitForFunction(() => {
    const body = document.body.innerText.toLowerCase();
    return (
      body.includes("venous return") ||
      body.includes("connection error:") ||
      Array.from(document.querySelectorAll("button")).some((button) =>
        /save note/i.test(button.textContent || ""),
      )
    );
  }, { timeout: 90000 });
} catch (error) {
  console.log("Tutor chat wait failed:", String(error));
}

const bodyText = await page.locator("body").innerText();
const saveNoteButtons = await page.getByRole("button", { name: /save note/i }).count();
const hasGroundedTutorReply = bodyText.toLowerCase().includes("venous return");
check("Tutor panel sent message appears in chat history", bodyText.includes(tutorPrompt));
check(
  "Tutor panel response appears in chat history",
  (saveNoteButtons > 0 || hasGroundedTutorReply) &&
    !bodyText.includes("Connection error:"),
);
check(
  "Tutor panel response uses primed context",
  hasGroundedTutorReply,
);
if (consoleErrors.length > 0) {
  console.log("Console errors:", JSON.stringify(consoleErrors));
}
check("No console errors", consoleErrors.length === 0);

saveScreenshot(await page.screenshot(), "study-flow-04-tutor-chat.png");

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.log("VERIFICATION FAILED");
  process.exit(1);
} else {
  console.log("ALL CHECKS PASSED");
}
