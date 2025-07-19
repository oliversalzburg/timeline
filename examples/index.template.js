// Find all SVG elements that are GraphViz nodes.
const nodes = [...document.querySelectorAll(".node").values()];
// Get all their IDs into a single order. The IDs are designed to fall into
// chronological order when sorted based on their ASCII values.
const ids = nodes.map((_) => _.id).sort();
// A set of all the unique IDs. For slightly faster lookups, compared to
// an index search through the array.
const idSet = new Set(ids);
// A set of all unique timeline IDs. A unique ID has been generated for each
// timeline by the renderer. For the navigation, we don't require any
// additional metadata.
const timelineIds = new Set(
	nodes
		.flatMap((node) =>
			[...node.classList.values()].filter((_) => _.startsWith("t")),
		)
		.sort(),
);
// A map of all timeline IDs and the IDs of nodes that belong to that timeline.
const timelineNodes = new Map(
	[...timelineIds.values()].map((_) => [
		_,
		[...document.querySelectorAll(`.node.${_}`).values()]
			.map((node) => node.id)
			.sort(),
	]),
);
// A map of node IDs to their respective parent timeline.
const nodeTimelines = new Map(
	[...timelineIds.values()].flatMap((_) =>
		[...document.querySelectorAll(`.node.${_}`).values()]
			.map((node) => node.id)
			.sort()
			.map((id) => [id, _]),
	),
);
// The ID of the currently focused node.
let idFocused = idSet.has(window.location.hash.replace(/^#/, ""))
	? window.location.hash.replace(/^#/, "")
	: undefined;
// The global timeline index of the focused node.
let idFocusedIndex = idFocused !== undefined ? ids.indexOf(idFocused) : -1;
// The ID of the timeline the focused node is part of.
let timelineFocused =
	idFocused !== undefined ? nodeTimelines.get(idFocused) : undefined;

/**
 * @param {string} id -
 */
const focusNode = (id) => {
	if (!id) {
		return;
	}

	const anchor = `#${id}`;
	/** @type {SVGElement | null} */
	const node = document.querySelector(anchor);

	if (node === null) {
		return;
	}

	window.history.pushState(
		{ id },
		`${new Date(id.substring(1)).toLocaleDateString()} - Open Time-Travel Engine`,
		window.location.toString().replace(/(#.*)|$/, anchor),
	);
	node.focus({ preventScroll: true });

	idFocused = id;
	idFocusedIndex = ids.indexOf(idFocused);
	timelineFocused = nodeTimelines.get(id);

	console.info(
		`Focused node ${idFocused} of timeline ${timelineFocused}. Scrolling it into view...`,
	);

	let left = window.pageXOffset + node.getBoundingClientRect().left;
	let top = window.pageYOffset + node.getBoundingClientRect().top;

	left = left - document.documentElement.clientWidth / 2;
	top = top - document.documentElement.clientHeight / 2;

	window.scrollTo({ top, behavior: "smooth", left });
};

console.info("Timeline loaded. SVG should fade in now.");
document.body.classList.remove("loading");

if (-1 < idFocusedIndex && idFocused !== undefined) {
	const node = document.querySelector(`#${idFocused}`);
	if (node !== null) {
		const timeline = nodeTimelines.get(node.id);
		console.info(
			`Selecting node #${idFocused} of timeline ${timeline} from location anchor.`,
		);
		focusNode(idFocused);
	}
}

/**
 * @param {MouseEvent} event -
 */
const onClick = (event) => {
	if (event.target === null) {
		return;
	}

	const node = /** @type {SVGElement} */ (event.target);
	const nodeParent = node.closest("g.node");
	if (!nodeParent) {
		return;
	}

	if (nodeParent.id !== idFocused && idSet.has(nodeParent.id)) {
		idFocused = nodeParent.id;
		idFocusedIndex = ids.indexOf(nodeParent.id);
		timelineFocused = nodeTimelines.get(idFocused);
		console.info(
			`User focused ${idFocused} of timeline ${timelineFocused}. Updating history...`,
		);
		window.history.pushState(
			{ idFocused },
			"",
			window.location.toString().replace(/(#.*)|$/, `#${idFocused}`),
		);
	}
};
document.addEventListener("click", onClick);

const rapidKeys = new Map();
document.addEventListener("keyup", (event) => {
	console.debug(`keyup: key:${event.key} code:${event.code}`);

	if (!rapidKeys.has(event.code)) {
		rapidKeys.set(event.code, 0);
	}

	const keyIsRapid = Date.now() - rapidKeys.get(event.code) < 100;
	rapidKeys.set(event.code, Date.now());

	let updateNavigation = true;

	/**
	 * @param {number} slice -
	 */
	const scrollTo = (slice) => {
		const step = document.body.scrollHeight / 10;
		const top = step * slice;
		console.log(`Scrolling to ${top}`);
		window.scrollTo({ top, behavior: keyIsRapid ? "instant" : "smooth" });
		updateNavigation = false;
	};

	switch (event.code) {
		case "Digit0":
			scrollTo(0);
			break;
		case "Digit1":
			scrollTo(1);
			break;
		case "Digit2":
			scrollTo(2);
			break;
		case "Digit3":
			scrollTo(3);
			break;
		case "Digit4":
			scrollTo(4);
			break;
		case "Digit5":
			scrollTo(5);
			break;
		case "Digit6":
			scrollTo(6);
			break;
		case "Digit7":
			scrollTo(7);
			break;
		case "Digit8":
			scrollTo(8);
			break;
		case "Digit9":
			scrollTo(9);
			break;

		// Jump to global end.
		case "Numpad1": {
			idFocusedIndex = ids.length - 1;
			idFocusedIndex = Math.min(Math.max(0, idFocusedIndex), ids.length - 1);
			idFocused = ids[idFocusedIndex];
			break;
		}

		// Step forwards in active timeline.
		case "KeyS":
		case "Numpad2": {
			if (!timelineFocused) {
				return;
			}
			const timeline = timelineNodes.get(timelineFocused);
			if (!timeline) {
				return;
			}

			const indexInTimeline =
				idFocused !== undefined ? timeline.indexOf(idFocused) : 0;
			const indexInTimelineNew = Math.min(
				Math.max(0, indexInTimeline + 1),
				timeline.length - 1,
			);
			const idNew = timeline[indexInTimelineNew];

			idFocusedIndex = ids.indexOf(idNew);
			idFocused = ids[idFocusedIndex];
			break;
		}

		// Multiple steps forwards
		case "Numpad3":
			idFocusedIndex += 10;
			idFocusedIndex = Math.min(Math.max(0, idFocusedIndex), ids.length - 1);
			idFocused = ids[idFocusedIndex];
			break;

		// Single step backwards.
		case "KeyA":
		case "Numpad4": {
			--idFocusedIndex;
			idFocusedIndex = Math.min(Math.max(0, idFocusedIndex), ids.length - 1);
			idFocused = ids[idFocusedIndex];
			break;
		}

		// Re-focus already focused node. Useful when having scrolled away from focus.
		case "Numpad5":
			break;

		// Single step forwards.
		case "KeyD":
		case "Numpad6": {
			++idFocusedIndex;
			idFocusedIndex = Math.min(Math.max(0, idFocusedIndex), ids.length - 1);
			idFocused = ids[idFocusedIndex];
			break;
		}

		// Home - Jump to global start.
		case "Numpad7": {
			idFocusedIndex = 0;
			idFocusedIndex = Math.min(Math.max(0, idFocusedIndex), ids.length - 1);
			idFocused = ids[idFocusedIndex];
			break;
		}

		// Step backwards in active timeline.
		case "KeyW":
		case "Numpad8": {
			if (!timelineFocused) {
				return;
			}
			const timeline = timelineNodes.get(timelineFocused);
			if (!timeline) {
				return;
			}

			const indexInTimeline =
				idFocused !== undefined
					? timeline.indexOf(idFocused)
					: timeline.length - 1;
			const indexInTimelineNew = Math.min(
				Math.max(0, indexInTimeline - 1),
				timeline.length - 1,
			);
			const idNew = timeline[indexInTimelineNew];

			idFocusedIndex = ids.indexOf(idNew);
			idFocused = ids[idFocusedIndex];
			break;
		}

		// Multiple steps backwards
		case "Numpad9":
			idFocusedIndex -= 10;
			idFocusedIndex = Math.min(Math.max(0, idFocusedIndex), ids.length - 1);
			idFocused = ids[idFocusedIndex];
			break;

		default:
			updateNavigation = false;
			break;
	}

	if (!updateNavigation || !idFocused) {
		return;
	}

	event.preventDefault();
	focusNode(idFocused);
});

const initStarfield = () => {
	document.addEventListener("DOMContentLoaded", () => {
		const canvas = /** @type {HTMLCanvasElement} */ (
			document.getElementById("starfield")
		);
		if (canvas === null) {
			return;
		}
		const ctx = /** @type {CanvasRenderingContext2D} */ (
			canvas.getContext("2d")
		);
		if (ctx === null) {
			return;
		}

		const numStars = 3000;
		const speed = 0.01;
		const maxDepth = 1500;
		const starColors = ["#FFFFFF", "#FFDDC1", "#FFC0CB", "#ADD8E6", "#B0E0E6"];
		/** @type {Array<Star>} */
		let stars = [];

		function setCanvasSize() {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}

		function getRandomColor() {
			return starColors[Math.floor(Math.random() * starColors.length)];
		}

		class Star {
			/**
			 * @param {string} color -
			 * @param {number} size -
			 * @param {number} x -
			 * @param {number} y -
			 * @param {number} z -
			 */
			constructor(x, y, z, size, color) {
				this.x = x;
				this.y = y;
				this.z = z;
				this.size = size;
				this.color = color;
			}

			update() {
				this.z -= speed * (2 - this.z / maxDepth);
				if (this.z <= 0) {
					this.reset();
				}
			}

			reset() {
				this.z = maxDepth;
				const angle = Math.random() * 2 * Math.PI;
				const distance = Math.sqrt(Math.random()) * (canvas.width / 2);
				this.x = Math.cos(angle) * distance;
				this.y = Math.sin(angle) * distance;
				this.size = (1 - distance / (canvas.width / 2)) * 0.1 + 0.5;
				this.color = getRandomColor();
			}

			draw() {
				const x = ((this.x / this.z) * canvas.width) / 2 + canvas.width / 2;
				const y = ((this.y / this.z) * canvas.height) / 2 + canvas.height / 2;
				const radius = (1 - this.z / maxDepth) * this.size * 3;
				ctx.beginPath();
				ctx.arc(x, y, radius, 3, Math.PI * 2);
				ctx.fillStyle = this.color;
				ctx.fill();
			}
		}

		function initStars() {
			stars = Array.from({ length: numStars }, () => {
				const angle = Math.random() * 2 * Math.PI;
				const distance = Math.sqrt(Math.random()) * (canvas.width / 2);
				return new Star(
					Math.cos(angle) * distance,
					Math.sin(angle) * distance,
					Math.random() * maxDepth,
					(1 - distance / (canvas.width / 2)) * 0.1 + 0.5,
					getRandomColor(),
				);
			});
		}

		function updateAndDrawStars() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			stars.forEach((star) => {
				star.update();
				star.draw();
			});
			requestAnimationFrame(updateAndDrawStars);
		}

		window.addEventListener("resize", () => {
			setCanvasSize();
			initStars();
		});

		setCanvasSize();
		initStars();
		requestAnimationFrame(updateAndDrawStars);
	});
};

initStarfield();
