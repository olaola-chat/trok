/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { useEffect, useState } from "preact/hooks";
import type {
  ExecLog,
  Package,
  Snapshot,
  StreamData,
} from "../../../lib/type.ts";
import { Socket } from "../service/index.ts";

export default function TaskState(props: { snapshots: Snapshot[] }) {
  const [taskState] = props.snapshots.sort((a, b) => {
    const value = b.timestamp - a.timestamp;
    if (value !== 0) return value;
    return a.status === "pending" ? 1 : -1;
  });
  const [streamData, setStreamData] = useState<StreamData[]>([]);

  useEffect(() => {
    Socket.mitt.on("data", (data) => {
      if (data.type !== "stream") return;
      if (data.data.task.id !== taskState.task.id) return;
      setStreamData((value) => [...value, data.data]);
    });
  }, []);

  return (
    <>
      <div className={`flex flex-col items-start chat chat-start mb-5`}>
        <div className="chat-header opacity-50 mb-1 text-xs ">
          <span>{taskState.task.origin}</span>
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

          {streamData.length > 0 &&
            taskState.status === "pending" && (
            <Code title="stream" theme="info">
              {streamData.map((item) => item.data).join("")}
            </Code>
          )}

          {taskState.packages?.length !== 0 &&
            (
              <>
                <h6>项目列表</h6>
                <ul className="text-xs">
                  {taskState.packages?.map((packageItem) => (
                    <PkgItem item={packageItem} />
                  ))}
                </ul>
              </>
            )}
        </div>

        <div className="chat-footer opacity-50 text-xs mt-1">
          {new Date(taskState.timestamp).toLocaleString()}
        </div>
      </div>
    </>
  );
}

function PkgItem(props: { item: Package }) {
  return (
    <>
      <li className="text-sm flex items-center gap-2">
        {{
          progress: <span className="loading loading-spinner loading-xs" />,
          pending: <span className="text-warning">-</span>,
          rejected: <span className="text-error">✗</span>,
          resolved: <span className="text-primary">✓</span>,
        }[props.item.status]}
        {props.item.path}
      </li>
      {props.item.logs && <Logs logs={props.item.logs} />}
    </>
  );
}

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
