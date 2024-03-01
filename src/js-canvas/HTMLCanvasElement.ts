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
const HEIGHT: unique symbol = Symbol("canvas-width");

const CONTEXT: unique symbol = Symbol("canvas-width");

export class HTMLCanvasElement extends Node implements Partial<HTMLCanvasElement> {
	private [WIDTH]: number;
	private [HEIGHT]: number;

	private [CONTEXT]: RenderingContext;

	get width(): number {
		console.debug(`[HTMLCanvasElement] get width: ${this[WIDTH]}`);
		return this[WIDTH];
	}
	get height(): number {
		console.debug(`[HTMLCanvasElement] get height: ${this[HEIGHT]}`);
		return this[HEIGHT];
	}

	set width(width: number) {
		console.debug(`[HTMLCanvasElement] set width = ${this[WIDTH]}`);
		this[WIDTH] = width;
	}
	set height(height: number) {
		console.debug(`[HTMLCanvasElement] set height = ${this[HEIGHT]}`);
		this[HEIGHT] = this.height;
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

		// The default size of a new canvas in most implementations
		this[WIDTH] = 300;
		this[HEIGHT] = 150;
	}
};
