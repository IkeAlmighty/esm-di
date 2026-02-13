export default class MockObject {
  constructor() {
    this.name = "MockObject";

    const { MockService } = this.dependencies;

    MockService();
  }
}
