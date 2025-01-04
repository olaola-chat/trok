import type { Repository, Task } from "./type.ts";
import { getCommits } from "./util.ts";

function getChangedPackages(repository: Repository, diffSelector: string) {
  const command = new Deno.Command("git", {
    args: ["diff", "--name-only", diffSelector],
    cwd: repository.path,
  });

  const { code, stdout, stderr } = command.outputSync();

  if (code !== 0) {
    throw new Error(`git diff failed: ${new TextDecoder().decode(stderr)}`);
  }

  const changedFiles = new TextDecoder()
    .decode(stdout)
    .split("\n")
    .filter(Boolean);

  const changedPackages = repository.packages.filter((item) =>
    changedFiles.some((file) => file.startsWith(item.replace("./", "")))
  );

  return changedPackages;
}

export default function filterPackages(repository: Repository, task: Task) {
  // 路径选择器
  if (task.selector.startsWith("./")) {
    return repository.packages.filter((item) => item === task.selector);
  }

  // git 选择器
  return getChangedPackages(repository, task.selector);
}
