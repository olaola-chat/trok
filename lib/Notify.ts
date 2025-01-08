import { SocketHub } from "./Hub.ts";
import Server from "./Server.tsx";
import type { SocketData } from "./type.ts";

export type NotifyClient = {
  notify: (message: SocketData) => unknown;
  release: () => void;
};

function isVerbose(message: SocketData) {
  return message.type === "stream" ||
    message.data.status! == "progress";
}

export default class Notify {
  static async getClient(
    notify?: string,
    verbose = false,
  ): Promise<NotifyClient> {
    // http只通知非verbose信息
    if (notify?.startsWith("http")) {
      return ({
        notify: (message: SocketData) => {
          if (isVerbose(message)) return;
          fetch(notify, {
            method: "POST",
            body: JSON.stringify(message),
            headers: { "Content-Type": "applicatin/json" },
          });
        },

        release: () => void 0,
      });
    }

    // websocket通知
    if (notify?.startsWith("ws")) {
      const socket = new WebSocket(notify);
      return await new Promise<NotifyClient>((resolve, reject) => {
        socket.addEventListener("open", () => {
          resolve({
            notify: (message: SocketData) => {
              if (verbose) return socket.send(JSON.stringify(message));
              if (isVerbose(message)) return;
              socket.send(JSON.stringify(message));
            },
            release: () => void socket.close(1000, "通知完成"),
          });
        });
        socket.addEventListener("close", (e) => {
          console.log(`websocket closed: code: ${e.code}; reason: ${e.reason}`);
          if (e.code !== 1000) reject(e.reason);
        });
        socket.addEventListener("error", (e) => {
          const message = e instanceof Error ? e.message : "unknown error";
          console.log(`websocket error: ${message}`);
        });
      });
    }

    if (notify) throw new Error("非法的notify地址");

    // 用户未配置notify
    return {
      notify: (message: SocketData) => {
        if (message.data.task.from === Server.id) {
          if (verbose) return SocketHub.broadcast(message);
          if (isVerbose(message)) return;
          SocketHub.broadcast(message);
          return;
        }
        if (verbose) return console.log(message);
        if (isVerbose(message)) return;
        console.log(message);
      },
      release: () => void 0,
    };
  }
}
