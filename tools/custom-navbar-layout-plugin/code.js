const FRAME_NAME = "PT Study Navbar Layout";
const FRAME_WIDTH = 1536;
const FRAME_HEIGHT = 1024;

const BUTTON_LAYOUT = {
  brain: { x: 176, y: 304, width: 359, height: 191 },
  scholar: { x: 582, y: 296, width: 371, height: 204 },
  tutor: { x: 990, y: 304, width: 376, height: 188 },
  library: { x: 225, y: 459, width: 210, height: 118 },
  mastery: { x: 430, y: 458, width: 231, height: 120 },
  calendar: { x: 661, y: 458, width: 214, height: 119 },
  methods: { x: 881, y: 458, width: 218, height: 119 },
  vault: { x: 1095, y: 460, width: 220, height: 117 },
};

const PRIMARY_BUTTONS = ["brain", "scholar", "tutor"];
const SECONDARY_BUTTONS = ["library", "mastery", "calendar", "methods", "vault"];

figma.showUI(__html__, {
  width: 440,
  height: 700,
  themeColors: true,
});

figma.ui.onmessage = async (message) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "cancel") {
    figma.closePlugin();
    return;
  }

  if (message.type !== "layout-assets") {
    return;
  }

  try {
    const payload = normalizePayload(message.payload);
    await figma.loadFontAsync({ family: "Inter", style: "Regular" }).catch(() => {});

    const frame = buildNavbarFrame(payload);
    figma.currentPage.appendChild(frame);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
    figma.notify(`Created ${frame.name}`);
    figma.closePlugin();
  } catch (error) {
    figma.ui.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Plugin payload was missing.");
  }

  const background = payload.background;
  const buttons = Array.isArray(payload.buttons) ? payload.buttons : [];

  if (!background || !background.name || !background.bytes) {
    throw new Error("Select the dashboard background PNG first.");
  }

  const buttonMap = {};
  for (const button of buttons) {
    if (!button || !button.name || !button.bytes) {
      continue;
    }
    const key = normalizeName(button.name);
    if (BUTTON_LAYOUT[key]) {
      buttonMap[key] = {
        name: button.name,
        bytes: ensureUint8Array(button.bytes),
      };
    }
  }

  const missing = Object.keys(BUTTON_LAYOUT).filter((key) => !buttonMap[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing button PNGs: ${missing.join(", ")}. Expected files named like brain.png and vault.png.`
    );
  }

  return {
    background: {
      name: background.name,
      bytes: ensureUint8Array(background.bytes),
    },
    buttons: buttonMap,
  };
}

function ensureUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value);
  }
  throw new Error("Unsupported image byte payload.");
}

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function buildNavbarFrame(payload) {
  const frame = figma.createFrame();
  frame.name = `${FRAME_NAME} ${timestampLabel()}`;
  frame.resizeWithoutConstraints(FRAME_WIDTH, FRAME_HEIGHT);
  frame.fills = [
    {
      type: "SOLID",
      color: rgb("#111111"),
    },
  ];
  frame.clipsContent = false;

  const backgroundRect = figma.createRectangle();
  backgroundRect.name = "Dashboard Background";
  backgroundRect.resizeWithoutConstraints(FRAME_WIDTH, FRAME_HEIGHT);
  backgroundRect.fills = [
    {
      type: "IMAGE",
      imageHash: figma.createImage(payload.background.bytes).hash,
      scaleMode: "FILL",
    },
  ];
  backgroundRect.locked = true;
  frame.appendChild(backgroundRect);

  const primaryNodes = PRIMARY_BUTTONS.map((key) =>
    createButtonNode(key, payload.buttons[key], frame)
  );
  const secondaryNodes = SECONDARY_BUTTONS.map((key) =>
    createButtonNode(key, payload.buttons[key], frame)
  );

  const primaryGroup = figma.group(primaryNodes, frame);
  primaryGroup.name = "Primary Nav";

  const secondaryGroup = figma.group(secondaryNodes, frame);
  secondaryGroup.name = "Secondary Nav";

  return frame;
}

function createButtonNode(key, asset, parent) {
  const spec = BUTTON_LAYOUT[key];
  const rect = figma.createRectangle();
  rect.name = buttonLabel(key);
  rect.x = spec.x;
  rect.y = spec.y;
  rect.resizeWithoutConstraints(spec.width, spec.height);
  rect.fills = [
    {
      type: "IMAGE",
      imageHash: figma.createImage(asset.bytes).hash,
      scaleMode: "FILL",
    },
  ];
  rect.strokes = [];
  rect.cornerRadius = 0;
  parent.appendChild(rect);
  return rect;
}

function buttonLabel(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function timestampLabel() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}${min}`;
}

function rgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(match[1], 16) / 255,
    g: parseInt(match[2], 16) / 255,
    b: parseInt(match[3], 16) / 255,
  };
}
