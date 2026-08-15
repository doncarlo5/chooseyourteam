import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const catalogsDirectory = new URL(
  "../src/localization/locales/",
  import.meta.url,
);

const getCatalogSnapshot = async (directory = catalogsDirectory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const snapshot = new Map();

  for (const entry of entries) {
    const entryUrl = new URL(entry.name, directory);

    if (entry.isDirectory()) {
      const nestedSnapshot = await getCatalogSnapshot(
        new URL(`${entry.name}/`, directory),
      );

      for (const [path, hash] of nestedSnapshot) {
        snapshot.set(`${entry.name}/${path}`, hash);
      }

      continue;
    }

    const contents = await readFile(entryUrl);
    snapshot.set(
      entry.name,
      createHash("sha256").update(contents).digest("hex"),
    );
  }

  return snapshot;
};

const runScript = (script) => {
  const result = spawnSync("npm", ["run", script], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const before = await getCatalogSnapshot();
runScript("i18n:extract");
runScript("i18n:compile");
const after = await getCatalogSnapshot();

const changedFiles = [...new Set([...before.keys(), ...after.keys()])].filter(
  (path) => before.get(path) !== after.get(path),
);

if (changedFiles.length > 0) {
  console.error(
    `Generated localization catalogs were stale:\n${changedFiles.map((path) => `- ${path}`).join("\n")}`,
  );
  process.exit(1);
}
