// ui/hub.tsx
import { render } from "https://esm.sh/preact@10.26.4";

// ui/src/components/Hub.tsx
import { useEffect as useEffect2, useState as useState2 } from "https://esm.sh/preact@10.26.4/hooks";

// ui/src/service.ts
import { useCallback, useEffect, useState } from "https://esm.sh/preact@10.26.4/hooks";

// lib/mitt.ts
function mitt(all) {
  all = all || /* @__PURE__ */ new Map();
  return {
    /**
     * A Map of event names to registered handler functions.
     */
    all,
    /**
     * Register an event handler for the given type.
     * @param {string|symbol} type Type of event to listen for, or `'*'` for all events
     * @param {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    on(type, handler) {
      const handlers = all.get(type);
      if (handlers) {
        handlers.push(handler);
      } else {
        all.set(type, [handler]);
      }
    },
    /**
     * Remove an event handler for the given type.
     * If `handler` is omitted, all handlers of the given type are removed.
     * @param {string|symbol} type Type of event to unregister `handler` from (`'*'` to remove a wildcard handler)
     * @param {Function} [handler] Handler function to remove
     * @memberOf mitt
     */
    off(type, handler) {
      const handlers = all.get(type);
      if (handlers) {
        if (handler) {
          handlers.splice(handlers.indexOf(handler) >>> 0, 1);
        } else {
          all.set(type, []);
        }
      }
    },
    /**
     * Invoke all handlers for the given type.
     * If present, `'*'` handlers are invoked after type-matched handlers.
     *
     * Note: Manually firing '*' handlers is not supported.
     *
     * @param {string|symbol} type The event type to invoke
     * @param {Any} [evt] Any value (object is recommended and powerful), passed to each handler
     * @memberOf mitt
     */
    emit(type, evt) {
      let handlers = all.get(type);
      if (handlers) {
        handlers.slice().map((handler) => {
          handler(evt);
        });
      }
      handlers = all.get("*");
      if (handlers) {
        handlers.slice().map((handler) => {
          handler(type, evt);
        });
      }
    }
  };
}

// ui/src/service.ts
function getApi(path) {
  return `${location.href}${path}`;
}
function notifyMe(message) {
  if (!("Notification" in window)) alert("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u684C\u9762\u901A\u77E5");
  else if (Notification.permission === "granted") new Notification(message);
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(message);
    });
  }
}
var Socket = class {
  static mitt = mitt();
  static client = new WebSocket(location.href.replace("http", "ws"));
  static timer;
  static {
    this.client.addEventListener("open", () => this.client.send("PING"));
    this.client.addEventListener("message", (e) => {
      if (e.data === "PONG") {
        setTimeout(() => this.client.send("PING"), 10 * 1e3);
      } else {
        const data = JSON.parse(e.data);
        this.mitt.emit("data", data);
      }
    });
    this.client.addEventListener("close", (e) => {
      clearInterval(this.timer);
      if (globalThis.confirm(`socket\u5DF2\u65AD\u5F00,\u662F\u5426\u91CD\u65B0\u94FE\u63A5? code: ${e.code}, reason: ${e.reason}`)) globalThis.location.reload();
    });
  }
};
function useSnapshots() {
  const [snapshots, setSnapshots] = useState([]);
  useEffect(() => {
    fetch(getApi("snapshot")).then((res) => res.json()).then(setSnapshots).then(
      () => {
        Socket.mitt.on("data", (data) => {
          if (data.type !== "snapshot") return;
          notifyMe(
            {
              pending: "\u5F00\u59CB\u5904\u7406",
              progress: "\u5F00\u59CB\u6253\u5305",
              resolved: "\u5904\u7406\u5B8C\u6210",
              rejected: "\u5904\u7406\u5931\u8D25"
            }[data.data.status]
          );
          setSnapshots((snapshot) => [...snapshot, data.data]);
        });
      }
    );
  }, []);
  return snapshots;
}

