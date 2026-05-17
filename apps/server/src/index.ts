import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { runMigrations } from "./db/migrations.js";
import { createRouter } from "./api/router.js";
import { isAppError } from "./util/errors.js";
import { logger } from "./util/logger.js";
import { startBackgroundServices, stopBackgroundServices } from "./services/startup.js";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PROMPT_DESK_PORT ?? 4317);

runMigrations();

const app = express();

app.use(
  cors({
    origin: [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/],
    credentials: false
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/api", createRouter());

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isAppError(error)) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details }
    });
    return;
  }

  logger.error("Unhandled request error", error);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Unexpected server error" }
  });
};

app.use(errorHandler);

app.listen(PORT, HOST, () => {
  logger.info(`PromptDesk server listening on http://${HOST}:${PORT}`);
  void startBackgroundServices();
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void stopBackgroundServices().finally(() => {
      process.exit(0);
    });
  });
}
