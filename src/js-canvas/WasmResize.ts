// @ts-nocheck
// Based on squoosh_resize_bg.js at v0.12.0
// import * as wasm from './squoosh_resize_bg.wasm';

import wasmInit from '../../node_modules/squoosh/codecs/resize/pkg/squoosh_resize_bg.wasm';
// import { readFile } from 'node:fs/promises';
// const wasmFile = await WebAssembly.compile(
//   await readFile(new URL('../../node_modules/squoosh/codecs/resize/pkg/squoosh_resize_bg.wasm', import.meta.url)),
// );
// const wasmInstance = await WebAssembly.instantiate(wasmFile, {});
// const wasm = wasmInstance.exports;
const wasmInstance = wasmInit({});
const wasm = wasmInstance.exports;
console.log('Wasm init:', wasmInstance, wasm);

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
	if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
		cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
	}
	return cachegetUint8Memory0;
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
	const ptr = malloc(arg.length * 1);
	getUint8Memory0().set(arg, ptr / 1);
	WASM_VECTOR_LEN = arg.length;
	return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
	if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
		cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
	}
	return cachegetInt32Memory0;
}

function getArrayU8FromWasm0(ptr, len) {
	return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
* @param {Uint8Array} input_image
* @param {number} input_width
* @param {number} input_height
* @param {number} output_width
* @param {number} output_height
* @param {number} typ_idx
* @param {boolean} premultiply
* @param {boolean} color_space_conversion
* @returns {Uint8Array}
*/
export function resize(input_image, input_width, input_height, output_width, output_height, typ_idx, premultiply, color_space_conversion) {
	var ptr0 = passArray8ToWasm0(input_image, wasm.__wbindgen_malloc);
	var len0 = WASM_VECTOR_LEN;
	wasm.resize(8, ptr0, len0, input_width, input_height, output_width, output_height, typ_idx, premultiply, color_space_conversion);
	var r0 = getInt32Memory0()[8 / 4 + 0];
	var r1 = getInt32Memory0()[8 / 4 + 1];
	var v1 = getArrayU8FromWasm0(r0, r1).slice();
	wasm.__wbindgen_free(r0, r1 * 1);
	return v1;
}

export function resizeImage(image: ImageData, output_width: number, output_height: number): ImageData {
	const input_image = image.data
	const input_width = image.width
	const input_height = image.height

	// https://github.com/GoogleChromeLabs/squoosh/blob/dev/codecs/resize/src/lib.rs
	// 0 => Type::Triangle,
	// 1 => Type::Catrom,
	// 2 => Type::Mitchell,
	// 3 => Type::Lanczos3,
	const typ_idx = 3

	const premultiply = true
	const color_space_conversion = false

	const output_image = resize(input_image, input_width, input_height, output_width, output_height, typ_idx, premultiply, color_space_conversion);

	return {
		width: output_width|0,
		height: output_height|0,
		data: output_image
	}
}
