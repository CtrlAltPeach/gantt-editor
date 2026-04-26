import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const type = process.argv[2] ?? "patch";

const tauriConf = resolve(__dirname, "../src-tauri/tauri.conf.json");
const pkgJson = resolve(__dirname, "../package.json");

const conf = JSON.parse(readFileSync(tauriConf, "utf8"));
const pkg = JSON.parse(readFileSync(pkgJson, "utf8"));

const [major, minor, patch] = conf.version.split(".").map(Number);

const next =
        type === "major" ? `${major + 1}.0.0` :
                type === "minor" ? `${major}.${minor + 1}.0` :
                        `${major}.${minor}.${patch + 1}`;

conf.version = next;
pkg.version = next;

writeFileSync(tauriConf, JSON.stringify(conf, null, 2));
writeFileSync(pkgJson, JSON.stringify(pkg, null, 2));

console.log(`Version bumped to ${next}`);