export type Repository = {
  origin: string;
  path: string;
  branch: string;
  packages: string[];
};

export type Task = {
  id: string;
  origin: string;
  branch: string;
  selector: string;
};

export type StreamData = {
  task: Task;
  packagePath: string;
  data: string;
};

export type ExecLog = {
  signal: Deno.Signal;
  stdout: string;
  stderr: string;
};

export type Package = {
  path: string;
  status: "pending" | "resolved" | "rejected";
  logs?: ExecLog | Error;
};

export type TaskSnapshot = {
  id: string;
  task: Task;
  timestamp: number;
  status: "pending" | "resolved" | "rejected";
  commits?: string[];
  packages?: Package[];
  message?: string;
};

export type SocketData = {
  type: "snapshot";
  data: TaskSnapshot;
} | {
  type: "stream";
  data: StreamData;
};

export type Config = {
  // 通知地址
  notify?: string;
};
