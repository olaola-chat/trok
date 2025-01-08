import type { Snapshot, SocketData, Task, TaskHubItem } from "./type.ts";
import Builder from "./Builder.ts";

export abstract class SnapshotHub {
  static snapshots: Snapshot[] = [];

  static registry(snapshot: Snapshot) {
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

type SocketClient = {
  ua: string;
  socket: WebSocket;
};

export abstract class SocketHub {
  static clients: SocketClient[] = [];

  static broadcast(data: SocketData) {
    if (data.type === "snapshot") SnapshotHub.registry(data.data);
    this.clients.filter((item) => !item.ua.startsWith("Deno")).forEach(
      (item) => item.socket.send(JSON.stringify(data)),
    );
  }

  static registry(client: SocketClient) {
    this.clients.push(client);

    client.socket.addEventListener("close", () => {
      const index = this.clients.findIndex((item) =>
        item.socket === client.socket
      );
      this.clients.splice(index, 1);
    });

    client.socket.addEventListener(
      "message",
      (e) => {
        if (e.data === "PING") client.socket.send("PONG");
        else this.broadcast(JSON.parse(e.data) as SocketData);
      },
    );
  }
}

export abstract class TaskHub {
  static list: TaskHubItem[] = [];

  static register(taskOptions: Omit<Task, "id">, verbose = true) {
    const task = { ...taskOptions, id: globalThis.crypto.randomUUID() };
    this.list.push({ verbose, task });
    this.dispatch();
  }

  static async dispatch() {
    if (!Builder.currentTask) {
      const item = this.list.shift();
      if (item) await Builder.run(item.task, undefined, item.verbose);
    }
    setTimeout(() => this.dispatch(), 3000);
  }
}
