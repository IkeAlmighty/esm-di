import assert from "node:assert";
import { test } from "node:test";
import { DependencyInjector } from "../index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("maps dependencies from directory", async () => {
  const injector = await DependencyInjector.init(
    path.join(__dirname, "./mock-dependencies"),
  );
  const dependencies = injector.trackedFunctions;

  assert.ok(dependencies["MockService"], "MockService should be tracked.");
});

test("injects dependencies into function", async () => {
  const injector = await DependencyInjector.init(
    path.join(__dirname, "./mock-dependencies"),
  );

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
  const injector = await DependencyInjector.init(
    path.join(__dirname, "./circular-dependencies"),
  );

  function startFunction() {
    const { CircularDependency } = startFunction.dependencies;
    return CircularDependency();
  }

  injector.injectDependencies(startFunction);

  assert.throws(() => startFunction(), {
    message: /Circular dependency detected/,
  });
});

test("'this' keyword works correctly in injected objects", async () => {
  const injector = await DependencyInjector.init(
    path.join(__dirname, "./mock-dependencies"),
  );

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
