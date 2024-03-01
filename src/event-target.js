// Implementation of the HTML EventTarget API
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
const EVENT_LISTENERS = Symbol("event-listeners");

export default class EventTarget {
	addEventListener( eventType, callback, useCaptureOrOptions )
	{
		// Lazily create the event listener map on the node
		this[EVENT_LISTENERS] = this[EVENT_LISTENERS] ?? new Map();

		// Registered listeners for this eventType
		let listeners = this[EVENT_LISTENERS].get(eventType);
		if (!listeners) {
			listeners = [];
			this[EVENT_LISTENERS].set(eventType, listeners);
		}

		// Capturing and non-capturing listeners need to be removed separately
		// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#sect1
		// TODO: handle other options? (once, passive, signal)
		// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#options
		listeners.push({
			callback,
			capturing: useCaptureOrOptions === true || !!useCaptureOrOptions?.capture,
			options: typeof useCaptureOrOptions === 'object' ? useCaptureOrOptions : { capture: !!useCaptureOrOptions }
		});
	}

	removeEventListener( eventType, callback, useCaptureOrOptions )
	{
		// There aren't any listeners registered
		if (!this[EVENT_LISTENERS]) return;

		// Registered listeners for this eventType
		let listeners = this[EVENT_LISTENERS].get(eventType);
		if (!listeners) return;

		// Extract the boolean capture value from the different possible argument formats
		const captureSetting = !!(typeof useCaptureOrOptions === 'object' ? useCaptureOrOptions.capture : useCaptureOrOptions);

		// Find the indexes of listeners we want to remove, then remove them from the listeners array
		// A listener must match the callback object (function) and capture setting (true/false)
		// We remove the elements in reverse index order to avoid the indexes changing
		listeners.map((listener, i) => {
			return listener.callback === callback && listener.capturing === captureSetting ? i : undefined
		})
			.reverse()
			.forEach(i => {
				if (i !== undefined) listeners.splice(i, 1)
			});
	}

	dispatchEvent( event )
	{
		let notCancelled = true;

		// There aren't any listeners registered
		if (!this[EVENT_LISTENERS]) return notCancelled;

		// List active listeners
		const listeners = this[EVENT_LISTENERS].get(event.type) ?? [];

		// Dispatch the event for every listener
		// TODO: handle 'once', 'passive' options, bubbling & capture
		// https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase
		listeners?.forEach(({ callback }) => {
			callback(event);

			// The event has been canceled through preventDefault()
			if (event.defaultPrevented) notCancelled = false;
		});

		return notCancelled;
	}

}
