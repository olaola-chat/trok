/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact";
import { Socket, useTasks, useWorkspace } from "../../service/index.ts";
import { useEffect } from "preact/hooks";
import { useSnapshots } from "../../service/index.ts";
import type { Task } from "../../../../type.ts";
import TaskState from "../../components/TaskState.tsx";

function Workspace(
  props: {
    onCreateTask: (origin: string, branch: string, selector: string) => void;
  },
) {
  const { workspace } = useWorkspace();
  return (
    <div className="flex flex-col gap-2 w-fit">
      {workspace.map((item) => {
        return (
          <form
            key={item.path}
            className="shadow bg-base-100 rounded-2xl p-2 flex flex-col gap-2 border-primary"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              props.onCreateTask(
                item.origin,
                item.branch,
                form.get("selector") as string,
              );
              e.currentTarget.reset();
            }}
          >
            <div
              tabIndex={0}
              className="collapse bg-base-200 collapse-arrow border"
            >
              <div className="collapse-title">
                <span>{item.origin}</span>
                <span className="badge badge-primary badge ml-2">
                  {item.branch}
                </span>
              </div>
              <div className="collapse-content flex flex-wrap gap-1">
                {item.packages.map((item) => (
                  <div
                    key={item}
                    className="badge badge-outline badge-accent-content"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <input
              type="text"
              name="selector"
              required
              placeholder="HEAD^...HEAD"
              className="input input-bordered input input-sm"
            />
            <button className="btn btn-primary self-end btn-sm">
              添加任务
            </button>
          </form>
        );
      })}
    </div>
  );
}

function TaskList(props: { tasks: Task[] }) {
  return (
    <div className="stack fixed bottom-2 right-2">
      {props.tasks.map((item) => {
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

function Main() {
  const snapshots = useSnapshots();
  const snapShotGroups = Object.values(
    Object.groupBy(snapshots, (item) => item.task.id),
  );

  const { tasks, fetchTasks } = useTasks();

  useEffect(() => {
    Socket.mitt.on("data", (data) => {
      if (data.type === "snapshot") void fetchTasks();
    });
  }, []);

  return (
    <div className="flex gap-2 ">
      <div className="p-2 bg-base-200 h-screen overflow-y-scroll w-96">
        <Workspace
          onCreateTask={async (origin, branch, selector) => {
            await fetch("/", {
              method: "POST",
              body: JSON.stringify({
                origin,
                branch,
                selector,
              }),
            });
            fetchTasks();
          }}
        />
      </div>
      <div className="p-2 h-screen overflow-y-scroll w-max">
        {snapShotGroups.map((item) => <TaskState snapshots={item!} />)}
      </div>
      <TaskList tasks={tasks} />
    </div>
  );
}

render(<Main />, document.getElementById("root")!);
