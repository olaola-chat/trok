import mitt from "https://esm.sh/mitt@3.0.1";
import type { TaskState } from "./type.ts";

// TODO: 只保存最近的100条消息
export default abstract class HubHandler {
  static mitt = mitt<{ message: Omit<TaskState, "timestamp"> }>();
  static messages: TaskState[] = [];
  static register(message: TaskState) {
    this.messages.push(message);
    this.mitt.emit("message", message);
  }
}
