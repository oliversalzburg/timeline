#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createWriteStream, unlinkSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { formatMilliseconds } from "@oliversalzburg/js-utils/format/milliseconds.js";

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
		return false;
	}

	scanPending = true;

	const entries = await readdir(target, { withFileTypes: true });
	const files = entries.filter((_) => _.isFile()).map((_) => _.name);
	const graphsRequested = files.filter((_) => _.endsWith(".request"));
	let changes = false;

	const allJobsRequested = [...jobs.keys()].every((key) =>
		graphsRequested.includes(key),
	);
	if (!allJobsRequested) {
		changes = true;
	}

	for (const graph of graphsRequested) {
		if (jobs.has(graph)) {
			continue;
		}

		const filename = join(target, graph);
		/*
		const stats = await stat(filename);
		if (Date.now() - stats.mtime < 1000 * 15) {
			process.stdout.write(
				`${new Date().toISOString()} New request '${filename}' was recently modified (<15s). Request is skipped during this scan.\n`,
			);
			continue;
		}*/

		const unfixed = graph.replace(/\.request$/, "");
		const parts = unfixed.match(
			/^universe-(?<origin>[^_]+)_(?<start>[^_]+)_(?<end>[^.]+)/,
		);

		jobs.set(graph, {
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

		process.stdout.write(
			`${new Date().toISOString()} Registered new job '${graph}'.\n`,
		);
		changes = true;
	}

	scanPending = false;
	return changes;
};

let managementLock = false;
const manage = async () => {
	if (managementLock) {
		return;
	}
	managementLock = true;

	for (const [graph, job] of jobs.entries()) {
		if (job.status === "complete") {
			jobs.delete(graph);
			continue;
		}

		if (job.status !== "pending") {
			continue;
		}

		const command = "make";
		const args = [
			"-j",
			job.target,
			`ORIGIN=${job.params.origin}`,
			`START=${job.params.start}`,
			`END=${job.params.end}`,
			"DEBUG=1",
		];

		job.status = "executing";
		job.started = Date.now();
		process.stdout.write(
			`${new Date().toISOString()} Executing '${command} ${args.join(" ")}'...\n`,
		);
		const processHandle = spawn(command, args, {
			shell: true,
		});
		job.process = processHandle;

		const logStream = createWriteStream(`${job.streamname}.log`);
		logStream.once("error", (_error) => {
			process.stdout.write(
				`${new Date().toISOString()} Error on log stream for '${command} ${args.join(" ")}'! Expect failure.\n`,
			);
			console.error(_error);
		});

		processHandle.stdout.pipe(logStream);
		processHandle.stderr.pipe(logStream);

		logStream.write(`Process started ${new Date().toISOString()}\n`);

		processHandle.on("exit", (code) => {
			if (!logStream.closed && !logStream.destroyed && !logStream.errored) {
				try {
					logStream.write(`Process ended ${new Date().toISOString()}\n`);
					logStream.close();
				} catch (_fault) {
					process.stdout.write(
						`${new Date().toISOString()} Error finalizing log stream for '${command} ${args.join(" ")}'!\n`,
					);
				}
			}

			process.stdout.write(
				`${new Date().toISOString()} Process '${command} ${args.join(" ")}' exited with code ${code} after ${formatMilliseconds(Date.now() - job.started)}.\n`,
			);

			job.status = code === 0 ? "complete" : "failed";
			if (code === 0) {
				unlinkSync(job.filename);
			}
		});

		// Only start one job per iteration.
		//break;
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

	while (!exitRequested) {
		const changes = await scan();

		if (changes) {
			process.stdout.write(
				`${new Date().toISOString()} Pending changes detected. Manager will execute.\n`,
			);
			await manage();
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
