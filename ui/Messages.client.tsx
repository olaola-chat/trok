import { render } from "https://esm.sh/preact@10.25.3";
import { useEffect, useState } from "https://esm.sh/preact@10.25.3/hooks";
import type { TaskState } from "../type.ts";
import Message from "./Message.tsx";

function notifyMe(message: string) {
  if (!("Notification" in window)) alert("当前浏览器不支持桌面通知");
  else if (Notification.permission === "granted") new Notification(message);
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(message);
    });
  }
}

function useWebsocketMessage() {
  const [messages, setMessages] = useState<TaskState[]>([]);
  useEffect(() => {
    const client = new WebSocket(location.href.replace("http", "ws"));
    client.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as TaskState;
      notifyMe(
        { pending: "开始处理", resolved: "处理完成", rejected: "处理失败" }[
          message.status
        ],
      );
      setMessages((messages) => [...messages, message]);
    });
    client.addEventListener("error", (event) => {
      console.log(event);
    });
  }, []);
  return messages;
}

export default function Messages() {
  const messages = useWebsocketMessage();
  return messages.map((item) => <Message message={item} />);
}

render(<Messages />, document.getElementById("messages")!);
