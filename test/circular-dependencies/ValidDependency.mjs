export default function ValidDependency() {
  const { CircularDependency } = ValidDependency.dependencies;
  return CircularDependency();
}
