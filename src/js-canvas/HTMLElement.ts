// Partial via https://github.com/microsoft/TypeScript/blob/main/src/lib/dom.generated.d.ts

interface Event {
	//readonly bubbles: boolean;
	//readonly cancelable: boolean;
	//readonly eventPhase: number;
	//readonly isTrusted: boolean;
	//readonly timeStamp: DOMHighResTimeStamp;

	readonly defaultPrevented: boolean;

	readonly target: EventTarget | null;
	readonly currentTarget: EventTarget | null;

	readonly type: string;

	preventDefault(): void;
	//stopImmediatePropagation(): void;
	//stopPropagation(): void;

	readonly NONE: 0;
	readonly CAPTURING_PHASE: 1;
	readonly AT_TARGET: 2;
	readonly BUBBLING_PHASE: 3;
}

interface EventListener {
		(evt: Event): void;
}

interface EventListenerObject {
		handleEvent(object: Event): void;
}

type EventListenerOrEventListenerObject = EventListener | EventListenerObject;

interface EventTarget {
	addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void;

	dispatchEvent(event: Event): boolean;

	removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
}

export class HTMLElement implements EventTarget {
	get clientWidth(): number {
		return 0;
	}
	get clientHeight(): number {
		return 0;
	}

  setAttribute(qualifiedName: string, value: string): void {
		throw new Error("Not implemented")
  }
  getAttribute(qualifiedName: string): string | null {
		throw new Error("Not implemented")
  }

	addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions | undefined): void {
		throw new Error("Not implemented")
	}
	removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions | undefined): void {
		throw new Error("Not implemented")			
	}
	dispatchEvent(event: Event): boolean {
		throw new Error("Not implemented")
	}

	constructor() {
	}
}
