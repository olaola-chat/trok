import { render } from "preact-render-to-string";
import App from "./ui/App.server.tsx";
import HubApp from "./ui/HubApp.server.tsx";
import Dispatcher from "./Dispatcher.ts";
import { getRandomString } from "./util.ts";
import Notify from "./Notify.ts";
import type { TaskState } from "./type.ts";
import Hub from "./Hub.ts";

export default async function server(req: Request) {
  const { pathname } = new URL(req.url);

  switch (`${req.method} ${pathname}`) {
    case "POST /": {
      const data = await req.text();
      const searchParams = new URLSearchParams(data);
      const origin = searchParams.get("origin")!;
      const branch = searchParams.get("branch")!;
      const selector = searchParams.get("selector")!;
      Dispatcher.register({ origin, branch, selector, id: getRandomString() });
      return new Response(null, { status: 302, headers: { location: "/" } });
    }

    case "GET /": {
      if (req.headers.get("upgrade") !== "websocket") {
        return new Response(render(<App />), {
          headers: { "content-type": "text/html" },
        });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.addEventListener("open", () => {
        console.log("a client connected!");
        Notify.mitt.on("message", (message) => {
          socket.send(JSON.stringify(message));
        });
      });
      socket.addEventListener("message", (event) => {
        if (event.data === "ping") socket.send("pong");
      });
      return response;
    }

    case "GET /hub": {
      if (req.headers.get("upgrade") !== "websocket") {
        return new Response(render(<HubApp />), {
          headers: { "content-type": "text/html" },
        });
      }
      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.addEventListener("open", () => {
        console.log("a client connected!");
        Hub.mitt.on("message", (message) => {
          socket.send(JSON.stringify(message));
        });
      });
      socket.addEventListener("message", (event) => {
        if (event.data === "ping") socket.send("pong");
      });
      return response;
    }

    case "POST /hub": {
      const data = await req.json() as TaskState;
      Hub.register(data);
      return new Response(null, { status: 200 });
    }

    default:
      return new Response("Not Found", { status: 404 });
  }
}
