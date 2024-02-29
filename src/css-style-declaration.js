// HTML "style" inline CSS property handling
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style

// style="border: 0px; clip: rect(0px, 0px, 0px, 0px); height: 1px; margin: -1px; overflow: hidden; padding: 0px; position: absolute; width: 1px; border-bottom-color: hotpink; -moz-animation-iteration-count: 1"
const ELEMENT = Symbol( "element" );

// Conversions between kebab-case and camelCase forms of the CSS property name
// The rules are as described in https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style
function  prop2dom(cssPropertyName) {
	return cssPropertyName.replace(/-[a-z]/g, (r) => r.toUpperCase().substr(1));
}
// Note: dom2prop(dom2prop('camelCaseProp')) will work as expected so it's always safe
// to use dom2prop to canonicalize property names in their kebab case (dashed) form
function dom2prop(cssStyleDeclarationPropertyName) {
	return cssStyleDeclarationPropertyName.replace(/[A-Z]/g, (r) => '-'+r.toLowerCase());
}
// In theory a valid CSS property (identifier) is more permissive, but in practice this covers all property names in use
function valid(propertyName) {
	if (typeof propertyName !== 'string') return false;
	// Valid css property name
	if (propertyName.match(/^\-?[a-z_-]*[a-z]$/)) return true;
	// Valid custom property
	if (propertyName.match(/^\-\-[A-Za-z_-]*[A-Za-z0-9]$/)) return true;
	// Valid DOM-style (camel case) property
	if (propertyName.match(/^[a-zA-Z]+$/)) return true;

	return false;
}

// Parses a style="" attribute into a map of property-value pairs for easier alterations
function styleToMap(styleString = "") {
	return new Map(styleString.split(/\s*;\s*/g).filter(s => s.length).map(sd => sd.trim().match(/^([a-z-]+)\s*:\s*(.*)$/).slice(1)));
}

// Stringifies a map of property-value pairs back into a style="" inline style attribute value
function mapToStyle(styleMap) {
	return Array.from(styleMap?.entries() ?? []).map(e => e.join(': ')).join('; ');
}

export function createInlineStyle( elem )
{
	const styleObject = {
		[ELEMENT]: elem
	};

	const styleProxy = new Proxy(styleObject, {
		get(target, name) {
			if (name === ELEMENT) return elem;
			if (!valid(name)) return undefined;

			const prop = dom2prop(name);

			return styleToMap(elem.attributes.style).get(prop);
		},
		set(target, name, value) {
			if (!valid(name)) return;

			const prop = dom2prop(name);
			const map = styleToMap(elem.attributes.style);

			elem.attributes.style = mapToStyle(map.set(prop, value));
		},
		deleteProperty(target, name) {
			if (!valid(name)) return;

			const prop = dom2prop(name);
			const map = styleToMap(elem.attributes.style);

			elem.attributes.style = mapToStyle(map.delete(prop));
		},
	});

	return styleProxy;
}

export function updateInlineStyle( style, value )
{
	// Parse and re-stringify value to validate format
	const styleValue = mapToStyle(styleToMap(value));

	style[ELEMENT].attributes.style = styleValue;
}

export default class CSSStyleDeclaration {
	constructor()
	{
		throw new Error( "Cannot directly instantiate CSSStyleDeclaration." );
	}
}
