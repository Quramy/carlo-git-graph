#!/usr/bin/env node

import path from "path";
import { fetchGraph } from "./graph";

if (process.argv.length <= 2) {
  console.log(`Usage: carlo-git-graph repository_path`);
  process.exit(1);
}
const repoPath = process.argv[2];

async function main() {
  const carlo = require("carlo");
  const app = await carlo.launch();

  app.serveFolder(path.join(__dirname, ".."));

  await app.exposeFunction("fetchGraph", () => fetchGraph(repoPath));

  await app.load("www/index.html");
}

main();
