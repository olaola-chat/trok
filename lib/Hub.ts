import type { Snapshot, SocketData, Task } from "./type.ts";
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
        else {
          const data = JSON.parse(e.data) as SocketData;
          if (data.type === "snapshot") SnapshotHub.registry(data.data);
          this.clients.filter((item) => !item.ua.startsWith("Deno")).forEach(
            (item) => item.socket.send(e.data),
          );
        }
      },
    );
  }
}

export abstract class TaskHub {
  static tasks: Task[] = [];

  static register(task: Task) {
    this.tasks.push(task);
    this.dispatch();
  }

  static async dispatch() {
    if (!Builder.currentTask) {
      const task = this.tasks.shift();
      if (task) await Builder.run(task);
    }
    setTimeout(() => this.dispatch(), 3000);
  }
}
