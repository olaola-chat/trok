import Builder from "./Builder.ts";
import type { Task } from "./type.ts";

export default abstract class Dispatcher {
  static queue: Task[] = [];

  static register(task: Task) {
    this.queue.push(task);
    this.dispatch();
  }

  static async dispatch() {
    if (!Builder.currentTask) {
      const task = this.queue.shift();
      if (task) await Builder.run(task);
    }
    setTimeout(() => this.dispatch(), 3000);
  }
}
