#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createWriteStream, unlinkSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";

// Parse command line arguments.
const args = process.argv
	.slice(2)
	.filter((_) => _.startsWith("--"))
	.reduce(
		(args, _) => {
			const argument = _.substring(2);
			const parts = argument.match(/^(?<name>[^=]+)=?(?<value>.*)$/);
			if (parts === null || parts.groups === undefined) {
				return args;
			}

			args[parts.groups.name ?? parts.groups.value] =
				typeof parts.groups.value === "string" && parts.groups.value !== ""
					? parts.groups.value
					: true;

			return args;
		},
		/** @type {Record<string, boolean | string>} */ ({}),
	);

const target = args.target ?? process.cwd();

const jobs = new Map();

let scanPending = false;
const scan = async () => {
	if (scanPending) {
		return;
	}

	scanPending = true;

	const entries = await readdir(target, { withFileTypes: true });
	const files = entries.filter((_) => _.isFile());
	const graphsRequested = files.filter((_) => _.name.endsWith(".request"));

	for (const graph of graphsRequested) {
		if (jobs.has(graph.name)) {
			continue;
		}

		const filename = join(target, graph.name);
		const stats = await stat(filename);
		if (Date.now() - stats.mtime < 1000 * 30) {
			process.stdout.write(
				`${new Date().toISOString()} Found new request '${filename}', but the file was recently modified. Request is skipped during this scan.\n`,
			);
			continue;
		}

		const unfixed = graph.name.replace(/\.request$/, "");
		const parts = unfixed.match(
			/^universe-(?<origin>[^_]+)_(?<start>[^_]+)_(?<end>[^.]+)/,
		);

		jobs.set(graph.name, {
			graph,
			status: "pending",
			filename,
			streamname: join(target, unfixed),
			target: "universe",
			params: {
				origin: parts.groups.origin,
				start: parts.groups.start,
				end: parts.groups.end,
			},
			added: Date.now(),
		});
	}

	scanPending = false;
};

let managementLock = false;
const manage = async () => {
	if (managementLock) {
		return;
	}
	managementLock = true;

	for (const job of jobs.values()) {
		if (job.status === "complete") {
			jobs.delete(job);
			continue;
		}
		if (job.status !== "pending") {
			continue;
		}

		const args = [
			"-j",
			job.target,
			`ORIGIN=${job.params.origin}`,
			`START=${job.params.start}`,
			`END=${job.params.end}`,
			"DEBUG=1",
		];

		job.status = "executing";
		process.stdout.write(
			`${new Date().toISOString()} Executing 'make ${args.join(" ")}'...\n`,
		);
		const processHandle = spawn("make", args, {
			shell: true,
		});
		job.process = processHandle;

		const logStream = createWriteStream(`${job.streamname}.log`);
		processHandle.stdout.pipe(logStream);
		processHandle.stderr.pipe(logStream);

		processHandle.on("exit", (code) => {
			logStream.close();

			process.stdout.write(
				`${new Date().toISOString()} Process 'make ${args.join(" ")}' exited with code ${code}.\n`,
			);

			job.status = code === 0 ? "complete" : "failed";
			if (code === 0) {
				unlinkSync(job.filename);
			}
		});
	}

	managementLock = false;
};

let exitRequested = false;
const main = async () => {
	for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT"]) {
		process.on(signal, () => {
			if (exitRequested) {
				process.stdout.write(
					`${new Date().toISOString()} Caught ${signal} while exit already requested. Exiting...\n`,
				);
				process.exit(1);
			}

			process.stdout.write(
				`${new Date().toISOString()} Caught ${signal}. Requesting exit...\n`,
			);
			exitRequested = true;
		});
	}

	process.stdout.write(`${new Date().toISOString()} Watching ${target}...\n`);

	let jobCount = 0;
	while (!exitRequested) {
		await scan();

		if (jobs.size !== jobCount) {
			process.stdout.write(
				`${new Date().toISOString()} Job count changed: ${jobCount} -> ${jobs.size}. Manager will execute.\n`,
			);
			jobCount = jobs.size;
		}

		if (0 < jobCount) {
			await manage();
			jobCount = jobs.size;
		}

		await setTimeout(10000);
	}

	process.stdout.write(
		`${new Date().toISOString()} Sending SIGTERM to any running jobs...\n`,
	);
	for (const job of jobs.values()) {
		if (job.status === "executing") {
			job.process.kill("SIGTERM");
		}
	}
};

main().catch(console.error);
