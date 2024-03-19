// https://html.spec.whatwg.org/multipage/canvas.html#canvasrenderingcontext2d

import type { HTMLCanvasElement } from "./HTMLCanvasElement.js";

import { CANVAS_DATA } from "./HTMLCanvasElement.js";
import { ImageData } from "./ImageData.js";
import { resizeImage } from "./WasmResize.js"

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

interface Context2DState {
	fillStyle: string
	scaleX: number
	scaleY: number
	translateX: number
	translateY: number
}

const STATE: unique symbol = Symbol("context2d-state");

export class CanvasRenderingContext2D implements CanvasRect, CanvasDrawImage, CanvasImageData {
	readonly canvas: HTMLCanvasElement;

	private [STATE]: Context2DState;

	reset() {
		this[STATE] = {
			fillStyle: "#000",
			scaleX: 1,
			scaleY: 1,
			translateX: 0,
			translateY: 0,
		};
	}

	get fillStyle(): string {
		return this[STATE].fillStyle;
	}
	set fillStyle(newStyle: string) {
		console.log(`${this}→fillStyle = ${newStyle}`);
		this[STATE].fillStyle = newStyle;
	}

	get transformActive(): boolean {
		const active = this[STATE].scaleX !== 1 || this[STATE].scaleY !== 1 || this[STATE].translateX !== 0 || this[STATE].translateY !== 0;

		if (active) {
			const activeTransforms = [];
			if (this[STATE].scaleX !== 1) activeTransforms.push(`scaleX: ${this[STATE].scaleX}`);
			if (this[STATE].scaleY !== 1) activeTransforms.push(`scaleY: ${this[STATE].scaleY}`);
			if (this[STATE].translateX !== 0) activeTransforms.push(`translateX: ${this[STATE].translateX}`);
			if (this[STATE].translateY !== 0) activeTransforms.push(`translateY: ${this[STATE].translateY}`);
			console.log(`${this}: context has active matrix transforms: ${activeTransforms.join(', ')}`);
		}

		return active;
	}

	// CanvasRect
	clearRect(x: number, y: number, w: number, h: number): void {
		throw new Error("Not implemented");
	}

	fillRect(x: number, y: number, w: number, h: number): void {
		if (this[STATE].scaleX !== 1 || this[STATE].scaleY !== 1 || this[STATE].translateX !== 0 || this[STATE].translateY !== 0) {
			console.log(`Warning: ${this}→fillRect( ${Array.from(arguments).join(', ')} ) canvas transform matrix not supported: ${Object.values(this[STATE]).map(([k,v]) => k+': '+v).join(', ')}`);
		}

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
		this.reset();
	}

	// CanvasDrawImage
	drawImage(image: CanvasImageSource, dx: number, dy: number): void;
	drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(image: CanvasImageSource, x1: number, y1: number, w1?: number, h1?: number, x2?: number, y2?: number, w2?: number, h2?: number): void {
		if (image instanceof globalThis.HTMLCanvasElement) {
			w1 = w1 ?? image.width;
			h1 = h1 ?? image.height;
			x2 = x2 ?? 0;
			y2 = y2 ?? 0;

			if (w1 !== w2 || h1 !== h2) {
				console.log(`${this} Not implemented: image scaling in drawImage( <${image.constructor.name}> ${Array.from(arguments).join(', ')} )`);
				return;
			}

			let srcImage = image.getContext("2d").getImageData(x1, y1, w1, h1);

			// Scaling/translation needed
			if (this.transformActive) {
				// This is slightly inaccurate but we don't do subpixel drawing
				const targetWidth = this[STATE].scaleX * w1 |0;
				const targetHeight = this[STATE].scaleY * h1 |0;

				x2 = x2 + this[STATE].translateX |0;
				y2 = y2 + this[STATE].translateY |0;

				srcImage = resizeImage(srcImage, targetWidth, targetHeight);
				w1 = srcImage.width;
				h1 = srcImage.height;

				console.log(`${this}→drawImage(): source image resized to: ${w1}x${h1} (${srcImage.data.length/4} pixels)`);
				console.log(`${this}→drawImage(): drawing to translated coordinates: ( ${x2}, ${y2} )`);
			}

			const srcPixels = srcImage.data;
			const dstPixels = this.canvas[CANVAS_DATA];
			const canvasW = this.canvas.width;
			const canvasH = this.canvas.height;
			const rows = h1;
			const cols = w1;

			let ntp = 0;
			let oob = 0;
			for (let row = 0; row < rows; ++row) {
				for (let col = 0; col < cols; ++col) {
					// Index of the destination canvas pixel should be within bounds
					const di = ((y2 + row) * canvasW + x2 + col) * 4;

					if (di < 0 || di >= dstPixels.length) {
						++oob;
						continue;
					}

					// source pixel
					const si = ((y1 + row) * srcImage.width + x1 + col) * 4;
					const sr = srcPixels[ si ];
					const sg = srcPixels[ si+1 ];
					const sb = srcPixels[ si+2 ];
					const sa = srcPixels[ si+3 ];
					if (sa > 0) ++ntp;

					// destination pixel
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
			console.log(`${this}→drawImage(): number of non-transparent source pixels drawn: ${ntp} (${ntp/(srcPixels.length/4)*100|0}%)`);
			console.log(`${this}→drawImage(): skipped drawing of ${oob} out-of-bounds pixels on the canvas`);
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
		// Expand calls using a DOMMatrix2D object
		if (typeof matrixOrA === 'object') {
			if ('a' in matrixOrA || 'b' in matrixOrA || 'c' in matrixOrA || 'd' in matrixOrA || 'e' in matrixOrA || 'f' in matrixOrA || 
				'm11' in matrixOrA || 'm12' in matrixOrA || 'm21' in matrixOrA || 'm22' in matrixOrA || 'm31' in matrixOrA || 'm32' in matrixOrA) {
				return this.setTransform(
					matrixOrA.a ?? matrixOrA.m11, matrixOrA.b ?? matrixOrA.m12, matrixOrA.c ?? matrixOrA.m21, 
					matrixOrA.dx ?? matrixOrA.m22, matrixOrA.e ?? matrixOrA.m31, matrixOrA.f ?? matrixOrA.m32
				);
			}
		} else {
			const a = matrixOrA;

			if ( b !== 0 || c !== 0) {
				console.log(`${this} Not implemented: context2d.setTransform( ${Array.from(arguments).join(', ')} ) skew/rotate transforms`);
			}

			this.scale(a,d);
			this.translate(e,f);

			console.log(`${this}→setTransform( ${Array.from(arguments).join(', ')} )`);
		}
	}
	scale(xScale: number, yScale: number) {
		this[STATE].scaleX = xScale;
		this[STATE].scaleY = yScale;
	}
	translate(x: number, y: number) {
		this[STATE].translateX = x;
		this[STATE].translateY = y;
	}

	// Stringifies the context object with its canvas & unique ID to ease debugging
	get [Symbol.toStringTag]() {
		return `${this.canvas[Symbol.toStringTag]}::context2d`;
	}

	private setPixel(x,y,r,g,b,a) {

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
