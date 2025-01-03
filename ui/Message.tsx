import type { TaskState } from "../type.ts";

export default function Message(props: {
  message: TaskState;
}) {
  const item = props.message;
  return (
    <>
      <div
        className={`flex flex-col items-start chat chat-start mb-5`}
      >
        <div className="chat-header opacity-50 mb-1">
          {{
            pending: "开始处理: ",
            resolved: "处理完成: ",
            rejected: "处理失败: ",
          }[item.status]}
        </div>
        <div
          className={`chat-bubble chat-bubble-${
            {
              pending: "",
              resolved: "success",
              rejected: "error",
            }[item.status]
          }`}
        >
          {item.commits?.length
            ? (
              <>
                <h6>提交记录</h6>
                <ul className="text-xs">
                  {item.commits.map(
                    (commitItem) => <li>✦ {commitItem}</li>,
                  )}
                </ul>
              </>
            )
            : null}
          <h6 className="mt-2">项目列表</h6>
          <ul className="text-xs">
            {item.packages?.map((packageItem) => {
              return (
                <>
                  <li>
                    {{
                      pending: "✦",
                      rejected: "✗",
                      resolved: "✓",
                    }[packageItem.status]} {packageItem.path}
                  </li>
                  {packageItem.logs &&
                    (
                      <div className="text-xs">
                        {packageItem.logs instanceof Error
                          ? (
                            <pre className="bg-error-content rounded text-error p-2 my-2">{packageItem.logs}</pre>
                          )
                          : (
                            <>
                              <pre className="overflow-x-scroll bg-info-content rounded text-info"><code>{packageItem.logs.stdout}</code></pre>
                              <pre className="overflow-x-scroll bg-error-content rounded text-error p-2 my-2"><code >{packageItem.logs.stderr}</code></pre>
                            </>
                          )}
                      </div>
                    )}
                </>
              );
            })}
          </ul>
        </div>

        <div className="chat-footer opacity-50">
          {item.task.origin}
          <span className="text-xs badge badge-xs badge-primary mx-2">
            {item.task.branch}
          </span>
          <span className="kbd kbd-xs">{item.task.selector}</span>
        </div>
      </div>
    </>
  );
}
