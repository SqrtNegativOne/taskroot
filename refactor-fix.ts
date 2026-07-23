import { Project } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.ts");
project.addSourceFilesAtPaths("src/**/*.tsx");

const dirs = ["auth", "domain", "store", "sync", "utils"];
for (const d of dirs) {
  const dir = project.getDirectory(`src/core/src/core/${d}`);
  if (dir) {
    for (const sf of dir.getSourceFiles()) {
      const baseName = sf.getBaseName();
      sf.move(`src/core/${d}/${baseName}`);
    }
  }
}

project.saveSync();
console.log("Fix complete.");
