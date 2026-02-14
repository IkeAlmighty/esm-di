import fs from "fs";
import path from "path";

const CONSTR_TOKEN = Symbol("DependencyInjector Constructor");

export class DependencyInjector {
  constructor(token) {
    if (token !== CONSTR_TOKEN)
      throw new Error(
        "Call await DependencyInstructor.init() to create the DI",
      );
    this.trackedFunctions = {};
  }

  static async init(dir) {
    const di = new DependencyInjector(CONSTR_TOKEN);
    await di.mapDependencies(dir);
    return di;
  }

  async mapDependencies(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith(".mjs") || file.endsWith(".js")) {
        const modulePath = path.join(dir, file);
        try {
          const module = await import(`file://${modulePath}`);
          if (module.default) {
            if (!module.default.name) {
              console.warn(
                `Warning: Default function in file ${file} does not have a 'name' property, and so will be skipped in dependencies.`,
              );
            } else {
              this.trackedFunctions[module.default.name] = module.default;
            }
          }
        } catch (error) {
          console.error(`Error loading dependency from file ${file}:`, error);
        }
      } else if (fs.lstatSync(path.join(dir, file)).isDirectory()) {
        await this.mapDependencies(path.join(dir, file));
      }
    }
  }

  // actually injects proxies for dependencies into the function's 'dependencies' property
  injectDependencies(func, visited = new Set()) {
    if (visited.has(func.name)) {
      throw new Error(
        `Circular dependency detected: ${[...visited, func.name].join(" -> ")}`,
      );
    }

    const dependencies = {};
    const proxy = new Proxy(dependencies, {
      get: (_, prop) => {
        const dependencyFunc = this.trackedFunctions[prop];
        if (!dependencyFunc) throw new Error(`Dependency ${prop} not tracked.`);

        const nextVisited = new Set(visited);
        nextVisited.add(func.name);

        // recursively inject dependencies for the dependency function
        this.injectDependencies(dependencyFunc, nextVisited);
        return dependencyFunc;
      },
    });

    func.dependencies = proxy;
    func.prototype.dependencies = proxy;

    return func.bind(func);
  }
}
