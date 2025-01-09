import { SocketHub } from "./Hub.ts";
import server from "./server.tsx";
import type { SocketData, Task } from "./type.ts";

export type NotifyClient = {
  notify: (message: SocketData) => unknown;
  release?: () => void;
};

function isVerbose(data: SocketData) {
  return data.type === "stream" || data.data.status! == "progress";
}

export default class Notify {
  static async getClient(
    task: Task,
    notify?: string | string[],
    verbose = false,
  ): Promise<NotifyClient> {
    const notifies = [notify].flat().filter(Boolean) as string[];

    const clients = await Promise.all(
      notifies.map(async (notify) => {
        // http只通知非verbose信息
        if (notify.startsWith("http")) {
          if (verbose) {
            console.warn(`http通知强制关闭verbose选项, 仅通知必要信息`);
          }
          return ({
            notify: (message: SocketData) => {
              if (isVerbose(message)) return;
              fetch(notify, {
                method: "POST",
                body: JSON.stringify(message),
                headers: { "Content-Type": "applicatin/json" },
              }).then(async (res) => {
                console.log(
                  `notify ${notify} response status:`,
                  res.status,
                  res.statusText,
                );
                const contentType = res.headers.get("Content-Type");
                if (contentType?.startsWith("application/json")) {
                  console.log(
                    `notify ${notify} response body: ${
                      JSON.stringify(await res.json(), null, 2)
                    }`,
                  );
                } else {console.log(
                    `notify ${notify} response body: ${await res.text()}`,
                  );}
              }).catch((err) => console.log(`${notify} request error: ${err}`));
            },
          });
        }

        // websocket通知
        if (notify.startsWith("ws")) {
          const socket = new WebSocket(notify);
          return await new Promise<NotifyClient>((resolve, reject) => {
            socket.addEventListener("open", () => {
              resolve({
                notify: (message: SocketData) => {
                  if (isVerbose(message) && !verbose) return;
                  socket.send(JSON.stringify(message));
                },
                release: () => socket.close(1000, "通知完成"),
              });
            });
            socket.addEventListener("close", (e) => {
              console.log(
                `websocket closed: code: ${e.code}; reason: ${e.reason}`,
              );
              if (e.code !== 1000) reject(e.reason);
            });
            socket.addEventListener("error", (e) => {
              const message = e instanceof Error ? e.message : "unknown error";
              console.log(`websocket error: ${message}`);
            });
          });
        }

        throw new Error(`位置notify格式: ${notify}`);
      }),
    );

    const socketNotifyClient = {
      notify: (data: SocketData) => SocketHub.broadcast(data),
    };
    const isFromLocalServer = task.from === server.id;
    if (isFromLocalServer) clients.push(socketNotifyClient);

    const consoleNotifyClient = {
      notify: (data: SocketData) => {
        console.log(data.type === "stream" ? data.data.data : data.data);
      },
    };
    clients.push(consoleNotifyClient);

    return {
      notify: (data: SocketData) => clients.map((item) => item.notify(data)),
      release: () => clients.map((item) => item.release?.()),
    };
  }
}
