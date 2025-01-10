import type { SocketData } from "./type.ts";

export type Notify = string | ((data: SocketData) => unknown);

export type Client = {
  send: (data: SocketData) => unknown;
  close?: (() => void) | undefined;
};

export default async function getNotifyClient(
  notify?: Array<Notify> | Notify,
  verbose = false,
): Promise<Client> {
  const notifies = [notify].flat().filter(Boolean) as Array<Notify>;

  const clients: Client[] = await Promise.all(
    notifies.map(async (notify) => {
      if (typeof notify !== "string") return { send: notify };
      if (notify.startsWith("http")) {
        return getHttpNotifyClient(notify, verbose);
      }
      if (notify.startsWith("ws")) {
        return await getWebocketNotifyClient(notify, verbose);
      }
      throw new Error(`未知notify格式: ${notify}`);
    }),
  );

  clients.push({
    send: (data: SocketData) => {
      console.log(data.type === "stream" ? data.data.data : data.data);
    },
  });

  return {
    send: (data: SocketData) => clients.map((item) => item.send(data)),
    close: () => clients.map((item) => item.close?.()),
  };
}

const isVerbose = (data: SocketData) =>
  data.type === "stream" || data.data.status === "progress";

function getHttpNotifyClient(notify: string, verbose: boolean): Client {
  if (verbose) console.warn(`http通知强制关闭verbose选项, 仅通知必要信息`);
  return {
    send: (data: SocketData) => {
      if (isVerbose(data)) return;
      fetch(notify, {
        method: "POST",
        body: JSON.stringify(data),
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
  };
}

async function getWebocketNotifyClient(notify: string, verbose: boolean) {
  const socket = new WebSocket(notify);
  return await new Promise<Client>((resolve, reject) => {
    socket.addEventListener("open", () => {
      resolve({
        send: (data: SocketData) => {
          if (isVerbose(data) && !verbose) return;
          socket.send(JSON.stringify(data));
        },
        close: () => socket.close(1000, "通知完成"),
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
