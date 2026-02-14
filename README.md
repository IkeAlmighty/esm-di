# 💉 JS-DI (JavaScript Dependency Injector)

A lightweight, **Proxy-based** dependency injection system for ESM. JS-DI allows functions to access their dependencies dynamically via `this.dependencies` without the "prop-drilling" nightmare of passing services through every single function call.

## 🚀 Features

- **Directory Mapping**: Automatically crawls directories to register `.mjs` and `.js` files based on their default exports.
- **Lazy Injection**: Dependencies are only resolved and injected the moment they are actually accessed.
- **Circular Detection**: Real-time detection of circular dependency chains (e.g., `A -> B -> A`) using a recursive tracking Set.
- **Context Binding**: Automatically binds functions and objects to themselves so that `this.dependencies` (or `FunctionName.dependencies`) is always accessible.

---

## 📦 Installation & Setup

Include `DependencyInjector.mjs` in your project and point it to your source files.

```javascript
import { DependencyInjector } from "./index.mjs";

// Initialize and auto-map a directory
const di = await DependencyInjector.init("./path/to/dependency/directory");
```

---

## 🛠 Examples

### 1. Standard Functions

For regular functions, dependencies can be accessed via the function name itself or `this`.

```javascript
function ServiceA() {
  // ServiceB is a default exported function of a file
  // in the mapped dependency directory
  const { ServiceB } = ServiceA.dependencies;
  return ServiceB();
}

di.injectDependencies(ServiceA); // Inject dependencies
ServiceA(); // Runs perfectly
```

### 2. Class Instantiation

When using ES6 Classes, the injector attaches the proxy to the `prototype`, making dependencies available via `this`.

```javascript
class ObjectA {
  constructor() {
    // 'this' refers to the instance; dependencies are inherited from the prototype
    const { ServiceB } = this.dependencies;
    console.log("ServiceB accessed!");
  }
}

di.injectDependencies(ObjectA);
new ObjectA(); // Runs perfectly
```

### 3. Function Constructors

Function constructors behave exactly like classes. The injector ensures that any instance created with `new` has access to the dependency tree.

```javascript
function FunctionD() {
  const { ServiceB } = this.dependencies;
  console.log("ServiceB accessed via constructor!");
}

di.injectDependencies(FunctionD);
const instance = new FunctionD(); // Runs perfectly
```

---

## ⚙️ How it Works

1.  **Direct Attachment**: The injector attaches a `dependencies` Proxy directly to the function object.
2.  **Prototype Link**: It also attaches that same Proxy to `func.prototype`. This is what allows `new` instances to access the tree via `this`.
3.  **Lazy Resolution**: Dependencies are trapped by a **Proxy** and only resolved/injected when they are actually accessed (e.g., during destructuring).
4.  **Self-Binding**: The injector uses `func.bind(func)` so that `this` inside a standard function call points to the function object itself.

---

## 🧪 Error Handling

| Error                                                              | Cause                                                                    |
| :----------------------------------------------------------------- | :----------------------------------------------------------------------- |
| `Dependency X not tracked`                                         | The requested function name was not found during the directory scan.     |
| `Circular dependency detected`                                     | A loop was found in the dependency graph (e.g., A → B → A).              |
| `Warning: Default function ... does not have a 'name' property...` | A file was skipped because the default export was an anonymous function. |
