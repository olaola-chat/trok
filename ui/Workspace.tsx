import type { Repository, Task } from "../type.ts";

export default function Workspace(
  props: { workspace: Repository[]; tasks: Task[] },
) {
  return (
    <div className="flex flex-col gap-2">
      {props.workspace.map((item) => {
        const list = props.tasks.filter(
          ({ origin, branch }) =>
            item.origin === origin && item.branch === branch,
        );

        return (
          <form
            key={item.path}
            action="/"
            method="post"
            encType="application/x-www-form-urlencoded"
            className="shadow bg-base-100 rounded-2xl p-2 flex flex-col gap-2 border-primary"
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

            {list.length
              ? (
                <div className="flex flex-wrap p-5 min-h-32 shadow bg-primary-content rounded-2xl">
                  {list.map((item) => (
                    <div className="badge badge-primary" key={item.id}>
                      {item.selector}
                    </div>
                  ))}
                </div>
              )
              : null}
            <input type="hidden" name="origin" value={item.origin} />
            <input type="hidden" name="branch" value={item.branch} />
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
