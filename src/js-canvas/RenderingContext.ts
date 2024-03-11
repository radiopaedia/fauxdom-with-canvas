// https://html.spec.whatwg.org/multipage/canvas.html#canvasrenderingcontext2d

import type { HTMLCanvasElement } from "./HTMLCanvasElement.js";

import { CANVAS_DATA } from "./HTMLCanvasElement.js";
import { ImageData } from "./ImageData.js";

// Partial types via https://github.com/microsoft/TypeScript/blob/main/src/lib/dom.generated.d.ts
export type RenderingContext = CanvasRenderingContext2D | ImageBitmapRenderingContext

export interface CanvasRenderingContext2DSettings {
	alpha?: boolean;
	colorSpace?: PredefinedColorSpace;
	desynchronized?: boolean;
	willReadFrequently?: boolean;
}

interface DOMMatrix2DInit {
	a?: number;
	b?: number;
	c?: number;
	d?: number;
	e?: number;
	f?: number;
	m11?: number;
	m12?: number;
	m21?: number;
	m22?: number;
	m41?: number;
	m42?: number;
}

interface RGBAColor {
	r: number,
	g: number,
	b: number,
	a?: number
}

const FILL_STYLE: unique symbol = Symbol("fill-style");

export class CanvasRenderingContext2D implements CanvasRect, CanvasDrawImage, CanvasImageData {
	readonly canvas: HTMLCanvasElement;

	private [FILL_STYLE]: string;

	get fillStyle(): string {
		return this[FILL_STYLE];
	}
	set fillStyle(newStyle: string) {
		console.log(`${this}→fillStyle = ${newStyle}`);
		this[FILL_STYLE] = newStyle;
	}

	// CanvasRect
	clearRect(x: number, y: number, w: number, h: number): void {
		throw new Error("Not implemented");
	}

	fillRect(x: number, y: number, w: number, h: number): void {
		const { r, g, b, a } = this.fillStyleRGBA;
		const alpha = a*255|0;

		const data = this.canvas[CANVAS_DATA];

		// Optimization: full-canvas fill
		if (x === 0 && y === 0 && data.length === w*h*4) {
			for (let i = 0; i < data.length; i+=4) {
				data[i+0] = r;
				data[i+1] = g;
				data[i+2] = b;
				data[i+3] = alpha;
			}
			console.log(`${this}→fillRect( ${Array.from(arguments).join(', ')} ) whole canvas with ${r},${g},${b} @ ${alpha}`);
			return;
		}

		for (let row = y; row < y+h; ++row) {
			const startIdx = row*4 + x;
			const endIdx = row*4 + x + w;

			for (let i = startIdx; i < endIdx; i+=4) {
				data[i+0] = r;
				data[i+1] = g;
				data[i+2] = b;
				data[i+3] = alpha;
			}
		}

		console.log(`${this}→fillRect( ${Array.from(arguments).join(', ')} ) with ${r},${g},${b} @ ${alpha}`);
	}

	strokeRect(x: number, y: number, w: number, h: number): void {
		throw new Error("Not implemented");
	}

	constructor(parentCanvas: HTMLCanvasElement) {
		this.canvas = parentCanvas;

		// defaults
		this.fillStyle = "#000";
	}

