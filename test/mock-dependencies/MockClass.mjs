export default class MockClass {
  constructor() {
    const { MockService } = this.dependencies;

    MockService();
  }
}
