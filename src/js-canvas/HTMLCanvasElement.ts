// https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element

import Node from '../node.js';
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
export class HTMLCanvasElement extends Node implements Partial<HTMLCanvasElement> {
	private w: number;
	private h: number;

	get width(): number {
		console.debug(`[HTMLCanvasElement] get width: ${this.w}`);
		return this.w;
	}
	get height(): number {
		console.debug(`[HTMLCanvasElement] get height: ${this.h}`);
		return this.h;
	}

	set width(width: number) {
		console.debug(`[HTMLCanvasElement] set width = ${this.w}`);
		this.w = width;
	}
	set height(height: number) {
		console.debug(`[HTMLCanvasElement] set height = ${this.h}`);
		this.h = this.height;
	}

	private context: RenderingContext;

	getContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null;
	//getContext(contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext | null;
	//getContext(contextId: string, options?: any): RenderingContext | null;
	getContext(contextId: ContextID, _options?: any): CanvasRenderingContext2D {
		if (contextId != "2d") throw new Error(`Not implemented: ${contextId}`);

		this.context = this.context || new CanvasRenderingContext2D(this);

		if (!(this.context instanceof CanvasRenderingContext2D)) throw new Error(`Context invalid`);

		return this.context;
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
		super();

		// The default size of a new canvas in most implementations
		this.width = 300
		this.height = 150
	}
};
