import { sleep } from "./util.ts";
import type { SocketData } from "./type.ts";
import Configiration from "./Configration.ts";

export default class Notify {
  static socket?: WebSocket;
  static setup() {
    if (!Configiration.notify) return;
    if (Configiration.notify.startsWith("ws")) {
      this.socket = new WebSocket(Configiration.notify);
    }
  }

  static async notify(message: SocketData) {
    if (!Configiration.notify) return console.log(message);
    if (Configiration.notify.startsWith("http")) {
      await fetch(Configiration.notify, {
        method: "POST",
        body: JSON.stringify(message),
        headers: { "Content-Type": "applicatin/json" },
      });
      return;
    }

    if (!this.socket) {
      await sleep(500);
      this.notify(message);
      return;
    }

    if (this.socket.readyState === this.socket.CLOSED) {
      await sleep(500);
      this.socket = new WebSocket(Configiration.notify);
      this.notify(message);
      return;
    }

    if (
      this.socket.readyState === WebSocket.CLOSING ||
      this.socket.readyState === WebSocket.CONNECTING
    ) {
      await sleep(500);
      this.notify(message);
    }

    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}
