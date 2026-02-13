export default function MockService() {
  const { AnotherMockService } = MockService.dependencies;
  AnotherMockService();
  console.log("This is a mock service for testing purposes.");
}
