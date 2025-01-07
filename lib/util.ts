import os from "node:os";
import { join } from "@std/path/join";
import { resolve } from "@std/path/resolve";

export function isSameGitOrigin(a: string, b: string) {
  const parseGitOrigin = (origin: string) => {
    let cookedOrigin = origin;
    // 补全转换scp形式的origin
    if (origin.startsWith("git@")) {
      cookedOrigin = `ssh://${origin.replace(":", "/")}`;
    }
    return new URL(cookedOrigin);
  };

  const [urlA, urlB] = [a, b].map(parseGitOrigin);
  return urlA.host === urlB.host && urlA.pathname === urlB.pathname;
}

export function isExecutableExist(executable: string) {
  const command = new Deno.Command(executable, {
    args: ["-v"],
    stdout: "piped",
    stderr: "piped",
  });
  return command.outputSync().success;
}

export function isFileExistSync(filePath: string): boolean {
  try {
    const fileInfo = Deno.statSync(filePath);
    return fileInfo.isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw error;
    }
  }
}

export function getCommits(repositoryPath: string, selector: string) {
  const process = new Deno.Command("git", {
    args: ["log", selector, "--pretty=format:%s"],
    cwd: repositoryPath,
  }).outputSync();

  const decoder = new TextDecoder();
  if (!process.success) throw new Error(decoder.decode(process.stderr));

  const commits = decoder.decode(process.stdout).split("\n");
  return commits.length > 20 ? [...commits.slice(0, 20), "..."] : commits;
}

export function cloneObj<T>(obj: T) {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRandomString() {
  return Math.random().toString(36).slice(2);
}

export function getRepositoryInfo(repositoryPath: string) {
  const getRemoteCommand = new Deno.Command("git", {
    cwd: repositoryPath,
    args: ["remote", "get-url", "origin"],
    stdout: "piped",
  });
  const { stdout: remoteStdout } = getRemoteCommand.outputSync();
  const origin = new TextDecoder().decode(remoteStdout).trim();

  const getBranchCommand = new Deno.Command("git", {
    cwd: repositoryPath,
    args: ["rev-parse", "--abbrev-ref", "HEAD"],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout: branchStdout } = getBranchCommand.outputSync();
  const branch = new TextDecoder().decode(branchStdout).trim();

  return { origin, branch };
}

export function findPackages(
  dirPath: string,
  packages: string[] = [],
): string[] {
  for (const entity of Deno.readDirSync(dirPath)) {
    if (entity.name === "node_modules") continue;
    if (entity.isDirectory) {
      const absolutePath = join(dirPath, entity.name);
      findPackages(absolutePath, packages);
    } else if (["deno.json", "package.json"].includes(entity.name)) {
      packages.push(dirPath);
    }
  }
  return packages;
}

function pkgManagerWrapper(pkgManager: string) {
  return isExecutableExist(pkgManager) ? pkgManager : `yes | npx ${pkgManager}`;
}

const lockfileMap = {
  pnpm: "pnpm-lock.yaml",
  npm: "package-lock.json",
  yarn: "yarn.lock",
  bun: "bun.lockb",
  deno: "deno.lock",
};

export function getPackageManager(packagePath: string) {
  const lockfiles = Object.entries(lockfileMap).map(
    ([pkgManager, lockfile]) => {
      const ifExist = isFileExistSync(resolve(packagePath, lockfile));
      return { ifExist, lockfile, pkgManager };
    },
  );

  const lockfilesExist = lockfiles.filter((item) => item.ifExist);

  if (lockfilesExist.length === 0) {
    throw new Error(`未找到任何lockfile,请提交你的lockfile后再提交任务`);
  }

  if (lockfilesExist.length > 1) {
    const lockfiles = lockfilesExist.map((item) => item.lockfile);
    throw new Error(
      `发现多个lockfile: ${lockfiles}, 打包服务不知道应该使用哪一个lockfile来安装你的依赖, 请删除多余的lockfile后重新提交任务`,
    );
  }

  const [{ pkgManager }] = lockfilesExist;
  return pkgManagerWrapper(pkgManager);
}

export async function streamExec(
  command: string | URL,
  options: {
    onStreamData: (data: string) => void;
    cwd?: Deno.CommandOptions["cwd"];
    args?: string[];
    timeout?: number;
  },
) {
  const abortController = new AbortController();

  const process = new Deno.Command(command, {
    cwd: options.cwd,
    args: options.args,
    signal: abortController.signal,
    stderr: "piped",
    stdout: "piped",
  }).spawn();

  // 5分钟超时
  const timer = setTimeout(
    // FIXME: abort后进程并未终止，不知道是否是deno的bug
    () => abortController.abort(),
    options.timeout ?? 5 * 60 * 1000,
  );

  options.onStreamData(
    `${os.userInfo().username}@${Deno.hostname()}:${options.cwd}$ ${command} ${
      options.args?.join(" ")
    }\n`,
  );

  const [stdout, stderr, { success, signal }] = await Promise.all([
    readStream(process.stdout, options.onStreamData),
    readStream(process.stderr, options.onStreamData),
    process.status,
  ]).finally(() => clearTimeout(timer));
  if (!success) throw { stderr, stdout, signal };
  return { stderr, stdout };
}

async function readStream(
  stream: ReadableStream<Uint8Array>,
  onStreamData: (data: string) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let data = "";
  while (true) {
    const { value, done } = await reader.read();
    const streamData = decoder.decode(value);
    data += streamData;
    console.log(streamData);
    onStreamData(streamData);
    if (done) break;
  }
  return data;
}
