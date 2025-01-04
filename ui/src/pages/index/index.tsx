/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact";
import { useMessages, useWorkspace } from "../../service/index.ts";
import Task from "../../components/Task.tsx";

function Workspace() {
  const workspace = useWorkspace();
  return (
    <div className="flex flex-col gap-2">
      {workspace.map((item) => {
        return (
          <form
            key={item.path}
            className="shadow bg-base-100 rounded-2xl p-2 flex flex-col gap-2 border-primary"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              fetch("/", {
                method: "POST",
                body: JSON.stringify({
                  origin: item.origin,
                  branch: item.branch,
                  selector: form.get("selector") as string,
                }),
              });
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

// TODO: 待处理任务列表

function TaskList() {
  const messages = useMessages("/messages");
  const group = Object.values(
    Object.groupBy(messages, (message) => message.task.id),
  );
  return group.map((item) => <Task states={item!} />);
}

function Main() {
  return (
    <div className="flex gap-2 ">
      <div className="w-2/5 p-2 bg-base-200 h-screen overflow-y-scroll">
        <Workspace />
      </div>
      <div className="w-3/5 p-2 h-screen overflow-y-scroll">
        <TaskList />
      </div>
    </div>
  );
}

render(<Main />, document.getElementById("root")!);
