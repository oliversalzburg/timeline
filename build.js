#!/usr/bin/env node

import { redirectErrorsToStream } from "@oliversalzburg/js-utils/errors/stream.js";
import esbuild from "esbuild";

esbuild
	.build({
		bundle: true,
		entryPoints: ["./source/index.ts"],
		external: ["node:*", "yaml"],
		format: "esm",
		minify: true,
		outfile: "./output/timeline.js",
		packages: "bundle",
		platform: "node",
		sourcemap: true,
		target: "esnext",
	})
	.catch(redirectErrorsToStream(process.stderr));
