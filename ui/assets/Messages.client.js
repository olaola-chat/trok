// ui/Messages.client.tsx
import { render } from "https://esm.sh/preact@10.25.3";
import { useEffect, useState } from "https://esm.sh/preact@10.25.3/hooks";

// ui/Message.tsx
import { Fragment, jsx, jsxs } from "https://esm.sh/preact@10.25.4/jsx-runtime";
function Message(props) {
  const item = props.message;
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: `flex flex-col items-start chat chat-start mb-5`,
      children: [
        /* @__PURE__ */ jsx("div", { className: "chat-header opacity-50 mb-1", children: {
          pending: "\u5F00\u59CB\u5904\u7406: ",
          resolved: "\u5904\u7406\u5B8C\u6210: ",
          rejected: "\u5904\u7406\u5931\u8D25: "
        }[item.status] }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: `chat-bubble chat-bubble-${{
              pending: "",
              resolved: "success",
              rejected: "error"
            }[item.status]}`,
            children: [
              item.commits?.length ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("h6", { children: "\u63D0\u4EA4\u8BB0\u5F55" }),
                /* @__PURE__ */ jsx("ul", { className: "text-xs", children: item.commits.map(
                  (commitItem) => /* @__PURE__ */ jsxs("li", { children: [
                    "\u2726 ",
                    commitItem
                  ] })
                ) })
              ] }) : null,
              /* @__PURE__ */ jsx("h6", { className: "mt-2", children: "\u9879\u76EE\u5217\u8868" }),
              /* @__PURE__ */ jsx("ul", { className: "text-xs", children: item.packages?.map((packageItem) => {
                return /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsxs("li", { children: [
                    {
                      pending: "\u2726",
                      rejected: "\u2717",
                      resolved: "\u2713"
                    }[packageItem.status],
                    " ",
                    packageItem.path
                  ] }),
                  packageItem.logs && /* @__PURE__ */ jsx("div", { className: "text-xs", children: packageItem.logs instanceof Error ? /* @__PURE__ */ jsx("pre", { className: "bg-error-content rounded text-error p-2 my-2", children: packageItem.logs }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx("pre", { className: "overflow-x-scroll bg-info-content rounded text-info", children: /* @__PURE__ */ jsx("code", { children: packageItem.logs.stdout }) }),
                    /* @__PURE__ */ jsx("pre", { className: "overflow-x-scroll bg-error-content rounded text-error p-2 my-2", children: /* @__PURE__ */ jsx("code", { children: packageItem.logs.stderr }) })
                  ] }) })
                ] });
              }) })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "chat-footer opacity-50", children: [
          item.task.origin,
          /* @__PURE__ */ jsx("span", { className: "text-xs badge badge-xs badge-primary mx-2", children: item.task.branch }),
          /* @__PURE__ */ jsx("span", { className: "kbd kbd-xs", children: item.task.selector })
        ] })
      ]
    }
  ) });
}

// ui/Messages.client.tsx
import { jsx as jsx2 } from "https://esm.sh/preact@10.25.4/jsx-runtime";
function notifyMe(message) {
  if (!("Notification" in window)) alert("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u684C\u9762\u901A\u77E5");
  else if (Notification.permission === "granted") new Notification(message);
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") new Notification(message);
    });
  }
}
function useWebsocketMessage() {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const client = new WebSocket(location.href.replace("http", "ws"));
    client.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      notifyMe(
        { pending: "\u5F00\u59CB\u5904\u7406", resolved: "\u5904\u7406\u5B8C\u6210", rejected: "\u5904\u7406\u5931\u8D25" }[message.status]
      );
      setMessages((messages2) => [...messages2, message]);
    });
    client.addEventListener("error", (event) => {
      console.log(event);
    });
  }, []);
  return messages;
}
function Messages() {
  const messages = useWebsocketMessage();
  return messages.map((item) => /* @__PURE__ */ jsx2(Message, { message: item }));
}
render(/* @__PURE__ */ jsx2(Messages, {}), document.getElementById("messages"));
export {
  Messages as default
};
