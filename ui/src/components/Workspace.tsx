/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { useWorkspace } from "../service/index.ts";

export default function Workspace(
  props: {
    onCreateTask: (
      origin: string,
      branch: string,
      selector: string,
    ) => void;
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
