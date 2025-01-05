import mitt from "https://esm.sh/mitt@3.0.1";

import type { TaskState } from "./type.ts";
import { getConfig } from "./util.ts";

const config = getConfig();

// TODO: 只保存最近的100条消息
export default abstract class TaskSnapshot {
  static mitt = mitt<{ snapshot: TaskState }>();
  static snapshots: TaskState[] = [];
  static take(taskState: TaskState) {
    const snapshot = { ...taskState, timestamp: Date.now() };
    this.snapshots.push(snapshot);
    this.mitt.emit("snapshot", snapshot);

    if (config.notify) {
      // 打包过程不通知
      if (
        this.snapshots.some((item) => item.status === "pending") &&
        snapshot.status === "pending"
      ) return;

      fetch(config.notify, {
        method: "POST",
        body: JSON.stringify(snapshot),
        headers: { "Content-Type": "application/json" },
      });
    }
    // TODO: 通知snapshop到webhook
  }
}
