import { build as viteBuild } from "vite";
import { rm } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const buildScriptDir = path.dirname(fileURLToPath(import.meta.url));
const localDistDir = path.resolve(buildScriptDir, "dist");
const flaskDistDir = path.resolve(buildScriptDir, "..", "brain", "static", "dist");

async function buildAll() {
  await rm(localDistDir, { recursive: true, force: true });
  await rm(flaskDistDir, { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();
}

buildAll()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
