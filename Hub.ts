import { asta } from "@rawrxd/asta";
import type { TaskState } from "./type.ts";

// TODO: 只保存最近的100条消息
export default abstract class Hub {
  static mitt = asta<{ message: Omit<TaskState, "timestamp"> }>();
  static messages: TaskState[] = [];
  static register(message: TaskState) {
    this.messages.push(message);
    this.mitt.emit("message", message);
  }
}
