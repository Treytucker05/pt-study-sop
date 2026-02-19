const KNOWN_EXTENSION_ASYNC_RESPONSE_ERRORS = [
  "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
  "The message port closed before a response was received.",
];

const extractMessage = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value) {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "";
};

const isKnownExtensionNoise = (value: unknown): boolean => {
  const message = extractMessage(value);
  return KNOWN_EXTENSION_ASYNC_RESPONSE_ERRORS.some((signature) =>
    message.includes(signature),
  );
};

let installed = false;

export const installRuntimeNoiseFilter = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Some browser extensions inject async messaging that rejects without a receiver.
  // Ignore only this known extension noise to keep console signal useful.
  window.addEventListener("unhandledrejection", (event) => {
    if (!isKnownExtensionNoise(event.reason)) return;
    event.preventDefault();
  });
};
