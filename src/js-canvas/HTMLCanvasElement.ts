// https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element

import Node, {EXTEND_NODE} from '../node.js';
import {
	RenderingContext,
	CanvasRenderingContext2D, CanvasRenderingContext2DSettings,
	// ImageBitmaps currently unsupported
	// https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap
	//ImageBitmapRenderingContext, ImageBitmapRenderingContextSettings,
} from './RenderingContext.js'

// Types via https://github.com/microsoft/TypeScript/blob/main/src/lib/dom.generated.d.ts
export type ContextID = "2d" | "bitmaprenderer" | "webgl" | "webgl2" | "webgpu" | string

// Implementation
const WIDTH: unique symbol = Symbol("canvas-width");
const HEIGHT: unique symbol = Symbol("canvas-height");

const CONTEXT: unique symbol = Symbol("canvas-context");
const EID: unique symbol = Symbol("element-id");

// Access canvas data (for the Context or testing/debugging)
export const CANVAS_DATA: unique symbol = Symbol("accesscanvas-data");

export class HTMLCanvasElement extends Node implements Partial<HTMLCanvasElement> {
	// The unique ID of the element assigned at creation time (to aid debugging)
	private [EID]: string;

	private [WIDTH]: number;
	private [HEIGHT]: number;

	private [CONTEXT]: RenderingContext;

	[CANVAS_DATA]: Uint8ClampedArray;

	get width(): number {
		console.debug(`${this}→width? (${this[WIDTH]})`);
		return this[WIDTH];
	}
	get height(): number {
		console.debug(`${this}→height? (${this[HEIGHT]})`);
		return this[HEIGHT];
	}

	set width(width: number) {
		console.debug(`${this}→width = ${width}`);
		this[WIDTH] = width;

		this.resize(this[WIDTH],this[HEIGHT]);
	}
	set height(height: number) {
		console.debug(`${this}→height = ${height}`);
		this[HEIGHT] = height;

		this.resize(this[WIDTH],this[HEIGHT]);
	}

	getContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null;
	//getContext(contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext | null;
	//getContext(contextId: string, options?: any): RenderingContext | null;
	getContext(contextId: ContextID, _options?: any): CanvasRenderingContext2D {
		if (contextId != "2d") throw new Error(`Not implemented: ${contextId}`);

		this[CONTEXT] = this[CONTEXT] || new CanvasRenderingContext2D(this);

		if (!(this[CONTEXT] instanceof CanvasRenderingContext2D)) throw new Error(`Context invalid`);

		return this[CONTEXT];
	}

	toDataURL(_type = "image/png", _quality: any): string {
		throw new Error("Not implemented")
	}

	toBlob(_callback: BlobCallback, _type = "image/png", _quality: any): void {
		throw new Error("Not implemented");
	}

	get clientWidth(): number {
		return this.width;
	}
	get clientHeight(): number {
		return this.height;
	}

	constructor() {
		super(EXTEND_NODE);

		// Assign a new pseudo-random element ID
		this[EID] = (Math.random()*(36**6)|0).toString(36);

		// The default size of a new canvas in most implementations
		this.resize(300, 150);
	}

	// Stringifies the object including its unique element tag
	get [Symbol.toStringTag]() {
		return `HTMLCanvasElement#${this[EID]}`
	}

	private resize(width: number, height: number) {
		this[WIDTH] = width;
		this[HEIGHT] = height;
		this[CANVAS_DATA] = new Uint8ClampedArray(this[WIDTH]*this[HEIGHT]*4);
		console.debug(`${this}→reset, new size: ${this[WIDTH]}x${this[HEIGHT]} (${this[CANVAS_DATA].length}b)`);
	}
};

// Export onto the global scope
if (globalThis && typeof globalThis.HTMLCanvasElement !== "object") {
	// @ts-ignore
	globalThis.HTMLCanvasElement = HTMLCanvasElement;
}
