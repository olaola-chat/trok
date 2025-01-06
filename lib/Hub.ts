import mitt from "./mitt.ts";
import type { StreamData, TaskSnapshot } from "./type.ts";

export default abstract class Hub {
  static mitt = mitt<{ snapshot: TaskSnapshot; stream: StreamData }>();
  static snapshots: TaskSnapshot[] = [];

  static registry(snapshot: TaskSnapshot) {
    this.snapshots.push(snapshot);
    // 只保存最近的100个任务
    this.clean();
  }

  static clean() {
    const tasklist = Object.values(
      Object.groupBy(this.snapshots, (item) => item.task.id),
    );

    if (tasklist.length > 100) {
      tasklist.shift();
      this.snapshots = tasklist.flat().map((item) => item!);
    }
  }
}
