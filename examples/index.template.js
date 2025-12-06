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
const DATA = [[], [], ["", "", ""], []];

const main = async () => {
	console.info("Program init started.");

	//#region DOM Element Selection
	/** @type {HTMLStyleElement | null} */
	const css = document.querySelector("#css");
	if (css === null) {
		throw new Error("Unable to find #css element.");
	}
	const stylesheet = css.sheet;
	if (stylesheet === null) {
		throw new Error("Unable to find stylesheet.");
	}

	/** @type {HTMLDivElement | null} */
	const loader = document.querySelector("body > .loader");
	if (loader === null) {
		throw new Error("Unable to find loader element.");
	}

	/** @type {SVGElement | null} */
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
	/** @type {HTMLIFrameElement | null} */
	const dialogIFrame = document.querySelector("dialog iframe");
	if (dialogIFrame === null) {
		throw new Error("Unable to find <dialog> element.");
	}

	/** @type {HTMLDivElement | null} */
	const calendarContainer = document.querySelector("#calendar");
	if (calendarContainer === null) {
		throw new Error("Unable to find #calendar element.");
	}
	/** @type {HTMLParagraphElement | null} */
	const calendarDate = document.querySelector("#calendar .date");
	if (calendarDate === null) {
		throw new Error("Unable to find #calendar element.");
	}
	/** @type {HTMLParagraphElement | null} */
	const calendarText = document.querySelector("#calendar .text");
	if (calendarText === null) {
		throw new Error("Unable to find #calendar element.");
	}

	/** @type {HTMLDivElement | null} */
	const menuContainer = document.querySelector("#menu");
	if (menuContainer === null) {
		throw new Error("Unable to find #menu element.");
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
	/** @type {HTMLDivElement | null} */
	const shouldersContainer = document.querySelector("#status .shoulders");
	if (shouldersContainer === null) {
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
	const statusOptions = document.querySelector("#status .options");
	if (statusOptions === null) {
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
	//#endregion

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
	/** @type {Map<string, Array<string>>} */
	const lookupTimelineToEventIDs = new Map(DATA[0]);
	/** @type {Map<string, import("source/types.js").TimelineMetadata>} */
	const lookupTimelineToMetadata = new Map(DATA[1]);
	const lookupSegmentBounds = DATA[3];
	/** @type {NodeListOf<SVGElement>} */
	const graphGroups = svg.querySelectorAll("g.graph");
	/** @type {Array<SVGElement>} */
	const lookupSegments = [...graphGroups.values()];
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
	// The ID of the timeline the focused node is part of.
	/** @type {string | undefined} */
	let idFocusedTimeline;

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

	const starPlanes = Array.from({
		length: 12,
	}).map(
		(_) =>
			/** @type {[number, number, HTMLCanvasElement, HTMLCanvasElement]} */ ([
				0,
				0,
				document.createElement("canvas"),
				document.createElement("canvas"),
			]),
	);
	const speedTime = 0.0001;
	const speedScroll = 0.001;
	const starColorsRGB = [
		[255, 255, 255],
		[255, 221, 193],
		[255, 192, 203],
		[173, 216, 230],
		[176, 224, 230],
	];
	const startTime = Date.now();
	let lastKnownScrollPosition = 0;

	//#region Audio
	const context = new window.AudioContext();

	function playSuccess() {
		const successNoise = context.createOscillator();
		successNoise.frequency.setValueAtTime(600, 0);
		successNoise.type = "sine";
		successNoise.frequency.exponentialRampToValueAtTime(
			800,
			context.currentTime + 0.05,
		);
		successNoise.frequency.exponentialRampToValueAtTime(
			1000,
			context.currentTime + 0.15,
		);

		const successGain = context.createGain();
		successGain.gain.exponentialRampToValueAtTime(
			0.01,
			context.currentTime + 0.3,
		);

		const successFilter = context.createBiquadFilter();
		successFilter.type = "bandpass";
		successFilter.Q.setValueAtTime(0.01, 0);

		successNoise
			.connect(successFilter)
			.connect(successGain)
			.connect(context.destination);
		successNoise.start();
		successNoise.stop(context.currentTime + 0.2);
	}

	function _playError() {
		const errorNoise = context.createOscillator();
		errorNoise.frequency.setValueAtTime(400, 0);
		errorNoise.type = "sine";
		errorNoise.frequency.exponentialRampToValueAtTime(
			200,
			context.currentTime + 0.05,
		);
		errorNoise.frequency.exponentialRampToValueAtTime(
			100,
			context.currentTime + 0.2,
		);

		const errorGain = context.createGain();
		errorGain.gain.exponentialRampToValueAtTime(
			0.01,
			context.currentTime + 0.3,
		);

		errorNoise.connect(errorGain).connect(context.destination);
		errorNoise.start();
		errorNoise.stop(context.currentTime + 0.3);
	}

	//#endregion

	/**
	 * @param id {string | undefined} -
	 * @param onTimelineId {string | undefined} -
	 */
	const findNodeNeighbors = (
		id = idFocused,
		onTimelineId = idFocusedTimeline,
	) => {
		if (id === undefined || onTimelineId === undefined) {
			throw new Error("missing id");
		}

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
			intersection: timelineIds.filter((_) =>
				[1, 2].includes(lookupTimelineToMetadata.get(_)?.[1] ?? 0),
			),
			mediaItems: timelineIds.filter(
				(_) => lookupTimelineToMetadata.get(_)?.[1] === 3,
			),
		};
	};

	/**
	 * @param {string | undefined} id -
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
		/** @type {HTMLElement | null} */
		const nodeTitleAnchor = document.querySelector(`${anchor} a`);
		const nodeTitle = nodeTitleAnchor?.attributes.getNamedItemNS(
			"http://www.w3.org/1999/xlink",
			"title",
		)?.value;

		if (node === null) {
			console.error(
				`Node with ID '${id}' wasn't found in DOM. Unable to focus node.`,
			);
			return;
		}

		if (nodeTitle === undefined) {
			console.error(
				`Node with ID '${id}' does not provide a title. Unable to focus node.`,
			);
			return;
		}

		const titleParts = nodeTitle.split("\n");
		calendarDate.textContent = titleParts[0];
		calendarText.textContent = `${titleParts[1]}\n${titleParts[2]}`;
		document.title = titleParts[0];
		intro.textContent = "Reise auf Zeit-Gleis:";

		idFocused = id;
		// If the newly focused node exists on the already focused timeline,
		// don't attempt to switch focus. This could cause focus to switch
		// to another timeline when entering a merge node.
		idFocusedTimeline =
			onTimelineId ??
			(idFocusedTimeline !== undefined &&
			lookupTimelinesFromEventId.get(id)?.includes(idFocusedTimeline)
				? idFocusedTimeline
				: lookupTimelinesFromEventId.get(id)?.[0]);

		if (setState) {
			window.history.pushState(
				{ id },
				"",
				window.location.toString().replace(/(#.*)|$/, anchor),
			);
		}

		console.info(
			`Focused node ${idFocused} of timeline ${idFocusedTimeline}. View update is pending.`,
		);

		requestFocusShift(id);
	};

	/**
	 * @param {MouseEvent} event -
	 */
	const onClick = (event) => {
		document.documentElement.style.cursor = "default";

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

		cameraIsDetached = false;
		focusTargetBox = { x: left, y: top };
		console.debug("New focus box requested", focusTargetBox);
	};

	//#region Navigation Helper
	const navigateForward = () => {
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			return false;
		}
		const neighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
		if (neighbors.down === null) {
			return false;
		}

		focusNode(neighbors.down);
		return true;
	};
	const navigateBackward = () => {
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			return false;
		}
		const neighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
		if (neighbors.up === null) {
			return false;
		}

		focusNode(neighbors.up);
		return true;
	};
	const navigateLeft = () => {
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			return false;
		}
		const neighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
		if (neighbors.left === null) {
			return false;
		}

		focusNode(neighbors.left);
		return true;
	};
	const navigateRight = () => {
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			return false;
		}
		const neighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
		if (neighbors.right === null) {
			return false;
		}

		focusNode(neighbors.right);
		return true;
	};
	const navigateA = () => {
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			console.warn(
				"Unable to navigate, due to missing focus information.",
				idFocused,
				idFocusedTimeline,
			);
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
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
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			console.warn(
				"Unable to navigate, due to missing focus information.",
				idFocused,
				idFocusedTimeline,
			);
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
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
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			console.warn(
				"Unable to navigate, due to missing focus information.",
				idFocused,
				idFocusedTimeline,
			);
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
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
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			console.warn(
				"Unable to navigate, due to missing focus information.",
				idFocused,
				idFocusedTimeline,
			);
			return;
		}
		const neighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
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
	const _navigateToFocusNode = () => {
		if (idFocused === undefined) {
			return;
		}
		focusNode(idFocused);
	};
	const _navigateStart = () => {
		if (idFocusedTimeline === undefined) {
			return;
		}

		const events = lookupTimelineToEventIDs.get(idFocusedTimeline);
		if (events === undefined) {
			throw Error("unexpected lookup miss");
		}

		focusNode(events[0], idFocusedTimeline);
	};
	const _navigateBack = () => {
		history.back();
	};
	//#endregion

	/**
	 * @param event {PopStateEvent} -
	 */
	const onPopState = (event) => {
		focusNode(event.state.id, undefined, false);
	};

	const getRandomColor = () => {
		const components =
			starColorsRGB[Math.floor(Math.random() * starColorsRGB.length)];
		const scale = 1 / (Math.random() * 3);
		const color = components.map((_) => Math.floor(_ * scale)).join(" ");
		return `rgb(${color})`;
	};

	let windowHeight = 1;
	let windowWidth = 1;
	const initGraphics = () => {
		console.info("Initializing graphics...");

		camera.x = window.scrollX;
		camera.y = window.screenY;

		windowHeight = window.innerHeight;
		windowWidth = window.innerWidth;
		for (const [, , planeTop, planeBottom] of starPlanes) {
			for (const plane of [planeTop, planeBottom]) {
				plane.width = windowWidth;
				plane.height = windowHeight;
			}
		}

		let stars = 2 ** 11;
		for (const [, , planeTop, planeBottom] of starPlanes) {
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
					context.fillStyle = getRandomColor();
					context.fill();
				}

				document.body.append(plane);
			}

			stars *= 0.9;
		}
	};

	let requestInstantFocusUpdate = false;
	const INPUT_THRESHOLD = 0.1;
	const _SPEED_FREE_FLIGHT = 5.0;
	const SPEED_MEDIA_SCALE = 0.5;
	const SPEED_MEDIA_TRANSLATE = 0.5;

	let previousTimelineActive = idFocusedTimeline;
	/**
	 * @typedef {{
	 * name: string,
	 * axes?: undefined|((frame: InputFrame) => void),
	 * pressed?: Record<number, undefined|((frame: InputFrame) => (InputPlane | undefined))>,
	 * released?: Record<number, undefined|((frame: InputFrame) => (InputPlane | undefined))>,
	 * }} InputPlane
	 * @type {InputPlane}
	 */
	const InputPlaneNeutral = {
		name: "neutral",
		pressed: {
			[Inputs.BUTTON_UP]: () => {
				if (navigateBackward()) {
					playSuccess();
				}
				return {
					name: "return",
					released: { [Inputs.BUTTON_UP]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				if (navigateForward()) {
					playSuccess();
				}
				return {
					name: "return",
					released: { [Inputs.BUTTON_DOWN]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_RB]: () => {
				mediaShow();
				return {
					name: "return",
					released: { [Inputs.BUTTON_RB]: returnToMedia },
				};
			},
			[Inputs.BUTTON_X]: () => {
				previousTimelineActive = idFocusedTimeline;
				menuSwitchTimeline();
				return {
					name: "return",
					released: { [Inputs.BUTTON_X]: returnToMenuSwitchTimeline },
				};
			},
		},
	};

	/** @type {InputPlane} */
	const InputPlaneMedia = {
		name: "media",
		pressed: {
			[Inputs.BUTTON_BACK]: () => {
				mediaClose();
				return {
					name: "return",
					released: { [Inputs.BUTTON_BACK]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_LB]: () => {
				if (!mediaBackward()) {
					mediaClose();
					return {
						name: "return",
						released: { [Inputs.BUTTON_LB]: returnToNeutral },
					};
				}
				return {
					name: "return",
					released: { [Inputs.BUTTON_LB]: returnToMedia },
				};
			},
			[Inputs.BUTTON_RB]: () => {
				if (!mediaForward()) {
					mediaClose();
					return {
						name: "return",
						released: { [Inputs.BUTTON_RB]: returnToNeutral },
					};
				}
				return {
					name: "return",
					released: { [Inputs.BUTTON_RB]: returnToMedia },
				};
			},
			[Inputs.BUTTON_LT]: (frame) => {
				mediaItemPosition.z -= (frame.delta / (1000 / 60)) * SPEED_MEDIA_SCALE;
				// Otherwise the item ends up behind the camera, or too far away.
				mediaItemPosition.z = Math.max(Math.min(mediaItemPosition.z, 39), -130);
				return {
					name: "return",
					pressed: {
						[Inputs.BUTTON_LT]: InputPlaneMedia.pressed?.[Inputs.BUTTON_LT],
					},
					released: { [Inputs.BUTTON_LT]: returnToMedia },
				};
			},
			[Inputs.BUTTON_RT]: (frame) => {
				mediaItemPosition.z += (frame.delta / (1000 / 60)) * SPEED_MEDIA_SCALE;
				// Otherwise the item ends up behind the camera, or too far away.
				mediaItemPosition.z = Math.max(Math.min(mediaItemPosition.z, 39), -130);
				return {
					name: "return",
					pressed: {
						[Inputs.BUTTON_RT]: InputPlaneMedia.pressed?.[Inputs.BUTTON_RT],
					},
					released: { [Inputs.BUTTON_RT]: returnToMedia },
				};
			},
		},
		axes: (frame) => {
			if (INPUT_THRESHOLD < Math.abs(frame.axes[Inputs.AXIS_LEFT_X])) {
				mediaItemPosition.x -=
					frame.axes[Inputs.AXIS_LEFT_X] *
					(frame.delta / (1000 / 60)) *
					SPEED_MEDIA_TRANSLATE;
			}
			if (INPUT_THRESHOLD < Math.abs(frame.axes[Inputs.AXIS_LEFT_Y])) {
				mediaItemPosition.x -=
					frame.axes[Inputs.AXIS_LEFT_Y] *
					(frame.delta / (1000 / 60)) *
					SPEED_MEDIA_TRANSLATE;
			}

			if (INPUT_THRESHOLD < Math.abs(frame.axes[Inputs.AXIS_RIGHT_X])) {
				mediaItemPosition.x -=
					frame.axes[Inputs.AXIS_RIGHT_X] *
					(frame.delta / (1000 / 60)) *
					SPEED_MEDIA_TRANSLATE;
			}
			if (INPUT_THRESHOLD < Math.abs(frame.axes[Inputs.AXIS_RIGHT_Y])) {
				mediaItemPosition.y -=
					frame.axes[Inputs.AXIS_RIGHT_Y] *
					(frame.delta / (1000 / 60)) *
					SPEED_MEDIA_TRANSLATE;
			}

			mediaItemPosition.x = Math.max(Math.min(mediaItemPosition.x, 95), -95);
			mediaItemPosition.y = Math.max(
				Math.min(mediaItemPosition.y, 10),
				-1_000_000,
			);
		},
	};

	/** @type {InputPlane} */
	const InputPlaneMenuSwitchTimeline = {
		name: "menuSwitchTimeline",
		pressed: {
			[Inputs.BUTTON_UP]: () => {
				if (idFocusedTimeline === undefined || idFocused === undefined) {
					return undefined;
				}
				const neighbors = findNodeNeighbors();
				const activeIndex = neighbors.intersection.indexOf(idFocusedTimeline);
				focusNode(idFocused, neighbors.intersection[activeIndex - 1]);
				menuSwitchTimeline();
				return {
					name: "return",
					released: { [Inputs.BUTTON_UP]: returnToMenuSwitchTimeline },
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				if (idFocusedTimeline === undefined || idFocused === undefined) {
					return undefined;
				}
				const neighbors = findNodeNeighbors();
				const activeIndex = neighbors.intersection.indexOf(idFocusedTimeline);
				focusNode(idFocused, neighbors.intersection[activeIndex + 1]);
				menuSwitchTimeline();
				return {
					name: "return",
					released: { [Inputs.BUTTON_DOWN]: returnToMenuSwitchTimeline },
				};
			},
			[Inputs.BUTTON_A]: () => {
				return {
					name: "return",
					released: { [Inputs.BUTTON_A]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_X]: () => {
				focusNode(idFocused, previousTimelineActive);
				return {
					name: "return",
					released: { [Inputs.BUTTON_X]: returnToNeutral },
				};
			},
		},
	};

	const returnToNeutral = () => {
		console.debug("Clearing input cache, returning neutral plane.");
		InputFrameCache = [];
		if (cssRuleHighlightActive !== undefined) {
			stylesheet.deleteRule(cssRuleHighlightActive);
			cssRuleHighlightActive = undefined;
		}
		calendarContainer.classList.add("open");
		menuContainer.classList.remove("open");
		statusContainer.classList.add("open");
		shouldersContainer.classList.add("visible");
		updateStatus();
		return InputPlaneNeutral;
	};
	const returnToMedia = () => {
		console.debug("Clearing input cache, returning media plane.");
		InputFrameCache = [];
		calendarContainer.classList.add("open");
		menuContainer.classList.remove("open");
		statusContainer.classList.add("open");
		shouldersContainer.classList.add("visible");
		updateStatus();
		return InputPlaneMedia;
	};
	const returnToMenuSwitchTimeline = () => {
		console.debug("Clearing input cache, returning menu plane.");
		InputFrameCache = [];
		calendarContainer.classList.remove("open");
		menuContainer.classList.add("open");
		statusContainer.classList.add("open");
		shouldersContainer.classList.remove("visible");
		return InputPlaneMenuSwitchTimeline;
	};

	let activeInputPlane = InputPlaneNeutral;

	/**
	 * @typedef {Record<number, number> & { axes: Record<number, number>, delta: number }} InputFrame
	 * @type {Array<InputFrame>}
	 */
	let InputFrameCache = [];
	/**
	 * @param {InputFrame} a -
	 * @param {InputFrame} b -
	 */
	const inputFramesAreEqual = (a, b) => {
		for (let fieldIndex = 0; fieldIndex < 17; ++fieldIndex) {
			if (a[fieldIndex] !== b[fieldIndex]) {
				return false;
			}
		}
		return true;
	};
	/**
	 * @param {InputFrame} frame -
	 */
	const pushInputFrame = (frame) => {
		const head =
			0 < InputFrameCache.length
				? InputFrameCache[InputFrameCache.length - 1]
				: null;
		if (head === null) {
			//console.debug("Recorded input frame.", InputFrameCache.length);
			InputFrameCache.push(frame);
			return;
		}

		if (inputFramesAreEqual(head, frame)) {
			InputFrameCache[InputFrameCache.length - 1] = frame;
			return;
		}

		//console.debug("Recorded input frame.", InputFrameCache.length);
		InputFrameCache.push(frame);
	};
	const digestInputFrames = () => {
		const head =
			0 < InputFrameCache.length
				? InputFrameCache[InputFrameCache.length - 1]
				: null;
		if (head === null) {
			return;
		}

		if (activeInputPlane.axes !== undefined) {
			activeInputPlane.axes(head);
		}

		const canPeekCount = InputFrameCache.length - 1;
		if (canPeekCount < 1) {
			return;
		}

		/** @param {number} slot - */
		const peek = (slot) => InputFrameCache[InputFrameCache.length - 1 - slot];
		const previousInputPlane = activeInputPlane;

		for (
			let buttonIndex = 0;
			buttonIndex <= Inputs.BUTTON_XBOX;
			++buttonIndex
		) {
			if (head[buttonIndex] === 1) {
				// Trigger on button press
				if (activeInputPlane.pressed?.[buttonIndex] !== undefined) {
					console.debug(
						`Triggering button press on ${activeInputPlane.name} input plane.`,
					);
					activeInputPlane =
						activeInputPlane.pressed?.[buttonIndex]?.(head) ?? activeInputPlane;
					if (activeInputPlane !== previousInputPlane) {
						return true;
					}
				}
			}

			if (
				head[buttonIndex] === 0 &&
				1 <= canPeekCount &&
				peek(1)[buttonIndex] === 1
			) {
				// Trigger on button release
				if (activeInputPlane.released?.[buttonIndex] !== undefined) {
					console.debug(
						`Triggering button release on ${activeInputPlane.name} input plane.`,
					);
					activeInputPlane =
						activeInputPlane.released?.[buttonIndex]?.(head) ??
						activeInputPlane;
					if (activeInputPlane !== previousInputPlane) {
						return true;
					}
				}
			}
		}

		return activeInputPlane !== previousInputPlane;
	};

	/**
	 * @param {number} delta -
	 */
	const handleInputs = (delta) => {
		const gamepads = navigator.getGamepads();
		if (
			Array.isArray(gamepads) &&
			0 < gamepads.length &&
			gamepads[0] !== null
		) {
			const gp = gamepads[0];
			const InputFrame = {
				delta,
				axes: gp.axes,
				[Inputs.BUTTON_A]: gp.buttons[Inputs.BUTTON_A].pressed ? 1 : 0,
				[Inputs.BUTTON_B]: gp.buttons[Inputs.BUTTON_B].pressed ? 1 : 0,
				[Inputs.BUTTON_X]: gp.buttons[Inputs.BUTTON_X].pressed ? 1 : 0,
				[Inputs.BUTTON_Y]: gp.buttons[Inputs.BUTTON_Y].pressed ? 1 : 0,
				[Inputs.BUTTON_LB]: gp.buttons[Inputs.BUTTON_LB].pressed ? 1 : 0,
				[Inputs.BUTTON_RB]: gp.buttons[Inputs.BUTTON_RB].pressed ? 1 : 0,
				[Inputs.BUTTON_LT]: gp.buttons[Inputs.BUTTON_LT].pressed ? 1 : 0,
				[Inputs.BUTTON_RT]: gp.buttons[Inputs.BUTTON_RT].pressed ? 1 : 0,
				[Inputs.BUTTON_BACK]: gp.buttons[Inputs.BUTTON_BACK].pressed ? 1 : 0,
				[Inputs.BUTTON_START]: gp.buttons[Inputs.BUTTON_START].pressed ? 1 : 0,
				[Inputs.BUTTON_KNOB_LEFT]: gp.buttons[Inputs.BUTTON_KNOB_LEFT].pressed
					? 1
					: 0,
				[Inputs.BUTTON_KNOB_RIGHT]: gp.buttons[Inputs.BUTTON_KNOB_RIGHT].pressed
					? 1
					: 0,
				[Inputs.BUTTON_UP]: gp.buttons[Inputs.BUTTON_UP].pressed ? 1 : 0,
				[Inputs.BUTTON_DOWN]: gp.buttons[Inputs.BUTTON_DOWN].pressed ? 1 : 0,
				[Inputs.BUTTON_LEFT]: gp.buttons[Inputs.BUTTON_LEFT].pressed ? 1 : 0,
				[Inputs.BUTTON_RIGHT]: gp.buttons[Inputs.BUTTON_RIGHT].pressed ? 1 : 0,
				[Inputs.BUTTON_XBOX]: gp.buttons[Inputs.BUTTON_XBOX].pressed ? 1 : 0,
			};
			pushInputFrame(InputFrame);
			return digestInputFrames();
		}
		return false;
	};

	/** @type {Array<string> | undefined} */
	let timelineMediaIds;
	/** @type {number | undefined} */
	let timelineMediaIdActive;

	/** @type {number | null} */
	let iFrameResizeHandle = null;
	const onIFrameLoad = () => {
		if (iFrameResizeHandle !== null) {
			window.clearTimeout(iFrameResizeHandle);
		}

		const resizeIFrame = () => {
			iFrameResizeHandle = null;

			if (mediaItemVisible === false) {
				return;
			}

			/** @type {HTMLIFrameElement | null} */
			const contentIFrame =
				dialogIFrame.contentWindow?.document.querySelector("#content_iframe") ??
				null;

			const kiwixThemeHeight = 45;
			const newHeight =
				contentIFrame?.contentWindow?.document.documentElement?.scrollHeight ??
				0;
			if (newHeight === 0 || kiwixThemeHeight + newHeight < 500) {
				iFrameResizeHandle = window.setTimeout(resizeIFrame, 100);
				return;
			}

			dialogIFrame.style.height = `${kiwixThemeHeight + newHeight}px`;

			iFrameResizeHandle = window.setTimeout(resizeIFrame, 1000);
		};
		iFrameResizeHandle = window.setTimeout(resizeIFrame, 100);
	};
	dialogIFrame.addEventListener("load", onIFrameLoad);

	const mediaReset = () => {
		mediaItemRotation = { x: 0, y: 0 };
		mediaItemPosition = { x: 0, y: 3, z: 0 };
		dialog.style.transform = `perspective(50vmin) rotateY(${mediaItemRotation.x}deg) rotateX(${mediaItemRotation.y}deg) translate3d(${mediaItemPosition.x}vmin, ${mediaItemPosition.y}vmin, ${mediaItemPosition.z}vmin)`;
		dialogImage.src = "";
		dialogImage.style.display = "none";
		dialogIFrame.style.display = "none";
		dialogIFrame.style.height = "150px";
	};
	const mediaShow = () => {
		if (timelineMediaIds === undefined || timelineMediaIds.length === 0) {
			return false;
		}

		timelineMediaIdActive = 0;

		mediaReset();

		const mediaPath =
			lookupTimelineToMetadata.get(
				timelineMediaIds[timelineMediaIdActive],
			)?.[2] ?? "";
		if (mediaPath.startsWith("/kiwix/")) {
			dialogIFrame.src = mediaPath;
			dialogIFrame.style.display = "block";
		} else {
			dialogImage.src = mediaPath;
			dialogImage.style.display = "block";
		}

		intro.textContent = "Artefaktname:";

		dialog.show();
		mediaItemVisible = true;
		return true;
	};
	const mediaForward = () => {
		if (timelineMediaIds === undefined || timelineMediaIds.length === 0) {
			return false;
		}

		timelineMediaIdActive =
			timelineMediaIdActive === undefined
				? 0
				: timelineMediaIdActive === timelineMediaIds.length - 1
					? undefined
					: timelineMediaIdActive + 1;
		if (timelineMediaIdActive === undefined) {
			return false;
		}

		mediaReset();

		const mediaPath =
			lookupTimelineToMetadata.get(
				timelineMediaIds[timelineMediaIdActive],
			)?.[2] ?? "";
		if (mediaPath.startsWith("/kiwix/")) {
			dialogIFrame.src = mediaPath;
			dialogIFrame.style.display = "block";
		} else {
			dialogImage.src = mediaPath;
			dialogImage.style.display = "block";
		}

		intro.textContent = "Artefaktname:";

		dialog.show();
		mediaItemVisible = true;
		return true;
	};
	const mediaBackward = () => {
		if (timelineMediaIds === undefined || timelineMediaIds.length === 0) {
			return false;
		}

		if (timelineMediaIdActive === undefined) {
			return false;
		}

		timelineMediaIdActive =
			timelineMediaIdActive === 0 ? undefined : timelineMediaIdActive - 1;
		if (timelineMediaIdActive === undefined) {
			return false;
		}

		mediaReset();

		const mediaPath =
			lookupTimelineToMetadata.get(
				timelineMediaIds[timelineMediaIdActive],
			)?.[2] ?? "";
		if (mediaPath.startsWith("/kiwix/")) {
			dialogIFrame.src = mediaPath;
			dialogIFrame.style.display = "block";
		} else {
			dialogImage.src = mediaPath;
			dialogImage.style.display = "block";
		}

		intro.textContent = "Artefaktname:";

		dialog.show();
		mediaItemVisible = true;
		return true;
	};

	const mediaClose = () => {
		if (iFrameResizeHandle !== null) {
			window.clearTimeout(iFrameResizeHandle);
		}
		dialogIFrame.src = "about:blank";
		dialog.close();
		mediaReset();
		intro.textContent = "Reise auf Zeit-Gleis:";
		mediaItemVisible = false;
	};

	const updateStatus = () => {
		statusOptions.classList.remove("visible");
		shoulderLeft.style.visibility = "hidden";
		shoulderRight.style.visibility = "hidden";
		statusButtonA.style.display = "none";
		statusButtonB.style.display = "none";
		statusButtonX.style.display = "none";
		statusButtonY.style.display = "none";
		statusOptionA.textContent = "";
		statusOptionB.textContent = "";
		statusOptionX.textContent = "";
		statusOptionY.textContent = "";

		if (idFocused === undefined || idFocusedTimeline === undefined) {
			return;
		}

		const newNeighbors = findNodeNeighbors(idFocused, idFocusedTimeline);
		if (1 < newNeighbors.intersection.length) {
			statusOptions.classList.add("visible");
			statusOptionX.textContent = "Umsteigen";
			statusButtonX.style.display = "inline-block";
		}

		const timelineColor = lookupTimelineToMetadata.get(idFocusedTimeline)?.[0];

		timelineMediaIds = newNeighbors.mediaItems;

		const timelineIdentityName =
			lookupTimelineToMetadata.get(idFocusedTimeline)?.[3];
		const mediaIdentityName =
			timelineMediaIdActive !== undefined
				? lookupTimelineToMetadata.get(
						timelineMediaIds[timelineMediaIdActive],
					)?.[3]
				: undefined;
		if (timelineIdentityName === undefined) {
			console.error(
				`Unable to look up identity for timeline ID '${idFocusedTimeline}'. Using fallback status.`,
			);
		}

		statusText.textContent = mediaIdentityName ?? timelineIdentityName ?? "???";
		intro.style.color = timelineColor ?? "";
		statusText.style.textShadow = `2px 2px 3px ${timelineColor}`;

		shoulderLeft.style.visibility =
			0 < newNeighbors.mediaItems.length && timelineMediaIdActive !== undefined
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
	};
	const updateStatusMenuSwitchTimeline = () => {
		statusOptions.classList.remove("visible");
		shoulderLeft.style.visibility = "hidden";
		shoulderRight.style.visibility = "hidden";
		statusButtonA.style.display = "none";
		statusButtonB.style.display = "none";
		statusButtonX.style.display = "none";
		statusButtonY.style.display = "none";
		statusOptionA.textContent = "";
		statusOptionB.textContent = "";
		statusOptionX.textContent = "";
		statusOptionY.textContent = "";
		statusText.textContent = "";
		intro.style.color = "transparent";
	};

	let cameraIsIdle = false;
	let cameraIsDetached = false;
	/** @type {number | undefined} */
	let timeoutCameraUnlock;
	const updateCamera = (_updateStatus = false) => {
		if (cameraIsIdle) {
			//console.debug("Camera update requested while camera was idle.");
			return true;
		}

		if (camera.x === focusTargetBox.x && camera.y === focusTargetBox.y) {
			//console.debug("Camera update was redundant.");
			return false;
		}

		// Determine timestamp from ID.
		const timestampFocused = idFocused?.replace(/^Z/, "").replace(/-\d+$/, "");
		if (timestampFocused !== undefined) {
			const timestamp = new Date(timestampFocused).valueOf();
			const focusedSegment = lookupSegmentBounds.findIndex(
				([start, end]) => start < timestamp && timestamp < end,
			);
			for (
				let segmentIndex = 0;
				segmentIndex < lookupSegments.length;
				++segmentIndex
			) {
				lookupSegments[segmentIndex].style.visibility =
					focusedSegment - 1 <= segmentIndex &&
					segmentIndex <= focusedSegment + 1
						? ""
						: "hidden";
			}
		}

		cameraIsIdle = true;
		window.scrollTo({
			top: focusTargetBox.y,
			behavior: requestInstantFocusUpdate ? "instant" : "smooth",
			left: focusTargetBox.x,
		});
		timeoutCameraUnlock = window.setTimeout(() => {
			timeoutCameraUnlock = undefined;
			cameraMovementFinalize();
			console.warn("Forced camera movement finalization!");
		}, 3000);

		requestInstantFocusUpdate = false;

		return false;
	};

	/** @type {number | undefined} */
	let cssRuleHighlightActive;
	const menuSwitchTimeline = () => {
		updateStatusMenuSwitchTimeline();
		const options = findNodeNeighbors().intersection;
		const existingMenuItems = menuContainer.querySelectorAll(".item");
		existingMenuItems.forEach((_) => void menuContainer.removeChild(_));
		const styleHighlight = `g.event, g.edge { &:not(.${idFocusedTimeline}) { opacity: 0.1; } }`;
		if (cssRuleHighlightActive !== undefined) {
			stylesheet.deleteRule(cssRuleHighlightActive);
		}
		cssRuleHighlightActive = stylesheet.cssRules.length;
		stylesheet.insertRule(styleHighlight, stylesheet.cssRules.length);
		for (const timeline of options) {
			const menuItem = document.createElement("div");
			menuItem.classList.add("item", timeline);
			if (idFocusedTimeline === timeline) {
				menuItem.classList.add("active");
			}
			menuItem.textContent =
				lookupTimelineToMetadata.get(timeline)?.[3] ?? "???";
			menuContainer.appendChild(menuItem);
		}
		statusOptions.classList.add("visible");
		statusOptionA.textContent = "Umsteigen";
		statusButtonA.style.display = "inline-block";
		statusOptionX.textContent = "Zurück";
		statusButtonX.style.display = "inline-block";
	};

	const cameraMovementFinalize = () => {
		cameraIsIdle = false;
		camera = { ...focusTargetBox };
		lastKnownScrollPosition = focusTargetBox.y;
	};
	const onScrollEnd = () => {
		window.clearTimeout(timeoutCameraUnlock);
		timeoutCameraUnlock = undefined;
		cameraMovementFinalize();
		console.debug("Camera updated", camera);
	};

	/** @type {number | undefined} */
	let previousTimestamp;
	/** @type {number | undefined} */
	let previousTimestampStarfield;
	/**
	 * @param timestamp {number} -
	 */
	const present = (timestamp) => {
		if (previousTimestamp === undefined) {
			previousTimestamp = timestamp;
		}
		if (previousTimestampStarfield === undefined) {
			previousTimestampStarfield = timestamp;
		}

		const delta = timestamp - previousTimestamp;
		const deltaStarfield = timestamp - previousTimestampStarfield;
		handleInputs(delta);
		updateCamera();

		// We don't want to update the starfield every frame, because it doesn't
		// move much, but consumes a lot of fill rate.
		if (!cameraIsIdle && !cameraIsDetached && 1000 < deltaStarfield) {
			const sinceStart = Date.now() - startTime;

			for (let z = 0; z < starPlanes.length; ++z) {
				const planeSet = starPlanes[z];

				const offset =
					(z + 1) *
					(lastKnownScrollPosition * speedScroll + sinceStart * speedTime);

				const planeOffsets = [planeSet[0], planeSet[1]];
				const planes = [planeSet[2], planeSet[3]];

				planeOffsets[0] = offset % windowHeight;
				planeOffsets[1] = (offset % windowHeight) - windowHeight;

				planes[0].style.transition =
					windowHeight / 2 < Math.abs(planeSet[0] - planeOffsets[0])
						? "none"
						: "ease-out all 0.9s";
				planes[1].style.transition =
					windowHeight / 2 < Math.abs(planeSet[1] - planeOffsets[1])
						? "none"
						: "ease-out all 0.9s";
				planes[0].style.opacity =
					windowHeight / 2 < Math.abs(planeSet[0] - planeOffsets[0])
						? "0"
						: "1";
				planes[1].style.opacity =
					windowHeight / 2 < Math.abs(planeSet[1] - planeOffsets[1])
						? "0"
						: "1";

				planes[0].style.transform = `translateY(${-planeOffsets[0]}px)`;
				planes[1].style.transform = `translateY(${-planeOffsets[1]}px)`;

				planeSet[0] = planeOffsets[0];
				planeSet[1] = planeOffsets[1];
			}

			previousTimestampStarfield = timestamp;
		}

		if (mediaItemVisible) {
			// Browser X-Y is reversed.
			dialog.style.transform = `perspective(50vmin) rotateY(${mediaItemRotation.x}deg) rotateX(${mediaItemRotation.y}deg) translate3d(${mediaItemPosition.x}vmin, ${mediaItemPosition.y}vmin, ${mediaItemPosition.z}vmin)`;
		}

		window.requestAnimationFrame(present);
		previousTimestamp = timestamp;
	};

	document.addEventListener("click", onClick);
	document.addEventListener("keydown", onKeyDown);
	document.addEventListener("keyup", onKeyUp);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("resize", initGraphics);
	window.addEventListener("scrollend", onScrollEnd);

	window.setTimeout(() => {
		initGraphics();

		console.info("Requesting initial focus...");
		navigateHome();

		window.requestAnimationFrame(present);
		window.setTimeout(() => {
			console.info("Program init finalized.");
			document.body.classList.remove("loading");

			window.setTimeout(() => {
				calendarContainer.classList.add("open");
				console.info("Calendar shown.");
			}, 8000);

			window.setTimeout(() => {
				statusContainer.classList.add("open");
				returnToNeutral();
				console.info("Status shown.");
			}, 9000);

			window.setTimeout(() => {
				loader.style.display = "none";
				console.info("Loader hidden.");
			}, 15000);
		}, 5000);
	});

	console.info("Next-frame ignition requested.");
};

document.addEventListener("DOMContentLoaded", () => {
	console.info(
		"DOM content loaded. Program init is pending. Allow at least 30 seconds to pass before looking for bugs.",
	);
	setTimeout(() => main().catch(console.error), 1000);
});
