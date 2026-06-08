import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";
import { loadEnv } from "vite";

const API_ROUTES: Record<string, string> = {
  "/api/send-admin-deletion-email": "/api/send-admin-deletion-email.ts",
  "/api/send-password-reset-email": "/api/send-password-reset-email.ts",
};

type VercelLikeRequest = {
  method?: string;
  body?: unknown;
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      if (!data) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function createVercelResponse(res: ServerResponse): VercelLikeResponse {
  let statusCode = 200;

  const vercelRes: VercelLikeResponse = {
    status(code: number) {
      statusCode = code;
      res.statusCode = code;
      return vercelRes;
    },
    json(body: unknown) {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = statusCode;
        res.end(JSON.stringify(body));
      }
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
      return vercelRes;
    },
  };

  return vercelRes;
}

async function handleApiRequest(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<void> {
  const modulePath = API_ROUTES[pathname];
  if (!modulePath) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "API route not found" }));
    return;
  }

  const body = req.method === "POST" ? await readJsonBody(req) : undefined;
  const module = await server.ssrLoadModule(modulePath);
  const handler = module.default as (req: VercelLikeRequest, res: VercelLikeResponse) => Promise<void>;

  await handler(
    {
      method: req.method,
      body,
    },
    createVercelResponse(res)
  );
}

export function localApiPlugin(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      Object.assign(process.env, env);

      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (!pathname || !(pathname in API_ROUTES)) {
          next();
          return;
        }

        try {
          await handleApiRequest(server, req, res, pathname);
        } catch (error) {
          console.error(`[local-api] ${pathname} failed:`, error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Local API handler failed" }));
          }
        }
      });
    },
  };
}
