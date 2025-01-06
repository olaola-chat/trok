import type { SocketData } from "./type.ts";
import Configiration from "./Configration.ts";
import Server from "./Server.tsx";

export type NotifyClient = {
  notify: (message: SocketData) => unknown;
  release: () => void;
};

export default class Notify {
  static async getClient(): Promise<NotifyClient> {
    const notify = Configiration.notify ?? Server.host;

    // 无处通知, 打印到控制台
    if (!notify) {
      return {
        notify: (message: SocketData) => console.log(message),
        release: () => void 0,
      };
    }

    // http通知
    if (notify.startsWith("http")) {
      return ({
        notify: (message: SocketData) =>
          void fetch(notify, {
            method: "POST",
            body: JSON.stringify(message),
            headers: { "Content-Type": "applicatin/json" },
          }),
        release: () => void 0,
      });
    }

    // websocket通知
    if (notify.startsWith("ws")) {
      const socket = new WebSocket(notify);
      return await new Promise<NotifyClient>((resolve, reject) => {
        socket.addEventListener("open", () => {
          resolve({
            notify: (message: SocketData) =>
              void socket.send(JSON.stringify(message)),
            release: () => void socket.close(1000),
          });
        });
        socket.addEventListener("close", (e) => {
          if (e.code !== 1000) reject(e.reason);
        });
      });
    }

    throw new Error("非法的notify地址");
  }
}
