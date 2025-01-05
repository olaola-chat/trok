import mitt from "https://esm.sh/mitt@3.0.1";
import type { TaskSnapshot } from "./type.ts";

// TODO: 只保存最近的100条消息
export default abstract class HubHandler {
  static mitt = mitt<{ message: Omit<TaskSnapshot, "timestamp"> }>();
  static messages: TaskSnapshot[] = [];
  static register(message: TaskSnapshot) {
    this.messages.push(message);
    this.mitt.emit("message", message);
  }
}
