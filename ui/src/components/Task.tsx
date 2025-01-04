/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { useEffect, useState } from "preact/hooks";
import type { StreamData, TaskState } from "../../../type.ts";
import { Socket } from "../service/index.ts";

export default function Task(props: {
  states: TaskState[];
}) {
  const [taskState] = props.states.sort((a) => a.status === "pending" ? 1 : -1);
  const [streamData, setStreamData] = useState<StreamData[]>([]);

  useEffect(() => {
    Socket.mitt.on("data", (data) => {
      if (data.type === "builder") {
        if (data.data.task.id === taskState.task.id) {
          setStreamData((value) => [...value, data.data]);
        }
      }
    });
  }, []);

  return (
    <>
      <div
        className={`flex flex-col items-start chat chat-start mb-5`}
      >
        <div className="chat-header opacity-50 mb-1 text-xs ">
          {taskState.task.origin}
          <span className="text-xs badge badge-xs badge-primary mx-2">
            {taskState.task.branch}
          </span>
          <span className="kbd kbd-xs">{taskState.task.selector}</span>
        </div>
        <div
          className={`chat-bubble min-w-80 relative chat-bubble-${
            {
              pending: "",
              resolved: "success",
              rejected: "error",
            }[taskState.status]
          }`}
        >
          {taskState.status === "pending" && (
            <span className="loading loading-spinner absolute right-2 top-2 text-warning loading-xs" />
          )}

          {taskState.message}
          {taskState.commits?.length
            ? (
              <>
                <h6>提交记录</h6>
                <ul className="text-xs">
                  {taskState.commits.map(
                    (commitItem) => <li>✦ {commitItem}</li>,
                  )}
                </ul>
              </>
            )
            : null}
          {taskState.packages?.length
            ? (
              <>
                <h6>项目列表</h6>
                <ul className="text-xs">
                  {taskState.packages?.map((packageItem) => {
                    const packageStream = streamData.filter((item) =>
                      item.packagePath === packageItem.path
                    );

                    return (
                      <>
                        <li>
                          {{
                            pending: "✦",
                            rejected: "✗",
                            resolved: "✓",
                          }[packageItem.status]} {packageItem.path}
                        </li>
                        {packageStream.length > 0 &&
                          packageItem.status === "pending" &&
                          (
                            <pre
                              title="stream"
                              className="overflow-x-scroll bg-secondary-content rounded text-info p-2 my-2 max-h-80 max-w-5xl"
                              ref={(el) => el?.scrollTo(0, el.scrollHeight)}
                            >
                        <code>
                          {packageStream.map((item) => item.data)}
                        </code>
                            </pre>
                          )}
                        {packageItem.logs &&
                          (
                            <div className="text-xs">
                              {packageItem.logs instanceof Error
                                ? (
                                  <pre className="bg-error-content rounded text-error p-2 my-2 overflow-x-scroll max-h-80 max-w-5xl">{packageItem.logs}</pre>
                                )
                                : (
                                  <>
                                    <pre
                                      title="stdout"
                                      className="overflow-x-scroll bg-info-content rounded text-info p-2 my-2 max-h-80 max-w-5xl"
                                      ref={(el) =>
                                        el?.scrollTo(0, el.scrollHeight)}
                                    ><code>{packageItem.logs.stdout}</code></pre>
                                    <pre
                                      title="signal"
                                      class="bg-primary-content"
                                    >{packageItem.logs.signal}</pre>
                                    <pre
                                      title="stderr"
                                      className="overflow-x-scroll bg-error-content rounded text-error p-2 my-2 max-h-80 max-w-5xl"
                                      ref={(el) =>
                                        el?.scrollTo(0, el.scrollHeight)}
                                    ><code >{packageItem.logs.stderr}</code></pre>
                                  </>
                                )}
                            </div>
                          )}
                      </>
                    );
                  })}
                </ul>
              </>
            )
            : null}
        </div>

        <div className="chat-footer opacity-50 text-xs mt-1">
          {new Date(taskState.timestamp).toLocaleString()}
        </div>
      </div>
    </>
  );
}
