#!/usr/bin/env node

import { redirectErrorsToStream } from "@oliversalzburg/js-utils/errors/stream.js";
import esbuild from "esbuild";

esbuild
  .build({
    bundle: true,
    entryPoints: ["./source/main.ts"],
    external: ["node:*"],
    format: "esm",
    outdir: "./output/",
    packages: "external",
    platform: "node",
    target: "esnext",
  })
  .catch(redirectErrorsToStream(process.stderr));