	// CanvasDrawImage
	drawImage(image: CanvasImageSource, dx: number, dy: number): void;
	drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(image: CanvasImageSource, x1: number, y1: number, w1?: number, h1?: number, x2?: number, y2?: number, w2?: number, h2?: number): void {
		if (image instanceof globalThis.HTMLCanvasElement) {
			w1 = w1 ?? image.width;
			h1 = h1 ?? image.height;

			if (w1 !== w2 || h1 !== h2) {
				console.log(`${this} Not implemented: image scaling in drawImage( <${image.constructor.name}> ${Array.from(arguments).join(', ')} )`);
				return;
			}

			const srcImage = image.getContext("2d").getImageData(x1, y1, w1, h1);
			const srcPixels = srcImage.data;
			const dstPixels = this.canvas[CANVAS_DATA];
			const rows = h1;
			const cols = w1;

			for (let row = 0; row < rows; ++row) {
				for (let col = 0; col < cols; ++col) {
					// source pixel
					const si = ((y1 + row) * srcImage.width + x1 + col) * 4;
					const sr = srcPixels[ si ];
					const sg = srcPixels[ si+1 ];
					const sb = srcPixels[ si+2 ];
					const sa = srcPixels[ si+3 ];

					// destination pixel
					const di = ((y2 + row) * srcImage.width + x2 + col) * 4;
					const dr = dstPixels[ di ];
					const dg = dstPixels[ di+1 ];
					const db = dstPixels[ di+2 ];
					const da = dstPixels[ di+3 ];

					// blend pixels using premultiplied alpha and the default 'source-over' composition
					// https://drafts.fxtf.org/compositing/#porterduffcompositingoperators_srcover
					const dstcontrib = (1 - sa/255)
					dstPixels[ di+0 ] = sr * (sa/255) + dr * (da/255) * dstcontrib |0;
					dstPixels[ di+1 ] = sg * (sa/255) + dg * (da/255) * dstcontrib |0;
					dstPixels[ di+2 ] = sb * (sa/255) + db * (da/255) * dstcontrib |0;

					dstPixels[ di+3 ] = sa + da*dstcontrib |0;
				}
			}
			console.log(`${this}→drawImage( <${image.constructor.name}> ${Array.from(arguments).join(', ')} )`);
			return;
		}

		//let dx,dy,dw,dh;
		//let sx,sy,sw,sh;
		console.log(`${this} Not implemented: only canvas sources supported: drawImage( <${image.constructor.name}> ${Array.from(arguments).join(', ')} )`);
	}

	// CanvasImageData
	createImageData(sw: number, sh: number, settings?: ImageDataSettings): ImageData;
	createImageData(imagedata: ImageData): ImageData;
	createImageData(widthOrImagedata: number|ImageData, height?: number, settings?: ImageDataSettings): ImageData {
		if (widthOrImagedata instanceof ImageData) {
			return new ImageData(widthOrImagedata.data, widthOrImagedata.width, widthOrImagedata.height);
		}

		return new ImageData(widthOrImagedata, height, settings);
	}

	getImageData(sx: number, sy: number, sw: number, sh: number, settings?: ImageDataSettings): ImageData {
		if (sx === 0 && sy === 0 && sw === this.canvas.width && sh === this.canvas.height && !settings) {
			console.log(`${this}→getImageData( ${Array.from(arguments).join(', ')} ) whole canvas ${this.canvas.width}x${this.canvas.height}`);
			return new ImageData(this.canvas[CANVAS_DATA], this.canvas.width, this.canvas.height);
		}

		console.log(`${this} Not implemented: context2d.getImageData( ${Array.from(arguments).join(', ')} )`);
		const id = new ImageData(sw, sh, settings);
		return id;
	}

	putImageData(imagedata: ImageData, dx: number, dy: number): void;
	putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
	putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX?: number, dirtyY?: number, dirtyWidth?: number, dirtyHeight?: number): void {
		let premultWarnLow, premultWarnZero;
		const canvas = this.canvas[CANVAS_DATA];
		if (dirtyX === undefined) {
			if (dx === 0 && dy === 0 && imagedata.width === this.canvas.width && imagedata.height === this.canvas.height) {
				console.log(`${this}→putImageData( ${Array.from(arguments).join(', ')} ) whole canvas ${this.canvas.width}x${this.canvas.height}`);

				for (let col = 0; col < imagedata.height; ++col) {
					for (let row = 0; row < imagedata.width; ++row) {
						const idx = (col*imagedata.width+row)*4;

						const alpha = imagedata.data[idx+3],
							r = imagedata.data[idx+0],
							g = imagedata.data[idx+1],
							b = imagedata.data[idx+2];

						// Transparent pixels that are not fully black/white have browser inconsistencies
						// Context for these warnings:
						// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData#data_loss_due_to_browser_optimization
						if (alpha === 0 && (r|g|b) !== 0 && (r&g&b) !== 255) {
							premultWarnZero = true;
						} else if (alpha < 255 && (r|g|b) !== 0 && (r&g&b) !== 255) {
							premultWarnLow = true;
						}

						canvas[idx+0] = r;
						canvas[idx+1] = g;
						canvas[idx+2] = b;
						canvas[idx+3] = alpha; //a
					}
				}

				if (premultWarnLow) {
					console.log(`${this} Compat warning: image contained colored non-opaque pixels (alpha<255), the result be inconsistent with observed browser behavior.`);
				}
				if (premultWarnZero) {
					console.log(`${this} Compat warning: image contained fully transparent colored pixels (alpha=0), the result of this operation may differ from browser behavior.`);
				}

				return
			}

			console.log(`${this} Not implemented: non-whole-canvas putImageData( ${Array.from(arguments).join(', ')} )`);
			return
		}

		console.log(`${this} Not implemented: context2d.putImageData( ${Array.from(arguments).join(', ')} )`);
	}	

	// From CanvasTransform
	setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
	setTransform(transform?: DOMMatrix2DInit): void;
	setTransform(matrixOrA?: any, b?, c?, d?, e?, f?) {
		console.log(`${this} Not implemented: context2d.setTransform( ${Array.from(arguments).join(', ')} )`);
	}

	// Stringifies the context object with its canvas & unique ID to ease debugging
	get [Symbol.toStringTag]() {
		return `${this.canvas[Symbol.toStringTag]}::context2d`;
	}

	// https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
	private get fillStyleRGBA(): RGBAColor {
		let c;
		let r = 0,
			g = 0,
			b = 0,
			a = 1;

		// Named color ('white', 'black', etc)
		if (CSS_NAMED_COLORS.has(this.fillStyle)) {
			c = HTMLColorToRGBA(CSS_NAMED_COLORS.get(this.fillStyle));
			if (c) return c;
		}

		// HTML color (#aaa, #bbccdd, #rrggbbaa)
		c = HTMLColorToRGBA(this.fillStyle);
		if (c) return c;

		// rgb() color definition
		c = HTMLColorToRGBA(this.fillStyle);
		if (c) return c;

		return { r, g, b, a };
	}
}

