/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { useSnapshots } from "../service/index.ts";
import TaskState from "./TaskState.tsx";

export default function Hub() {
  const snapshots = useSnapshots();
  const snapShotGroups = Object.values(
    Object.groupBy(snapshots, (item) => item.task.id),
  );

  return (
    <div
      className="p-2 h-screen overflow-y-scroll grow"
      ref={(el) => el?.scrollTo(0, el.scrollHeight)}
    >
      {snapShotGroups.map((item) => <TaskState snapshots={item!} />)}
    </div>
  );
}
