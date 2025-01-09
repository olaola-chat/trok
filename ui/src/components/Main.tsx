/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import {
  getApi,
  Socket,
  useTaskHubList,
  useWorkspace,
} from "../service/index.ts";
import { useEffect } from "preact/hooks";
import { useSnapshots } from "../service/index.ts";
import TaskState from "./TaskState.tsx";
import Repo from "./Repo.tsx";
import { TaskHubList } from "./TaskHub.tsx";

export default function Main() {
  const snapshots = useSnapshots();
  const snapShotGroups = Object.values(
    Object.groupBy(snapshots, (item) => item.task.id),
  );
  const { list, fetchTasks } = useTaskHubList();
  const { workspace } = useWorkspace();

  useEffect(() => {
    Socket.mitt.on("data", (data) => {
      if (data.type === "snapshot") void fetchTasks();
    });
  }, []);

  return (
    <div className="flex gap-2 w-screen">
      {workspace.length
        ? (
          <div className="p-2 bg-base-200 h-screen overflow-y-scroll max-w-96">
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
