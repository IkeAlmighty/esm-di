import path from "node:path";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CONSTR_TOKEN = Symbol("DependencyInjector Constructor");
const MODULE_EXT_REGEX = /\.(js|mjs|cjs)$/;

export class DependencyInjector {
  constructor(token) {
    if (token !== CONSTR_TOKEN)
      throw new Error(
        "Call await DependencyInstructor.init() to create the DI",
      );
    this.trackedFunctions = {};
  }

  static async init(modules) {
    const di = new DependencyInjector(CONSTR_TOKEN);
    await di.mapDependencies(modules);
    return di;
  }

  async mapDependencies(modules) {
    for (const module of modules) {
      const dep = module.default;
      if (!dep) continue;
      const depName = dep.name ?? dep.constructor?.name;
      if (depName) {
        this.trackedFunctions[depName] = dep;
      }
    }
  }

  // actually injects proxies for dependencies into the function's 'dependencies' property
  injectDependencies(func, visited = new Set()) {
    const depName = func.name ?? func.constructor.name;
    if (visited.has(depName)) {
      throw new Error(
        `Circular dependency detected: ${[...visited, depName].join(" -> ")}`,
      );
    }

    const dependencies = {};
    const proxy = new Proxy(dependencies, {
      get: (_, prop) => {
        const dependencyFunc = this.trackedFunctions[prop];
        if (!dependencyFunc) throw new Error(`Dependency ${prop} not tracked.`);

        const nextVisited = new Set(visited);
        nextVisited.add(depName);

        // recursively inject dependencies for the dependency function
        return this.injectDependencies(dependencyFunc, nextVisited);
      },
    });

    const isInstance = typeof func === "object" && func !== null;
    if (isInstance) {
      func.dependencies = proxy;
      return func;
    }

    const isClass = func.toString().startsWith("class");
    if (isClass) {
      // trap the constructor of the class so that dependencies is added once constructed:
      const classTrap = new Proxy(func, {
        construct(target, args) {
          const instance = Reflect.construct(target, args);
          instance.dependencies = proxy;
          return instance;
        },
      });

      return classTrap;
    }

    func.dependencies = proxy;
    return func.bind(func);
  }
}

export async function getModules(dir, { quiet = false } = {}) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let modules = [];

  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name);

    if (entry.isDirectory()) {
      const subModules = await getModules(fullPath, { quiet });
      modules = modules.concat(subModules);
    } else if (entry.isFile() && MODULE_EXT_REGEX.test(entry.name)) {
      const fileUrl = pathToFileURL(fullPath).href;
      const module = await import(fileUrl);

      if (module.default && !module.default.name) {
        console.warn(
          `Default export of ${fileUrl} does not have a name and so will not be tracked by esm-di DependencyInjector (if this export is an object of "YourClassName", you can add "this.name = YourClassName.name" to the constructor to fix this).`,
        );
      }

      modules.push(module);
    }
  }

  return modules;
}
