/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact";
import { Socket, useTaskHubList, useWorkspace } from "../service/index.ts";
import { useEffect, useState } from "preact/hooks";
import { useSnapshots } from "../service/index.ts";
import TaskState from "./components/TaskState.tsx";
import type { Task } from "../../../lib/type.ts";

function Workspace(
  props: {
    onCreateTask: (
      origin: string,
      branch: string,
      selector: string,
      verbose: boolean,
    ) => void;
  },
) {
  const { workspace } = useWorkspace();
  const [verbose, setVerbose] = useState(false);
  return (
    <div className="flex flex-col gap-2 w-fit">
      <div className="form-control w-full">
        <label className="label cursor-pointer">
          <span className="label-text text-bold">打印详细信息</span>
          <input
            type="checkbox"
            onChange={() => setVerbose(!verbose)}
            className="toggle toggle-primary"
            checked={verbose}
          />
        </label>
      </div>

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
                verbose,
              );
              e.currentTarget.reset();
            }}
          >
            <div className="collapse collapse-arrow border">
              <input type="checkbox" />
              <div className="collapse-title">
                <span>{item.origin}</span>
                <span className="badge badge-primary badge ml-2">
                  {item.branch}
                </span>
              </div>
              <div className="collapse-content">
                <div className="flex flex-wrap justify-center gap-1">
                  {item.packages.map((item) => (
                    <input
                      type="radio"
                      aria-label={item}
                      key={item}
                      name="selector"
                      className="btn btn-xs btn-outline"
                      value={item}
                    />
                  ))}
                </div>
                <button className="btn btn-primary block btn-wide mt-5 mx-auto btn-sm">
                  提交任务
                </button>
              </div>
            </div>
          </form>
        );
      })}
    </div>
  );
}

function TaskHubList(props: { list: Task[] }) {
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

function Main() {
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
          onCreateTask={async (origin, branch, selector, verbose) => {
            await fetch("/task", {
              method: "POST",
              body: JSON.stringify({
                origin,
                branch,
                selector,
                verbose,
              }),
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

render(<Main />, document.getElementById("root")!);