// ui/src/components/Hub.tsx
import { Fragment, jsx, jsxs } from "https://esm.sh/preact@10.26.4/jsx-runtime";
function Hub() {
  const snapshots = useSnapshots();
  const snapShotGroups = Object.values(
    Object.groupBy(snapshots, (item) => item.task.id)
  );
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "p-2 h-screen overflow-y-scroll grow",
      ref: (el) => el?.scrollTo(0, el.scrollHeight),
      children: snapShotGroups.map((item, index) => /* @__PURE__ */ jsx(TaskState, { snapshots: item }, index))
    }
  );
}
function TaskState(props) {
  const [taskState] = props.snapshots.sort((a, b) => {
    const value = b.timestamp - a.timestamp;
    if (value !== 0) return value;
    return a.status === "pending" ? 1 : -1;
  });
  const [streamData, setStreamData] = useState2([]);
  useEffect2(() => {
    Socket.mitt.on("data", (data) => {
      if (data.type !== "stream") return;
      if (data.data.task.id !== taskState.task.id) return;
      setStreamData((value) => [...value, data.data]);
    });
  }, []);
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: `flex flex-col items-start chat chat-start mb-5`, children: [
    /* @__PURE__ */ jsxs("div", { className: "chat-header opacity-50 mb-1 text-xs ", children: [
      /* @__PURE__ */ jsx("span", { children: taskState.task.origin }),
      /* @__PURE__ */ jsx("span", { className: "text-xs badge badge-xs badge-primary mx-2", children: taskState.task.branch }),
      /* @__PURE__ */ jsx("span", { className: "kbd kbd-xs", children: taskState.task.selector })
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: `chat-bubble min-w-80 relative chat-bubble-${{
          pending: "neutral",
          progress: "neutral",
          resolved: "success",
          rejected: "error"
        }[taskState.status]}`,
        children: [
          taskState.logs && /* @__PURE__ */ jsx(Logs, { logs: taskState.logs }),
          taskState.commits?.length ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("h6", { children: "\u63D0\u4EA4\u8BB0\u5F55" }),
            /* @__PURE__ */ jsx("ul", { className: "text-xs", children: taskState.commits.map((commitItem) => /* @__PURE__ */ jsxs("li", { children: [
              "\u2726 ",
              commitItem
            ] })) })
          ] }) : null,
          taskState.status === "progress" && streamData.length !== 0 && /* @__PURE__ */ jsx(Code, { title: "stream", theme: "info", children: streamData.map(
            (item) => item.data
          ).join("") }),
          taskState.packages?.length !== 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("h6", { children: "\u9879\u76EE\u5217\u8868" }),
            /* @__PURE__ */ jsx("ul", { className: "text-xs", children: taskState.packages?.map((packageItem) => /* @__PURE__ */ jsx(PkgItem, { item: packageItem })) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "chat-footer opacity-50 text-xs mt-1", children: [
      /* @__PURE__ */ jsx("span", { className: "font-bold", children: new Date(taskState.timestamp).toLocaleString() }),
      "from:",
      " ",
      /* @__PURE__ */ jsx("span", { class: "badge badge-xs badge-secondary mr-2", children: taskState.task.from })
    ] })
  ] }) });
}
function PkgItem(props) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("li", { className: "text-sm flex items-center gap-2", children: [
      {
        progress: /* @__PURE__ */ jsx("span", { className: "loading loading-spinner loading-xs" }),
        pending: /* @__PURE__ */ jsx("span", { className: "text-warning", children: "-" }),
        rejected: /* @__PURE__ */ jsx("span", { className: "text-error", children: "\u2717" }),
        resolved: /* @__PURE__ */ jsx("span", { className: "text-primary", children: "\u2713" })
      }[props.item.status],
      props.item.path
    ] }),
    props.item.logs && /* @__PURE__ */ jsx(Logs, { logs: props.item.logs })
  ] });
}
function Code(props) {
  return /* @__PURE__ */ jsx(
    "pre",
    {
      title: props.title,
      className: `text-xs overflow-x-scroll bg-${props.theme}-content rounded text-${props.theme} p-2 my-2 max-h-80 max-w-5xl`,
      ref: (el) => el?.scrollTo(0, el.scrollHeight),
      children: /* @__PURE__ */ jsx("code", { children: props.children })
    }
  );
}
function Logs(props) {
  if (typeof props.logs === "string") return props.logs;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Code, { title: "stdout", theme: "info", children: props.logs.stdout }),
    props.logs.signal,
    /* @__PURE__ */ jsx(Code, { title: "stderr", theme: "error", children: props.logs.stderr })
  ] });
}

// ui/hub.tsx
import { jsx as jsx2 } from "https://esm.sh/preact@10.26.4/jsx-runtime";
render(/* @__PURE__ */ jsx2(Hub, {}), document.getElementById("root"));
