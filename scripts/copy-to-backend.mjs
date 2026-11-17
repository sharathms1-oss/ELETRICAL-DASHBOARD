import { copyFileSync, existsSync } from "node:fs";
if (!existsSync("dist/index.html")) throw new Error("dist/index.html missing - build first");
copyFileSync("dist/index.html", "backend/index.html");
console.log("Copied dist/index.html -> backend/index.html");
