const CONSTR_TOKEN = Symbol("DependencyInjector Constructor");

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
      if (module.default) {
        if (!module.default.name) {
          console.warn(
            `Warning: Default function in file ${file} does not have a 'name' property, and so will be skipped in dependencies.`,
          );
        } else {
          this.trackedFunctions[module.default.name] = module.default;
        }
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
