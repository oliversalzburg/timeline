/** biome-ignore-all lint/style/noUnusedTemplateLiteral: Consistency overrules */

import { mustExist } from "@oliversalzburg/js-utils/data/nil.js";
import { expect } from "chai";
import { describe, it } from "mocha";
import {
	history,
	random,
	snapshotHasRegression,
	snapshotIdentity,
} from "./fixtures/documents.js";
import { load } from "./loader.js";
import { matchFontColorTo } from "./palette.js";
import { render } from "./renderer.js";
import type { RGBTuple, TimelineDocument } from "./types.js";

/**
 * Renderer
 */

describe("Renderer", () => {
	before(() => {
		expect(new Date().getTimezoneOffset()).to.equal(
			0,
			"The test suite must be executed in the UTC time zone.",
		);
	});

	it("should produce the expected font colors", () => {
		const colors = {
			"#004db9": "#FFFFFFFF",
		};
		Object.entries(colors).forEach(([fill, font]) => {
			const rgb = mustExist(fill.substring(1).match(/../g)).map((x) =>
				Number.parseInt(x, 16),
			) as RGBTuple;
			const generated = matchFontColorTo(rgb);
			expect(generated).to.eql(
				[255, 255, 255, 255],
				`Generated font color '${generated}' doesn't match expected font color '${font}'.`,
			);
		});
	});

	it("should render timelines correctly (fixture 1)", function () {
		const document: TimelineDocument = { ...random };
		const now = Date.UTC(2025, 5, 15);
		const timeline = load(document, "document");
		const artifact = render([timeline], {
			now,
			origin: "document",
			theme: "dark",
		});
		expect(artifact.graph).to.have.lengthOf(1);
		expect(
			snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact.graph[0]),
			"Snapshot regression detected.",
		).to.be.false;
	});

	it("should render timelines correctly (fixture 3)", function () {
		const document: TimelineDocument = { ...history };
		const now = Date.UTC(2025, 5, 15);
		const timeline = load(document, "document");
		const artifact = render([timeline], {
			now,
			origin: "document",
			theme: "dark",
		});
		expect(artifact.graph).to.have.lengthOf(1);
		expect(
			snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact.graph[0]),
			"Snapshot regression detected.",
		).to.be.false;
	});

	it("should render timelines correctly (fixture 1+3)", function () {
		const documents: Array<TimelineDocument> = [{ ...random }, { ...history }];
		const now = Date.UTC(2025, 5, 15);
		const timelines = documents.map((_, index) => load(_, index.toFixed()));
		const artifact = render(timelines, {
			now,
			origin: "0",
			theme: "dark",
		});
		expect(artifact.graph).to.have.lengthOf(1);
		expect(
			snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact.graph[0]),
			"Snapshot regression detected.",
		).to.be.false;
	});

	it("should merge timelines correctly (fixture 1a)", function () {
		const document: TimelineDocument = { ...random };
		const now = Date.UTC(2025, 5, 15);
		const timeline = load(document, "document");
		const artifact = render(
			[
				timeline,
				{
					meta: { id: "test", private: true, rank: 1 },
					records: timeline.records.slice(0, 1),
				},
			],
			{
				now,
				origin: "document",
				theme: "dark",
			},
		);
		expect(artifact.graph).to.have.lengthOf(1);
		expect(
			snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact.graph[0]),
			"Snapshot regression detected.",
		).to.be.false;
	});
	it("should merge timelines correctly (fixture 1b)", function () {
		const document: TimelineDocument = { ...random };
		const now = Date.UTC(2025, 5, 15);
		const timeline = load(document, "document");
		const artifact = render(
			[
				timeline,
				{
					meta: { id: "test", private: true, rank: 1 },
					records: timeline.records.slice(1, 2),
				},
			],
			{
				now,
				origin: "document",
				theme: "dark",
			},
		);
		expect(artifact.graph).to.have.lengthOf(1);
		expect(
			snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact.graph[0]),
			"Snapshot regression detected.",
		).to.be.false;
	});
	it("should merge timelines correctly (fixture 1c)", function () {
		const document: TimelineDocument = { ...random };
		const now = Date.UTC(2025, 5, 15);
		const timeline = load(document, "document");
		const artifact = render(
			[
				timeline,
				{
					meta: { id: "test", private: true, rank: 1 },
					records: timeline.records.slice(0, 2),
				},
			],
			{
				now,
				origin: "document",
				theme: "dark",
			},
		);
		expect(artifact.graph).to.have.lengthOf(1);
		expect(
			snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact.graph[0]),
			"Snapshot regression detected.",
		).to.be.false;
	});

	it("should render prefixes correctly", function () {
		const now = Date.UTC(2025, 5, 15);
		const artifact = render(
			[
				{
					meta: { id: "document", private: true, rank: 1, prefix: "🎭" },
					records: [[now, { title: "Now" }]],
				},
			],
			{
				now,
				origin: "document",
				theme: "dark",
			},
		);
		expect(artifact.graph).to.have.lengthOf(1);
		expect(
			snapshotHasRegression(snapshotIdentity(this, ".gv"), artifact.graph[0]),
			"Snapshot regression detected.",
		).to.be.false;
	});
});
