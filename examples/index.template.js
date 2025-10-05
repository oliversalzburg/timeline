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

/** @type {import("source/types.js").RenderResultMetadata} */
const DATA = [[], [], ["", "", ""]];

const main = () => {
	console.info("Program init started.");

	const svg = document.querySelector("body > svg");
	if (svg === null) {
		throw new Error("Unable to find <svg> element.");
	}

	/** @type {HTMLDialogElement | null} */
	const dialog = document.querySelector("dialog");
	if (dialog === null) {
		throw new Error("Unable to find <dialog> element.");
	}
	/** @type {HTMLImageElement | null} */
	const dialogImage = document.querySelector("dialog img");
	if (dialogImage === null) {
		throw new Error("Unable to find <dialog> element.");
	}

	/** @type {HTMLDivElement | null} */
	const statusContainer = document.querySelector("#status");
	if (statusContainer === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLParagraphElement | null} */
	const statusText = document.querySelector("#status .text");
	if (statusText === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const shoulderLeft = document.querySelector("#status .shoulder.left");
	if (shoulderLeft === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const shoulderRight = document.querySelector("#status .shoulder.right");
	if (shoulderRight === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const intro = document.querySelector("#status .intro");
	if (intro === null) {
		throw new Error("Unable to find #status element.");
	}

	/** @type {HTMLSpanElement | null} */
	const statusOptionA = document.querySelector("#status .options .option.a");
	if (statusOptionA === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const statusOptionB = document.querySelector("#status .options .option.b");
	if (statusOptionB === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const statusOptionX = document.querySelector("#status .options .option.x");
	if (statusOptionX === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const statusOptionY = document.querySelector("#status .options .option.y");
	if (statusOptionY === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const statusButtonA = document.querySelector("#status .options .button.a");
	if (statusButtonA === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const statusButtonB = document.querySelector("#status .options .button.b");
	if (statusButtonB === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const statusButtonX = document.querySelector("#status .options .button.x");
	if (statusButtonX === null) {
		throw new Error("Unable to find #status element.");
	}
	/** @type {HTMLSpanElement | null} */
	const statusButtonY = document.querySelector("#status .options .button.y");
	if (statusButtonY === null) {
		throw new Error("Unable to find #status element.");
	}

	// A set of all the unique IDs.
	const idSet = DATA[0].reduce(
		(set, [, ids]) => {
			ids.forEach((id) => {
				set.add(id);
			});
			return set;
		},
		/** @type {Set<string>} */ (new Set()),
	);
	// Get all their IDs into a single order. The IDs are designed to fall into
	// chronological order when sorted based on their ASCII values.
	const allEventIDs = [...idSet.values()].sort();
	// A set of all unique timeline IDs. A unique ID has been generated for each
	// timeline by the renderer. For the navigation, we don't require any
	// additional metadata.
	const timelineIds = new Set(new Map(DATA[0]).keys());
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
	/** @type {Map<string, import("source/types.js").TimelineMetadata>} */
	const lookupTimelineToMetadata = new Map(DATA[1]);
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

	// The ID of the currently focused node.
	/** @type {string | undefined} */
	let idFocused;
	/** @type {HTMLElement | null} */
	let nodeFocused = null;
	// The ID of the timeline the focused node is part of.
	/** @type {string | undefined} */
	let timelineFocused;

	const neighborhoods = new Map();
	for (const id of allEventIDs) {
		if (id.match(/-1$/)) {
			const baseId = id.substring(0, id.length - 2);
			const neighborhood = allEventIDs.filter((needle) =>
				needle.startsWith(baseId),
			);

			neighborhood.sort((a, b) => {
				/** @type {SVGElement | null} */
				const nodeA = document.querySelector(`#${a}`);
				if (nodeA === null) {
					throw new Error(`unable to find node '#${a}'`);
				}

				/** @type {SVGElement | null} */
				const nodeB = document.querySelector(`#${b}`);
				if (nodeB === null) {
					throw new Error(`unable to find node '#${b}'`);
				}

				return (
					nodeA.getBoundingClientRect().left -
					nodeB.getBoundingClientRect().left
				);
			});
			neighborhoods.set(baseId, neighborhood);
		}
	}

	const rapidKeys = new Map();
	const starPlanes = Array.from({
		length: 16,
	}).map((_) => [
		document.createElement("canvas"),
		document.createElement("canvas"),
	]);
	const _speedTime = 0.0001;
	const _speedScroll = 0.001;
	const starColors = ["#FFFFFF", "#FFDDC1", "#FFC0CB", "#ADD8E6", "#B0E0E6"];
	const _startTime = Date.now();
	const _lastKnownScrollPosition = 0;

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
		const neighborhood = neighborhoods.get(eventDate) || [id];
		const onDate = neighborhood;
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
			intersection: timelineIds.filter(
				(_) => _ !== onTimelineId && lookupTimelineToMetadata.get(_)?.[1] === 1,
			),
			mediaItems: timelineIds.filter(
				(_) => lookupTimelineToMetadata.get(_)?.[1] === 3,
			),
		};
	};

	/**
	 * @param {string} id -
	 * @param {string | undefined} onTimelineId -
	 * @param {boolean | undefined} setState -
	 */
	const focusNode = (id, onTimelineId = undefined, setState = true) => {
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
		idFocused = id;
		// If the newly focused node exists on the already focused timeline,
		// don't attempt to switch focus. This could cause focus to switch
		// to another timeline when entering a merge node.
		timelineFocused =
			onTimelineId ??
			(timelineFocused !== undefined &&
			timelineNodes.get(timelineFocused)?.includes(id)
				? timelineFocused
				: nodeTimelines.get(id));

		if (setState) {
			window.history.pushState(
				{ id },
				"",
				window.location.toString().replace(/(#.*)|$/, anchor),
			);
		}
		document.title = `${new Date(id.substring(1).split("-").slice(0, -1).join("-")).toLocaleDateString()}`;

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
	const onKeyDown = (event) => {
		console.debug(`keydown: key:${event.key} code:${event.code}`);
		switch (event.code) {
			case "ArrowDown":
			case "ArrowLeft":
			case "ArrowRight":
			case "ArrowUp":
				event.preventDefault();
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

		const _keyIsRapid = Date.now() - rapidKeys.get(event.code) < 1000;
		rapidKeys.set(event.code, Date.now());

		switch (event.code) {
			case "KeyA": {
				event.preventDefault();
				navigateA();
				return;
			}
			case "KeyB": {
				event.preventDefault();
				navigateB();
				return;
			}
			case "KeyX": {
				event.preventDefault();
				navigateX();
				return;
			}
			case "KeyZ": {
				event.preventDefault();
				navigateY();
				return;
			}

			case "ArrowDown":
			case "Numpad2":
				event.preventDefault();
				navigateForward();
				return;

			case "ArrowLeft":
			case "Numpad4":
				event.preventDefault();
				navigateLeft();
				return;

			case "Numpad5":
				event.preventDefault();
				navigateHome();
				return;

			case "ArrowRight":
			case "Numpad6":
				event.preventDefault();
				navigateRight();
				return;

			case "ArrowUp":
			case "Numpad8":
				event.preventDefault();
				navigateBackward();
				return;
		}
	};

	let focusTargetBox = { x: 0, y: 0 };
	let camera = { x: 0, y: 0 };
	let mediaItemRotation = { x: 0, y: 0 };
	let mediaItemPosition = { x: 0, y: 0, z: 0 };
	let mediaItemVisible = false;
	let mediaItemClosed = false;
	let focusShiftPending = false;

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
		focusShiftPending = true;
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
		if (neighbors.intersection.length < 1) {
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
		if (neighbors.intersection.length < 2) {
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
		if (neighbors.intersection.length < 3) {
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
		if (neighbors.intersection.length < 4) {
			console.warn(
				"Unable to navigate, due to lack of intersections.",
				neighbors,
			);
			return;
		}
		focusNode(idFocused, neighbors.intersection[3]);
	};
	const navigateHome = () => {
		focusNode(DATA[2][1], DATA[2][2]);
	};
	const navigateToFocusNode = () => {
		if (idFocused === undefined) {
			return;
		}
		focusNode(idFocused);
	};
	const navigateStart = () => {
		if (timelineFocused === undefined) {
			return;
		}

		const events = lookupTimelineToEventIDs.get(timelineFocused);
		if (events === undefined) {
			throw Error("unexpected lookup miss");
		}

		focusNode(events[0], timelineFocused);
	};
	const navigateBack = () => {
		history.back();
	};

	/**
	 * @param event {PopStateEvent} -
	 */
	const onPopState = (event) => {
		focusNode(event.state.id, undefined, false);
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

	let windowHeight = 1;
	const initGraphics = () => {
		console.info("Initializing graphics...");

		windowHeight = window.innerHeight;
		for (const [planeTop, planeBottom] of starPlanes) {
			for (const plane of [planeTop, planeBottom]) {
				plane.width = document.body.scrollWidth;
				plane.height = windowHeight;
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

	let inputEventsPending = false;
	let requestInstantFocusUpdate = false;
	/** @type {Array<number> | undefined} */
	let previousAxes;
	/** @type {Array<{pressed:boolean}> | undefined} */
	let previousButtons;
	const INPUT_THRESHOLD = 0.5;

	/**
	 * @param {number} delta -
	 */
	const handleInputs = (delta) => {
		let requiresRefresh = inputEventsPending;
		const gamepads = navigator.getGamepads();
		if (Array.isArray(gamepads) && 0 < gamepads.length) {
			const gp = gamepads[0];
			if (gp !== null) {
				if (
					previousAxes !== undefined &&
					(gp.axes[Inputs.AXIS_LEFT_X] !== previousAxes?.[Inputs.AXIS_LEFT_X] ||
						INPUT_THRESHOLD < Math.abs(gp.axes[Inputs.AXIS_LEFT_X]))
				) {
					focusTargetBox.x += gp.axes[Inputs.AXIS_LEFT_X] * delta * 0.001;
					requiresRefresh = true;
					requestInstantFocusUpdate = true;
				}
				if (
					previousAxes !== undefined &&
					(gp.axes[Inputs.AXIS_LEFT_Y] !== previousAxes?.[Inputs.AXIS_LEFT_Y] ||
						INPUT_THRESHOLD < Math.abs(gp.axes[Inputs.AXIS_LEFT_Y]))
				) {
					focusTargetBox.y += gp.axes[Inputs.AXIS_LEFT_Y] * delta * 0.001;
					requiresRefresh = true;
					requestInstantFocusUpdate = true;
				}

				if (
					previousAxes !== undefined &&
					(gp.axes[Inputs.AXIS_RIGHT_X] !==
						previousAxes?.[Inputs.AXIS_RIGHT_X] ||
						INPUT_THRESHOLD < Math.abs(gp.axes[Inputs.AXIS_RIGHT_X]))
				) {
					mediaItemPosition.x -= gp.axes[Inputs.AXIS_RIGHT_X] * delta * 0.001;
				}
				if (
					previousAxes !== undefined &&
					(gp.axes[Inputs.AXIS_RIGHT_Y] !==
						previousAxes?.[Inputs.AXIS_RIGHT_Y] ||
						INPUT_THRESHOLD < Math.abs(gp.axes[Inputs.AXIS_RIGHT_Y]))
				) {
					mediaItemPosition.y -= gp.axes[Inputs.AXIS_RIGHT_Y] * delta * 0.001;
				}
				if (gp.buttons[Inputs.BUTTON_LT].pressed === true) {
					mediaItemPosition.z -= delta * 0.001;
				}
				if (gp.buttons[Inputs.BUTTON_RT].pressed === true) {
					mediaItemPosition.z += delta * 0.001;
				}

				if (
					gp.buttons[Inputs.BUTTON_START].pressed === false &&
					previousButtons?.[Inputs.BUTTON_START].pressed === true
				) {
					navigateStart();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_BACK].pressed === false &&
					previousButtons?.[Inputs.BUTTON_BACK].pressed === true
				) {
					navigateBack();
					requiresRefresh = true;
				}
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
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_B].pressed === false &&
					previousButtons?.[Inputs.BUTTON_B].pressed === true
				) {
					navigateB();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_X].pressed === false &&
					previousButtons?.[Inputs.BUTTON_X].pressed === true
				) {
					navigateX();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_Y].pressed === false &&
					previousButtons?.[Inputs.BUTTON_Y].pressed === true
				) {
					navigateY();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_BACK].pressed === false &&
					previousButtons?.[Inputs.BUTTON_BACK].pressed === true
				) {
					navigateToFocusNode();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_LB].pressed === false &&
					previousButtons?.[Inputs.BUTTON_LB].pressed === true
				) {
					showMediaBackwardOrClose();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_RB].pressed === false &&
					previousButtons?.[Inputs.BUTTON_RB].pressed === true
				) {
					showMediaForwardOrClose();
					requiresRefresh = true;
				}

				previousAxes = [...gp.axes];
				previousButtons = [...gp.buttons];
			}
		}
		return requiresRefresh;
	};

	/** @type {Array<string> | undefined} */
	let timelineMediaIds;
	/** @type {number | undefined} */
	let timelineMediaIdActive;
	const showMediaForwardOrClose = () => {
		if (timelineMediaIds === undefined || timelineMediaIds.length === 0) {
			return;
		}

		timelineMediaIdActive =
			timelineMediaIdActive === undefined
				? 0
				: timelineMediaIdActive === timelineMediaIds.length - 1
					? undefined
					: timelineMediaIdActive + 1;
		if (timelineMediaIdActive === undefined) {
			closeMedia();
			return;
		}

		dialogImage.src = `${lookupTimelineToMetadata.get(timelineMediaIds[timelineMediaIdActive])?.[2]}`;
		dialog.show();
		mediaItemVisible = true;
	};
	const showMediaBackwardOrClose = () => {
		if (timelineMediaIds === undefined || timelineMediaIds.length === 0) {
			return;
		}

		if (timelineMediaIdActive === undefined) {
			closeMedia();
			return;
		}

		timelineMediaIdActive =
			timelineMediaIdActive === 0 ? undefined : timelineMediaIdActive - 1;
		if (timelineMediaIdActive === undefined) {
			closeMedia();
			return;
		}

		dialogImage.src = `${lookupTimelineToMetadata.get(timelineMediaIds[timelineMediaIdActive])?.[2]}`;
		dialog.show();
		mediaItemVisible = true;
	};
	const closeMedia = () => {
		dialog.close();
		mediaItemRotation = { x: 0, y: 0 };
		mediaItemPosition = { x: 0, y: 0, z: 0 };
		dialog.style.transform = `rotateX(0) rotateY(0) translate(0 0 0)`;
		mediaItemVisible = false;
		mediaItemClosed = true;
	};

	let cameraIsIdle = false;
	const updateCamera = (updateStatus = false) => {
		if (cameraIsIdle) {
			console.debug("Camera update requested while camera was idle.");
			return true;
		}

		if (updateStatus) {
			nodeFocused?.focus({ preventScroll: true });
			focusShiftPending = false;

			if (idFocused !== undefined && timelineFocused !== undefined) {
				const newNeighbors = findNodeNeighbors(idFocused, timelineFocused);
				const navOptions = {
					A:
						0 < newNeighbors.intersection.length
							? newNeighbors.intersection[0]
							: null,
					B:
						1 < newNeighbors.intersection.length
							? newNeighbors.intersection[1]
							: null,
					X:
						2 < newNeighbors.intersection.length
							? newNeighbors.intersection[2]
							: null,
					Y:
						3 < newNeighbors.intersection.length
							? newNeighbors.intersection[3]
							: null,
				};

				const timelineColor =
					lookupTimelineToMetadata.get(timelineFocused)?.[0];

				timelineMediaIds = newNeighbors.mediaItems;

				const timelineIdentityName =
					lookupTimelineToMetadata.get(timelineFocused)?.[3];
				if (timelineIdentityName === undefined) {
					console.error(
						`Unable to look up identity for timeline ID '${timelineFocused}'. Using fallback status.`,
					);
				}

				intro.textContent = "⥲";
				statusText.textContent = timelineIdentityName ?? "???";
				statusText.style.color = timelineColor ?? "";

				statusContainer.style.visibility =
					0 < newNeighbors.intersection.length ||
					0 < newNeighbors.mediaItems.length
						? "visible"
						: "hidden";

				shoulderLeft.style.visibility =
					0 < newNeighbors.mediaItems.length &&
					timelineMediaIdActive !== undefined
						? "visible"
						: "hidden";
				shoulderLeft.textContent =
					timelineMediaIdActive === 0 ? "Schließen" : "Zurück blättern";

				shoulderRight.style.visibility =
					0 < newNeighbors.mediaItems.length ? "visible" : "hidden";
				shoulderRight.textContent =
					timelineMediaIdActive === undefined
						? "Artefakte anzeigen"
						: timelineMediaIdActive === timelineMediaIds.length - 1
							? "Schließen"
							: "Vorwärts blättern";

				statusOptionA.textContent =
					navOptions.A === null || newNeighbors.intersection.length < 1
						? ""
						: (lookupTimelineToMetadata.get(navOptions.A)?.[3] ?? "???");
				statusOptionA.style.color =
					navOptions.A === null || newNeighbors.intersection.length < 1
						? ""
						: (lookupTimelineToMetadata.get(navOptions.A)?.[0] ?? "#f00");
				statusOptionB.textContent =
					navOptions.B === null || newNeighbors.intersection.length < 2
						? ""
						: (lookupTimelineToMetadata.get(navOptions.B)?.[3] ?? "???");
				statusOptionB.style.color =
					navOptions.B === null || newNeighbors.intersection.length < 2
						? ""
						: (lookupTimelineToMetadata.get(navOptions.B)?.[0] ?? "#f00");
				statusOptionX.textContent =
					navOptions.X === null || newNeighbors.intersection.length < 3
						? ""
						: (lookupTimelineToMetadata.get(navOptions.X)?.[3] ?? "???");
				statusOptionX.style.color =
					navOptions.X === null || newNeighbors.intersection.length < 3
						? ""
						: (lookupTimelineToMetadata.get(navOptions.X)?.[0] ?? "#f00");
				statusOptionY.textContent =
					navOptions.Y === null || newNeighbors.intersection.length < 4
						? ""
						: (lookupTimelineToMetadata.get(navOptions.Y)?.[3] ?? "???");
				statusOptionY.style.color =
					navOptions.Y === null || newNeighbors.intersection.length < 4
						? ""
						: (lookupTimelineToMetadata.get(navOptions.Y)?.[0] ?? "#f00");

				statusButtonA.style.display =
					navOptions.A === null || newNeighbors.intersection.length < 1
						? "none"
						: "inline-block";
				statusButtonB.style.display =
					navOptions.B === null || newNeighbors.intersection.length < 2
						? "none"
						: "inline-block";
				statusButtonX.style.display =
					navOptions.X === null || newNeighbors.intersection.length < 3
						? "none"
						: "inline-block";
				statusButtonY.style.display =
					navOptions.Y === null || newNeighbors.intersection.length < 4
						? "none"
						: "inline-block";
			}
		}

		if (camera.x === focusTargetBox.x && camera.y === focusTargetBox.y) {
			console.debug("Camera update was redundant.");
			return false;
		}

		console.debug("Scrolling to new target...", focusTargetBox);
		cameraIsIdle = true;
		window.scrollTo({
			top: focusTargetBox.y,
			behavior: requestInstantFocusUpdate ? "instant" : "smooth",
			left: focusTargetBox.x,
		});
		inputEventsPending = false;
		requestInstantFocusUpdate = false;

		const newCamera = { ...focusTargetBox };
		setTimeout(
			() => {
				cameraIsIdle = false;
				camera = newCamera;
				console.debug("Camera updated", camera);
			},
			requestInstantFocusUpdate ? 0 : 1000,
		);

		return false;
	};

	/** @type {number | undefined} */
	let previousTimestamp;
	/**
	 * @param timestamp {number} -
	 */
	const present = (timestamp) => {
		if (previousTimestamp === undefined) {
			previousTimestamp = timestamp;
		}

		const delta = timestamp - previousTimestamp;

		if (handleInputs(delta)) {
			inputEventsPending = updateCamera(
				focusShiftPending || mediaItemVisible || mediaItemClosed,
			);
			mediaItemClosed = false;
		}

		//svg.style.transform = `translateY(${lastKnownScrollPosition}pt)`;
		/*
		const sinceStart = Date.now() - startTime;
		for (let z = 0; z < starPlanes.length; ++z) {
			const offset =
				(((z + 1) *
					(lastKnownScrollPosition * speedScroll + sinceStart * speedTime)) %
					windowHeight) *
				-1;
			starPlanes[z][0].style.transform = `translateY(${offset}px)`;
			starPlanes[z][1].style.transform =
				`translateY(${offset + windowHeight}px)`;
		}
		*/

		if (mediaItemVisible) {
			// Browser X-Y is reversed.
			dialog.style.transform = `perspective(50vmin) rotateY(${mediaItemRotation.x}deg) rotateX(${mediaItemRotation.y}deg) translate3d(${mediaItemPosition.x}px, ${mediaItemPosition.y}px, ${mediaItemPosition.z}px)`;
		}

		window.requestAnimationFrame(present);
	};

	document.addEventListener("click", onClick);
	document.addEventListener("keydown", onKeyDown);
	document.addEventListener("keyup", onKeyUp);
	window.addEventListener("resize", initGraphics);
	window.addEventListener("popstate", onPopState);

	window.setTimeout(() => {
		initGraphics();

		console.info("Requesting initial focus...");
		inputEventsPending = true;
		navigateHome();

		window.requestAnimationFrame(present);
		window.setTimeout(() => {
			console.info("Program init finalized.");
			document.body.classList.remove("loading");
		}, 5000);
	});
	console.info("Next-frame ignition requested.");
};

document.addEventListener("DOMContentLoaded", () => {
	console.info(
		"DOM content loaded. Program init is pending. Allow at least 30 seconds to pass.",
	);
	setTimeout(() => main(), 5000);
});
