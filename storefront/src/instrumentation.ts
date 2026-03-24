import { installServerConsoleJsonLogger } from "@/lib/observability/serverLogger";

export async function register() {
  installServerConsoleJsonLogger();
}