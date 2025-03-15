/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import {
  getApi,
  Socket,
  useTaskHubList,
  useWorkspace,
} from "../service.ts";
import { useEffect } from "preact/hooks";
import type { Task, Repository } from "../../../lib/type.ts";
import Hub from "./Hub.tsx";



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
          <div className="p-2 bg-base-200 h-screen overflow-y-scroll max-w-sm">
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

function Repo(
  props: {
    repo: Repository;
    onCreateTask: (
      origin: string,
      branch: string,
      selector: string,
    ) => void;
  },
) {
  return (
    <form
      key={props.repo.path}
      className="shadow bg-base-100 rounded-2xl p-2 flex flex-col gap-2 border-primary my-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        props.onCreateTask(
          props.repo.origin,
          props.repo.branch,
          form.get("selector") as string,
        );
        e.currentTarget.reset();
      }}
    >
      <div className="collapse collapse-arrow border">
        <input type="checkbox" />
        <div className="collapse-title">
          <span>{props.repo.origin}</span>
          <span className="badge badge-primary badge ml-2">
            {props.repo.branch}
          </span>
        </div>
        <div className="collapse-content">
          <div className="flex flex-wrap justify-center gap-1">
            {props.repo.packages.map((item) => (
              <input
                type="radio"
                required
                aria-label={item}
                key={item}
                name="selector"
                className="btn btn-xs btn-outline"
                value={item}
              />
            ))}
          </div>
          <button type="submit" className="btn btn-primary block btn-wide mt-5 mx-auto btn-sm">
            提交任务
          </button>
        </div>
      </div>
    </form>
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