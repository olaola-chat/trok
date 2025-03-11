/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import {
  getApi,
  Socket,
  useTaskHubList,
  useWorkspace,
} from "../service/index.ts";
import { useEffect } from "preact/hooks";
import Repo from "./Repo.tsx";
import type { Task } from "../../../lib/type.ts";
import Hub from "./Hub.tsx";

export function TaskHubList(props: { list: Task[] }) {
  return (
    <div className="stack fixed bottom-2 right-2">
      {props.list.map((item) => {
        return (
          <div className="shadow rounded-lg p-4 bg-base-100 border text-center text-sm">
            {item.origin}
            <span className="badge badge-primary badge-sm mx-2">
              {item.branch}
            </span>
            <span className="kbd kbd-sm">{item.selector}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Workspace() {
  const { workspace } = useWorkspace();

  const { list, fetchTasks } = useTaskHubList();
  useEffect(() => {
    Socket.mitt.on("data", (data) => {
      if (data.type === "snapshot") fetchTasks();
    });
  }, []);

  return (
    <div className="flex gap-2 w-screen">
      {workspace.length
        ? (
          <div className="p-2 bg-base-200 h-screen overflow-y-scroll">
            {workspace.map((item) => (
              <Repo
                repo={item}
                onCreateTask={async (origin, branch, selector) => {
                  await fetch(getApi("task"), {
                    method: "POST",
                    body: JSON.stringify({ origin, branch, selector }),
                  });
                  fetchTasks();
                }}
              />
            ))}
          </div>
        )
        : null}
      <TaskHubList list={list} />
      <Hub />
    </div>
  );
}
