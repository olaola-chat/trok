/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import type { Task } from "../../../lib/type.ts";

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
