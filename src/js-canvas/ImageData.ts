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

	constructor(width: number, height: number, settings?: ImageDataSettings);
	constructor(data: Uint8ClampedArray, width: number, height?: number, settings?: ImageDataSettings);
	constructor(widthOrData, heightOrWidth, settingsOrHeight?, settings?) {
		const rgbaArray = (widthOrData instanceof Uint8ClampedArray) ? widthOrData : null;
		let colorSpace = "srgb";

		if (rgbaArray) {
			console.log(`[ImageData] Warning: Array initializer support is experimental! ( new ImageData([${rgbaArray.length}b ${rgbaArray?.constructor?.name??"Array"}], ${Array.from(arguments).slice(1).join(',')}) )`);

			this.width = heightOrWidth;
			this.height = typeof settingsOrHeight === "number" ? settingsOrHeight : undefined;

			colorSpace = ( typeof settingsOrHeight === "object" ? settingsOrHeight : ( typeof settings === "object" ? settings : { colorSpace: "srgb" } )).colorSpace;
		} else {
			this.width = widthOrData;
			this.height = heightOrWidth;

			colorSpace = ( typeof settingsOrHeight === "object" ? settingsOrHeight : { colorSpace: "srgb" }).colorSpace;
		}

		if (colorSpace !== "srgb") {
			console.log(`[ImageData] Warning: Only the 'srgb' color space is supported! ( new ImageData(${Array.from(arguments).join(',')}) )`);
			throw new Error(`Unsupported colorSpace: ${colorSpace}`);
		}

		// We need to calculate the height based on the array data and width
		if (this.height === undefined) {
			this.height = rgbaArray.length / this.width / 4;
		}

		if (rgbaArray) {
			if (this.width * this.height * 4 !== rgbaArray.length) {
				// TODO: this should be a "DOMException"
				throw new Error(`The array dimensions do not match the supplied width or height`);
			}

			this.data = new Uint8ClampedArray(rgbaArray);
		} else {
			this.data = new Uint8ClampedArray(this.width * this.height * 4);
		}
	}
};
