export default function CircularDependency() {
  const { ValidDependency } = CircularDependency.dependencies;
  return ValidDependency();
}
