const Inputs = {
	BUTTON_A: 0,
	BUTTON_B: 1,
	BUTTON_X: 2,
	BUTTON_Y: 3,
	BUTTON_LB: 4,
	BUTTON_RB: 5,
	BUTTON_LT: 6,
	BUTTON_RT: 7,
	BUTTON_BACK: 8,
	BUTTON_START: 9,
	BUTTON_KNOB_LEFT: 10,
	BUTTON_KNOB_RIGHT: 11,
	BUTTON_UP: 12,
	BUTTON_DOWN: 13,
	BUTTON_LEFT: 14,
	BUTTON_RIGHT: 15,
	BUTTON_XBOX: 16,
	AXIS_LEFT_X: 0,
	AXIS_LEFT_Y: 1,
	AXIS_RIGHT_X: 2,
	AXIS_RIGHT_Y: 3,
};

/** @type {[Array<[string, Array<string>]>, Array<[string, string]>, Array<[string, string]>]} */
const DATA = [[["REPLACED BY", ["BUILD-SITE.JS"]]], [], []];

const main = () => {
	const svg = document.querySelector("svg");
	if (svg === null) {
		throw new Error("Unable to find <svg> element.");
	}

	/** @type {HTMLParagraphElement | null} */
	const statusText = document.querySelector("#status .text");
	if (statusText === null) {
		throw new Error("Unable to find #status element.");
	}

	console.info("Timeline loaded. SVG should fade in now.");
	document.body.classList.remove("loading");

	// Find all SVG elements that are GraphViz nodes.
	const nodes = [...document.querySelectorAll(".node").values()];
	// Get all their IDs into a single order. The IDs are designed to fall into
	// chronological order when sorted based on their ASCII values.
	const ids = nodes.map((_) => _.id).sort();
	// A set of all the unique IDs. For slightly faster lookups, compared to
	// an index search through the array.
	const idSet = new Set(ids);
	idSet.delete("");
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
			[...document.querySelectorAll(`.node.event.${_}`).values()]
				.map((node) => node.id)
				.sort(),
		]),
	);
	// A map of node IDs to their respective parent timeline.
	const nodeTimelines = new Map(
		[...timelineIds.values()].flatMap((_) =>
			[...document.querySelectorAll(`.node.event.${_}`).values()]
				.map((node) => node.id)
				.sort()
				.map((id) => [id, _]),
		),
	);
	/** @type {Map<string, Array<string>>} */
	const lookupTimelineToEventIDs = new Map(DATA[0]);
	/** @type {Map<string, string>} */
	const lookupTimelineToPenColor = new Map(DATA[1]);
	/** @type {Map<string, string>} */
	const lookupTimelineToIdentity = new Map(DATA[2]);
	/** @type {Map<string, Array<string>>} */
	const lookupTimelinesFromEventId = lookupTimelineToEventIDs
		.entries()
		.reduce((all, [timelineId, ids]) => {
			ids.forEach((id) => {
				if (all.has(id)) {
					all.get(id).push(timelineId);
				} else {
					all.set(id, [timelineId]);
				}
			});
			return all;
		}, new Map());
	const allEventIDs = lookupTimelineToEventIDs
		.values()
		.reduce((all, current) => {
			all.push(...current);
			return all;
		}, []);

	// The ID of the currently focused node.
	let idFocused = idSet.has(window.location.hash.replace(/^#/, ""))
		? window.location.hash.replace(/^#/, "")
		: undefined;
	// The global timeline index of the focused node.
	let idFocusedIndex = idFocused !== undefined ? ids.indexOf(idFocused) : -1;
	/** @type {HTMLElement | null} */
	let nodeFocused =
		idFocused !== undefined ? document.querySelector(`#${idFocused}`) : null;
	// The ID of the timeline the focused node is part of.
	let timelineFocused =
		idFocused !== undefined ? nodeTimelines.get(idFocused) : undefined;

	const rapidKeys = new Map();
	const starPlanes = Array.from({
		length: 16,
	}).map((_) => [
		document.createElement("canvas"),
		document.createElement("canvas"),
	]);
	const speedTime = 0.001;
	const speedScroll = 0.001;
	const starColors = ["#FFFFFF", "#FFDDC1", "#FFC0CB", "#ADD8E6", "#B0E0E6"];
	const startTime = Date.now();
	let lastKnownScrollPosition = 0;
	const _ticking = false;
	const _gamepadControlHandle = 0;

	/**
	 * @param id {string} -
	 * @param onTimelineId {string} -
	 */
	const findNodeNeighbors = (id, onTimelineId) => {
		const eventDateMatch = id.match(/^Z\d{4}-\d{2}-\d{2}/);
		if (eventDateMatch === null || eventDateMatch.length === 0) {
			throw new Error(`Unable to match date in ID '${id}'`);
		}

		const eventDate = eventDateMatch[0];
		const onDate = allEventIDs
			.filter((eventId) => eventId.startsWith(eventDate))
			.sort();
		const ownIndexOnDate = onDate.indexOf(id);

		const timelineIds = lookupTimelinesFromEventId.get(id);
		if (timelineIds === undefined) {
			throw new Error(`Unable to find timeline ID for event ID '${id}'`);
		}

		if (!timelineIds.includes(onTimelineId)) {
			throw new Error(
				`Event ID '${id}' is not on timeline ID '${onTimelineId}'`,
			);
		}

		const eventIds = lookupTimelineToEventIDs.get(onTimelineId);
		if (eventIds === undefined) {
			throw new Error(`Unable to find event IDs for timeline ID '${id}'`);
		}

		const eventIndexOnTimeline = eventIds.indexOf(id);

		return {
			left: ownIndexOnDate === 0 ? null : onDate[ownIndexOnDate - 1],
			right:
				ownIndexOnDate === onDate.length - 1
					? null
					: onDate[ownIndexOnDate + 1],
			up:
				eventIndexOnTimeline === 0 ? null : eventIds[eventIndexOnTimeline - 1],
			down:
				eventIndexOnTimeline === eventIds.length - 1
					? null
					: eventIds[eventIndexOnTimeline + 1],
			intersection: timelineIds,
		};
	};

	/**
	 * @param {string} id -
	 * @param {string | undefined} onTimelineId -
	 */
	const focusNode = (id, onTimelineId = undefined) => {
		if (!id) {
			return;
		}

		const anchor = `#${id}`;
		/** @type {HTMLElement | null} */
		const node = document.querySelector(anchor);

		if (node === null) {
			console.error(
				`Node with ID '${id}' wasn't found in DOM. Unable to focus node.`,
			);
			return;
		}

		nodeFocused = node;
		window.history.pushState(
			{ id },
			"",
			window.location.toString().replace(/(#.*)|$/, anchor),
		);
		document.title = `${new Date(id.substring(1).split("-").slice(0, -1).join("-")).toLocaleDateString()} - Open Time-Travel Engine`;

		idFocused = id;
		idFocusedIndex = ids.indexOf(idFocused);
		// If the newly focused node exists on the already focused timeline,
		// don't attempt to switch focus. This could cause focus to switch
		// to another timeline when entering a merge node.
		timelineFocused =
			onTimelineId ??
			(timelineFocused !== undefined &&
			timelineNodes.get(timelineFocused)?.includes(id)
				? timelineFocused
				: nodeTimelines.get(id));

		console.info(
			`Focused node ${idFocused} of timeline ${timelineFocused}. View update is pending.`,
		);

		requestFocusShift(id);
	};

	/**
	 * @param {MouseEvent} event -
	 */
	const onClick = (event) => {
		inputEventsPending = true;
		if (event.target === null) {
			return;
		}

		const nodeTarget = /** @type {SVGElement} */ (event.target);
		const node = nodeTarget.classList.contains("event")
			? nodeTarget
			: nodeTarget.closest("g.event");
		if (!node) {
			return;
		}

		if (node.id !== idFocused && idSet.has(node.id)) {
			console.info(`User selected ${node.id}. Focusing...`);
			focusNode(node.id);
		}
	};

	/**
	 * @param {KeyboardEvent} event -
	 */
	const onKeyUp = (event) => {
		console.debug(`keyup: key:${event.key} code:${event.code}`);
		inputEventsPending = true;

		if (!rapidKeys.has(event.code)) {
			rapidKeys.set(event.code, 0);
		}

		const keyIsRapid = Date.now() - rapidKeys.get(event.code) < 1000;
		rapidKeys.set(event.code, Date.now());

		let updateNavigation = true;

		/**
		 * @param {number} slice -
		 */
		const scrollTo = (slice) => {
			const step = document.body.scrollHeight / 10;
			const top = step * slice;
			console.info(
				`Scrolling ${keyIsRapid ? "rapidly" : "smoothly"} to ${top}.`,
			);
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
				navigateA();
				return;
			}

			// Step forwards in active timeline.
			case "KeyS":
			case "Numpad2": {
				navigateForward();
				return;
			}

			// Multiple steps forwards
			case "Numpad3":
				navigateB();
				break;

			// Single step backwards.
			case "KeyA":
			case "Numpad4": {
				navigateLeft();
				return;
			}

			// Re-focus already focused node. Useful when having scrolled away from focus.
			case "Numpad5":
				navigateHome();
				return;

			// Single step forwards.
			case "KeyD":
			case "Numpad6": {
				navigateRight();
				return;
			}

			// Home - Jump to global start.
			case "Numpad7": {
				navigateX();
				break;
			}

			// Step backwards in active timeline.
			case "KeyW":
			case "Numpad8": {
				navigateBackward();
				return;
			}

			// Multiple steps backwards
			case "Numpad9":
				navigateY();
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
	};

	let focusTargetBox = { x: 0, y: 0 };
	let camera = { x: 0, y: 0 };
	/**
	 * @param id {string | undefined}
	 */
	const requestFocusShift = (id) => {
		if (!id) {
			return;
		}

		const anchor = `#${id}`;
		/** @type {SVGElement | null} */
		const node = document.querySelector(anchor);

		if (node === null) {
			return;
		}

		let left = window.pageXOffset + node.getBoundingClientRect().left;
		let top = window.pageYOffset + node.getBoundingClientRect().top;

		left = left - document.documentElement.clientWidth / 2;
		top = top - document.documentElement.clientHeight / 2;

		focusTargetBox = { x: left, y: top };
		console.debug("New focus box requested", focusTargetBox);
	};

	const navigateForward = () => {
		if (idFocused === undefined || timelineFocused === undefined) {
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, timelineFocused);
		if (neighbors.down === null) {
			return;
		}

		focusNode(neighbors.down);
	};
	const navigateBackward = () => {
		if (idFocused === undefined || timelineFocused === undefined) {
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, timelineFocused);
		if (neighbors.up === null) {
			return;
		}

		focusNode(neighbors.up);
	};
	const navigateLeft = () => {
		if (idFocused === undefined || timelineFocused === undefined) {
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, timelineFocused);
		if (neighbors.left === null) {
			return;
		}

		focusNode(neighbors.left);
	};
	const navigateRight = () => {
		if (idFocused === undefined || timelineFocused === undefined) {
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, timelineFocused);
		if (neighbors.right === null) {
			return;
		}

		focusNode(neighbors.right);
	};
	const navigateA = () => {
		if (idFocused === undefined || timelineFocused === undefined) {
			console.warn(
				"Unable to navigate, due to missing focus information.",
				idFocused,
				timelineFocused,
			);
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, timelineFocused);
		if (neighbors.intersection.length <= 1) {
			console.warn(
				"Unable to navigate, due to lack of intersections.",
				neighbors,
			);
			return;
		}
		focusNode(idFocused, neighbors.intersection[0]);
	};
	const navigateB = () => {
		if (idFocused === undefined || timelineFocused === undefined) {
			console.warn(
				"Unable to navigate, due to missing focus information.",
				idFocused,
				timelineFocused,
			);
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, timelineFocused);
		if (neighbors.intersection.length <= 1) {
			console.warn(
				"Unable to navigate, due to lack of intersections.",
				neighbors,
			);
			return;
		}
		focusNode(idFocused, neighbors.intersection[1]);
	};
	const navigateX = () => {
		if (idFocused === undefined || timelineFocused === undefined) {
			console.warn(
				"Unable to navigate, due to missing focus information.",
				idFocused,
				timelineFocused,
			);
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, timelineFocused);
		if (neighbors.intersection.length <= 2) {
			console.warn(
				"Unable to navigate, due to lack of intersections.",
				neighbors,
			);
			return;
		}
		focusNode(idFocused, neighbors.intersection[2]);
	};
	const navigateY = () => {
		if (idFocused === undefined || timelineFocused === undefined) {
			console.warn(
				"Unable to navigate, due to missing focus information.",
				idFocused,
				timelineFocused,
			);
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, timelineFocused);
		if (neighbors.intersection.length <= 3) {
			console.warn(
				"Unable to navigate, due to lack of intersections.",
				neighbors,
			);
			return;
		}
		focusNode(idFocused, neighbors.intersection[3]);
	};
	const navigateHome = () => {
		focusNode("Z1983-12-25-0");
	};

	/**
	 * @param _event {Event} -
	 */
	const _onScroll = (_event) => {
		inputEventsPending = true;
		lastKnownScrollPosition = window.scrollY;
	};

	const getRandomColor = () => {
		const colorBase = starColors[Math.floor(Math.random() * starColors.length)];
		const matches = colorBase.substring(1).match(/../g);
		if (matches === null) {
			return colorBase;
		}
		const components = matches.map((x) => Number.parseInt(x, 16));
		const scale = 1 / (Math.random() * 3);
		const color = components
			.map((_) => Math.floor(_ * scale))
			.map((_) => _.toString(16).padStart(2, "0"))
			.join("")
			.toUpperCase();
		return `#${color}`;
	};

	const init = () => {
		for (const [planeTop, planeBottom] of starPlanes) {
			for (const plane of [planeTop, planeBottom]) {
				plane.width = document.body.scrollWidth;
				plane.height = window.innerHeight;
			}
		}

		let stars = 2 ** 11;
		for (const [planeTop, planeBottom] of starPlanes) {
			for (const plane of [planeTop, planeBottom]) {
				const context = plane.getContext("2d");
				if (context === null) {
					throw new Error(
						"Unable to initialize 2D rendering context for star plane.",
					);
				}

				for (let _ = 0; _ < stars; ++_) {
					context.beginPath();
					context.arc(
						Math.random() * plane.width,
						Math.random() * plane.height,
						Math.random(),
						0,
						Math.PI * 2,
					);
					const _grey = Math.floor(Math.random() * 255)
						.toString(16)
						.padStart(2, "0");
					context.fillStyle = getRandomColor();
					context.fill();
				}

				document.body.insertBefore(plane, svg);
			}

			stars *= 0.9;
		}
	};

	let inputEventsPending = true;
	/** @type {Array<{pressed:boolean}> | undefined} */
	let previousButtons;
	const handleInputs = () => {
		let requiresRefresh = inputEventsPending;
		const gamepads = navigator.getGamepads();
		if (Array.isArray(gamepads) && 0 < gamepads.length) {
			const gp = gamepads[0];
			if (gp !== null) {
				//startTime += gp.axes[AXIS_LEFT_Y] * 1000;
				//startTime += gp.axes[AXIS_RIGHT_Y] * 1000;

				if (
					gp.buttons[Inputs.BUTTON_DOWN].pressed === false &&
					previousButtons?.[Inputs.BUTTON_DOWN].pressed === true
				) {
					navigateForward();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_UP].pressed === false &&
					previousButtons?.[Inputs.BUTTON_UP].pressed === true
				) {
					navigateBackward();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_LEFT].pressed === false &&
					previousButtons?.[Inputs.BUTTON_LEFT].pressed === true
				) {
					navigateLeft();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_RIGHT].pressed === false &&
					previousButtons?.[Inputs.BUTTON_RIGHT].pressed === true
				) {
					navigateRight();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_XBOX].pressed === false &&
					previousButtons?.[Inputs.BUTTON_XBOX].pressed === true
				) {
					navigateHome();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_A].pressed === false &&
					previousButtons?.[Inputs.BUTTON_A].pressed === true
				) {
					navigateA();
				}
				if (
					gp.buttons[Inputs.BUTTON_B].pressed === false &&
					previousButtons?.[Inputs.BUTTON_B].pressed === true
				) {
					navigateB();
				}
				if (
					gp.buttons[Inputs.BUTTON_X].pressed === false &&
					previousButtons?.[Inputs.BUTTON_X].pressed === true
				) {
					navigateX();
				}
				if (
					gp.buttons[Inputs.BUTTON_Y].pressed === false &&
					previousButtons?.[Inputs.BUTTON_Y].pressed === true
				) {
					navigateY();
				}

				previousButtons = [...gp.buttons];
			}
		}
		return requiresRefresh;
	};

	let cameraIsIdle = false;
	const updateCamera = () => {
		if (cameraIsIdle) {
			console.debug("Camera update requested while camera was idle.");
			return true;
		}

		// @ts-expect-error focusVisible is legit. trust me, bro
		nodeFocused?.focus({ focusVisible: true, preventScroll: true });

		if (timelineFocused !== undefined) {
			const timelineColor = lookupTimelineToPenColor.get(timelineFocused);
			if (timelineColor === undefined) {
				console.error(
					`Unable to look up pen color for timeline ID '${timelineFocused}'. Using fallback focus color.`,
				);
			} else {
				console.debug(`Setting --focus-color='${timelineColor}'`);
			}
			document.body.style.setProperty(
				"--focus-color",
				(timelineColor === "#00000000" ? "rgb(255 255 255)" : timelineColor) ??
					"rgb(255 255 255)",
			);

			const timelineIdentity = lookupTimelineToIdentity.get(timelineFocused);
			if (timelineIdentity === undefined) {
				console.error(
					`Unable to look up identity for timeline ID '${timelineFocused}'. Using fallback status.`,
				);
			} else {
				console.debug(`Setting #status.text='${timelineIdentity}'`);
			}
			statusText.textContent = timelineIdentity ?? "???";
		}

		if (camera.x === focusTargetBox.x && camera.y === focusTargetBox.y) {
			console.debug("Camera update was redundant.");
			return false;
		}

		console.debug("Scrolling to new target...", focusTargetBox);
		cameraIsIdle = true;
		inputEventsPending = false;
		window.scrollTo({
			top: focusTargetBox.y,
			behavior: "smooth",
			left: focusTargetBox.x,
		});

		const newCamera = { ...focusTargetBox };
		setTimeout(() => {
			cameraIsIdle = false;
			camera = newCamera;
			console.debug("Camera updated", camera);
		}, 1000);

		return false;
	};

	const present = () => {
		if (handleInputs()) {
			inputEventsPending = updateCamera();
		}

		//svg.style.transform = `translateY(${lastKnownScrollPosition}pt)`;
		const sinceStart = Date.now() - startTime;
		for (let z = 0; z < starPlanes.length; ++z) {
			const offset =
				(((z + 1) *
					(lastKnownScrollPosition * speedScroll + sinceStart * speedTime)) %
					window.innerHeight) *
				-1;
			starPlanes[z][0].style.transform = `translateY(${offset}px)`;
			starPlanes[z][1].style.transform =
				`translateY(${offset + window.innerHeight}px)`;
		}
		window.requestAnimationFrame(present);
	};

	if (-1 < idFocusedIndex && idFocused) {
		const node = document.querySelector(`#${idFocused}`);
		if (node !== null) {
			const timeline = nodeTimelines.get(node.id);
			console.info(
				`Selecting node #${idFocused} of timeline ${timeline} from location anchor.`,
			);
			focusNode(idFocused);
		}
	} else {
		focusNode(ids[0]);
	}

	document.addEventListener("click", onClick);
	document.addEventListener("keyup", onKeyUp);
	//document.addEventListener("scroll", onScroll);
	window.addEventListener("resize", init);

	init();
	present();
};

document.addEventListener("DOMContentLoaded", () => {
	main();
});
