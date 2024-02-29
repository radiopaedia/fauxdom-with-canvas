// https://html.spec.whatwg.org/multipage/canvas.html#canvasrenderingcontext2d

import { HTMLCanvasElement } from "./HTMLCanvasElement.js";

// Partial types via https://github.com/microsoft/TypeScript/blob/main/src/lib/dom.generated.d.ts
export type RenderingContext = CanvasRenderingContext2D | ImageBitmapRenderingContext

export interface CanvasRenderingContext2DSettings {
    alpha?: boolean;
    colorSpace?: PredefinedColorSpace;
    desynchronized?: boolean;
    willReadFrequently?: boolean;
}

export class CanvasRenderingContext2D implements CanvasRect, CanvasDrawImage, CanvasImageData {
	readonly canvas: HTMLCanvasElement;

	// CanvasRect
	clearRect(x: number, y: number, w: number, h: number): void {
		throw new Error("Not implemented");
	}

	fillRect(x: number, y: number, w: number, h: number): void {
		throw new Error("Not implemented");
	}

	strokeRect(x: number, y: number, w: number, h: number): void {
		throw new Error("Not implemented");
	}

	constructor(parentCanvas: HTMLCanvasElement) {
		this.canvas = parentCanvas;
	}

	// CanvasDrawImage
	drawImage(image: CanvasImageSource, dx: number, dy: number): void;
	drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(image: CanvasImageSource, x1: number, y1: number, w1?: number, h1?: number, x2?: number, y2?: number, w2?: number, h2?: number): void {
		//let dx,dy,dw,dh;
		//let sx,sy,sw,sh;
		throw new Error("Not implemented");
	}

	// CanvasImageData
	createImageData(sw: number, sh: number, settings?: ImageDataSettings): ImageData;
	createImageData(imagedata: ImageData): ImageData;
	createImageData(widthOrImagedata: number|ImageData, height?: number, settings?: ImageDataSettings): ImageData {
    throw new Error("Not implemented");
	}

	getImageData(sx: number, sy: number, sw: number, sh: number, settings?: ImageDataSettings): ImageData {
		throw new Error("Not implemented");
	}

	putImageData(imagedata: ImageData, dx: number, dy: number): void;
	putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
	putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX?: number, dirtyY?: number, dirtyWidth?: number, dirtyHeight?: number): void {
		throw new Error("Not implemented");
	}	

}

export interface ImageBitmapRenderingContextSettings {
    alpha?: boolean;
}

export class ImageBitmapRenderingContext {

}