export interface ImageBitmapRenderingContextSettings {
	alpha?: boolean;
}

export class ImageBitmapRenderingContext {

}

// TODO: these are only the basic colors
const CSS_NAMED_COLORS = new Map([
	[ "black", "#000000" ],
	[ "silver", "#c0c0c0" ],
	[ "gray", "#808080" ],
	[ "white", "#ffffff" ],
	[ "maroon", "#800000" ],
	[ "red", "#ff0000" ],
	[ "purple", "#800080" ],
	[ "fuchsia", "#ff00ff" ],
	[ "green", "#008000" ],
	[ "lime", "#00ff00" ],
	[ "olive", "#808000" ],
	[ "yellow", "#ffff00" ],
	[ "navy", "#000080" ],
	[ "blue", "#0000ff" ],
	[ "teal", "#008080" ],
	[ "aqua", "#00ffff" ],
]);

function HTMLColorToRGBA(color: string): RGBAColor | null {
	let r = 0,
		g = 0,
		b = 0,
		a = 0;

	let matched, wasMatched;

	// Match longform
	matched = color.match(/^#(?<r>[0-9a-f]{2})(?<g>[0-9a-f]{2})(?<b>[0-9a-f]{2})(?<a>[0-9a-f]{2})?$/)?.groups;
	if (matched?.r && matched?.g && matched?.b) {
		r = parseInt(matched.r, 16);
		g = parseInt(matched.g, 16);
		b = parseInt(matched.b, 16);
		a = matched.a ? parseInt(matched.a, 10) : 1.0;
		wasMatched = true;
	}

	// Match short form
	matched = color.match(/^#(?<r>[0-9a-f]{1})(?<g>[0-9a-f]{1})(?<b>[0-9a-f]{1})(?<a>[0-9a-f]{1})?$/)?.groups;
	if (matched?.r && matched?.g && matched?.b) {
		r = parseInt(matched.r, 16);
		g = parseInt(matched.g, 16);
		b = parseInt(matched.b, 16);
		a = matched.a ? parseInt(matched.a, 10) : 1.0;
		wasMatched = true;
	}

	if (!wasMatched) {
		console.log(`Not a HTML color string: ${color}`);
		return null;
	}
	return { r, g, b, a };
}

function CSSRGBColorToRGBA(color: string): RGBAColor | null {
	let matched = color.match(/rgb\((?<r>\d{1,3})\s+(?<g>\d{1,3})\s+(?<b>\d{1,3})(\s*\/\s*(?<a>\d{1,3})%)?/)?.groups
	if (matched?.r && matched?.g && matched?.b) {
		let r = parseInt(matched.r, 10);
		let g = parseInt(matched.g, 10);
		let b = parseInt(matched.b, 10);
		let a = matched.a ? parseInt(matched.a, 10)/100 : 1.0;
		return { r, g, b, a };
	}

	console.log(`Not a CSS color definition': ${color}`);
	return null;
}
