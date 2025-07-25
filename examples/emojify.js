#!/usr/bin/env node

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

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

const assets = typeof args.assets === "string" ? args.assets : "output/images";

if (typeof args.target !== "string") {
	process.stderr.write("Missing --target.\n");
	process.exit(1);
}

const content = readFileSync(args.target, "utf8");
const contentLocation = dirname(args.target);
const contentName = basename(args.target);

const svgPrefixes = content
	.replaceAll(
		/<\u{1F1E9}\u{1F1EA}\u{00A0}(.+)>;/gu,
		`<<TABLE><TR><TD FIXEDSIZE="TRUE" HEIGHT="25" WIDTH="25"><IMG SCALE="TRUE" SRC="1F1E9-1F1EA.svg"/></TD><TD>\$1</TD></TR></TABLE>>;`,
	)
	.replaceAll(
		/<\u{1F1EB}\u{1F1F7}\u{00A0}(.+)>;/gu,
		`<<TABLE><TR><TD FIXEDSIZE="TRUE" HEIGHT="25" WIDTH="25"><IMG SCALE="TRUE" SRC="1F1EB-1F1F7.svg"/></TD><TD>\$1</TD></TR></TABLE>>;`,
	)
	.replaceAll(
		/<\u{1F1EC}\u{1F1E7}\u{00A0}(.+)>;/gu,
		`<<TABLE><TR><TD FIXEDSIZE="TRUE" HEIGHT="25" WIDTH="25"><IMG SCALE="TRUE" SRC="1F1EC-1F1E7.svg"/></TD><TD>\$1</TD></TR></TABLE>>;`,
	);

copyFileSync(
	join(assets, "1F1E9-1F1EA.svg"),
	join(contentLocation, "1F1E9-1F1EA.svg"),
);
copyFileSync(
	join(assets, "1F1EB-1F1F7.svg"),
	join(contentLocation, "1F1EB-1F1F7.svg"),
);
copyFileSync(
	join(assets, "1F1EC-1F1E7.svg"),
	join(contentLocation, "1F1EC-1F1E7.svg"),
);

writeFileSync(
	join(contentLocation, contentName.replace(/\.gv$/, ".img.gv")),
	svgPrefixes,
);

process.stderr.write(`Successfully emojified ${args.target}.\n`);
