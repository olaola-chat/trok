/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { useEffect, useState } from "preact/hooks";
import type { ExecLog, Snapshot, StreamData } from "../../../../lib/type.ts";
import { Socket } from "../../service/index.ts";

function Code(
  props: {
    children: string;
    theme: "error" | "info" | "primary";
    title?: string;
  },
) {
  return (
    <pre
      title={props.title}
      className={`text-xs overflow-x-scroll bg-${props.theme}-content rounded text-${props.theme} p-2 my-2 max-h-80 max-w-5xl`}
      ref={(el) => el?.scrollTo(0, el.scrollHeight)}
    ><code>{props.children}</code></pre>
  );
}

function Logs(props: { logs: ExecLog | string }) {
  if (typeof props.logs === "string") return props.logs;
  return (
    <>
      <Code title="stdout" theme="info">{props.logs.stdout}</Code>
      {props.logs.signal}
      <Code title="stderr" theme="error">{props.logs.stderr}</Code>
    </>
  );
}

export default function TaskState(props: { snapshots: Snapshot[] }) {
  const [taskState] = props.snapshots.sort((a, b) => {
    const value = b.timestamp - a.timestamp;
    if (value !== 0) return value;
    return a.status === "pending" ? 1 : -1;
  });
  const [streamData, setStreamData] = useState<StreamData[]>([]);

  useEffect(() => {
    Socket.mitt.on("data", (data) => {
      if (data.type === "stream") {
        if (data.data.taskId === taskState.task.id) {
          setStreamData((value) => [...value, data.data]);
        }
      }
    });
  }, []);

  return (
    <>
      <div className={`flex flex-col items-start chat chat-start mb-5`}>
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
              pending: "neutral",
              progress: "neutral",
              resolved: "success",
              rejected: "error",
            }[taskState.status]
          }`}
        >
          {taskState.logs && <Logs logs={taskState.logs} />}
          {taskState.commits?.length
            ? (
              <>
                <h6>提交记录</h6>
                <ul className="text-xs">
                  {taskState.commits.map((commitItem) => <li>✦ {commitItem}
                  </li>)}
                </ul>
              </>
            )
            : null}

          {streamData.filter((item) => !item.packagePath).length > 0 &&
            taskState.status === "pending" && (
            <Code title="stream" theme="info">
              {streamData
                .filter((item) => !item.packagePath)
                .map((item) => item.data).join("")}
            </Code>
          )}

          {taskState.packages?.length
            ? (
              <>
                <h6>项目列表</h6>
                <ul className="text-xs">
                  {taskState.packages?.map((packageItem) => {
                    const packageStream = streamData.filter(
                      (item) => item.packagePath === packageItem.path,
                    );

                    const pending = packageStream.length
                      ? (
                        <span className="loading loading-spinner text-warning loading-xs" />
                      )
                      : <span className="text-warning">-</span>;

                    const rejected = <span className="text-error">✗</span>;
                    const resolved = <span className="text-primary">✓</span>;

                    return (
                      <>
                        <li className="text-sm flex items-center gap-2">
                          {{ pending, rejected, resolved }[packageItem.status]}
                          {packageItem.path}
                        </li>
                        {packageStream.length > 0 &&
                          packageItem.status === "pending" && (
                          <Code theme="info">
                            {packageStream.map((item) => item.data).join("")}
                          </Code>
                        )}
                        {packageItem.logs && <Logs logs={packageItem.logs} />}
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
