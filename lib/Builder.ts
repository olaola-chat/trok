import { join } from "@std/path/join";
import type {
  ExecLog,
  Package,
  Repository,
  SocketData,
  StreamData,
  Task,
  TaskSnapshot,
} from "./type.ts";
import {
  cloneObj,
  findPackages,
  getCommits,
  getPackageManager,
  getRepositoryInfo,
  isSameGitOrigin,
} from "./util.ts";
import Notify, { type NotifyClient } from "./Notify.ts";

const snapshot = (data: Omit<TaskSnapshot, "timestamp">): SocketData => ({
  type: "snapshot",
  data: cloneObj({ ...data, timestamp: Date.now() }),
});

const stream = (data: StreamData): SocketData => ({
  type: "stream",
  data: cloneObj(data),
});

export default class Builder {
  static workspace = this.findGitRepositories(Deno.cwd());

  static currentTask: Task | null = null;

  private static notifyClient: NotifyClient;

  private static getChangedPackages(
    repository: Repository,
    diffSelector: string,
  ) {
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

  private static filterPackages(repository: Repository, task: Task) {
    // 路径选择器
    if (task.selector.startsWith("./")) {
      return repository.packages.filter((item) => item === task.selector);
    }

    // git 选择器
    return this.getChangedPackages(repository, task.selector);
  }

  private static findGitRepositories(
    dirPath: string,
    repositories: Repository[] = [],
  ) {
    for (const entity of Deno.readDirSync(dirPath)) {
      if (!entity.isDirectory) continue;
      const absolutePath = join(dirPath, entity.name);
      if (entity.name !== ".git") {
        this.findGitRepositories(absolutePath, repositories);
      } else {
        const { origin, branch } = getRepositoryInfo(dirPath);
        const packages = findPackages(dirPath).map((item) =>
          item.replace(dirPath, ".")
        );
        repositories.push({ origin, branch, path: dirPath, packages });
      }
    }
    return repositories;
  }

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
      this.notifyClient.notify(
        stream({ task: this.currentTask!, data, packagePath }),
      );
      stdout += data;
    });

    this.read(process.stderr.getReader(), (data) => {
      this.notifyClient.notify(
        stream({ task: this.currentTask!, data, packagePath }),
      );
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
      this.notifyClient.notify(
        stream({ task: this.currentTask!, data, packagePath }),
      );
      stdout += data;
    });

    this.read(process.stderr.getReader(), (data) => {
      this.notifyClient.notify(
        stream({ task: this.currentTask!, data, packagePath }),
      );
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

  private static async prepareTask(task: Task) {
    const repository = this.workspace.find((repo) =>
      isSameGitOrigin(repo.origin, task.origin)
    );
    if (!repository) {
      throw new Error(`repository ${task.origin} not found`);
    }
    if (repository.branch !== task.branch) {
      throw new Error(`branch ${task.branch} not found`);
    }

    this.notifyClient.notify(snapshot({ task, status: "pending" }));

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
      this.notifyClient.notify(stream({ task: this.currentTask!, data }));
      stdout += data;
    });

    this.read(process.stderr.getReader(), (data) => {
      this.notifyClient.notify(stream({ task: this.currentTask!, data }));
      stderr += data;
    });
    const { success, signal } = await process.status;
    if (!success) throw { signal, stdout, stderr };

    const packages: Package[] = this.filterPackages(repository, task).map((
      item,
    ) => (
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
    this.notifyClient = await Notify.getClient();

    try {
      const { repository, packages, commits } = await this.prepareTask(task);
      this.notifyClient.notify(
        snapshot({ task, status: "pending", packages, commits }),
      );
      for (const item of packages) {
        try {
          await this.installPackage(repository, item.path);
          await this.buildPackage(repository, item.path);
          item.status = "resolved";
        } catch (err) {
          const logs = err instanceof Error ? err.message : err as ExecLog;
          item.status = "rejected";
          item.logs = logs;
          continue;
        } finally {
          this.notifyClient.notify(
            snapshot({ task, status: "pending", packages, commits }),
          );
          await this.checkRepositoryDirty(repository);
        }
      }
      this.notifyClient.notify(
        snapshot({ task, status: "resolved", packages, commits }),
      );
    } catch (err) {
      const logs = err instanceof Error ? err.message : err as ExecLog;
      this.notifyClient.notify(
        snapshot({ task: task, status: "rejected", logs: logs }),
      );
    } finally {
      this.currentTask = null;
      this.notifyClient.release();
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
