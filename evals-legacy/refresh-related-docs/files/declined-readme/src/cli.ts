// Evidence fixture: current CLI flag definition for the fetch command.
import { Command } from "commander";

export function buildCli() {
  return new Command()
    .name("sample-cli")
    .command("fetch")
    .option("--max-retries <n>", "maximum retry attempts", "3");
}
