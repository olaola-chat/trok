import { join } from "@std/path";
import type { Repository } from "./type.ts";

export default function findGitRepositories(
  dirPath: string,
  repositories: Repository[] = [],
) {
  for (const entity of Deno.readDirSync(dirPath)) {
    if (!entity.isDirectory) continue;
    const absolutePath = join(dirPath, entity.name);
    if (entity.name !== ".git") findGitRepositories(absolutePath, repositories);
    else {
      const { origin, branch } = getRepositoryInfo(dirPath);
      const packages = findPackages(dirPath).map((item) =>
        item.replace(dirPath, ".")
      );
      repositories.push({ origin, branch, path: dirPath, packages });
    }
  }
  return repositories;
}

function getRepositoryInfo(repositoryPath: string) {
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

function findPackages(dirPath: string, packages: string[] = []): string[] {
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
