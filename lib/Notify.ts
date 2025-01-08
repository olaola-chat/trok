import { SocketHub } from "./Hub.ts";
import Server from "./Server.tsx";
import type { SocketData } from "./type.ts";

export type NotifyClient = {
  notify: (message: SocketData) => unknown;
  release: () => void;
};

export default class Notify {
  static verbose = false;
  static notify: string;
  static async getClient(): Promise<NotifyClient> {
    if (!this.notify) {
      return {
        notify: (message: SocketData) => {
          if (message.data.task.from === Server.id) {
            SocketHub.broadcast(message);
          } else {
            // 无处通知, 打印到控制台
            console.log(
              message.type === "stream" ? message.data.data : message,
            );
          }
        },
        release: () => void 0,
      };
    }

    // http通知
    if (this.notify.startsWith("http")) {
      return ({
        notify: (message: SocketData) => {
          // http简单通知下
          if (
            message.type === "snapshot" && message.data.status !== "progress"
          ) {
            void fetch(this.notify, {
              method: "POST",
              body: JSON.stringify(message),
              headers: { "Content-Type": "applicatin/json" },
            });
          } else console.log(message);
        },

        release: () => void 0,
      });
    }

    // websocket通知
    if (this.notify.startsWith("ws")) {
      const socket = new WebSocket(this.notify);
      return await new Promise<NotifyClient>((resolve, reject) => {
        socket.addEventListener("open", () => {
          resolve({
            notify: (message: SocketData) => {
              void socket.send(JSON.stringify(message));
            },
            release: () => void socket.close(1000),
          });
        });
        socket.addEventListener("close", (e) => {
          /**
           * e.code always 1005
           * @see https://github.com/denoland/deno/issues/27566
           */
          console.log(`websocket closed: code: ${e.code}; reason: ${e.reason}`);
          if (e.code !== 1000) reject(e.reason);
        });
        socket.addEventListener("error", (e) => {
          console.log(
            `websocket error: ${
              e instanceof Error ? e.message : "unknown error"
            }`,
          );
        });
      });
    }

    throw new Error("非法的notify地址");
  }
}
