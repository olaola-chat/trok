/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact";
import Task from "../../components/Task.tsx";
import { useMessages } from "../../service/index.ts";

function TaskList() {
  const messages = useMessages("/hub/messages");
  const group = Object.values(
    Object.groupBy(messages, (message) => message.task.id),
  );
  return group.map((item) => <Task states={item!} />);
}

function Hub() {
  return <TaskList />;
}

render(<Hub />, document.getElementById("root")!);
