import { join } from "@std/path/join";
import type {
  ExecLog,
  Package,
  Repository,
  StreamData,
  Task,
  TaskSnapshot,
} from "./type.ts";
import filterPackages from "./filterPackages.ts";
import findGitRepositories from "./findGitRepositories.ts";
import getPackageManager from "./getPackageManager.ts";
import { cloneObj, getCommits, isSameGitOrigin } from "./util.ts";
import Notify from "./Notify.ts";

const notifySnapshot = (data: Omit<TaskSnapshot, "timestamp">) =>
  Notify.notify({
    type: "snapshot",
    data: cloneObj({ ...data, timestamp: Date.now() }),
  });

const notifyStream = (data: StreamData) =>
  Notify.notify({
    type: "stream",
    data: cloneObj(data),
  });

export default class Builder {
  static workspace = findGitRepositories(Deno.cwd());

  static currentTask: Task | null = null;

  private static async installPackage(
    repository: Repository,
    packagePath: string,
  ) {
    const absolutePackagePath = join(repository.path, packagePath);
    const packageManager = getPackageManager(absolutePackagePath);
    const abortController = new AbortController();
    setTimeout(() => abortController.abort(), 5 * 60 * 1000); // 5分钟超时
    const process = new Deno.Command(packageManager, {
      cwd: absolutePackagePath,
      args: [packageManager === "npm" ? "ci" : "--frozen-lockfile", "install"],
      stderr: "piped",
      stdout: "piped",
      signal: abortController.signal,
    }).spawn();

    let stdout = "";
    let stderr = "";

    this.read(process.stdout.getReader(), (data) => {
      notifyStream({ task: this.currentTask!, data, packagePath });
      stdout += data;
    });

    this.read(process.stderr.getReader(), (data) => {
      notifyStream({ task: this.currentTask!, data, packagePath });
      stderr += data;
    });
    const { signal, success } = await process.status;
    if (!success) throw { signal, stdout, stderr };
  }

  private static async buildPackage(
    repository: Repository,
    packagePath: string,
  ) {
    const absolutePackagePath = join(repository.path, packagePath);
    const packageManager = getPackageManager(absolutePackagePath);

    const process = new Deno.Command(packageManager, {
      cwd: absolutePackagePath,
      args: ["run", "build"],
      stderr: "piped",
      stdout: "piped",
    }).spawn();

    let stdout = "";
    let stderr = "";

    this.read(process.stdout.getReader(), (data) => {
      notifyStream({ task: this.currentTask!, data, packagePath });
      stdout += data;
    });

    this.read(process.stderr.getReader(), (data) => {
      notifyStream({ task: this.currentTask!, data, packagePath });
      stderr += data;
    });
    const { success, signal } = await process.status;
    if (!success) throw { signal, stdout, stderr };
  }

  // 检查打包产物是否污染仓库
  private static checkRepositoryDirty(repository: Repository) {
    const process = new Deno.Command("git", {
      args: ["status", "-s", repository.path],
      stderr: "piped",
      stdout: "piped",
    }).outputSync();
    const isDirty = process.success && !process.stdout;
    if (!isDirty) return;
    new Deno.Command("git", {
      args: ["reset", "HEAD", "--hard"],
      cwd: repository.path,
    }).outputSync();
    const a = new Deno.Command("git", {
      args: ["clean", "-fd"],
      cwd: repository.path,
    }).outputSync();

    new TextDecoder().decode(a.stdout);

    throw new Error(`源码仓库工作区有变更: \n${process.stdout}`);
  }

  static async prepareTask(task: Task) {
    const repository = this.workspace.find((repo) =>
      isSameGitOrigin(repo.origin, task.origin)
    );
    if (!repository) {
      throw new Error(`repository ${task.origin} not found`);
    }
    if (repository.branch !== task.branch) {
      throw new Error(`branch ${task.branch} not found`);
    }

    // 拉取最新代码
    const process = new Deno.Command("git", {
      cwd: repository.path,
      args: ["pull"],
      stderr: "piped",
      stdout: "piped",
    }).spawn();

    let stdout = "";
    let stderr = "";

    this.read(process.stdout.getReader(), (data) => {
      notifyStream({ task: this.currentTask!, data });
      stdout += data;
    });

    this.read(process.stderr.getReader(), (data) => {
      notifyStream({ task: this.currentTask!, data });
      stderr += data;
    });
    const { success, signal } = await process.status;
    if (!success) throw { signal, stdout, stderr };

    const packages: Package[] = filterPackages(repository, task).map((item) => (
      { path: item, status: "pending" }
    ));

    if (!packages.length) throw new Error("no package found");

    const commits = task.selector.includes("...")
      ? getCommits(repository.path, task.selector)
      : [];
    return { repository, packages, commits };
  }

  static async run(task: Task) {
    this.currentTask = task;
    try {
      const { repository, packages, commits } = await this.prepareTask(task);
      notifySnapshot({ task, status: "pending", packages, commits });
      for (const item of packages) {
        try {
          await this.installPackage(repository, item.path);
          await this.buildPackage(repository, item.path);
          item.status = "resolved";
        } catch (err) {
          item.status = "rejected";
          item.logs = err as ExecLog | Error;
          continue;
        } finally {
          notifySnapshot({ task, status: "pending", packages, commits });
          await this.checkRepositoryDirty(repository);
        }
      }
      notifySnapshot({ task, status: "resolved", packages, commits });
    } catch (err) {
      const message = (err as Error).message;
      notifySnapshot({ task: task, status: "rejected", message });
    } finally {
      this.currentTask = null;
    }
  }

  private static async read(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onData: (data: string) => void,
  ) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onData(decoder.decode(value));
    }
  }
}
