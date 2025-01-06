import { useCallback, useEffect, useState } from "preact/hooks";
import type {
  Repository,
  SocketData,
  Task,
  TaskSnapshot,
} from "../../../lib/type.ts";
import mitt from "../../../lib/mitt.ts";

function notifyMe(message: string) {
  if (!("Notification" in window)) alert("当前浏览器不支持桌面通知");
  else if (Notification.permission === "granted") new Notification(message);
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(message);
    });
  }
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Repository[]>([]);

  const fetchWorkspace = useCallback(
    () => void fetch("/workspace").then((res) => res.json()).then(setWorkspace),
    [],
  );

  useEffect(() => void fetchWorkspace(), []);

  return { workspace, fetchWorkspace };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const fetchTasks = useCallback(
    () => fetch("/task").then((res) => res.json()).then(setTasks),
    [],
  );
  useEffect(() => void fetchTasks(), []);
  return { tasks, fetchTasks };
}

export class Socket {
  static mitt = mitt<{ data: SocketData }>();
  static client = new WebSocket(
    new URL("hub", location.href).href.replace("http", "ws"),
  );

  static {
    this.client.addEventListener("message", (event) => {
      const data = JSON.parse(event.data) as SocketData;
      this.mitt.emit("data", data);
    });
  }
}

export function useHub() {
  const [snapshots, setSnapshots] = useState<TaskSnapshot[]>([]);
  useEffect(() => {
    fetch("/hub").then((res) => res.json()).then(setSnapshots).then(
      () => {
        Socket.mitt.on("data", (data) => {
          if (data.type === "snapshot") {
            notifyMe(
              {
                pending: "开始处理",
                resolved: "处理完成",
                rejected: "处理失败",
              }[data.data.status],
            );
            setSnapshots((snapshot) => [...snapshot!, data.data]);
          }
        });
      },
    );
  }, []);
  return snapshots;
}
