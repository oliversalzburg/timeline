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

/** @type {import("../lib/types.js").UniverseResultMetadata} */
const DATA = [[], [], ["", "", ""]];

const main = async function main() {
	console.info("Program loaded. Starting static initialization...");

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
	/** @type {HTMLIFrameElement | null} */
	const dialogIFrame = document.querySelector("dialog iframe");
	if (dialogIFrame === null) {
		throw new Error("Unable to find <dialog> element.");
	}
	/** @type {HTMLImageElement | null} */
	const dialogImage = document.querySelector("dialog img");
	if (dialogImage === null) {
		throw new Error("Unable to find <dialog> element.");
	}
	/** @type {HTMLVideoElement | null} */
	const dialogVideo = document.querySelector("dialog video");
	if (dialogVideo === null) {
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
	const targetElement = document.querySelector("#target");
	if (targetElement === null) {
		throw new Error("Unable to find #target element.");
	}
	/** @type {HTMLDivElement | null} */
	const targetFocusElement = document.querySelector("#target-focus");
	if (targetFocusElement === null) {
		throw new Error("Unable to find #target-focus element.");
	}

	/** @type {HTMLDivElement | null} */
	const menuContainer = document.querySelector("#menu");
	if (menuContainer === null) {
		throw new Error("Unable to find #menu element.");
	}

	/** @type {HTMLDivElement | null} */
	const artifactsContainer = document.querySelector("#artifacts");
	if (artifactsContainer === null) {
		throw new Error("Unable to find #artifacts element.");
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

	const DOM = {
		queueRead: new Map(),
		queueWrite: new Map(),
		/** @type {undefined|(() => unknown) } */
		dominator: undefined,
		writing: false,
		/**
		 * Schedule DOM read operation.
		 * @param {string} id -
		 * @param {() => unknown} operation -
		 */
		read: function readDOM(id, operation) {
			if (DOM.writing) {
				console.warn(
					`DOM read operation '${id}' scheduled during write cycle!`,
				);
			}
			Object.defineProperty(operation, "name", {
				value: `DOMread_${id}`,
				writable: false,
			});
			DOM.queueRead.set(id, operation);
		},
		/**
		 * Schedule DOM write operation.
		 * @param {string} id -
		 * @param {() => unknown} operation -
		 */
		write: function writeDOM(id, operation) {
			if (DOM.writing) {
				console.warn(
					`DOM write operation '${id}' scheduled during write cycle!`,
				);
			}
			Object.defineProperty(operation, "name", {
				value: `DOMwrite_${id}`,
				writable: false,
			});
			DOM.queueWrite.set(id, operation);
		},
		/**
		 * Schedule full DOM read-write cycle operation.
		 * @param {string} id -
		 * @param {() => unknown} operation -
		 */
		dominate: function dominateDOM(id, operation) {
			Object.defineProperty(operation, "name", {
				value: `DOM_${id}`,
				writable: false,
			});
			DOM.dominator = operation;
		},
		run: function runTasksDOM() {
			if (DOM.dominator !== undefined) {
				DOM.dominator();
				DOM.dominator = undefined;
				return;
			}

			for (const [, operation] of DOM.queueRead.entries()) {
				operation();
			}
			DOM.queueRead.clear();
			DOM.writing = true;
			for (const [, operation] of DOM.queueWrite.entries()) {
				operation();
			}
			DOM.writing = false;
			DOM.queueWrite.clear();
		},
	};

	//#region SFX
	const audioContext = new window.AudioContext();
	const samples = new Map();
	const samplesLoading = new Map();
	/**
	 * @param {string} id -
	 * @param {string} url -
	 */
	const sfxPrepareSample = async function sfxPrepareSample(id, url) {
		console.debug(`Preparing sample '${id}' from '${url}'...`);
		const load = async () => {
			const raw = await fetch(url);
			const data = await audioContext.decodeAudioData(await raw.arrayBuffer());
			return data;
		};
		const dataRequest = load();
		samplesLoading.set(url, dataRequest);
		const data = await dataRequest;
		console.debug(`Sample '${id}' is ready.`);
		samples.set(id, data);
	};

	sfxPrepareSample("swipe1", "media/sfx/SND01_sine/swipe_01.wav");
	sfxPrepareSample("swipe2", "media/sfx/SND01_sine/swipe_02.wav");
	sfxPrepareSample("swipe3", "media/sfx/SND01_sine/swipe_03.wav");
	sfxPrepareSample("swipe4", "media/sfx/SND01_sine/swipe_04.wav");
	sfxPrepareSample("swipe5", "media/sfx/SND01_sine/swipe_05.wav");
	sfxPrepareSample("tap1", "media/sfx/SND01_sine/tap_01.wav");
	sfxPrepareSample("tap2", "media/sfx/SND01_sine/tap_02.wav");
	sfxPrepareSample("tap3", "media/sfx/SND01_sine/tap_03.wav");
	sfxPrepareSample("tap4", "media/sfx/SND01_sine/tap_04.wav");
	sfxPrepareSample("tap5", "media/sfx/SND01_sine/tap_05.wav");
	sfxPrepareSample("button", "media/sfx/SND01_sine/button.wav");
	sfxPrepareSample("disabled", "media/sfx/SND01_sine/disabled.wav");
	sfxPrepareSample("swipe", "media/sfx/SND01_sine/swipe.wav");
	sfxPrepareSample(
		"transition_down",
		"media/sfx/SND01_sine/transition_down.wav",
	);
	sfxPrepareSample("transition_up", "media/sfx/SND01_sine/transition_up.wav");

	/**
	 * Play the sound with the given ID.
	 *
	 * @param {string} id -
	 */
	const sfxPlay = async function sfxPlay(id) {
		if (!samples.has(id)) {
			console.warn(`Trying to play unprepared sample '${id}'!`);
			return;
		}
		console.debug(`Requesting to play '${id}'.`);
		await audioContext.resume();
		const sfxBuffer = audioContext.createBufferSource();
		sfxBuffer.buffer = samples.get(id);
		sfxBuffer.connect(audioContext.destination);
		sfxBuffer.loop = false;
		console.debug(`Playing '${id}'...`);
		sfxBuffer.start();
	};
	const sfxPlaySwipe = function sfxPlaySwipe() {
		const index = Math.round(1 + Math.random() * 4);
		sfxPlay(`swipe${index}`);
	};
	const sfxPlayTap = function sfxPlayTap() {
		const index = Math.round(1 + Math.random() * 4);
		sfxPlay(`tap${index}`);
	};
	//#endregion

	const view = {
		window: {
			width: 0,
			height: 0,
		},
		bounds: {
			width: 0,
			height: 0,
		},
		scope: {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		},
		position: {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		},
		focus: {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		},
	};

	/**
	 * A set of all the unique event IDs.
	 */
	const idSet = DATA[0].reduce(
		(set, [, id]) => {
			set.add(id);
			return set;
		},
		/** @type {Set<string>} */ (new Set()),
	);

	/**
	 * @type {Map<string, import("../lib/types.js").TimelineMetadata>}
	 */
	const timelines = new Map(DATA[1].map((_) => [_[0], _]));
	/**
	 * @type {Map<string, Array<{
	 * 	timestamp: number,
	 * 	id: string,
	 * 	title: string,
	 * 	contributors: Array<string>
	 * }>>}
	 */
	const timelineEvents = new Map();
	/**
	 * @type {Array<{
	 * 	timestamp: number,
	 * 	id: string,
	 * 	title: string,
	 * 	contributors: Array<string>,
	 * 	element: SVGElement,
	 * 	bb: { x: number, y: number, w: number, h: number }
	 * }>}
	 */
	const events = new Array();
	/**
	 * @type {Map<string, {
	 * 	timestamp: number,
	 * 	id: string,
	 * 	title: string,
	 * 	contributors: Array<string>,
	 * 	element: SVGElement,
	 * 	bb: { x: number, y: number, w: number, h: number }
	 * }>}
	 */
	const eventsById = new Map();
	/**
	 * @type {Map<string, Array<string>>}
	 */
	const contributors = new Map();
	for (const [
		index,
		[timestamp, id, title, eventContributors],
	] of DATA[0].entries()) {
		/** @type {SVGElement | null} */
		const element = document.querySelector(`#${id}`);
		if (element === null) {
			throw new Error(`Couldn't find '#${id}'`);
		}
		const boundingRect = element.getBoundingClientRect();
		events[index] = {
			timestamp,
			id,
			title,
			contributors: eventContributors,
			bb: {
				x: boundingRect.x + window.scrollX,
				y: boundingRect.y + window.scrollY,
				w: boundingRect.width,
				h: boundingRect.height,
			},
			element,
		};
		contributors.set(id, events[index].contributors);
		eventsById.set(id, events[index]);

		for (const contributor of events[index].contributors) {
			const contributorMeta = timelines.get(contributor);
			if (contributorMeta === undefined) {
				throw new Error("couldn't find meta");
			}
			const contributorEvents = timelineEvents.get(contributorMeta[0]) ?? [];
			contributorEvents.push(events[index]);
			timelineEvents.set(contributorMeta[0], contributorEvents);
		}
	}
	/**
	 * @type {Array<{
	 * 	element: SVGElement,
	 * 	bb: { x: number, y: number, w: number, h: number }
	 * }>}
	 */
	const timelineEdges = new Array();
	for (const timelineId of timelines.keys()) {
		/** @type {NodeListOf<SVGElement>} */
		const elements = document.querySelectorAll(`g.edge.${timelineId}`);
		for (const element of elements) {
			const boundingRect = element.getBoundingClientRect();
			const edge = {
				element,
				bb: {
					x: boundingRect.x + window.scrollX,
					y: boundingRect.y + window.scrollY,
					w: boundingRect.width,
					h: boundingRect.height,
				},
			};
			timelineEdges.push(edge);
		}
	}
	timelineEdges.toSorted((a, b) => a.bb.y - b.bb.y);

	console.info("Constructing star planes...");
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
	/**
	 * How much time is contributing to the speed of the starfield.
	 *
	 * @type {number}
	 */
	const speedTime = 0.0001;
	/**
	 * How much scroll position is contributing to the speed of the starfield.
	 *
	 * @type {number}
	 */
	const speedScroll = 0.001;
	/**
	 * The base colors of stars in the starfield.
	 *
	 * @type {Array<[number, number, number]>}
	 */
	const starColorsRGB = [
		[255, 255, 255],
		[255, 221, 193],
		[255, 192, 203],
		[173, 216, 230],
		[176, 224, 230],
	];
	/**
	 * Point in time when the page was initialized.
	 *
	 * @type {number}
	 */
	const startTime = Date.now();

	//#region Focus Select
	/**
	 * The ID of the currently focused node.
	 *
	 * @type {string | undefined}
	 */
	let idFocused;

	/**
	 * The ID of the timeline the focused node is part of.
	 *
	 * @type {string | undefined}
	 */
	let idFocusedTimeline;

	/**
	 * Remember the ID of the focused timeline, for temporary changes.
	 *
	 * @type {string | undefined}
	 */
	let previousTimelineActive = idFocusedTimeline;

	/**
	 * Try to focus an event on the focused timeline, which is closest to the
	 * given date.
	 *
	 * @param {Date} date - The date to focus.
	 */
	const focusDate = function focusDate(date) {
		const ids =
			idFocusedTimeline !== undefined
				? new Set(
						(timelineEvents.get(idFocusedTimeline)?.values() ?? []).map(
							(_) => _.id,
						),
					)
				: idSet;
		let distance = Number.POSITIVE_INFINITY;
		let best;
		for (const id of ids) {
			const idDate = new Date(id.substring(1, 11));
			const idDistance = Math.abs(idDate.valueOf() - date.valueOf());
			if (idDistance < distance) {
				distance = idDistance;
				best = id;
			}
		}
		if (best !== undefined) {
			focusNode(best);
		}
	};

	/**
	 * Focus the node with the given ID.
	 *
	 * @param {string | undefined} id - The ID of the node to focus.
	 * @param {string | undefined} onTimelineId - The ID of the timeline the node is part of.
	 * @param {boolean | undefined} setState - Should we update the URL?
	 * @param {boolean | undefined} shiftFocus - Should we move the camera?
	 */
	const focusNode = function focusNode(
		id,
		onTimelineId = undefined,
		setState = true,
		shiftFocus = true,
	) {
		if (!id) {
			return;
		}

		const anchor = `#${id}`;
		const event = eventsById.get(id);
		/** @type {string | undefined} */
		let nodeTitle;
		/** @type {HTMLDivElement} */
		let previousDay;
		/** @type {NodeListOf<HTMLDivElement>} */
		let previousDays;
		DOM.read("focusNode", () => {
			/** @type {HTMLElement | null} */
			const node = document.querySelector(anchor);
			/** @type {HTMLElement | null} */
			const nodeTitleAnchor = document.querySelector(`${anchor} a`);
			nodeTitle = nodeTitleAnchor?.attributes.getNamedItemNS(
				"http://www.w3.org/1999/xlink",
				"title",
			)?.value;

			if (node === null) {
				console.error(
					`Node with ID '${id}' wasn't found in DOM. Unable to focus node.`,
				);
				return;
			}

			previousDay = /** @type {HTMLDivElement} */ (
				calendarContainer.cloneNode(true)
			);
			previousDays = document.querySelectorAll(".calendar.previous");
		});

		DOM.write("focusNode", () => {
			if (nodeTitle === undefined) {
				console.error(
					`Node with ID '${id}' does not provide a title. Unable to focus node.`,
				);
				return;
			}

			if (event === undefined) {
				console.error(
					`Couldn't find event relating to node ID '${id}'. Unable to focus node.`,
				);
				return;
			}

			for (const day of previousDays) {
				day.remove();
			}
			document.body.append(previousDay);
			previousDay.id = "";
			previousDay.classList.add("previous", "pending");
			previousDay.style.transition =
				"transform ease-in-out 2s, opacity linear 2s";
			previousDay.style.zIndex = "5";

			const titleParts = nodeTitle.split("\n");
			calendarDate.textContent = titleParts[0];
			calendarText.textContent = `${titleParts[1]}\n${titleParts[2]}`;
			document.title = titleParts[0];

			idFocused = id;
			// If the newly focused node exists on the already focused timeline,
			// don't attempt to switch focus. This could cause focus to switch
			// to another timeline when entering a merge node.
			idFocusedTimeline =
				onTimelineId ??
				(idFocusedTimeline !== undefined &&
				contributors.get(id)?.includes(idFocusedTimeline)
					? idFocusedTimeline
					: contributors.get(id)?.[0]);

			const currentDate =
				idFocused !== undefined
					? new Date(idFocused.substring(1, 11))
					: new Date();
			menuMainJumpDateYear = currentDate.getFullYear();
			menuMainJumpDateMonth = currentDate.getMonth();
			menuMainJumpDateDate = currentDate.getDate();

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
		});

		updateStatus();
		if (shiftFocus) {
			cameraIsAttached = true;
			requestFocusShift(id);
		}
	};

	/**
	 * Only requests the focus shift.
	 * The actual focus shift happens in updateCamera().
	 * @param id {string | undefined}
	 */
	const requestFocusShift = function requestFocusShift(id) {
		if (!id) {
			return;
		}

		const event = eventsById.get(id);
		if (event === undefined) {
			throw new Error(`can't find event '${id}'`);
		}

		view.focus = {
			x: event.bb.x,
			y: event.bb.y,
			width: event.bb.w,
			height: event.bb.h,
		};
		//console.debug("New focus box requested", view.focus);
	};

	/**
	 * Timeout for a callback to lock the camera onto the node in focus.
	 *
	 * @type {number | undefined}
	 */
	let timeoutCameraLock;

	const focusHitTest = function focusHitTest() {
		if (timeoutCameraLock !== undefined) {
			window.clearTimeout(timeoutCameraLock);
			timeoutCameraLock = undefined;
		}
		timeoutCameraLock = window.setTimeout(() => {
			if (!cameraIsAttached && previousVisibleNodes !== undefined) {
				for (const node of previousVisibleNodes) {
					if (
						node.bb.x < cameraFocus.x &&
						cameraFocus.x < node.bb.x + node.bb.w &&
						node.bb.y < cameraFocus.y &&
						cameraFocus.y < node.bb.y + node.bb.h
					) {
						if (node.id !== idFocused) {
							focusNode(node.id);
							break;
						}
					}
				}
			}
		}, 1000);
	};

	/**
	 * @param id {string | undefined} -
	 * @param onTimelineId {string | undefined} -
	 */
	const getNodeNeighbors = function getNodeNeighbors(
		id = idFocused,
		onTimelineId = idFocusedTimeline,
	) {
		if (id === undefined || onTimelineId === undefined) {
			throw new Error("missing id");
		}

		const eventDateMatch = id.match(/^Z\d{4}-\d{2}-\d{2}/);
		if (eventDateMatch === null || eventDateMatch.length === 0) {
			throw new Error(`Unable to match date in ID '${id}'`);
		}

		const timelineIds = contributors.get(id);
		if (timelineIds === undefined) {
			throw new Error(`Unable to find timeline ID for event ID '${id}'`);
		}

		if (!timelineIds.includes(onTimelineId)) {
			throw new Error(
				`Event ID '${id}' is not on timeline ID '${onTimelineId}'`,
			);
		}

		const eventIds = timelineEvents.get(onTimelineId)?.map((_) => _.id);
		if (eventIds === undefined) {
			throw new Error(
				`Unable to find event IDs for timeline ID '${onTimelineId}'`,
			);
		}

		const eventIndexOnTimeline = eventIds.indexOf(id);

		return {
			up:
				eventIndexOnTimeline === 0 ? null : eventIds[eventIndexOnTimeline - 1],
			down:
				eventIndexOnTimeline === eventIds.length - 1
					? null
					: eventIds[eventIndexOnTimeline + 1],
			intersection: timelineIds.filter((_) =>
				[1, 2].includes(timelines.get(_)?.[3] ?? 0),
			),
			mediaItems: timelineIds.filter((_) => timelines.get(_)?.[3] === 3),
		};
	};

	/**
	 * Update the information on the bottom status bar.
	 */
	const updateStatus = function updateStatus() {
		/** @type {NodeListOf<HTMLImageElement> | undefined} */
		let existingArtifacts;
		DOM.read("updateStatus", () => {
			existingArtifacts = /** @type {NodeListOf<HTMLImageElement>} */ (
				document.querySelectorAll("#artifacts .artifact")
			);
		});
		DOM.write("updateStatus", () => {
			statusOptions.classList.remove("visible");
			shouldersContainer.classList.remove("visible");
			shoulderLeft.classList.remove("visible");
			shoulderRight.classList.remove("visible");
			statusButtonA.style.display = "none";
			statusButtonB.style.display = "none";
			statusButtonX.style.display = "none";
			statusButtonY.style.display = "none";
			statusOptionA.textContent = "";
			statusOptionB.textContent = "";
			statusOptionX.textContent = "";
			statusOptionY.textContent = "";

			if (existingArtifacts !== undefined) {
				for (const artifact of existingArtifacts) {
					artifact.remove();
				}
			}

			if (idFocused === undefined || idFocusedTimeline === undefined) {
				return;
			}

			const event = eventsById.get(idFocused);
			if (event === undefined) {
				console.error(`Unable to look up event for ID '${idFocused}'.`);
				return;
			}

			const newNeighbors = getNodeNeighbors(idFocused, idFocusedTimeline);
			if (1 < newNeighbors.intersection.length) {
				statusOptions.classList.add("visible");
				statusOptionX.textContent = "Umsteigen";
				statusButtonX.style.display = "inline-block";
			}

			const timelineColorPen = timelines.get(idFocusedTimeline)?.[1];

			timelineMediaIds = newNeighbors.mediaItems;
			for (const mediaItemId of newNeighbors.mediaItems) {
				const mediaItem = timelines.get(mediaItemId);
				if (mediaItem === undefined) {
					console.error(`failed to find '${mediaItemId}'`);
					continue;
				}
				const whd = mediaItem[6] ?? [100, 100, 0];
				const isPortrait = whd[0] < whd[1];
				const artifact = /** @type {HTMLImageElement} */ (
					document.createElement("img")
				);
				artifact.classList.add("artifact");
				artifact.src = mediaItem[4];
				artifact.style.width = `${(Math.round(isPortrait ? (whd[0] / whd[1]) * 100 : 100) / 100) * 3}cm`;
				artifact.style.height = `${(Math.round(isPortrait ? 100 : (whd[1] / whd[0]) * 100) / 100) * 3}cm`;
				artifactsContainer.appendChild(artifact);
			}

			const timelineIdentityName = timelines.get(idFocusedTimeline)?.[5];
			const mediaIdentityName =
				timelineMediaIdActive !== undefined
					? timelines.get(timelineMediaIds[timelineMediaIdActive])?.[5]
					: undefined;
			if (timelineIdentityName === undefined) {
				console.error(
					`Unable to look up identity for timeline ID '${idFocusedTimeline}'. Using fallback status.`,
				);
			}

			if (mediaIdentityName !== undefined) {
				intro.textContent = "Artefaktname:";
				statusText.textContent = mediaIdentityName;
			} else {
				intro.textContent = `Reise auf Zeit-Gleis: ${timelineIdentityName}`;
				statusText.textContent = event.title;
			}

			intro.style.color = timelineColorPen ?? "";
			statusText.style.textShadow = `2px 2px 3px ${timelineColorPen}`;

			const hasShoulderLeft =
				0 < newNeighbors.mediaItems.length &&
				timelineMediaIdActive !== undefined;
			const hasShoulderRight = 0 < newNeighbors.mediaItems.length;

			if (hasShoulderLeft) {
				shoulderLeft.classList.add("visible");
				shoulderLeft.textContent =
					timelineMediaIdActive === 0 ? "Schließen" : "Zurück blättern";
			}
			if (hasShoulderRight) {
				shoulderRight.classList.add("visible");
				shoulderRight.textContent =
					timelineMediaIdActive === undefined
						? "Artefakte anzeigen"
						: timelineMediaIdActive === timelineMediaIds.length - 1
							? "Schließen"
							: "Vorwärts blättern";
			}

			if (hasShoulderLeft || hasShoulderRight) {
				shouldersContainer.classList.add("visible");
			}
		});
	};
	//#endregion

	//#region Camera
	/**
	 * The position the camera is looking at.
	 *
	 * @type {{x: number, y: number}}
	 */
	let cameraFocus = { x: 0, y: 0 };
	/**
	 * Is the camera currently being moved?
	 *
	 * @type {boolean}
	 */
	let cameraIsIdle = false;
	/**
	 * Is the camera currently locked to a timeline?
	 *
	 * @type {boolean}
	 */
	let cameraIsAttached = true;
	/**
	 * Timeout for a callback to clean up camera locks.
	 *
	 * @type {number | undefined}
	 */
	let timeoutCameraUnlock;

	/**
	 * Updates the view, moves the camera if needed.
	 */
	const updateCamera = function updateCamera() {
		if (cameraIsIdle) {
			//console.debug("Camera update requested while camera was idle.");
			return true;
		}

		const newFocus = {
			x: view.focus.x + view.focus.width / 2,
			y: view.focus.y + view.focus.height / 2,
		};

		if (newFocus.x === cameraFocus.x && newFocus.y === cameraFocus.y) {
			//console.debug("Camera update was redundant.");
			return false;
		}

		const newScope = {
			x: newFocus.x - view.window.width / 2,
			y: newFocus.y - view.window.height / 2,
			width: view.window.width,
			height: view.window.height,
		};

		//console.debug("Camera doesn't match focus. Adjusting scope...", newScope);

		DOM.write("updateCamera", () => {
			cameraFocus = newFocus;
			if (requestInstantFocusUpdate) {
				document.documentElement.scrollLeft = newScope.x;
				document.documentElement.scrollTop = newScope.y;

				targetElement.classList.add("visible");

				if (idFocused !== undefined) {
					const event = eventsById.get(idFocused);
					if (event === undefined) {
						console.error(`Unable to look up event for ID '${idFocused}'.`);
						return;
					}
					targetFocusElement.classList.add("visible");
					targetFocusElement.style.left = `calc(${event.bb.x}px - 4mm)`;
					targetFocusElement.style.top = `calc(${event.bb.y}px - 4mm)`;
					targetFocusElement.style.width = `calc(${event.bb.w}px + 8mm)`;
					targetFocusElement.style.height = `calc(${event.bb.h}px + 8mm)`;
				}
			}
		});

		if (!requestInstantFocusUpdate) {
			DOM.dominate("scrollTo", () => {
				cameraIsIdle = true;
				window.scrollTo({
					behavior: requestInstantFocusUpdate ? "instant" : "smooth",
					left: newScope.x,
					top: newScope.y,
				});
				timeoutCameraUnlock = window.setTimeout(() => {
					timeoutCameraUnlock = undefined;
					cameraMovementFinalize();
					console.warn("Forced camera movement finalization!");
				}, 3000);
			});
		}

		return false;
	};

	/**
	 * Finalize a camera movement, like after a scrollTo() operation.
	 */
	const cameraMovementFinalize = function cameraMovementFinalize() {
		/** @type {NodeListOf<HTMLDivElement>}*/
		let pendingDays;
		DOM.read("cameraMovementFinalize", () => {
			view.position.x = window.scrollX;
			view.position.y = window.scrollY;
			view.scope.y = window.scrollY - view.window.height;
			pendingDays = document.querySelectorAll(".calendar.previous.pending");
		});
		if (cameraIsAttached) {
			DOM.write("cameraMovementFinalize", () => {
				if (idFocused !== undefined) {
					const event = eventsById.get(idFocused);
					if (event === undefined) {
						console.error(`Unable to look up event for ID '${idFocused}'.`);
						return;
					}
					targetElement.classList.remove("visible");
					targetFocusElement.classList.add("visible");
					targetFocusElement.style.left = `calc(${event.bb.x}px - 4mm)`;
					targetFocusElement.style.top = `calc(${event.bb.y}px - 4mm)`;
					targetFocusElement.style.width = `calc(${event.bb.w}px + 8mm)`;
					targetFocusElement.style.height = `calc(${event.bb.h}px + 8mm)`;
				}

				for (const day of pendingDays) {
					day.style.opacity = "0";
					day.style.transform = "perspective(50vh) rotateX(90deg)";
					day.classList.remove("pending");
				}

				cull();
			});
		}
		cameraIsIdle = false;
		requestInstantFocusUpdate = false;
	};

	/**
	 * Finalize the camera movement resulting from the scroll.
	 */
	const onScrollEnd = function onScrollEnd() {
		window.clearTimeout(timeoutCameraUnlock);
		timeoutCameraUnlock = undefined;
		cameraMovementFinalize();
		//console.debug("Camera updated", view);
	};

	let previousFirstVisibleNodeIndex = 0;
	/** @type {Set<{element: SVGElement, bb: { x: number, y: number, w: number, h: number } }>} */
	let previousVisibleEdges = new Set(timelineEdges);
	/**
	 * @type {Set<{
	 * 	bb: { x: number, y: number, w: number, h: number }
	 * 	element: SVGElement,
	 * 	id: string,
	 * 	title: string,
	 * }>}
	 */
	let previousVisibleNodes = new Set(events);
	const cull = function cull() {
		const visibleEdges = [];
		for (
			let firstVisibleEdgeIndex = 0;
			firstVisibleEdgeIndex < timelineEdges.length;
			++firstVisibleEdgeIndex
		) {
			const edge = timelineEdges[firstVisibleEdgeIndex];
			if (view.scope.y + view.scope.height < edge.bb.y) {
				continue;
			}
			if (edge.bb.y + edge.bb.h < view.scope.y) {
				continue;
			}
			visibleEdges.push(edge);
		}

		const visibleNodes = [];
		let firstVisibleNodeIndex = previousFirstVisibleNodeIndex;
		for (; 0 < firstVisibleNodeIndex; --firstVisibleNodeIndex) {
			const event = events[firstVisibleNodeIndex];
			if (event.bb.y + event.bb.h < view.scope.y) {
				break;
			}
		}
		for (; firstVisibleNodeIndex < events.length; ++firstVisibleNodeIndex) {
			const event = events[firstVisibleNodeIndex];
			if (view.scope.y + view.scope.height < event.bb.y) {
				break;
			}
			visibleNodes.push(event);
		}

		for (const edge of previousVisibleEdges) {
			edge.element.style.display = "none";
		}
		for (const event of previousVisibleNodes) {
			event.element.style.display = "none";
		}

		for (const edge of visibleEdges) {
			edge.element.style.display = "block";
		}
		for (const event of visibleNodes) {
			event.element.style.display = "block";
		}

		previousVisibleEdges = new Set(visibleEdges);
		previousFirstVisibleNodeIndex = firstVisibleNodeIndex;
		previousVisibleNodes = new Set(visibleNodes);
	};
	//#endregion

	//#region Mouse Handling
	/**
	 * @param {MouseEvent} event -
	 */
	const onClick = function onClick(event) {
		DOM.write("onClick", () => {
			document.documentElement.style.cursor = "default";
		});

		if (event.target === null) {
			return;
		}

		DOM.read("onClick", () => {
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
		});
	};

	/**
	 * @param {MouseEvent} _event -
	 */
	const onMouseMove = function onMouseMove(_event) {
		DOM.write("onClick", () => {
			document.documentElement.style.cursor = "default";
		});
	};
	//#endregion

	//#region Keyboard Handling
	/**
	 * @param {KeyboardEvent} event -
	 */
	const onKeyDown = function onKeyDown(event) {
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
	const onKeyUp = function onKeyUp(event) {
		console.debug(`keyup: key:${event.key} code:${event.code}`);

		switch (event.code) {
			case "ArrowDown":
			case "Numpad2":
				event.preventDefault();
				navigateForward();
				return;

			case "Numpad5":
				event.preventDefault();
				navigateHome();
				return;

			case "ArrowUp":
			case "Numpad8":
				event.preventDefault();
				navigateBackward();
				return;
		}
	};
	//#endregion

	//#region Navigation Helper
	const navigateForward = function navigateForward() {
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			return false;
		}
		const neighbors = getNodeNeighbors(idFocused, idFocusedTimeline);
		if (neighbors.down === null) {
			return false;
		}

		focusNode(neighbors.down);
		return true;
	};
	const navigateBackward = function navigateBackward() {
		if (idFocused === undefined || idFocusedTimeline === undefined) {
			return false;
		}
		const neighbors = getNodeNeighbors(idFocused, idFocusedTimeline);
		if (neighbors.up === null) {
			return false;
		}

		focusNode(neighbors.up);
		return true;
	};
	/**
	 * Focus the origin node.
	 */
	const navigateHome = function navigateHome() {
		focusNode(DATA[2][1], DATA[2][2]);
	};
	const _navigateToFocusNode = () => {
		if (idFocused === undefined) {
			return;
		}
		focusNode(idFocused);
	};
	/**
	 * Focus the first event on the current timeline.
	 */
	const navigateStart = function navigateStart() {
		if (idFocusedTimeline === undefined) {
			return;
		}

		const events = timelineEvents.get(idFocusedTimeline);
		if (events === undefined) {
			throw Error("unexpected lookup miss");
		}

		focusNode(events[0].id, idFocusedTimeline);
	};
	/**
	 * Focus the last event on the current timeline.
	 */
	const navigateEnd = function navigateEnd() {
		if (idFocusedTimeline === undefined) {
			return;
		}

		const events = timelineEvents.get(idFocusedTimeline);
		if (events === undefined) {
			throw Error("unexpected lookup miss");
		}

		focusNode(events[events.length - 1].id, idFocusedTimeline);
	};
	const _navigateBack = () => {
		history.back();
	};
	//#endregion

	/**
	 * @param event {PopStateEvent} -
	 */
	const onPopState = function onPopState(event) {
		focusNode(event.state.id, undefined, false);
	};

	let requestInstantFocusUpdate = false;
	const INPUT_THRESHOLD = 0.1;
	const SPEED_FREE_FLIGHT = 5.0;
	const SPEED_MEDIA_SCALE = 0.5;
	const SPEED_MEDIA_TRANSLATE = 5.0;

	//#region Input Plane Neutral
	/**
	 * @typedef {{
	 * 	name: string,
	 * 	axes?: undefined | ((frame: InputFrame) => void),
	 * 	pressed?: Record<number, undefined | ((frame: InputFrame) => (InputPlane | undefined))>,
	 * 	released?: Record<number, undefined | ((frame: InputFrame) => (InputPlane | undefined))>,
	 * }} InputPlane
	 * @type {InputPlane}
	 */
	const InputPlaneNeutral = {
		name: "neutral",
		pressed: {
			[Inputs.BUTTON_UP]: () => {
				if (navigateBackward()) {
					sfxPlayTap();
				}
				return {
					name: "return",
					released: { [Inputs.BUTTON_UP]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				if (navigateForward()) {
					sfxPlayTap();
				}
				return {
					name: "return",
					released: { [Inputs.BUTTON_DOWN]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_RB]: () => {
				mediaShow(0);
				return {
					name: "return",
					released: { [Inputs.BUTTON_RB]: returnToMedia },
				};
			},
			[Inputs.BUTTON_X]: () => {
				previousTimelineActive = idFocusedTimeline;
				menuMainSwitchTimeline();
				sfxPlaySwipe();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_X]: returnToMenuPlane(
							InputPlaneMainMenuSwitchTimeline,
						),
					},
				};
			},
			[Inputs.BUTTON_START]: () => {
				menuMain();
				sfxPlay("transition_up");
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_START]: returnToMenuPlane(InputPlaneMenuMain),
					},
				};
			},
		},
		axes: (frame) => {
			let changed = false;
			if (INPUT_THRESHOLD < Math.abs(frame.axes[Inputs.AXIS_LEFT_X])) {
				cameraIsAttached = false;
				requestInstantFocusUpdate = true;
				view.focus.x +=
					frame.axes[Inputs.AXIS_LEFT_X] *
					(frame.delta / (1000 / 60)) *
					SPEED_FREE_FLIGHT;
				changed = true;
			}
			if (INPUT_THRESHOLD < Math.abs(frame.axes[Inputs.AXIS_LEFT_Y])) {
				cameraIsAttached = false;
				requestInstantFocusUpdate = true;
				view.focus.y +=
					frame.axes[Inputs.AXIS_LEFT_Y] *
					(frame.delta / (1000 / 60)) *
					SPEED_FREE_FLIGHT;
				changed = true;
			}

			if (changed) {
				view.focus.x = Math.max(Math.min(view.focus.x, view.bounds.width), 0);
				view.focus.y = Math.max(Math.min(view.focus.y, view.bounds.height), 0);

				focusHitTest();
			}
		},
	};

	const returnToNeutral = function returnToNeutral() {
		console.debug("Clearing input cache, returning neutral plane.");
		InputFrameCache = [];
		menuMainFocusIndex = 0;
		menuMainJumpFocusIndex = 0;
		menuMainJumpDateFocusIndex = 0;
		DOM.write("returnToNeutral", () => {
			if (cssRuleHighlightActive !== undefined) {
				stylesheet.deleteRule(cssRuleHighlightActive);
				cssRuleHighlightActive = undefined;
			}
			calendarContainer.classList.add("open");
			menuContainer.classList.remove("open");
			statusContainer.classList.add("open");
			targetFocusElement.classList.add("visible");
		});
		updateStatus();
		return InputPlaneNeutral;
	};

	let activeInputPlane = InputPlaneNeutral;

	/**
	 * @param {InputPlane} plane -
	 */
	const returnToMenuPlane = function returnToMenuPlane(plane) {
		return () => {
			console.debug("Clearing input cache, returning provided menu plane.");
			InputFrameCache = [];
			DOM.write("returnToMenuPlan", () => {
				calendarContainer.classList.remove("open");
				menuContainer.classList.add("open");
				statusContainer.classList.add("open");
			});
			return plane;
		};
	};
	//#endregion

	//#region Input Handling
	/**
	 * @typedef {Record<number, number> & { axes: Record<number, number>, delta: number }} InputFrame
	 * @type {Array<InputFrame>}
	 */
	let InputFrameCache = [];
	/**
	 * @param {InputFrame} a -
	 * @param {InputFrame} b -
	 */
	const inputFramesAreEqual = function inputFramesAreEqual(a, b) {
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
	const pushInputFrame = function pushInputFrame(frame) {
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
	const digestInputFrames = function digestInputFrames() {
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
	const handleInputs = function handleInputs(delta) {
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
	//#endregion

	//#region Media
	/** @type {Array<string> | undefined} */
	let timelineMediaIds;
	/** @type {number | undefined} */
	let timelineMediaIdActive;
	let mediaItemPosition = { x: 0, y: 100, z: 10 };
	let mediaItemVisible = false;

	/** @type {number | null} */
	let iFrameResizeHandle = null;
	const onIFrameLoad = function onIFrameLoad() {
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
	const onVideoLoad = function onVideoLoad() {
		dialogVideo.play();
	};
	dialogVideo.addEventListener("canplaythrough", onVideoLoad);

	const mediaReset = function mediaReset() {
		mediaItemPosition = { x: 0, y: 100, z: 10 };
		DOM.write("mediaReset", () => {
			dialog.style.transform = `perspective(20px) translate3d(${mediaItemPosition.x}vmin, ${mediaItemPosition.y}vmin, ${mediaItemPosition.z}vmin)`;
			dialogIFrame.style.display = "none";
			dialogIFrame.style.height = "150px";
			dialogIFrame.style.width = "";
			dialogImage.src = "";
			dialogImage.style.display = "none";
			dialogVideo.src = "";
			dialogVideo.style.display = "none";
		});
	};
	/**
	 * Show the media item with the given index.
	 *
	 * @param {number} mediaIndex -
	 */
	const mediaShow = function mediaShow(mediaIndex) {
		if (timelineMediaIds === undefined || timelineMediaIds.length === 0) {
			return false;
		}

		if (
			mediaIndex === undefined ||
			mediaIndex < 0 ||
			timelineMediaIds.length <= mediaIndex
		) {
			timelineMediaIdActive = undefined;
			return false;
		}

		const mediaPath = timelines.get(timelineMediaIds[mediaIndex])?.[4] ?? "";
		if (mediaPath === "") {
			timelineMediaIdActive = undefined;
			return false;
		}

		console.info(`Showing media item ${mediaIndex}...`);
		timelineMediaIdActive = mediaIndex;
		mediaReset();

		DOM.write("mediaShow", () => {
			if (mediaPath.startsWith("/kiwix/")) {
				dialogIFrame.src = mediaPath;
				dialogIFrame.style.display = "block";
			} else if (mediaPath.endsWith(".pdf")) {
				dialogIFrame.src = `${mediaPath}#toolbar=0&navpanes=0`;
				dialogIFrame.style.display = "block";
				dialogIFrame.style.height = "600mm";
				dialogIFrame.style.width = "215mm";
			} else if (mediaPath.endsWith(".mp4")) {
				dialogVideo.src = mediaPath;
				dialogVideo.style.display = "block";
			} else {
				dialogImage.src = mediaPath;
				dialogImage.style.display = "block";
			}

			dialog.show();
			mediaItemVisible = true;
		});
		return true;
	};
	const mediaForward = function mediaForward() {
		if (timelineMediaIds === undefined || timelineMediaIds.length === 0) {
			return false;
		}

		return mediaShow(
			timelineMediaIdActive === undefined ? 0 : timelineMediaIdActive + 1,
		);
	};
	const mediaBackward = function mediaBackward() {
		if (timelineMediaIds === undefined || timelineMediaIds.length === 0) {
			return false;
		}

		return mediaShow(
			timelineMediaIdActive === undefined ? 0 : timelineMediaIdActive - 1,
		);
	};
	const mediaClose = function mediaClose() {
		console.info("Closing media...");
		if (iFrameResizeHandle !== null) {
			window.clearTimeout(iFrameResizeHandle);
		}
		DOM.write("mediaClose", () => {
			dialogIFrame.src = "about:blank";
			dialog.close();
			mediaItemVisible = false;
		});
		mediaReset();
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
			let changed = false;
			if (INPUT_THRESHOLD < Math.abs(frame.axes[Inputs.AXIS_RIGHT_X])) {
				mediaItemPosition.x -=
					frame.axes[Inputs.AXIS_RIGHT_X] *
					(frame.delta / (1000 / 60)) *
					SPEED_MEDIA_TRANSLATE;
				changed = true;
			}
			if (INPUT_THRESHOLD < Math.abs(frame.axes[Inputs.AXIS_RIGHT_Y])) {
				mediaItemPosition.y -=
					frame.axes[Inputs.AXIS_RIGHT_Y] *
					(frame.delta / (1000 / 60)) *
					SPEED_MEDIA_TRANSLATE;
				changed = true;
			}

			if (changed) {
				mediaItemPosition.x = Math.max(Math.min(mediaItemPosition.x, 95), -95);
				mediaItemPosition.y = Math.max(
					Math.min(mediaItemPosition.y, 100),
					-1_000_000,
				);
			}
		},
	};

	const returnToMedia = function returnToMedia() {
		console.debug("Clearing input cache, returning media plane.");
		InputFrameCache = [];
		DOM.write("returnToMedia", () => {
			calendarContainer.classList.add("open");
			menuContainer.classList.remove("open");
			statusContainer.classList.add("open");
		});
		updateStatus();
		return InputPlaneMedia;
	};
	//#endregion

	//#region Main Menu
	/**
	 * @param {HTMLElement} menu -
	 * @param {number} indent -
	 */
	const offsetMenu = function offsetMenu(menu, indent) {
		for (let level = 0; level < indent; ++level) {
			const menuItem = document.createElement("div");
			menuItem.classList.add("item", "offset");
			menuItem.innerHTML = "&nbsp;";
			menu.appendChild(menuItem);
		}
	};

	let menuMainFocusIndex = 0;
	const menuMain = function menuMain(isActive = true) {
		updateStatusMenuSwitchTimeline();

		/** @type {NodeListOf<HTMLDivElement> | undefined} */
		let existingMenuItems;
		DOM.read("menuMain", () => {
			existingMenuItems = menuContainer.querySelectorAll(".level");
		});
		DOM.write("menuMain", () => {
			existingMenuItems?.forEach((_) => void menuContainer.removeChild(_));

			const menuLevel0 = document.createElement("div");
			menuLevel0.classList.add("level");
			if (isActive) {
				menuLevel0.classList.add("active");
			}
			menuContainer.appendChild(menuLevel0);

			const menuItemJump = document.createElement("div");
			menuItemJump.classList.add("item");
			if (menuMainFocusIndex === 0) {
				menuItemJump.classList.add("active");
			}
			menuItemJump.textContent = "Springen";
			menuLevel0.appendChild(menuItemJump);

			const menuItemSwitch = document.createElement("div");
			menuItemSwitch.classList.add("item");
			if (menuMainFocusIndex === 1) {
				menuItemSwitch.classList.add("active");
			}
			menuItemSwitch.textContent = "Umsteigen";
			menuLevel0.appendChild(menuItemSwitch);

			const menuItemArtifacts = document.createElement("div");
			menuItemArtifacts.classList.add("item");
			if (menuMainFocusIndex === 2) {
				menuItemArtifacts.classList.add("active");
			}
			menuItemArtifacts.textContent = "Artefakte";
			menuLevel0.appendChild(menuItemArtifacts);

			statusOptions.classList.add("visible");
			statusOptionA.textContent = "Auswählen";
			statusButtonA.style.display = "inline-block";
			statusOptionX.textContent = "Zurück";
			statusButtonX.style.display = "inline-block";
		});

		if (isActive) {
			if (menuMainFocusIndex === 0) {
				menuMainJump(false);
			}
			if (menuMainFocusIndex === 1) {
				menuMainSwitchTimeline(false);
			}
			if (menuMainFocusIndex === 2) {
				menuMainArtifacts(false);
			}
		}
	};

	/** @type {InputPlane} */
	const InputPlaneMenuMain = {
		name: "menuMain",
		pressed: {
			[Inputs.BUTTON_UP]: () => {
				menuMainFocusIndex = Math.min(2, Math.max(0, menuMainFocusIndex - 1));
				menuMain();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_UP]: returnToMenuPlane(InputPlaneMenuMain),
					},
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				menuMainFocusIndex = Math.min(2, Math.max(0, menuMainFocusIndex + 1));
				menuMain();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_DOWN]: returnToMenuPlane(InputPlaneMenuMain),
					},
				};
			},
			[Inputs.BUTTON_RIGHT]: () => {
				if (menuMainFocusIndex === 0) {
					menuMainJumpFocusIndex = 0;
					menuMainJump();
					sfxPlaySwipe();
					return {
						name: "return",
						released: {
							[Inputs.BUTTON_RIGHT]: returnToMenuPlane(InputPlaneMenuMainJump),
						},
					};
				}
				if (menuMainFocusIndex === 1) {
					_menuMainSwitchTimelineFocusIndex = 0;
					menuMainSwitchTimeline();
					sfxPlaySwipe();
					return {
						name: "return",
						released: {
							[Inputs.BUTTON_RIGHT]: returnToMenuPlane(
								InputPlaneMainMenuSwitchTimeline,
							),
						},
					};
				}
				if (menuMainFocusIndex === 2) {
					menuMainArtifactsFocusIndex = 0;
					menuMainArtifacts();
					sfxPlaySwipe();
					return {
						name: "return",
						released: {
							[Inputs.BUTTON_RIGHT]: returnToMenuPlane(
								InputPlaneMenuMainArtifacts,
							),
						},
					};
				}
			},
			[Inputs.BUTTON_A]: () => {
				if (menuMainFocusIndex === 0) {
					menuMainJumpFocusIndex = 0;
					menuMainJump();
					sfxPlaySwipe();
					return {
						name: "return",
						released: {
							[Inputs.BUTTON_A]: returnToMenuPlane(InputPlaneMenuMainJump),
						},
					};
				}
				if (menuMainFocusIndex === 1) {
					_menuMainSwitchTimelineFocusIndex = 0;
					menuMainSwitchTimeline();
					sfxPlaySwipe();
					return {
						name: "return",
						released: {
							[Inputs.BUTTON_A]: returnToMenuPlane(
								InputPlaneMainMenuSwitchTimeline,
							),
						},
					};
				}
				if (menuMainFocusIndex === 2) {
					menuMainArtifactsFocusIndex = 0;
					menuMainArtifacts();
					sfxPlaySwipe();
					return {
						name: "return",
						released: {
							[Inputs.BUTTON_A]: returnToMenuPlane(InputPlaneMenuMainArtifacts),
						},
					};
				}
			},
			[Inputs.BUTTON_START]: () => {
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_START]: returnToNeutral },
				};
			},
		},
	};
	//#endregion

	//#region Jump Menu
	let menuMainJumpFocusIndex = 0;
	const menuMainJump = function menuMainJump(isActive = true) {
		if (isActive) {
			menuMain(false);
		}

		DOM.write("menuMainJump", () => {
			const menuLevel1 = document.createElement("div");
			menuLevel1.classList.add("level");
			if (isActive) {
				menuLevel1.classList.add("active");
			}
			menuContainer.appendChild(menuLevel1);

			const menuItemDate = document.createElement("div");
			menuItemDate.classList.add("item");
			if (menuMainJumpFocusIndex === 0) {
				menuItemDate.classList.add("active");
			}
			menuItemDate.textContent = "zu Datum";
			menuLevel1.appendChild(menuItemDate);

			const menuItemStart = document.createElement("div");
			menuItemStart.classList.add("item");
			if (menuMainJumpFocusIndex === 1) {
				menuItemStart.classList.add("active");
			}
			menuItemStart.textContent = "an Anfang";
			menuLevel1.appendChild(menuItemStart);

			const menuItemEnd = document.createElement("div");
			menuItemEnd.classList.add("item");
			if (menuMainJumpFocusIndex === 2) {
				menuItemEnd.classList.add("active");
			}
			menuItemEnd.textContent = "an Ende";
			menuLevel1.appendChild(menuItemEnd);

			const menuItemOrigin = document.createElement("div");
			menuItemOrigin.classList.add("item");
			if (menuMainJumpFocusIndex === 3) {
				menuItemOrigin.classList.add("active");
			}
			menuItemOrigin.textContent = "zum Ursprung";
			menuLevel1.appendChild(menuItemOrigin);
		});

		if (isActive) {
			if (menuMainJumpFocusIndex === 0) {
				menuMainJumpDate(false);
			}
		}
	};

	/** @type {InputPlane} */
	const InputPlaneMenuMainJump = {
		name: "menuMainJump",
		pressed: {
			[Inputs.BUTTON_UP]: () => {
				menuMainJumpFocusIndex = Math.min(
					3,
					Math.max(0, menuMainJumpFocusIndex - 1),
				);
				menuMainJump();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_UP]: returnToMenuPlane(InputPlaneMenuMainJump),
					},
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				menuMainJumpFocusIndex = Math.min(
					3,
					Math.max(0, menuMainJumpFocusIndex + 1),
				);
				menuMainJump();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_DOWN]: returnToMenuPlane(InputPlaneMenuMainJump),
					},
				};
			},
			[Inputs.BUTTON_LEFT]: () => {
				menuMain();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_LEFT]: returnToMenuPlane(InputPlaneMenuMain),
					},
				};
			},
			[Inputs.BUTTON_RIGHT]: () => {
				if (menuMainJumpFocusIndex === 0) {
					menuMainJumpDateFocusIndex = 0;
					menuMainJumpDate();
					sfxPlaySwipe();
					return {
						name: "return",
						released: {
							[Inputs.BUTTON_RIGHT]: returnToMenuPlane(
								InputPlaneMenuMainJumpDateYear,
							),
						},
					};
				}
			},
			[Inputs.BUTTON_A]: () => {
				switch (menuMainJumpFocusIndex) {
					case 0:
						menuMainJumpDateFocusIndex = 0;
						menuMainJumpDate();
						sfxPlaySwipe();
						return {
							name: "return",
							released: {
								[Inputs.BUTTON_A]: returnToMenuPlane(
									InputPlaneMenuMainJumpDateYear,
								),
							},
						};
					case 1:
						navigateStart();
						sfxPlay("transition_down");
						return {
							name: "return",
							released: { [Inputs.BUTTON_A]: returnToNeutral },
						};
					case 2:
						navigateEnd();
						sfxPlay("transition_down");
						return {
							name: "return",
							released: { [Inputs.BUTTON_A]: returnToNeutral },
						};
					case 3:
						navigateHome();
						sfxPlay("transition_down");
						return {
							name: "return",
							released: { [Inputs.BUTTON_A]: returnToNeutral },
						};
				}
			},
			[Inputs.BUTTON_START]: () => {
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_START]: returnToNeutral },
				};
			},
		},
	};
	//#endregion

	//#region Jump Date Menu
	let menuMainJumpDateFocusIndex = 0;
	let menuMainJumpDateYear = 1983;
	let menuMainJumpDateMonth = 11;
	let menuMainJumpDateDate = 25;
	const menuMainJumpDate = function menuMainJumpDate(isActive = true) {
		if (isActive) {
			menuMainFocusIndex = 0;
			menuMain(false);
			menuMainJump(false);
		}

		DOM.write("menuMainJumpDate", () => {
			const menuLevel2 = document.createElement("div");
			menuLevel2.classList.add("level");
			if (isActive) {
				menuLevel2.classList.add("active");
			}
			menuContainer.appendChild(menuLevel2);

			const menuItemYear = document.createElement("div");
			menuItemYear.classList.add("item");
			if (menuMainJumpDateFocusIndex === 0) {
				menuItemYear.classList.add("active");
			}
			menuItemYear.textContent = menuMainJumpDateYear.toString();
			menuLevel2.appendChild(menuItemYear);

			const menuLevel3 = document.createElement("div");
			menuLevel3.classList.add("level", "active");
			menuContainer.appendChild(menuLevel3);

			const menuItemMonth = document.createElement("div");
			menuItemMonth.classList.add("item");
			if (menuMainJumpDateFocusIndex === 1) {
				menuItemMonth.classList.add("active");
			}
			menuItemMonth.textContent = (menuMainJumpDateMonth + 1).toString();
			menuLevel3.appendChild(menuItemMonth);

			const menuLevel4 = document.createElement("div");
			menuLevel4.classList.add("level", "active");
			menuContainer.appendChild(menuLevel4);

			const menuItemDay = document.createElement("div");
			menuItemDay.classList.add("item");
			if (menuMainJumpDateFocusIndex === 2) {
				menuItemDay.classList.add("active");
			}
			menuItemDay.textContent = menuMainJumpDateDate.toString();
			menuLevel4.appendChild(menuItemDay);
		});
	};

	/** @type {InputPlane} */
	const InputPlaneMenuMainJumpDateYear = {
		name: "menuMainJumpDateYear",
		pressed: {
			[Inputs.BUTTON_LEFT]: () => {
				menuMainJump();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_LEFT]: returnToMenuPlane(InputPlaneMenuMainJump),
					},
				};
			},
			[Inputs.BUTTON_RIGHT]: () => {
				menuMainJumpDateFocusIndex = 1;
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_RIGHT]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateMonth,
						),
					},
				};
			},
			[Inputs.BUTTON_UP]: () => {
				menuMainJumpDateYear = Math.min(
					2030,
					Math.max(0, menuMainJumpDateYear - 1),
				);
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_UP]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateYear,
						),
					},
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				menuMainJumpDateYear = Math.min(
					2030,
					Math.max(0, menuMainJumpDateYear + 1),
				);
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_DOWN]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateYear,
						),
					},
				};
			},
			[Inputs.BUTTON_A]: () => {
				focusDate(
					new Date(
						`${menuMainJumpDateYear}-${menuMainJumpDateMonth + 1}-${menuMainJumpDateDate}`,
					),
				);
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_A]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_START]: () => {
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_START]: returnToNeutral },
				};
			},
		},
	};
	/** @type {InputPlane} */
	const InputPlaneMenuMainJumpDateMonth = {
		name: "menuMainJumpDateMonth",
		pressed: {
			[Inputs.BUTTON_LEFT]: () => {
				menuMainJumpDateFocusIndex = 0;
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_LEFT]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateYear,
						),
					},
				};
			},
			[Inputs.BUTTON_RIGHT]: () => {
				menuMainJumpDateFocusIndex = 2;
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_RIGHT]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateDay,
						),
					},
				};
			},
			[Inputs.BUTTON_UP]: () => {
				menuMainJumpDateMonth = Math.min(
					11,
					Math.max(0, menuMainJumpDateMonth - 1),
				);
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_UP]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateMonth,
						),
					},
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				menuMainJumpDateMonth = Math.min(
					11,
					Math.max(0, menuMainJumpDateMonth + 1),
				);
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_DOWN]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateMonth,
						),
					},
				};
			},
			[Inputs.BUTTON_A]: () => {
				focusDate(
					new Date(
						`${menuMainJumpDateYear}-${menuMainJumpDateMonth + 1}-${menuMainJumpDateDate}`,
					),
				);
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_A]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_START]: () => {
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_START]: returnToNeutral },
				};
			},
		},
	};
	/** @type {InputPlane} */
	const InputPlaneMenuMainJumpDateDay = {
		name: "menuMainJumpDateDay",
		pressed: {
			[Inputs.BUTTON_LEFT]: () => {
				menuMainJumpDateFocusIndex = 1;
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_LEFT]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateMonth,
						),
					},
				};
			},
			[Inputs.BUTTON_RIGHT]: () => {
				menuMainJumpDate();
				sfxPlay("disabled");
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_RIGHT]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateDay,
						),
					},
				};
			},
			[Inputs.BUTTON_UP]: () => {
				menuMainJumpDateDate = Math.min(
					31,
					Math.max(0, menuMainJumpDateDate - 1),
				);
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_UP]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateDay,
						),
					},
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				menuMainJumpDateDate = Math.min(
					31,
					Math.max(0, menuMainJumpDateDate + 1),
				);
				menuMainJumpDate();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_DOWN]: returnToMenuPlane(
							InputPlaneMenuMainJumpDateDay,
						),
					},
				};
			},
			[Inputs.BUTTON_A]: () => {
				focusDate(
					new Date(
						`${menuMainJumpDateYear}-${menuMainJumpDateMonth + 1}-${menuMainJumpDateDate}`,
					),
				);
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_A]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_START]: () => {
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_START]: returnToNeutral },
				};
			},
		},
	};
	//#endregion

	//#region Switch Timeline
	const updateStatusMenuSwitchTimeline =
		function updateStatusMenuSwitchTimeline() {
			DOM.write("updateStatusMenuSwitchTimeline", () => {
				statusOptions.classList.remove("visible");
				shoulderLeft.classList.remove("visible");
				shoulderRight.classList.remove("visible");
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
			});
		};

	/** @type {number | undefined} */
	let cssRuleHighlightActive;
	let _menuMainSwitchTimelineFocusIndex = 0;
	const menuMainSwitchTimeline = function menuMainSwitchTimeline(
		isActive = true,
	) {
		updateStatusMenuSwitchTimeline();
		if (isActive) {
			menuMainFocusIndex = 1;
			menuMain(false);
		}

		const options = getNodeNeighbors().intersection;
		DOM.write("menuMainSwitchTimeline", () => {
			if (isActive) {
				const styleHighlight = `g.event.${idFocusedTimeline}, g.edge.${idFocusedTimeline} {
				filter: drop-shadow(0 0 6px rgb(255, 255, 255)) drop-shadow(0 0 15px rgba(255, 255, 255, 0.5));
			}`;
				if (cssRuleHighlightActive !== undefined) {
					stylesheet.deleteRule(cssRuleHighlightActive);
				}
				cssRuleHighlightActive = stylesheet.cssRules.length;
				stylesheet.insertRule(styleHighlight, stylesheet.cssRules.length);
				targetFocusElement.classList.remove("visible");
			}

			const menuLevel1 = document.createElement("div");
			menuLevel1.classList.add("level");
			if (isActive) {
				menuLevel1.classList.add("active");
			}
			offsetMenu(menuLevel1, 1);
			menuContainer.appendChild(menuLevel1);

			for (const timelineId of options) {
				const timeline = timelines.get(timelineId);
				if (timeline === undefined) {
					throw new Error(`can't find timeline '${timelineId}'`);
				}
				const menuItem = document.createElement("div");
				menuItem.classList.add("item", timelineId);
				if (idFocusedTimeline === timelineId) {
					menuItem.classList.add("active");
				}
				menuItem.textContent = timeline[5] ?? timeline[4] ?? "???";
				menuLevel1.appendChild(menuItem);
			}
			statusOptions.classList.add("visible");
			statusOptionA.textContent = "Umsteigen";
			statusButtonA.style.display = "inline-block";
			statusOptionX.textContent = "Zurück";
			statusButtonX.style.display = "inline-block";
		});
	};

	/** @type {InputPlane} */
	const InputPlaneMainMenuSwitchTimeline = {
		name: "menuSwitchTimeline",
		pressed: {
			[Inputs.BUTTON_UP]: () => {
				if (idFocusedTimeline === undefined || idFocused === undefined) {
					return undefined;
				}
				const neighbors = getNodeNeighbors();
				const activeIndex = neighbors.intersection.indexOf(idFocusedTimeline);
				focusNode(idFocused, neighbors.intersection[activeIndex - 1]);
				sfxPlayTap();
				menuMainSwitchTimeline();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_UP]: returnToMenuPlane(
							InputPlaneMainMenuSwitchTimeline,
						),
					},
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				if (idFocusedTimeline === undefined || idFocused === undefined) {
					return undefined;
				}
				const neighbors = getNodeNeighbors();
				const activeIndex = neighbors.intersection.indexOf(idFocusedTimeline);
				focusNode(idFocused, neighbors.intersection[activeIndex + 1]);
				sfxPlayTap();
				menuMainSwitchTimeline();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_DOWN]: returnToMenuPlane(
							InputPlaneMainMenuSwitchTimeline,
						),
					},
				};
			},
			[Inputs.BUTTON_LEFT]: () => {
				menuMain();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_LEFT]: returnToMenuPlane(InputPlaneMenuMain),
					},
				};
			},
			[Inputs.BUTTON_A]: () => {
				sfxPlaySwipe();
				sfxPlay("button");
				return {
					name: "return",
					released: { [Inputs.BUTTON_A]: returnToNeutral },
				};
			},
			[Inputs.BUTTON_X]: () => {
				focusNode(idFocused, previousTimelineActive);
				sfxPlaySwipe();
				return {
					name: "return",
					released: { [Inputs.BUTTON_X]: returnToNeutral },
				};
			},
		},
	};
	//#endregion

	//#region Artifact Menu
	let menuMainArtifactsFocusIndex = 0;
	const menuMainArtifacts = function menuMainArtifacts(isActive = true) {
		if (isActive) {
			menuMainFocusIndex = 2;
			menuMain(false);
		}

		DOM.write("menuMainArtifacts", () => {
			const menuLevel1 = document.createElement("div");
			menuLevel1.classList.add("level");
			if (isActive) {
				menuLevel1.classList.add("active");
			}
			offsetMenu(menuLevel1, 2);
			menuContainer.appendChild(menuLevel1);

			const artifacts = timelineMediaIds ?? [];
			for (const [index, artifactId] of artifacts.entries()) {
				const artifact = timelines.get(artifactId);
				if (artifact === undefined) {
					throw new Error(`can't find artifact '${artifactId}'`);
				}
				const menuItem = document.createElement("div");
				menuItem.classList.add("item");
				if (menuMainArtifactsFocusIndex === index) {
					menuItem.classList.add("active");
				}
				menuItem.textContent = artifact[5] ?? artifact[4];
				menuLevel1.appendChild(menuItem);
			}
		});
	};

	/** @type {InputPlane} */
	const InputPlaneMenuMainArtifacts = {
		name: "menuMainArtifacts",
		pressed: {
			[Inputs.BUTTON_UP]: () => {
				menuMainArtifactsFocusIndex = Math.min(
					3,
					Math.max(0, menuMainArtifactsFocusIndex - 1),
				);
				menuMainArtifacts();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_UP]: returnToMenuPlane(InputPlaneMenuMainArtifacts),
					},
				};
			},
			[Inputs.BUTTON_DOWN]: () => {
				menuMainArtifactsFocusIndex = Math.min(
					3,
					Math.max(0, menuMainArtifactsFocusIndex + 1),
				);
				menuMainArtifacts();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_DOWN]: returnToMenuPlane(
							InputPlaneMenuMainArtifacts,
						),
					},
				};
			},
			[Inputs.BUTTON_LEFT]: () => {
				menuMain();
				sfxPlayTap();
				return {
					name: "return",
					released: {
						[Inputs.BUTTON_LEFT]: returnToMenuPlane(InputPlaneMenuMain),
					},
				};
			},
			[Inputs.BUTTON_RIGHT]: () => {
				return undefined;
			},
			[Inputs.BUTTON_A]: () => {
				return undefined;
			},
			[Inputs.BUTTON_START]: () => {
				sfxPlay("transition_down");
				return {
					name: "return",
					released: { [Inputs.BUTTON_START]: returnToNeutral },
				};
			},
		},
	};
	//#endregion

	//#region Frame Loop
	/** @type {number | undefined} */
	let previousTimestamp;
	/** @type {number | undefined} */
	let previousTimestampStarfield;
	/**
	 * @param timestamp {number} -
	 */
	const present = function present(timestamp) {
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
		if (!cameraIsIdle && cameraIsAttached && 1000 < deltaStarfield) {
			const sinceStart = Date.now() - startTime;

			DOM.write("updateStarfield", () => {
				for (let z = 0; z < starPlanes.length; ++z) {
					const planeSet = starPlanes[z];

					const offset =
						(z + 1) * (view.scope.y * speedScroll + sinceStart * speedTime);

					const planeOffsets = [planeSet[0], planeSet[1]];
					const planes = [planeSet[2], planeSet[3]];

					planeOffsets[0] = offset % view.window.height;
					planeOffsets[1] = (offset % view.window.height) - view.window.height;

					planes[0].style.transition =
						view.window.height / 2 < Math.abs(planeSet[0] - planeOffsets[0])
							? "none"
							: "ease-out all 0.9s";
					planes[1].style.transition =
						view.window.height / 2 < Math.abs(planeSet[1] - planeOffsets[1])
							? "none"
							: "ease-out all 0.9s";
					planes[0].style.opacity =
						view.window.height / 2 < Math.abs(planeSet[0] - planeOffsets[0])
							? "0"
							: "1";
					planes[1].style.opacity =
						view.window.height / 2 < Math.abs(planeSet[1] - planeOffsets[1])
							? "0"
							: "1";

					planes[0].style.transform = `translateY(${-planeOffsets[0]}px)`;
					planes[1].style.transform = `translateY(${-planeOffsets[1]}px)`;

					planeSet[0] = planeOffsets[0];
					planeSet[1] = planeOffsets[1];
				}
				previousTimestampStarfield = timestamp;
			});
		}

		if (mediaItemVisible) {
			DOM.write("updateMediaItem", () => {
				// Browser X-Y is reversed.
				dialog.style.transform = `perspective(20px) translate3d(${mediaItemPosition.x}px, ${mediaItemPosition.y}px, ${mediaItemPosition.z}px)`;
			});
		}

		DOM.run();

		window.requestAnimationFrame(present);
		previousTimestamp = timestamp;
	};
	//#endregion

	//#region Init
	const getRandomColor = function getRandomColor() {
		const components =
			starColorsRGB[Math.floor(Math.random() * starColorsRGB.length)];
		const scale = 1 / (Math.random() * 3);
		const color = components.map((_) => Math.floor(_ * scale)).join(" ");
		return `rgb(${color})`;
	};
	const initGraphics = function initGraphics() {
		console.info("Initializing graphics...");

		// View window is the size of the visible area of the window.
		// Not the size of the (larger) scrollable background plane.
		view.window.width = document.documentElement.clientWidth;
		view.window.height = document.documentElement.clientHeight;

		// View bounds are the size of the SVG, which should be a huge DOM
		// element, that defines the size of the background plane.
		view.bounds.width = svg.scrollWidth;
		view.bounds.height = svg.scrollHeight;

		// View position is the segment of the SVG we're currently looking
		// at. It's the exact window into the background plane that we see.
		view.position.x = window.scrollX;
		view.position.y = window.scrollY;
		view.position.width = view.window.width;
		view.position.height = view.window.height;

		// View scope is larger than the position, and is used for culling operations.
		view.scope.x = 0;
		view.scope.y = window.scrollY - view.window.height;
		view.scope.width = view.window.width;
		view.scope.height = view.window.height * 3;

		for (const [, , planeTop, planeBottom] of starPlanes) {
			for (const plane of [planeTop, planeBottom]) {
				plane.width = view.window.width;
				plane.height = view.window.height;
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

				document.body.insertBefore(plane, svg);
			}

			stars *= 0.9;
		}
	};

	document.addEventListener("click", onClick);
	document.addEventListener("mousemove", onMouseMove);
	document.addEventListener("keydown", onKeyDown);
	document.addEventListener("keyup", onKeyUp);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("resize", initGraphics);
	window.addEventListener("scrollend", onScrollEnd);

	const init = function init() {
		initGraphics();

		console.info("Requesting initial focus...");
		const existingAnchor = window.location.hash;
		if (existingAnchor !== "") {
			try {
				focusNode(existingAnchor.replace(/^#/, ""));
			} catch (_) {
				navigateHome();
			}
		} else {
			navigateHome();
		}

		window.setTimeout(() => {
			// Ensure initial view is culled.
			cull();

			console.info("Program init finalized.");
			Promise.all(samplesLoading.values().toArray()).then(() => {
				document.body.classList.remove("loading");
				window.requestAnimationFrame(present);

				window.setTimeout(() => {
					calendarContainer.classList.add("open");
					console.info("Calendar shown.");
				}, 5000);

				window.setTimeout(() => {
					statusContainer.classList.add("open");
					returnToNeutral();
					console.info("Status shown.");
				}, 6000);

				window.setTimeout(() => {
					loader.style.display = "none";
					console.info("Loader hidden.");
				}, 10000);
			});
		});
	};
	window.setTimeout(init);
	console.info("Next-frame ignition requested.");
	//#endregion
};

const onDOMContentLoaded = function onDOMContentLoaded() {
	console.info(
		"DOM content loaded. Program init is pending. Allow at least 30 seconds to pass before looking for bugs.",
	);
	const invokeMain = function invokeMain() {
		main().catch(console.error);
	};
	setTimeout(invokeMain, 1000);
};
document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
