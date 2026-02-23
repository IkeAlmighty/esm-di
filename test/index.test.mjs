import assert from "node:assert";
import { test } from "node:test";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { DependencyInjector } from "../index.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULE_EXT_REGEX = /\.(js|mjs|cjs)$/;

async function getModules(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let modules = [];

  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name);

    if (entry.isDirectory()) {
      console.log("is a directory");
      const subModules = await getModules(fullPath);
      modules = modules.concat(subModules);
    } else if (entry.isFile() && MODULE_EXT_REGEX.test(entry.name)) {
      const fileUrl = pathToFileURL(fullPath).href;
      const module = await import(fileUrl);

      modules.push(module);
    }
  }

  return modules;
}

test("maps dependencies from directory", async () => {
  const dir = path.join(__dirname, "./mock-dependencies");
  const injector = await DependencyInjector.init(await getModules(dir));
  const dependencies = injector.trackedFunctions;

  assert.ok(dependencies["MockService"], "MockService should be tracked.");
});

test("injects dependencies into function", async () => {
  const dir = path.join(__dirname, "./mock-dependencies");
  const injector = await DependencyInjector.init(await getModules(dir));

  function testFunction() {
    const { MockService } = testFunction.dependencies;
    return MockService();
  }

  assert.doesNotThrow(
    () => injector.injectDependencies(testFunction),
    "injectDependencies should not throw.",
  );

  assert.ok(
    testFunction.dependencies.MockService,
    "MockService should be injected as a dependency.",
  );

  assert.doesNotThrow(
    () => testFunction(),
    "testFunction should execute without throwing after dependencies are injected.",
  );
});

test("throws error for cicular dependencies", async () => {
  const dir = path.join(__dirname, "./mock-dependencies");
  const injector = await DependencyInjector.init(await getModules(dir));

  function startFunction() {
    const { CircularDependency } = startFunction.dependencies;
    return CircularDependency();
  }

  injector.injectDependencies(startFunction);

  assert.throws(() => startFunction(), {
    message: /(Circular dependency detected)*/,
  });
});

test("'this' keyword works correctly in injected objects", async () => {
  const dir = path.join(__dirname, "./mock-dependencies");
  const injector = await DependencyInjector.init(await getModules(dir));

  function TestObject() {
    const { MockObject } = this.dependencies;
    return new MockObject();
  }

  injector.injectDependencies(TestObject);

  assert.doesNotThrow(
    () => new TestObject(),
    "TestObject should execute without throwing after dependencies are injected.",
  );

  function TestObjectReturnedFromInjector() {
    const { MockObject } = this.dependencies;
    return new MockObject();
  }

  const InjectedTestObject = injector.injectDependencies(
    TestObjectReturnedFromInjector,
  );

  assert.doesNotThrow(
    () => new InjectedTestObject(),
    "InjectedTestObject should execute without throwing after dependencies are injected.",
  );
});
