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

/** @type {Array<[string, Array<string>]>} */
const idMesh = [["REPLACED BY", ["BUILD-SITE.JS"]]];

const main = () => {
	const svg = document.querySelector("svg");
	if (svg === null) {
		throw new Error("Unable to find <svg> element.");
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
	const _idLookup = new Map(idMesh);
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
	let startTime = Date.now();
	let lastKnownScrollPosition = 0;
	const _ticking = false;
	const _gamepadControlHandle = 0;

	/**
	 * @param {string} id -
	 */
	const focusNode = (id) => {
		if (!id) {
			return;
		}

		const anchor = `#${id}`;
		/** @type {SVGElement | null} */
		nodeFocused = document.querySelector(anchor);

		if (nodeFocused === null) {
			return;
		}

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
			timelineFocused !== undefined &&
			timelineNodes.get(timelineFocused)?.includes(id)
				? timelineFocused
				: nodeTimelines.get(id);

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
			console.log(
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
		focusNode(idFocused);
	};
	const navigateBackward = () => {
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
		focusNode(idFocused);
	};
	const _navigateLeft = () => {};
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
					startTime -= 1000;
					lastKnownScrollPosition -= 10;
					navigateForward();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_UP].pressed === false &&
					previousButtons?.[Inputs.BUTTON_UP].pressed === true
				) {
					startTime += 1000;
					lastKnownScrollPosition += 10;
					navigateBackward();
					requiresRefresh = true;
				}
				if (
					gp.buttons[Inputs.BUTTON_XBOX].pressed === false &&
					previousButtons?.[Inputs.BUTTON_XBOX].pressed === true
				) {
					navigateHome();
					requiresRefresh = true;
				}

				previousButtons = [...gp.buttons];
			}
		}
		return requiresRefresh;
	};

	let cameraIsIdle = false;
	const updateCamera = () => {
		if (camera.x === focusTargetBox.x && camera.y === focusTargetBox.y) {
			console.debug("Camera update was redundant.");
			return true;
		}

		if (cameraIsIdle) {
			console.debug("Camera update requested while camera was idle.");
			return true;
		}

		// @ts-expect-error focusVisible is legit. trust me, bro
		nodeFocused?.focus({ focusVisible: true, preventScroll: true });

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
		}, 2000);

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
