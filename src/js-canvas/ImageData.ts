export class ImageData {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/ImageData/colorSpace) */
	readonly colorSpace: PredefinedColorSpace;
	/**
	 * Returns the one-dimensional array containing the data in RGBA order, as integers in the range 0 to 255.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ImageData/data)
	 */
	readonly data: Uint8ClampedArray;
	/**
	 * Returns the actual dimensions of the data in the ImageData object, in pixels.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ImageData/height)
	 */
	readonly height: number;
	/**
	 * Returns the actual dimensions of the data in the ImageData object, in pixels.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ImageData/width)
	 */
	readonly width: number;

	constructor(sw: number, sh: number, settings?: ImageDataSettings);
	constructor(data: Uint8ClampedArray, sw: number, sh?: number, settings?: ImageDataSettings);
	constructor(swOrData,shOrSw, settingsOrSh?, settings?) {
		console.log(`[HTMLCanvasElement] Not implemented: new ImageData( ${Array.from(arguments).join(', ')} )`);
		this.width = 512;
		this.height = 512;
		this.data = new Uint8ClampedArray(this.width * this.height * 4);
	}
};
