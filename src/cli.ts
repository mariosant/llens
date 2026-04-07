#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import run from "./commands/run";
import init from "./commands/init";
import validate from "./commands/validate";

const main = defineCommand({
  meta: {
    name: "llens",
    version: "0.1.0",
    description: "LLM Quality Assurance Test Runner",
  },
  subCommands: {
    run,
    init,
    validate,
  },
  run: run.run, // Default to run command
});

runMain(main);
