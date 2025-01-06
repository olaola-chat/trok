import { resolve } from "@std/path";
import { isExecutableExist, isFileExistSync } from "./util.ts";

function pkgManagerWrapper(pkgManager: string) {
  return isExecutableExist(pkgManager) ? pkgManager : `yes | npx ${pkgManager}`;
}

const lockfileMap = {
  pnpm: "pnpm-lock.yaml",
  npm: "package-lock.json",
  yarn: "yarn.lock",
  bun: "bun.lockb",
};

export default function getPackageManager(packagePath: string) {
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
