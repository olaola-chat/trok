/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import type { Repository } from "../../../lib/type.ts";

export default function Repo(
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
      className="shadow bg-base-100 rounded-2xl p-2 flex flex-col gap-2 border-primary"
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
}
