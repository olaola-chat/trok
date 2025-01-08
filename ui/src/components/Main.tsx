/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { Socket, useTaskHubList } from "../service/index.ts";
import { useEffect } from "preact/hooks";
import { useSnapshots } from "../service/index.ts";
import TaskState from "./TaskState.tsx";
import Workspace from "./Workspace.tsx";
import { TaskHubList } from "./TaskHub.tsx";

export default function Main() {
  const snapshots = useSnapshots();
  const snapShotGroups = Object.values(
    Object.groupBy(snapshots, (item) => item.task.id),
  );
  const { list, fetchTasks } = useTaskHubList();

  useEffect(() => {
    Socket.mitt.on("data", (data) => {
      if (data.type === "snapshot") void fetchTasks();
    });
  }, []);

  return (
    <div className="flex gap-2 w-screen">
      <div className="p-2 bg-base-200 h-screen overflow-y-scroll max-w-96">
        <Workspace
          onCreateTask={async (origin, branch, selector) => {
            await fetch("/task", {
              method: "POST",
              body: JSON.stringify({ origin, branch, selector }),
            });
            fetchTasks();
          }}
        />
      </div>

      <div
        className="p-2 h-screen overflow-y-scroll grow"
        ref={(el) => el?.scrollTo(0, el.scrollHeight)}
      >
        {snapShotGroups.map((item) => <TaskState snapshots={item!} />)}
      </div>
      <TaskHubList list={list} />
    </div>
  );
}
