#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const targetPath = "output/images";
mkdirSync(targetPath, { recursive: true });

const sourcePath = join(import.meta.dirname, "openmoji-svg-color");
const prefix = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
const files = readdirSync(sourcePath);
for (const file of files) {
	const content = readFileSync(join(sourcePath, file), "utf8");
	const normalized = content.replace(
		/<svg[^>]+>/,
		`<svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">`,
	);
	writeFileSync(join(targetPath, file), `${prefix}\n${normalized}`);
}
