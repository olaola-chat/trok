import { join } from "@std/path/join";
import type {
  ExecLog,
  Package,
  Repository,
  Snapshot,
  SocketData,
  StreamData,
  Task,
} from "./type.ts";
import * as util from "./util.ts";
import getNotifyClient, {
  type Client,
  type Notify,
} from "./getNotifyClient.ts";

const snapshot = (data: Omit<Snapshot, "timestamp">): SocketData => ({
  type: "snapshot",
  data: util.cloneObj({ ...data, timestamp: Date.now() }),
});

const stream = (data: StreamData): SocketData => ({
  type: "stream",
  data: util.cloneObj(data),
});

export default abstract class Workspace {
  static repos = this.findGitRepositories(Deno.cwd());
  static currentTask: Task | null = null;

  private static notifyClient: Client;

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
      .filter(Boolean).map((item) => `./${item}`);

    // 预处理包路径，去除开头的 './' 并记录原始路径
    const packageEntries = repository.packages.map((pkg) => ({
      original: pkg,
      normalized: pkg.replace(/^\.\//, ""),
    }));

    // 按标准化后的路径长度从长到短排序，确保优先匹配更具体的子包
    const sortedPackageEntries = [...packageEntries].sort((a, b) =>
      b.normalized.length - a.normalized.length
    );

    const changed = new Set<string>();

    for (const file of changedFiles) {
      for (const pkgEntry of sortedPackageEntries) {
        const { normalized, original } = pkgEntry;
        // 检查文件是否精确匹配包路径或以包路径加斜杠开头
        if (file === normalized || file.startsWith(`${normalized}/`)) {
          changed.add(original);
          break; // 找到最长匹配，停止进一步检查
        }
      }
    }

    return Array.from(changed);
  }

  private static filterPackages(repository: Repository, task: Task) {
    // 路径选择器
    if (task.selector.startsWith(".")) {
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
        const { origin, branch } = util.getRepositoryInfo(dirPath);
        const packages = util.findPackages(dirPath).map((item) =>
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
    const packageManager = util.getPackageManager(absolutePackagePath);
    await util.streamExec(packageManager, {
      cwd: absolutePackagePath,
      args: packageManager === "npm"
        ? ["ci"]
        : ["install", "--frozen-lockfile"],
      onStreamData: (data) => {
        this.notifyClient.send(
          stream({ task: this.currentTask!, data }),
        );
      },
    });
  }

  private static async buildPackage(
    repository: Repository,
    packagePath: string,
  ) {
    const absolutePackagePath = join(repository.path, packagePath);
    const packageManager = util.getPackageManager(absolutePackagePath);
    await util.streamExec(packageManager, {
      cwd: absolutePackagePath,
      args: ["run", "build"],
      onStreamData: (data) => {
        this.notifyClient.send(
          stream({ task: this.currentTask!, data }),
        );
      },
    });
  }

  // 检查打包产物是否污染仓库
  private static async checkRepositoryDirty(repository: Repository) {
    const { stdout } = await util.streamExec("git", {
      cwd: repository.path,
      args: ["status", "-s", repository.path],
      onStreamData: (data) => {
        this.notifyClient.send(
          stream({ task: this.currentTask!, data }),
        );
      },
    });

    if (!stdout) return;

    new Deno.Command("git", {
      args: ["reset", "HEAD", "--hard"],
      cwd: repository.path,
    }).outputSync();

    new Deno.Command("git", {
      args: ["clean", "-fd"],
      cwd: repository.path,
    }).outputSync();

    throw new Error(`仓库工作区有变更: \n${stdout}`);
  }

  private static async prepareTask(task: Task) {
    const repository = this.repos.find((repo) =>
      util.isSameGitOrigin(repo.origin, task.origin)
    );
    if (!repository) {
      throw new Error(`repository ${task.origin} not found`);
    }
    if (repository.branch !== task.branch) {
      throw new Error(`branch ${task.branch} not found`);
    }

    // 拉取最新代码
    await util.streamExec("git", {
      cwd: repository.path,
      args: ["pull"],
      onStreamData: (data) => {
        this.notifyClient.send(
          stream({ task: this.currentTask!, data }),
        );
      },
    });

    const packages = this.filterPackages(repository, task).map((
      item,
    ) => (
      { path: item, status: "pending" } as Package
    ));

    if (!packages.length) throw new Error("no package found");

    const commits = task.selector.includes("...")
      ? util.getCommits(repository.path, task.selector)
      : [];
    return { repository, packages, commits };
  }

  static async run(
    options: {
      task: Task;
      notify?: Notify | Notify[];
      verbose?: boolean;
    },
  ) {
    const { task, notify, verbose } = options;
    this.currentTask = task;
    this.notifyClient = await getNotifyClient(notify, verbose);

    try {
      const { repository, packages, commits } = await this.prepareTask(task);
      this.notifyClient.send(
        snapshot({ task, status: "pending", packages, commits }),
      );

      for (const item of packages) {
        item.status = "progress";
        this.notifyClient.send(
          snapshot({ task, status: "progress", packages, commits }),
        );
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
          this.notifyClient.send(
            snapshot({ task, status: "progress", packages, commits }),
          );
          await this.checkRepositoryDirty(repository);
        }
      }

      this.notifyClient.send(
        snapshot({ task, status: "resolved", packages, commits }),
      );
    } catch (err) {
      const logs = err instanceof Error ? err.message : err as ExecLog;
      this.notifyClient.send(
        snapshot({ task: task, status: "rejected", logs: logs }),
      );
    } finally {
      this.currentTask = null;
      this.notifyClient.close?.();
    }
  }
}
