const expectedMajor = 25;
const actualVersion = process.versions.node;
const actualMajor = Number.parseInt(actualVersion.split(".")[0] ?? "", 10);

if (actualMajor !== expectedMajor) {
  console.error(
    [
      `PromptDesk is configured for Node.js ${expectedMajor}.x, but the current runtime is ${process.version}.`,
      'Run "nvm use" in this repository, then run "npm install" before starting the app.',
    ].join("\n"),
  );
  process.exit(1);
}
