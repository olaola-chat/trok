import type { StreamData, TaskSnapshot } from "./type.ts";
import mitt from "https://esm.sh/mitt@3.0.1";

export default abstract class Hub {
  static mitt = mitt<{ snapshot: TaskSnapshot; stream: StreamData }>();
  static snapshots: TaskSnapshot[] = [];

  // TODO: 只保存最近的100条消息
  static clean() {}
}
