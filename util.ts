import type { Config } from "./type.ts";
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

export function getConfig(): Config {
  const configPath = resolve(Deno.cwd() as string, "tork.config.json");
  if (isFileExistSync(configPath)) {
    const text = Deno.readTextFileSync(configPath);
    return JSON.parse(text) as Config;
  }
  return {};
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
