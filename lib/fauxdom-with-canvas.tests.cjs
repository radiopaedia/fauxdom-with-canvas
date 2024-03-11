'use strict';

const reCache = {},
	whitespaces = {},
	isWhiteSpace = Object.prototype.hasOwnProperty.bind( whitespaces ),
	EOF = null;

class Lexer
{
	constructor( str )
	{
		this.index = 0;
		this.str = str;
		this.scanChar = this.str[this.index];
		
		if ( !isWhiteSpace( "\x20" ) )
		{
			// Unicode C0 & C1 control characters are treated as whitespace, along with the ASCII space character.
			for ( let i = 0; i <= 0x20; i++ )
				whitespaces[String.fromCharCode( i )] = null;
			for ( let i = 0x80; i <= 0x9f; i++ )
				whitespaces[String.fromCharCode( i )] = null;
		}
	}
	
	isWhiteSpace( theChar )
	{
		return (theChar !== EOF && isWhiteSpace( theChar ));
	}
	
	goToString( toChar, caseSensitive )
	{
		if ( caseSensitive !== false )
			this.index = this.str.indexOf( toChar, this.index );
		else
		{
			if ( !reCache[toChar] )
				reCache[toChar] = new RegExp( toChar, "ig" );
			
			reCache[toChar].lastIndex = this.index;
			
			const match = reCache[toChar].exec( this.str );
			if ( match ) this.index = match.index;
			else this.index = -1;
		}
		
		if ( this.index > -1 )
			this.scanChar = this.str[this.index];
		else
		{
			this.index = this.str.length;
			this.scanChar = EOF;
		}
	}
	
	goToIndex( index )
	{
		this.scanChar = this.str[this.index = index];
	}
	
	advance( amount )
	{
		this.index += amount;
		if ( this.index > this.str.length )
		{
			this.index = this.str.length;
			return (this.scanChar = EOF);
		}
		return (this.scanChar = this.str[this.index]);
	}
	
	match( str, caseSensitive )
	{
		var chunk = this.str.substr( this.index, str.length );
		if ( caseSensitive === false )
		{
			str = str.toLowerCase();
			chunk = chunk.toLowerCase();
		}
		if ( chunk === str )
		{
			this.index += str.length-1;
			this.getNextChar();
			return true;
		}
		return false;
	}
	
	peek()
	{
		return this.str[this.index + 1];
	}
	
	getChar()
	{
		return this.scanChar;
	}
	
	getNextChar()
	{
		if ( this.index + 1 < this.str.length )
			return (this.scanChar = this.str[++this.index]);
		else
		{
			this.index = this.str.length;
			return (this.scanChar = EOF);
		}
	}
	
	getNextAfterWhiteSpace()
	{
		var theChar;
		do theChar = this.getNextChar();
		while ( theChar !== EOF && isWhiteSpace( theChar ) )
		return theChar;
	}
	
	skipWhiteSpace()
	{
		var theChar = this.scanChar;
		
		while ( theChar !== EOF && isWhiteSpace( theChar ) )
			theChar = this.getNextChar();
		
		return this.scanChar;
	}
}

// Implementation of the HTML EventTarget API
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
const EVENT_LISTENERS = Symbol("event-listeners");

class EventTarget {
	addEventListener( eventType, callback, useCaptureOrOptions )
	{
		// Lazily create the event listener map on the node
		this[EVENT_LISTENERS] = this[EVENT_LISTENERS] ?? new Map();

		// Registered listeners for this eventType
		let listeners = this[EVENT_LISTENERS].get(eventType);
		if (!listeners) {
			listeners = [];
			this[EVENT_LISTENERS].set(eventType, listeners);
		}

		// Capturing and non-capturing listeners need to be removed separately
		// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#sect1
		// TODO: handle other options? (once, passive, signal)
		// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#options
		listeners.push({
			callback,
			capturing: useCaptureOrOptions === true || !!useCaptureOrOptions?.capture,
			options: typeof useCaptureOrOptions === 'object' ? useCaptureOrOptions : { capture: !!useCaptureOrOptions }
		});
	}

	removeEventListener( eventType, callback, useCaptureOrOptions )
	{
		// There aren't any listeners registered
		if (!this[EVENT_LISTENERS]) return;

		// Registered listeners for this eventType
		let listeners = this[EVENT_LISTENERS].get(eventType);
		if (!listeners) return;

		// Extract the boolean capture value from the different possible argument formats
		const captureSetting = !!(typeof useCaptureOrOptions === 'object' ? useCaptureOrOptions.capture : useCaptureOrOptions);

		// Find the indexes of listeners we want to remove, then remove them from the listeners array
		// A listener must match the callback object (function) and capture setting (true/false)
		// We remove the elements in reverse index order to avoid the indexes changing
		listeners.map((listener, i) => {
			return listener.callback === callback && listener.capturing === captureSetting ? i : undefined
		})
			.reverse()
			.forEach(i => {
				if (i !== undefined) listeners.splice(i, 1);
			});
	}

	dispatchEvent( event )
	{
		let notCancelled = true;

		// There aren't any listeners registered
		if (!this[EVENT_LISTENERS]) return notCancelled;

		// List active listeners
		const listeners = this[EVENT_LISTENERS].get(event.type) ?? [];

		// Dispatch the event for every listener
		// TODO: handle 'once', 'passive' options, bubbling & capture
		// https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase
		listeners?.forEach(({ callback }) => {
			callback(event);

			// The event has been canceled through preventDefault()
			if (event.defaultPrevented) notCancelled = false;
		});

		return notCancelled;
	}

}

const DOCTYPE = Symbol( "doctype" ),
	HEAD = Symbol( "head" ),
	BODY = Symbol( "body" ),
	DOCUMENT_ELEMENT = Symbol( "documentElement" ),
	NODE_TYPE = Symbol( "nodeType" ),
	PARENT_NODE = Symbol( "parentNode" ),
	OWNER = Symbol( "ownerDocument" ),
	TAG_NAME = Symbol( "tagName" ),
	PARSER_OPTIONS = Symbol( "parserOptions" ),
	
	spacesRE = /\s+/g,
	
	nodeTypes = {
		ELEMENT_NODE: 1,
		//ATTRIBUTE_NODE: 2, // Unused
		TEXT_NODE: 3,
		CDATA_SECTION_NODE: 4,
		//ENTITY_REFERENCE_NODE: 5, // Unused, historical
		//ENTITY_NODE: 6, // Unused, historical
		PROCESSING_INSTRUCTION_NODE: 7,
		COMMENT_NODE: 8,
		DOCUMENT_NODE: 9,
		DOCUMENT_TYPE_NODE: 10,
		DOCUMENT_FRAGMENT_NODE: 11,
		//NOTATION_NODE: 12 // Unused, historical
	},
	
	selfClosingTags = {
		"AREA": true,
		"BASE": true,
		"BR": true,
		"COL": true,
		"COMMAND": true,
		"EMBED": true,
		"HR": true,
		"IMG": true,
		"INPUT": true,
		"KEYGEN": true,
		"LINK": true,
		"META": true,
		"PARAM": true,
		"SOURCE": true,
		"TRACK": true,
		"WBR": true
	};

function setupDocument( document )
{
	var firstElementPosition = -1,
		documentElementPosition = -1,
		documentTagName = "HTML";
	
	if ( document[DOCTYPE] && document[PARSER_OPTIONS].allowCustomRootElement )
		documentTagName = document[DOCTYPE].name.toUpperCase();
	
	for ( let i = 0, l = document.childNodes.length; i < l; i++ )
		if ( document.childNodes[i].tagName === documentTagName )
		{
			documentElementPosition = i;
			
			document[NODE_TYPE] = nodeTypes.DOCUMENT_NODE;
			document[DOCUMENT_ELEMENT] = document.childNodes[i];
			document[HEAD] = document[BODY] = null;
			for ( let k = 0; k < document[DOCUMENT_ELEMENT].childNodes.length; k++ )
			{
				const node = document[DOCUMENT_ELEMENT].childNodes[k];
				
				switch ( node.tagName )
				{
					case "HEAD": document[HEAD] = node; break;
					
					case "BODY":
					case "FRAMESET":
						document[BODY] = node; break;
				}
				
				if ( document[HEAD] && document[BODY] ) break;
			}
			
			if ( firstElementPosition !== -1 )
			{
				const newParent = document[HEAD] || document[BODY] || document[DOCUMENT_ELEMENT],
					count = documentElementPosition - firstElementPosition;
				for ( let k = firstElementPosition; k < documentElementPosition; k++ )
					setNodeParent( document.childNodes[k], newParent );
				newParent.childNodes.splice( 0, 0, ...document.childNodes.splice( firstElementPosition, count ) );
				documentElementPosition -= count;
				l -= count;
			}
			
			if ( documentElementPosition < l - 1 )
			{
				const newParent = document[BODY] || document[HEAD] || document[DOCUMENT_ELEMENT];
				for ( let k = documentElementPosition + 1; k < l; k++ )
					setNodeParent( document.childNodes[k], newParent );
				newParent.childNodes.splice( newParent.childNodes.length, 0, ...document.childNodes.splice( documentElementPosition + 1 ) );
			}
			
			break;
		}
		else if ( firstElementPosition === -1 && document.childNodes[i].nodeType === nodeTypes.ELEMENT_NODE )
			firstElementPosition = i;
}

function getDocument( node )
{
	const owner = node[OWNER] || node.getRootNode();
	if ( owner[NODE_TYPE] === nodeTypes.DOCUMENT_NODE || owner[NODE_TYPE] === nodeTypes.DOCUMENT_FRAGMENT_NODE )
		return owner;
	return null;
}

function detachNodes( nodes )
{
	if ( nodes && nodes.length > 0 ) for ( let i = 0; i < nodes.length; i++ )
		setNodeParent( nodes[i], null );
}

function setNodeParent( node, parent )
{
	const owner = (parent !== null ? getDocument( parent ) : null);
	
	if ( node[OWNER] !== owner && node.hasChildNodes() )
		node.forEach( node => {node[OWNER] = owner;}, null );
	
	node[PARENT_NODE] = parent;
	node[OWNER] = owner;
}

function globalizeRegExp( re )
{
	if ( !re.global )
	{
		let flags = re.flags;
		re = new RegExp( re.source, flags +"g" );
	}
	return re;
}

const ELEMENT$1 = Symbol( "element" ),
	LENGTH = Symbol( "length" ),
	
	validClassTokenRE = /^\S+$/,
	
	indexOf = Array.prototype.indexOf,
	join = Array.prototype.join,
	splice = Array.prototype.splice;

function createTokenList( elem )
{
	const list = Object.create( DOMTokenList.prototype );
	
	list[LENGTH] = 0;
	list[ELEMENT$1] = elem;
	const className = elem.className;
	if ( className ) list.value = className;
	
	return list;
}

class DOMTokenList
{
	constructor()
	{
		throw new Error( "Cannot directly instantiate DOMTokenList." );
	}
	
	get length() {return this[LENGTH]}
	set length( val ) {}
	
	get value()
	{
		return join.call( this, " " );
	}
	set value( val )
	{
		if ( this[LENGTH] > 0 )
			for ( let k in this ) if ( this.hasOwnProperty( k ) && isFinite( k ) )
				delete this[k];
		this[LENGTH] = 0;
		
		if ( typeof val === "string" )
			this.add.apply( this, val.split( spacesRE ) );
		else delete this[ELEMENT$1].attributes.class;
	}
	
	add()
	{
		for ( let i = 0; i < arguments.length; i++ )
			if ( indexOf.call( this, arguments[i] ) === -1 && this.supports( arguments[i] ) )
				this[this[LENGTH]++] = arguments[i];
		this[ELEMENT$1].attributes.class = this.value;
	}
	
	remove()
	{
		for ( let i = 0, idx; i < arguments.length; i++ )
		{
			idx = indexOf.call( this, arguments[i] );
			if ( idx !== -1 )
			{
				splice.call( this, idx, 1 );
				this[LENGTH]--;
			}
		}
		this[ELEMENT$1].attributes.class = this.value;
	}
	
	item( v )
	{
		if ( typeof v === "number" && v >= 0 && v < this[LENGTH] )
			return this[v];
	}
	
	toggle( token, force )
	{
		var exists = false;
		if ( this.supports( token ) )
		{
			let idx = indexOf.call( this, token );
			if ( idx !== -1 && force !== true )
			{
				splice.call( this, idx, 1 );
				this[LENGTH]--;
			}
			else if ( force !== false )
			{
				exists = true;
				if ( idx === -1 )
					this[this[LENGTH]++] = token;
			}
			this[ELEMENT$1].attributes.class = this.value;
		}
		return exists;
	}
	
	contains( token )
	{
		return (indexOf.call( this, token ) !== -1);
	}
	
	replace( token, newToken )
	{
		var idx = indexOf.call( this, token );
		if ( idx >= 0 && this.supports( newToken ) )
		{
			if ( indexOf.call( this, newToken ) === -1 )
				this[idx] = newToken;
			else
			{
				splice.call( this, idx, 1 );
				this[LENGTH]--;
			}
			this[ELEMENT$1].attributes.class = this.value;
			return true;
		}
		return false;
	}
	
	supports( token )
	{
		if ( token && typeof token === "string" )
			return token.match( validClassTokenRE );
		return false;
	}
}

// HTML "style" inline CSS property handling
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style

// style="border: 0px; clip: rect(0px, 0px, 0px, 0px); height: 1px; margin: -1px; overflow: hidden; padding: 0px; position: absolute; width: 1px; border-bottom-color: hotpink; -moz-animation-iteration-count: 1"
const ELEMENT = Symbol( "element" );
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

function createInlineStyle( elem )
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
			// Fail silently (return truthy value to avoid showing an TypeError)
			if (!valid(name)) return true;

			const prop = dom2prop(name);
			const map = styleToMap(elem.attributes.style);

			elem.attributes.style = mapToStyle(map.set(prop, value));
			return true;
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

function updateInlineStyle( style, value )
{
	// Parse and re-stringify value to validate format
	const styleValue = mapToStyle(styleToMap(value));

	style[ELEMENT].attributes.style = styleValue;
}

const newLinesRE = /\r\n|\r|\f/g,
	anbSyntaxRE = /\(\s*(even|odd|(?:(?:([+-]?\d*)n)\s*(?:([+-])\s*(\d+))?|([+-]?\d+)))\s*/g;

const ParamTypes = {
	Selectors: 0,
	Identifier: 1,
	Iterator: 2,
	IteratorOf: 3
};

const paramExpectations = {
	"is": ParamTypes.Selectors,
	"not": ParamTypes.Selectors,
	"where": ParamTypes.Selectors, // Alias of :is()
	"has": ParamTypes.Selectors,
	
	"lang": ParamTypes.Identifier, // Not implementing
	"dir": ParamTypes.Identifier, // Not implementing
	
	"nth-child": ParamTypes.IteratorOf,
	"nth-last-child": ParamTypes.IteratorOf,
	
	"nth-of-type": ParamTypes.Iterator,
	"nth-last-of-type": ParamTypes.Iterator,
	"nth-col": ParamTypes.Iterator, // Not implementing
	"nth-last-col": ParamTypes.Iterator, // Not implementing
};

// https://drafts.csswg.org/selectors-4/

function parseSelector( selector )
{
	return parseSelectorList( new Lexer( selector.replace( newLinesRE, "\n" ) ) );
}

function parseSelectorList( lexer, terminator = EOF, relative = false )
{
	var theChar = lexer.skipWhiteSpace(),
		selector = {},
		compound = [],
		complex = [compound],
		ast = [complex];
	
	while ( theChar !== EOF && theChar !== terminator )
	{
		switch ( theChar )
		{
			case "*": // https://drafts.csswg.org/selectors-4/#universal-selector
				if ( compound.length > 0 )
					throw syntaxError( "Universal selectors must come before all other simple selectors.", lexer );
				selector.type = "universal";
				compound.push( selector );
				selector = {};
				break;
				
			case "#":
			case ".":
			{
				lexer.getNextChar();
				const name = parseIdentifier( lexer );
				if ( !name ) throw syntaxError( "Expected an identifier.", lexer );
				
				selector.type = (theChar === "#" ? "id" : "class");
				selector.name = name;
				
				compound.push( selector );
				selector = {};
				break;
			}
			case "[": // https://drafts.csswg.org/selectors-4/#attribute-selectors
			{
				lexer.getNextAfterWhiteSpace();
				const name = parseIdentifier( lexer );
				if ( !name ) throw syntaxError( "Expected an identifier.", lexer );
				
				selector.type = "attr";
				selector.name = name;
				selector.comparison = "=";
				selector.value = true;
				selector.ignoreCase = false;
				
				if ( (theChar = lexer.getNextAfterWhiteSpace()) !== "]" )
				{
					switch ( theChar )
					{
						case "=": break;
						
						case "~":
						case "|":
						case "^":
						case "$":
						case "*":
							if ( lexer.peek() !== "=" ) throw syntaxError( "Expected '='.", lexer, 1 );
							selector.comparison = theChar + selector.comparison;
							lexer.getNextChar();
							break;
							
						default: throw syntaxError( "Unexpected character '"+ (theChar === EOF ? "END_OF_INPUT" : theChar) +"'.", lexer );
					}
					
					theChar = lexer.getNextAfterWhiteSpace();
					if ( theChar === "'" || theChar === '"' )
					{
						// https://drafts.csswg.org/css-syntax-3/#consume-string-token
						const quote = theChar;
						
						selector.value = "";
						theChar = lexer.getNextChar();
						
						while ( theChar !== EOF && theChar !== quote && theChar !== "\n" )
						{
							if ( theChar === "\\" )
							{
								selector.value += parseEscapedCodePoint( lexer );
								theChar = lexer.getChar();
							}
							else
							{
								selector.value += theChar;
								theChar = lexer.getNextChar();
							}
						}
					}
					else
					{
						const name = parseIdentifier( lexer );
						if ( !name ) throw syntaxError( "Expected an identifier.", lexer );
						selector.value = name;
					}
					
					if ( lexer.getNextAfterWhiteSpace() !== "]" )
					{
						const ident = parseIdentifier( lexer );
						if ( ident === "i" || ident === "I" )
							selector.ignoreCase = true;
						else if ( ident === "s" || ident === "S" )
							selector.ignoreCase = false;
						else if ( ident )
							throw syntaxError( "Unexpected identifier '"+ ident +"'.", lexer, -ident.length + 1 );
						
						if ( lexer.getNextAfterWhiteSpace() !== "]" )
							throw syntaxError( "Expected ']'.", lexer, -1 + ident.length );
					}
				}
				
				compound.push( selector );
				selector = {};
				break;
			}
			case ":":
			{
				lexer.getNextChar();
				if ( lexer.match( ":" ) ) // https://drafts.csswg.org/selectors-4/#pseudo-elements
				{
					const name = parseIdentifier( lexer );
					if ( !name ) throw syntaxError( "Expected a pseudo-element name.", lexer );
					
					selector.type = "pseudo-element";
					selector.name = name;
				}
				else // https://drafts.csswg.org/selectors-4/#pseudo-classes
				{
					const name = parseIdentifier( lexer );
					if ( !name ) throw syntaxError( "Expected a pseudo-class name.", lexer );
					
					selector.type = "pseudo-class";
					selector.name = name;
					
					const paramType = paramExpectations[name];
					if ( paramType != null )
					{
						selector.type = "pseudo-fn";
						
						if ( lexer.getNextChar() !== "(" )
							throw syntaxError( "Expected '('.", lexer );
						
						switch ( paramType )
						{
							case ParamTypes.IteratorOf: // https://drafts.csswg.org/selectors-4/#nth-child-pseudo
							case ParamTypes.Iterator: // https://drafts.csswg.org/css-syntax-3/#anb-microsyntax
								let A = 0, B = 0, ofSelector;
								
								anbSyntaxRE.lastIndex = lexer.index;
								const match = anbSyntaxRE.exec( lexer.str );
								if ( !match ) throw syntaxError( "Invalid parameter.", lexer, 1 );
								lexer.advance( match[0].length );
								
								if ( paramType === ParamTypes.IteratorOf )
								{
									lexer.skipWhiteSpace();
									const savedIdx = lexer.index;
									if ( parseIdentifier( lexer ).toLowerCase() === "of" )
									{
										const chr = lexer.getNextChar();
										if ( chr !== ")" && !lexer.isWhiteSpace( chr ) )
											throw syntaxError( "Expected whitespace.", lexer );
										
										ofSelector = parseSelectorList( lexer, ")" );
										if ( !(ofSelector instanceof Array) || ofSelector.length === 0 )
											throw syntaxError( "Expected at least one selector.", lexer );
									}
									else lexer.goToIndex( savedIdx );
								}
								
								if ( lexer.skipWhiteSpace() !== ")" )
									throw syntaxError( "Expected ')'.", lexer );
								
								if ( match[1] === "even" || match[1] === "odd" )
								{
									A = 2;
									if ( match[1] === "odd" ) B = 1;
								}
								else if ( match[5] ) // We found just an integer.
									B = parseInt( match[5], 10 );
								else
								{
									if ( match[2] === "-" ) A = -1;
									else if ( !match[2] || match[2] === "+" ) A = 1;
									else A = parseInt( match[2], 10 );
									
									if ( match[3] )
										B = parseInt( match[3] + match[4], 10 );
								}
								
								selector.params = [A, B];
								if ( ofSelector ) selector.params.push( ofSelector );
								break;
								
							case ParamTypes.Selectors:
								lexer.getNextChar();
								selector.params = parseSelectorList( lexer, ")", true );
								if ( selector.params.length === 0 )
									throw syntaxError( "Expected at least one selector.", lexer );
								break;
								
							case ParamTypes.Identifier:
								if ( isIdentifierStart( lexer.getNextAfterWhiteSpace() ) )
									selector.params = [parseIdentifier( lexer )];
								else throw syntaxError( "Expected an identifier.", lexer );
								lexer.getNextChar();
								break;
						}
						if ( lexer.skipWhiteSpace() !== ")" ) throw syntaxError( "Expected ')'.", lexer );
					}
					// Having this branch here allows custom functional pseudo-classes with
					// these names to be defined by the user.
					else if ( name === "before" || name === "after" || name === "first-line" || name === "first-letter" )
						selector.type = "pseudo-element";
				}
				
				compound.push( selector );
				selector = {};
				break;
			}
			
			// https://drafts.csswg.org/selectors-4/#combinators
			case "+":
			case ">":
			case "~":
				if ( compound.length === 0 )
				{
					if ( complex.length === 1 )
					{
						if ( relative )
							complex.unshift( [{type: "pseudo-class", name: "scope"}] );
						else throw syntaxError( "Absolute selectors cannot start with a combinator.", lexer );
					}
					else if ( typeof complex[complex.length - 2] === "string" )
						throw syntaxError( "Cannot have multiple combinators in a row.", lexer );
					complex.splice( complex.length - 1, 0, theChar );
				}
				else complex.push( theChar, compound = [] );
				break;
				
			case ",":
				if ( compound.length === 0 )
				{
					if ( complex.length > 1 )
					{
						complex.pop();
						if ( typeof complex[complex.length - 1] === "string" )
							throw syntaxError( "Complex selectors are not allowed to end with a combinator.", lexer, -1 );
						ast.push( complex = [compound] );
					}
				}
				else ast.push( complex = [compound = []] );
				lexer.skipWhiteSpace();
				break;
				
			default:
				if ( lexer.isWhiteSpace( theChar ) )
				{
					if ( compound.length > 0 )
						complex.push( compound = [] );
					lexer.skipWhiteSpace();
					lexer.advance( -1 );
				}
				else if ( isIdentifierStart( theChar ) )
				{
					if ( compound.length > 0 )
						throw syntaxError( "Type (tag name) selectors must come before all other simple selectors.", lexer );
					
					selector.type = "type";
					// We'll always have a valid identifier here, thanks to
					// the isIdentifierStart() above.
					selector.name = parseIdentifier( lexer ).toUpperCase();
					
					compound.push( selector );
					selector = {};
				}
				else throw syntaxError( "Unexpected character '"+ theChar +"'.", lexer );
		}
		theChar = lexer.getNextChar();
	}
	
	if ( compound.length === 0 )
	{
		if ( complex.length === 1 )
		{
			ast.pop();
			complex = ast[ast.length - 1];
		}
		else complex.pop();
	}
	
	if ( complex && typeof complex[complex.length - 1] === "string" )
		throw syntaxError( "Complex selectors are not allowed to end with a combinator.", lexer, -1 );
	
	return ast;
}

function syntaxError( message, lexer, offset = 0 )
{
	var error = new SyntaxError( message ),
		column = lexer.index + offset;
	error.stack = "SyntaxError: "+ message +"\n\n"+ lexer.str +"\n"+ " ".repeat( column ) +"^\n    at index "+ column;
	return error;
}

// https://drafts.csswg.org/css-syntax-3/#consume-name
function parseIdentifier( lexer )
{
	var name = "",
		theChar = lexer.getChar();
	
	if ( isIdentifierStart( theChar ) )
	{
		do
		{
			if ( theChar === "\\" )
			{
				name += parseEscapedCodePoint( lexer );
				theChar = lexer.getChar();
			}
			else
			{
				name += theChar;
				theChar = lexer.getNextChar();
			}
		}
		while ( theChar !== EOF && (isIdentifierStart( theChar ) || (theChar >= "0" && theChar <= "9") || theChar === "-") )
		lexer.advance( -1 );
	}
	
	return name;
}

// https://drafts.csswg.org/css-syntax-3/#consume-escaped-code-point
function parseEscapedCodePoint( lexer )
{
	var theChar = lexer.getNextChar();
	
	if ( isHexDigit( theChar ) )
	{
		let codePoint = "";
		
		for ( let i = 5; i >= 0 && isHexDigit( theChar ); i-- )
		{
			codePoint += theChar;
			theChar = lexer.getNextChar();
		}
		
		if ( lexer.isWhiteSpace( theChar ) )
			lexer.getNextChar();
		
		codePoint = parseInt( codePoint, 16 ) | 0;
		if ( codePoint === 0 ||
			(codePoint >= 0xD800 && codePoint <= 0xDFFF) || // Surrogate
			codePoint > 0x10FFFF ) // Maximum allowed code point
				return "\uFFFD";
		return String.fromCodePoint( codePoint );
	}
	else if ( theChar === EOF ) return "\uFFFD";
	
	lexer.getNextChar();
	return theChar;
}

function isHexDigit( theChar )
{
	return (theChar !== EOF && ((theChar >= "0" && theChar <= "9") || (theChar >= "A" && theChar <= "F") || (theChar >= "a" && theChar <= "f")));
}

function isIdentifierStart( theChar )
{
	return ((theChar >= "A" && theChar <= "Z") || (theChar >= "a" && theChar <= "z") || theChar === "_" || theChar >= "\u0080" || theChar === "\\");
}

const STATE_INITIAL = 0,
	STATE_DESCENDANT_COMBINATOR = 1,
	STATE_CHILD_COMBINATOR = 2,
	STATE_NEXT_SIBLING_COMBINATOR = 3,
	STATE_SUBSEQUENT_SIBLING_COMBINATOR = 4,
	
	stateTransitions = {
		">": STATE_CHILD_COMBINATOR,
		"+": STATE_NEXT_SIBLING_COMBINATOR,
		"~": STATE_SUBSEQUENT_SIBLING_COMBINATOR
	},
	
	pseudoProcs = {
		is( scope, node, selectors )
		{
			return matchesSelectorList( scope, node, selectors );
		},
		not( scope, node, selectors )
		{
			return !matchesSelectorList( scope, node, selectors );
		},
		has( scope, node, selectors )
		{
			var has = false;
			
			for ( let i = 0; i < selectors.length; i++ )
				if ( selectors[i][0] instanceof Array && isRelativeSimpleSelector( selectors[i][0][0] ) )
				{
					has = matchesSelectorList( node, node, selectors, true );
					break;
				}
			
			if ( !has && node.childNodes.length > 0 ) node.forEach( elem =>
			{
				if ( matchesSelectorList( node, elem, selectors ) )
				{
					has = true;
					return false;
				}
			} );
			
			return has;
		},
		
		["nth-child"]( scope, node, args )
		{
			const parent = node[PARENT_NODE],
				nodes = parent.childNodes,
				iter = new ChildIterator( args[0], args[1] );
			for ( let i = 0; i < nodes.length; i++ )
				if ( nodes[i][NODE_TYPE] === Node.ELEMENT_NODE )
				{
					if ( !args[2] || matchesSelectorList( parent, nodes[i], args[2] ) )
					{
						const iterMatch = iter.next();
						if ( nodes[i] === node )
							return iterMatch;
					}
				}
			return false;
		},
		["nth-last-child"]( scope, node, args )
		{
			const parent = node[PARENT_NODE],
				nodes = parent.childNodes,
				iter = new ChildIterator( args[0], args[1] );
			for ( let i = nodes.length - 1; i >= 0; i-- )
				if ( nodes[i][NODE_TYPE] === Node.ELEMENT_NODE )
				{
					if ( !args[2] || matchesSelectorList( parent, nodes[i], args[2] ) )
					{
						const iterMatch = iter.next();
						if ( nodes[i] === node )
							return iterMatch;
					}
				}
			return false;
		},
		
		["nth-of-type"]( scope, node, args )
		{
			const nodes = node[PARENT_NODE].childNodes,
				iter = new ChildIterator( args[0], args[1] ),
				tagName = node[TAG_NAME];
			for ( let i = 0; i < nodes.length; i++ )
				if ( nodes[i][TAG_NAME] === tagName )
				{
					const iterMatch = iter.next();
					if ( nodes[i] === node )
						return iterMatch;
				}
			
			// For code here to be reachable, 'node' would have to not be inside
			// its own parent, or the above test of 'nodes[i] === node' would
			// have to be skippable. Since neither of these scenarios is
			// possible (for now), an explicit 'return false' here never
			// executes and isn't needed.
		},
		["nth-last-of-type"]( scope, node, args )
		{
			const nodes = node[PARENT_NODE].childNodes,
				iter = new ChildIterator( args[0], args[1] ),
				tagName = node[TAG_NAME];
			for ( let i = nodes.length - 1; i >= 0; i-- )
				if ( nodes[i][TAG_NAME] === tagName )
				{
					const iterMatch = iter.next();
					if ( nodes[i] === node )
						return iterMatch;
				}
			
			// For code here to be reachable, 'node' would have to not be inside
			// its own parent, or the above test of 'nodes[i] === node' would
			// have to be skippable. Since neither of these scenarios is
			// possible (for now), an explicit 'return false' here never
			// executes and isn't needed.
		}
	},
	pseudoClasses = {
		scope( scope, node )
		{
			return (node === scope);
		},
		
		enabled( scope, node )
		{
			switch ( node[TAG_NAME] )
			{
				case "BUTTON":
				case "INPUT":
				case "SELECT":
				case "TEXTAREA":
				case "OPTGROUP":
				case "OPTION":
				case "FIELDSET":
					return !node.hasAttribute( "disabled" );
			}
			return false;
		},
		disabled( scope, node )
		{
			switch ( node[TAG_NAME] )
			{
				case "BUTTON":
				case "INPUT":
				case "SELECT":
				case "TEXTAREA":
				case "OPTGROUP":
				case "OPTION":
				case "FIELDSET":
					return node.hasAttribute( "disabled" );
			}
			return false;
		},
		
		checked( scope, node )
		{
			if ( node[TAG_NAME] === "INPUT" )
			{
				const type = node.getAttribute( "type" );
				if ( type === "checkbox" || type === "radio" )
					return node.hasAttribute( "checked" );
			}
			else if ( node[TAG_NAME] === "OPTION" )
				return node.hasAttribute( "selected" );
			return false;
		},
		
		required( scope, node )
		{
			switch ( node[TAG_NAME] )
			{
				case "INPUT":
				case "SELECT":
				case "TEXTAREA":
					return node.hasAttribute( "required" );
			}
			return false;
		},
		optional( scope, node )
		{
			switch ( node[TAG_NAME] )
			{
				case "INPUT":
				case "SELECT":
				case "TEXTAREA":
					return !node.hasAttribute( "required" );
			}
			return false;
		},
		
		root( scope, node )
		{
			const document = getDocument( scope );
			return (!!document && document.documentElement === node);
		},
		empty( scope, node )
		{
			return (node.childNodes.length === 0);
		},
		
		["first-child"]( scope, node )
		{
			const nodes = node[PARENT_NODE].childNodes;
			for ( let i = 0; i < nodes.length; i++ )
				if ( nodes[i][NODE_TYPE] === Node.ELEMENT_NODE )
					return (nodes[i] === node);
			
			// For code here to be reachable, we would have to be looking at an
			// ELEMENT_NODE node inside a parent that has no ELEMENT_NODE nodes.
			// Therefore, an explicit 'return false' here never executes and
			// isn't needed.
		},
		["last-child"]( scope, node )
		{
			const nodes = node[PARENT_NODE].childNodes;
			for ( let i = nodes.length - 1; i >= 0; i-- )
				if ( nodes[i][NODE_TYPE] === Node.ELEMENT_NODE )
					return (nodes[i] === node);
			
			// For code here to be reachable, we would have to be looking at an
			// ELEMENT_NODE node inside a parent that has no ELEMENT_NODE nodes.
			// Therefore, an explicit 'return false' here never executes and
			// isn't needed.
		},
		["only-child"]( scope, node )
		{
			const nodes = node[PARENT_NODE].childNodes;
			let first, last;
			for ( let s = 0, e = nodes.length - 1; e >= 0 && !(first && last); s++, e-- )
			{
				if ( !first && nodes[s][NODE_TYPE] === Node.ELEMENT_NODE )
					first = nodes[s];
				if ( !last && nodes[e][NODE_TYPE] === Node.ELEMENT_NODE )
					last = nodes[e];
			}
			return (first === last && first === node);
		},
		
		["first-of-type"]( scope, node )
		{
			const nodes = node[PARENT_NODE].childNodes,
				tagName = node[TAG_NAME];
			for ( let i = 0; i < nodes.length; i++ )
				if ( nodes[i][TAG_NAME] === tagName )
					return (nodes[i] === node);
			
			// For code here to be reachable, we would have to be looking at an
			// ELEMENT_NODE node inside a parent that has no ELEMENT_NODE nodes.
			// Therefore, an explicit 'return false' here never executes and
			// isn't needed.
		},
		["last-of-type"]( scope, node )
		{
			const nodes = node[PARENT_NODE].childNodes,
				tagName = node[TAG_NAME];
			for ( let i = nodes.length - 1; i >= 0; i-- )
				if ( nodes[i][TAG_NAME] === tagName )
					return (nodes[i] === node);
			
			// For code here to be reachable, we would have to be looking at an
			// ELEMENT_NODE node inside a parent that has no ELEMENT_NODE nodes.
			// Therefore, an explicit 'return false' here never executes and
			// isn't needed.
		},
		["only-of-type"]( scope, node )
		{
			const nodes = node[PARENT_NODE].childNodes,
				tagName = node[TAG_NAME];
			let first, last;
			for ( let s = 0, e = nodes.length - 1; e >= 0 && !(first && last); s++, e-- )
			{
				if ( !first && nodes[s][TAG_NAME] === tagName )
					first = nodes[s];
				if ( !last && nodes[e][TAG_NAME] === tagName )
					last = nodes[e];
			}
			return (first === last && first === node);
		}
	};

pseudoProcs.where = pseudoProcs.is;

function querySelector( scope, selector, all )
{
	const selectors = parseSelector( selector ),
		result = [];
	
	scope.forEach( node =>
	{
		if ( matchesSelectorList( scope, node, selectors ) )
		{
			result.push( node );
			if ( !all ) return false;
		}
	} );
	
	return (all ? result : (result[0] || null));
}

function closest( scope, selector )
{
	const selectors = parseSelector( selector );
	let node = scope;
	
	while ( node != null && node[NODE_TYPE] === Node.ELEMENT_NODE )
	{
		if ( matchesSelectorList( scope, node, selectors ) )
			return node;
		node = node[PARENT_NODE];
	}
	
	return null;
}

function matches( scope, selector )
{
	return matchesSelectorList( scope, scope, parseSelector( selector ) );
}

function matchesSelectorList( scope, node, selectors, relative = false )
{
	var currentNode;
	
List:
	for ( let i = 0; i < selectors.length; i++ )
	{
		const complex = selectors[i];
		let state = STATE_INITIAL;
		
		if ( relative && complex[0] instanceof Array && !isRelativeSimpleSelector( complex[0][0] ) )
			continue;
		
		currentNode = node;
		
	Complex:
		for ( let x = (relative ? 0 : complex.length - 1);
			(relative ? x < complex.length : x >= 0);
			(relative ? x++ : x--) )
		{
			if ( stateTransitions.hasOwnProperty( complex[x] ) )
				state = stateTransitions[complex[x]];
			else switch ( state )
			{
				case STATE_INITIAL:
					if ( !matchesCompoundSelector( scope, currentNode, complex[x] ) )
						continue List;
					state = STATE_DESCENDANT_COMBINATOR;
					break;
					
				case STATE_DESCENDANT_COMBINATOR:
					while ( currentNode = currentNode[PARENT_NODE] )
						if ( matchesCompoundSelector( scope, currentNode, complex[x] ) )
							continue Complex;
					continue List;
					
				case STATE_CHILD_COMBINATOR:
					currentNode = currentNode[PARENT_NODE];
					if ( !matchesCompoundSelector( scope, currentNode, complex[x] ) )
						continue List;
					break;
					
				case STATE_NEXT_SIBLING_COMBINATOR:
				{
					const nodes = currentNode[PARENT_NODE].childNodes;
					currentNode = nodes[nodes.indexOf( currentNode ) + (relative ? 1 : -1)];
					if ( !matchesCompoundSelector( scope, currentNode, complex[x] ) )
						continue List;
					break;
				}
				case STATE_SUBSEQUENT_SIBLING_COMBINATOR:
				{
					const nodes = currentNode[PARENT_NODE].childNodes;
					for ( let k = nodes.indexOf( currentNode ) + (relative ? 1 : -1);
							(relative ? k < nodes.length : k >= 0);
							(relative ? k++ : k--) )
						if ( matchesCompoundSelector( scope, nodes[k], complex[x] ) )
						{
							currentNode = nodes[k];
							continue Complex;
						}
					continue List;
				}
			}
		}
		return true;
	}
	return false;
}

function matchesCompoundSelector( scope, node, compound )
{
	if ( !node || node[NODE_TYPE] !== Node.ELEMENT_NODE )
		return false;
	for ( let i = 0; i < compound.length; i++ )
	{
		const simple = compound[i];
		let matched;
		
		matched = false;
		switch ( simple.type )
		{
			case "universal": return true;
			
			case "type": matched = (node[TAG_NAME] === simple.name); break;
			case "id": matched = (node.id === simple.name); break;
			case "class": matched = node.classList.contains( simple.name ); break;
			
			case "attr":
				if ( simple.comparison === "=" && (simple.value === true || simple.value === "") )
					matched = node.hasAttribute( simple.name );
				else
				{
					let attr = node.getAttribute( simple.name );
					if ( typeof attr === "string" )
					{
						let value = (simple.ignoreCase ? simple.value.toLowerCase() : simple.value);
						if ( simple.ignoreCase ) attr = attr.toLowerCase();
						if ( value !== "" ) switch ( simple.comparison )
						{
							case "=": matched = (attr === value); break;
							case "~=": matched = attr.split( spacesRE ).indexOf( value ) !== -1; break;
							case "|=": matched = (attr === value || attr.startsWith( value +"-" )); break;
							case "^=": matched = attr.startsWith( value ); break;
							case "$=": matched = attr.endsWith( value ); break;
							case "*=": matched = attr.indexOf( value ) !== -1; break;
						}
					}
				}
				break;
				
			case "pseudo-element": break;
			
			case "pseudo-class":
				if ( pseudoClasses.hasOwnProperty( simple.name ) )
					matched = !!pseudoClasses[simple.name].call( null, scope, node );
				break;
				
			case "pseudo-fn":
				if ( pseudoProcs.hasOwnProperty( simple.name ) )
					matched = !!pseudoProcs[simple.name].call( null, scope, node, simple.params );
				break;
		}
		
		if ( !matched ) return false;
	}
	return true;
}

function isRelativeSimpleSelector( simple )
{
	return (!!simple && simple.type === "pseudo-class" && simple.name === "scope");
}

class ChildIterator
{
	constructor( A, B )
	{
		this.A = parseInt( A, 10 ) | 0;
		this.B = parseInt( B, 10 ) | 0;
		this.current = 0;
	}
	
	next()
	{
		if ( this.A === 0 && this.B === 0 )
			return false;
		
		this.current += 1;
		
		let match = false;
		if ( this.A === 0 )
			match = (this.current === this.B);
		else if ( (this.A < 0 && this.B >= this.current) || (this.A > 0 && this.current >= this.B) )
			match = (((this.current + this.B) % this.A) === 0);
		
		return match;
	}
}

function serializeNode( elem )
{
	var tagName = elem.tagName,
		owner = getDocument( elem ),
		entities = owner ? owner.entityEncoder : null,
		html = "";
	switch ( elem.nodeType )
	{
		case nodeTypes.ELEMENT_NODE:
			tagName = tagName.toLowerCase();
			html += "<"+ tagName;
			for ( let k in elem.attributes )
				if ( elem.attributes.hasOwnProperty( k ) )
				{
					let attr = elem.attributes[k];
					if ( attr === true )
						attr = "";
					else if ( entities && owner[PARSER_OPTIONS] )
						attr = encodeEntities( attr, entities, owner[PARSER_OPTIONS] );
					
					html += " "+ k;
					if ( attr !== "" )
						html += '="'+ attr +'"';
				}
			html += ">";
			
			for ( let i = 0; i < elem.childNodes.length; i++ )
				html += serializeNode( elem.childNodes[i] );
			
			if ( selfClosingTags[elem.tagName] !== true )
				html += "</"+ tagName +">";
			break;
			
		case nodeTypes.TEXT_NODE:
			if ( entities && owner[PARSER_OPTIONS] &&
				(!elem.parentNode || (elem.parentNode.tagName !== "SCRIPT" && elem.parentNode.tagName !== "STYLE")) )
					html += encodeEntities( elem.nodeValue, entities, owner[PARSER_OPTIONS] );
			else html += elem.nodeValue;
			break;
			
		case nodeTypes.CDATA_SECTION_NODE:
			html += "<![CDATA["+ elem.nodeValue +"]]>";
			break;
			
		case nodeTypes.PROCESSING_INSTRUCTION_NODE:
			html += "<?"+ elem.nodeName;
			if ( elem.nodeValue )
				html += " "+ elem.nodeValue;
			html += "?>";
			break;
			
		case nodeTypes.COMMENT_NODE:
			html += "<!--"+ elem.nodeValue +"-->";
			break;
			
		case nodeTypes.DOCUMENT_TYPE_NODE:
			html += "<!DOCTYPE";
			if ( elem.name )
				html += " "+ elem.name;
			if ( elem.publicId )
				html += ' PUBLIC "'+ elem.publicId +'"';
			if ( elem.systemId )
			{
				if ( !elem.publicId )
					html += " SYSTEM";
				html += ' "'+ elem.systemId +'"';
			}
			html += ">";
			break;
	}
	return html;
}

function encodeEntities( text, entities, options )
{
	if ( options.encodeEntities === false )
		return text;
	else if ( options.encodeEntities === true || !(options.encodeEntities instanceof RegExp) )
		return entities.encode( text );
	return entities.encode( text, options.encodeEntities );
}

const CLASS_LIST = Symbol( "classList" );
const INLINE_STYLE = Symbol( "style" );

const EXTEND_NODE = Symbol( "extendNode" );

function createNode( nodeType, baseClass = Node )
{
	const node = Object.create( baseClass.prototype );
	
	node[NODE_TYPE] = nodeType;
	node.nodeValue = null;
	node[PARENT_NODE] = null;
	node[OWNER] = null;
	
	switch ( nodeType )
	{
		case Node.ELEMENT_NODE:
			node[TAG_NAME] = null;
			node.attributes = {};
			// fallthrough
			
		case Node.DOCUMENT_NODE:
		case Node.DOCUMENT_FRAGMENT_NODE:
			node.childNodes = [];
	}
	
	return node;
}

class Node extends EventTarget
{
	constructor()
	{
		super();

		// We allow `extend`-ing `class`-es to call super(EXTEND_NODE)
		if (arguments[0] === EXTEND_NODE) return;

		throw new Error( "Cannot directly instantiate Node." );
	}
	
	get nodeType() {return this[NODE_TYPE]}
	
	get nodeName()
	{
		switch ( this.nodeType )
		{
			case Node.ELEMENT_NODE: return this.tagName;
			case Node.TEXT_NODE: return "#text";
			case Node.CDATA_SECTION_NODE: return "#cdata-section";
			case Node.PROCESSING_INSTRUCTION_NODE: return this.target;
			case Node.COMMENT_NODE: return "#comment";
			case Node.DOCUMENT_NODE: return "#document";
			case Node.DOCUMENT_TYPE_NODE: return this.name;
			case Node.DOCUMENT_FRAGMENT_NODE: return "#document-fragment";
		}
	}
	
	get parentNode() {return this[PARENT_NODE]}
	get ownerDocument() {return this[OWNER]}
	get tagName() {return this[TAG_NAME] || null}
	
	get firstChild()
	{
		if ( this.childNodes ) return this.childNodes[0] || null;
		return null;
	}
	
	get lastChild()
	{
		if ( this.childNodes ) return this.childNodes[this.childNodes.length - 1] || null;
		return null;
	}
	
	get previousSibling()
	{
		const parent = this.parentNode;
		if ( parent )
		{
			const idx = parent.childNodes.indexOf( this );
			if ( idx > 0 ) return parent.childNodes[idx - 1];
		}
		return null;
	}
	
	get nextSibling()
	{
		const parent = this.parentNode;
		if ( parent )
		{
			const idx = parent.childNodes.indexOf( this );
			if ( idx > -1 && idx < parent.childNodes.length - 1 ) return parent.childNodes[idx + 1];
		}
		return null;
	}
	
	get id()
	{
		return (this.attributes && this.attributes.id) || "";
	}
	set id( id )
	{
		if ( this.attributes )
			this.attributes.id = id;
	}
	
	get className()
	{
		return (this.attributes && this.attributes.class) || "";
	}
	set className( val )
	{
		if ( this.attributes )
		{
			this.classList.value = val;
			this.attributes.class = this[CLASS_LIST].value;
		}
	}
	
	get classList()
	{
		if ( this.attributes )
		{
			if ( !this[CLASS_LIST] )
				this[CLASS_LIST] = createTokenList( this );
			return this[CLASS_LIST];
		}
		return null;
	}
	
	get innerHTML()
	{
		if ( this.nodeType === Node.ELEMENT_NODE )
		{
			let html = "";
			for ( let i = 0; i < this.childNodes.length; i++ )
				html += serializeNode( this.childNodes[i] );
			return html;
		}
		return null;
	}
	set innerHTML( html )
	{
		if ( this.nodeType === Node.ELEMENT_NODE && selfClosingTags[this.tagName] !== true )
		{
			const nodes = parseHTML( this, html );
			if ( nodes )
				addChildNode( this, nodes, 0, this.childNodes.length );
			else
			{
				detachNodes( this.childNodes );
				this.childNodes.length = 0;
			}
		}
	}
	
	get outerHTML()
	{
		return serializeNode( this );
	}
	set outerHTML( html )
	{
		if ( this.parentNode )
		{
			const idx = this.parentNode.childNodes.indexOf( this ),
				nodes = parseHTML( this, html );
			if ( nodes )
				addChildNode( this.parentNode, nodes, idx, 1 );
			else detachNodes( this.parentNode.childNodes.splice( idx, 1 ) );
		}
	}

	get style()
	{
		if ( this.attributes )
		{
			if ( !this[INLINE_STYLE] )
				this[INLINE_STYLE] = createInlineStyle( this );
			return this[INLINE_STYLE];
		}
		return null;
	}
	set style( value )
	{
		if ( this.attributes )
		{
			if ( !this[INLINE_STYLE] )
				this[INLINE_STYLE] = createInlineStyle( this );

			updateInlineStyle( this[INLINE_STYLE], value );
		}
	}
	
	get textContent()
	{
		if ( this.childNodes )
		{
			let text = "";
			for ( let i = 0; i < this.childNodes.length; i++ )
			{
				if ( this.childNodes[i].nodeType !== Node.COMMENT_NODE &&
						this.childNodes[i].nodeType !== Node.CDATA_SECTION_NODE &&
						this.childNodes[i].nodeType !== Node.PROCESSING_INSTRUCTION_NODE )
					text += this.childNodes[i].textContent;
			}
			return text;
		}
		return this.nodeValue;
	}
	set textContent( text )
	{
		if ( text == null )
			text = "";
		else if ( typeof text !== "string" )
			text += "";
		
		if ( this.childNodes )
		{
			let node = createNode( Node.TEXT_NODE );
			node.nodeValue = text;
			setNodeParent( node, this );
			
			detachNodes( this.childNodes );
			this.childNodes.length = 1;
			this.childNodes[0] = node;
		}
		else if ( this.nodeType >= Node.TEXT_NODE && this.nodeType <= Node.COMMENT_NODE )
			this.nodeValue = text;
	}
	
	getRootNode()
	{
		let rootNode = this;
		while ( rootNode.parentNode )
			rootNode = rootNode.parentNode;
		return rootNode;
	}
	
	hasAttributes()
	{
		if ( this.attributes ) for ( let k in this.attributes )
			if ( this.attributes.hasOwnProperty( k ) ) return true;
		return false;
	}
	
	getAttributeNames()
	{
		if ( this.attributes )
			return Object.keys( this.attributes );
		return [];
	}
	
	getAttribute( name )
	{
		var result;
		if ( this.attributes && name && typeof name === "string" )
			result = this.attributes[lowerAttributeCase( this, name )];
		if ( result === undefined )
			return null;
		return result;
	}
	
	setAttribute( name, value )
	{
		if ( this.attributes && name && typeof name === "string" )
		{
			name = lowerAttributeCase( this, name );
			if ( name === "class" )
			{
				if ( value !== true )
					this.className = ""+ value;
				else
				{
					this.classList.value = "";
					this.attributes[name] = true;
				}
			}
			else if ( typeof value === "string" || value === true )
				this.attributes[name] = value;
			else this.attributes[name] = ""+ value;
		}
	}
	
	toggleAttribute( name, force )
	{
		if ( this.attributes && name && typeof name === "string" )
		{
			name = lowerAttributeCase( this, name );
			if ( !this.attributes.hasOwnProperty( name ) )
			{
				if ( arguments.length === 1 || force === true )
					return (this.attributes[name] = true);
				return false;
			}
			else if ( arguments.length === 1 || force === false )
			{
				delete this.attributes[name];
				return false;
			}
			return true;
		}
	}
	
	removeAttribute( name )
	{
		if ( this.attributes && name && typeof name === "string" )
		{
			name = lowerAttributeCase( this, name );
			if ( name === "class" && this[CLASS_LIST] )
				this[CLASS_LIST].value = null;
			delete this.attributes[name];
		}
	}
	
	hasAttribute( name )
	{
		if ( this.attributes && name && typeof name === "string" )
			return this.attributes.hasOwnProperty( lowerAttributeCase( this, name ) );
		return false;
	}
	
	hasChildNodes()
	{
		return (!!this.childNodes && this.childNodes.length > 0);
	}
	
	appendChild( child )
	{
		return this.insertBefore( child, null );
	}
	
	insertBefore( newChild, refChild )
	{
		if ( this.childNodes && newChild instanceof Node && arguments.length > 1 )
		{
			let idx = -1;
			
			if ( refChild == null )
				idx = this.childNodes.length;
			else if ( refChild instanceof Node && refChild.parentNode === this )
				idx = this.childNodes.indexOf( refChild );
			
			if ( idx !== -1 )
				return addChildNode( this, newChild, idx );
		}
		return null;
	}
	
	replaceChild( newChild, oldChild )
	{
		if ( this.childNodes && oldChild instanceof Node && newChild instanceof Node &&
			oldChild.parentNode === this && oldChild !== newChild )
		{
			addChildNode( this, newChild, this.childNodes.indexOf( oldChild ), 1 );
			return oldChild;
		}
		return null;
	}
	
	removeChild( child )
	{
		if ( this.childNodes && child instanceof Node && child.parentNode === this )
		{
			const idx = this.childNodes.indexOf( child ),
				owner = getDocument( this );
			
			if ( owner && child.parentNode === owner.documentElement && tagNameProp.hasOwnProperty( child.tagName ) )
				owner[tagNameProp[child.tagName]] = null;
			
			detachNodes( this.childNodes.splice( idx, 1 ) );
			return child;
		}
		return null;
	}
	
	cloneNode( deep )
	{
		var clone;
		
		if ( this.nodeType === Node.DOCUMENT_NODE || this.nodeType === Node.DOCUMENT_FRAGMENT_NODE )
			clone = new DOM( null, this[PARSER_OPTIONS] );
		else clone = createNode( this.nodeType );
		
		switch ( this.nodeType )
		{
			case Node.ELEMENT_NODE:
				clone[TAG_NAME] = this.tagName;
				clone.attributes = Object.assign( clone.attributes, this.attributes );
				break;
				
			case Node.TEXT_NODE:
			case Node.CDATA_SECTION_NODE:
			case Node.PROCESSING_INSTRUCTION_NODE:
			case Node.COMMENT_NODE:
				clone.nodeValue = this.nodeValue;
				break;
				
			case Node.DOCUMENT_NODE:
			case Node.DOCUMENT_FRAGMENT_NODE:
				clone[NODE_TYPE] = this.nodeType;
				clone.entityEncoder.entities = this.entityEncoder;
				break;
				
			case Node.DOCUMENT_TYPE_NODE:
				clone.name = this.name;
				clone.publicId = this.publicId;
				clone.systemId = this.systemId;
				break;
		}
		
		if ( deep === true && this.childNodes && this.childNodes.length > 0 )
		{
			for ( let i = 0; i < this.childNodes.length; i++ )
				clone.appendChild( this.childNodes[i].cloneNode( true ) );
			
			if ( clone.nodeType === Node.DOCUMENT_NODE || clone.nodeType === Node.DOCUMENT_FRAGMENT_NODE )
				setupDocument( clone );
		}
		
		return clone;
	}
	
	getElementById( id )
	{
		var elem = null;
		if ( id && typeof id === "string" && this.childNodes )
			this.forEach( node =>
			{
				if ( node.id === id )
				{
					elem = node;
					return false;
				}
			} );
		return elem;
	}
	
	getElementsByClassName( className )
	{
		var nodeList = [];
		if ( className && typeof className === "string" )
		{
			const classList = className.trim().split( spacesRE );
			if ( classList.length > 1 || classList[0] !== "" ) this.forEach( node =>
			{
				for ( let i = 0; i < classList.length; i++ )
					if ( !node.classList.contains( classList[i] ) )
						return;
				nodeList.push( node );
			} );
		}
		return nodeList;
	}
	
	getElementsByTagName( tagName )
	{
		var nodeList = [];
		if ( tagName && typeof tagName === "string" )
		{
			tagName = tagName.toUpperCase();
			this.forEach( node =>
			{
				if ( tagName === "*" || node.tagName === tagName )
					nodeList.push( node );
			} );
		}
		return nodeList;
	}
	
	closest( selector )
	{
		if ( selector && typeof selector === "string" )
			return closest( this, selector );
		else return null;
	}
	
	matches( selector )
	{
		if ( selector && typeof selector === "string" )
			return matches( this, selector );
		else return false;
	}
	
	querySelector( selector )
	{
		if ( selector && typeof selector === "string" )
			return querySelector( this, selector, false );
		else return null;
	}
	
	querySelectorAll( selector )
	{
		if ( selector && typeof selector === "string" )
			return querySelector( this, selector, true );
		else return [];
	}
	
	// Non-standard
	
	forEach( callback, type = nodeTypes.ELEMENT_NODE )
	{
		// This unrolled recursive function is about 1.45x faster in Node than its
		// equivalent recursive form.
		
		let childNodes = this.childNodes,
			current = this.firstChild,
			idxStack = [],
			idx = 0,
			parent, nextSibling;
		
		while ( current )
		{
			// 'parent' and 'nextSibling' are stored here so that if callback() changes
			// the document, we can maintain our place in the overall list of nodes by
			// looking for insertions, deletions, or replacements within the 'current'
			// node's list of siblings.
			parent = current[PARENT_NODE];
			nextSibling = childNodes[idx + 1];
			
			if ( (type === null || current.nodeType === type) &&
				callback( current, parent ) === false )
					return;
			
			// If the parent of 'current' changes during callback(), we no longer want to
			// look at the children of 'current' here as it was either moved or removed.
			if ( current[PARENT_NODE] === parent && current.childNodes && current.childNodes.length > 0 )
			{
				idxStack.push( idx );
				childNodes = current.childNodes;
				current = childNodes[idx = 0];
			}
			else
			{
				if ( nextSibling )
				{
					idx += 1;
					// If callback() changed the number of nodes that come before the
					// previously found 'nextSibling', 'idx' needs to be updated so we
					// don't skip over or repeat visits to any nodes.
					if ( nextSibling !== childNodes[idx] )
						idx = parent.childNodes.indexOf( nextSibling );
				}
				else idx = childNodes.length;
				
				while ( childNodes[idx] == null )
				{
					current = parent;
					parent = current[PARENT_NODE];
					if ( current && current !== this )
					{
						childNodes = parent.childNodes;
						idx = idxStack.pop() + 1;
					}
					else return;
				}
				current = childNodes[idx];
			}
		}
	}
}

Object.defineProperties( Node,
{
	ELEMENT_NODE: {value: nodeTypes.ELEMENT_NODE},
	//ATTRIBUTE_NODE: {value: nodeTypes.ATTRIBUTE_NODE},
	TEXT_NODE: {value: nodeTypes.TEXT_NODE},
	CDATA_SECTION_NODE: {value: nodeTypes.CDATA_SECTION_NODE},
	//ENTITY_REFERENCE_NODE: {value: nodeTypes.ENTITY_REFERENCE_NODE},
	//ENTITY_NODE: {value: nodeTypes.ENTITY_NODE},
	PROCESSING_INSTRUCTION_NODE: {value: nodeTypes.PROCESSING_INSTRUCTION_NODE},
	COMMENT_NODE: {value: nodeTypes.COMMENT_NODE},
	DOCUMENT_NODE: {value: nodeTypes.DOCUMENT_NODE},
	DOCUMENT_TYPE_NODE: {value: nodeTypes.DOCUMENT_TYPE_NODE},
	DOCUMENT_FRAGMENT_NODE: {value: nodeTypes.DOCUMENT_FRAGMENT_NODE},
	//NOTATION_NODE: {value: nodeTypes.NOTATION_NODE},
} );

const tagNameProp = {
	HEAD,
	BODY,
	FRAMESET: BODY
};

function addChildNode( parent, node, index, removalCount = 0 )
{
	if ( !parent ||
		(parent.nodeType !== Node.ELEMENT_NODE &&
	 		parent.nodeType !== Node.DOCUMENT_NODE &&
	 		parent.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) ||
		(parent.nodeType === Node.ELEMENT_NODE && selfClosingTags[parent.tagName] === true) )
			return node;
	
	if ( node.nodeType <= Node.COMMENT_NODE )
	{
		if ( parent.parentNode && parent.parentNode.nodeType === Node.DOCUMENT_NODE )
		{
			if ( tagNameProp.hasOwnProperty( node.tagName ) )
			{
				const prop = tagNameProp[node.tagName];
				if ( parent.parentNode[prop] && removalCount === 0 )
					return node;
				parent.parentNode[prop] = node;
			}
		}
		
		if ( node.parentNode )
			node.parentNode.removeChild( node );
		setNodeParent( node, parent );
		detachNodes( parent.childNodes.splice( index, removalCount, node ) );
	}
	else if ( node.nodeType === Node.DOCUMENT_TYPE_NODE &&
		(parent.nodeType === Node.DOCUMENT_NODE || parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) )
	{
		const owner = node.parentNode;
		if ( owner && (owner.nodeType === Node.DOCUMENT_NODE || owner.nodeType === Node.DOCUMENT_FRAGMENT_NODE) )
		{
			owner.removeChild( node );
			owner[DOCTYPE] = null;
		}
		setNodeParent( node, parent );
		detachNodes( parent.childNodes.splice( index, removalCount, node ) );
		parent[DOCTYPE] = node;
	}
	else if ( node.nodeType === Node.DOCUMENT_FRAGMENT_NODE )
	{
		if ( parent.parentNode && parent.parentNode.nodeType === Node.DOCUMENT_NODE )
		{
			if ( removalCount > 0 )
				detachNodes( parent.childNodes.splice( index, removalCount ) );
			for ( let i = node.childNodes.length - 1; i >= 0; i-- )
			{
				const child = node.childNodes[i];
				if ( tagNameProp.hasOwnProperty( child.tagName ) )
				{
					const prop = tagNameProp[child.tagName];
					if ( parent.parentNode[prop] && removalCount === 0 )
						continue;
					parent.parentNode[prop] = child;
				}
				setNodeParent( child, parent );
				parent.childNodes.splice( index, 0, child );
				node.childNodes.splice( i, 1 );
			}
		}
		else if ( node !== getDocument( parent ) )
		{
			for ( let i = 0; i < node.childNodes.length; i++ )
				setNodeParent( node.childNodes[i], parent );
			detachNodes( parent.childNodes.splice( index, removalCount, ...node.childNodes ) );
			node.childNodes.length = 0;
		}
	}
	
	return node;
}

function parseHTML( parent, html )
{
	if ( html && typeof html === "string" )
	{
		const owner = getDocument( parent );
		return new Parser( html, owner ? owner[PARSER_OPTIONS] : null, owner ? owner.entityEncoder : null ).parseHTML();
	}
}

function lowerAttributeCase( node, name )
{
	const owner = getDocument( node );
	if ( owner && owner[PARSER_OPTIONS].lowerAttributeCase )
		return name.toLowerCase();
	return name;
}

const toLowerCase = String.prototype.toLowerCase,
	toUpperCase = String.prototype.toUpperCase,
	
	defaultOptions = {
		allowCustomRootElement: false,
		allowSelfClosingSyntax: false,
		allowCDATA: false,
		allowProcessingInstructions: false,
		decodeEntities: false,
		encodeEntities: false,
		collapseWhitespace: false,
		trimWhitespace: false,
		lowerAttributeCase: false
	},
	
	STATE_START_TAG = 0,
	STATE_ATTRIBUTE = 1,
	STATE_END_TAG = 2,
	
	// '12.1.2.3 Attributes' from HTML5 spec.
	attributeNameExclusions = {
		//"\0": true, // This is caught by the lexer in isWhiteSpace().
		//'"': true, // Disabled to better match browser behaviour.
		//"'": true, // Disabled to better match browser behaviour.
		">": true,
		"/": true,
		"=": true
	},
	
	pTagBoundary = {P: true},
	definitionTagBoundary = {DT: true, DD: true},
	tableStructureTagBoundary = {TBODY: true, THEAD: true, TFOOT: true},
	tableCellTagBoundary = {TD: true, TH: true},
	formElementTagBoundary = {BUTTON: true, DATALIST: true, OPTGROUP: true, OPTION: true, PROGRESS: true, SELECT: true, TEXTAREA: true},
	
	// Largely based on '8.1.2.4 Optional tags' from the HTML5 spec.
	// https://www.w3.org/TR/html50/syntax.html#syntax-tag-omission
	tagBoundaries = {
		ADDRESS: pTagBoundary,
		ARTICLE: pTagBoundary,
		ASIDE: pTagBoundary,
		BLOCKQUOTE: pTagBoundary,
		DIV: pTagBoundary,
		FIELDSET: pTagBoundary,
		FOOTER: pTagBoundary,
		H1: pTagBoundary,
		H2: pTagBoundary,
		H3: pTagBoundary,
		H4: pTagBoundary,
		H5: pTagBoundary,
		H6: pTagBoundary,
		HEADER: pTagBoundary,
		HGROUP: pTagBoundary,
		HR: pTagBoundary,
		MAIN: pTagBoundary,
		NAV: pTagBoundary,
		P: pTagBoundary,
		PRE: pTagBoundary,
		SECTION: pTagBoundary,
		
		BODY: {HEAD: true, TITLE: true},
		
		// Definitions
		DL: pTagBoundary,
		DD: definitionTagBoundary,
		DT: definitionTagBoundary,
		
		// Tables
		TABLE: pTagBoundary,
		TBODY: tableStructureTagBoundary,
		THEAD: tableStructureTagBoundary,
		TD: tableCellTagBoundary,
		TFOOT: tableStructureTagBoundary,
		TH: tableCellTagBoundary,
		TR: {TR: true},
		
		// Lists
		LI: {LI: true},
		OL: pTagBoundary,
		UL: pTagBoundary,
		
		// Forms
		BUTTON: formElementTagBoundary,
		DATALIST: formElementTagBoundary,
		FORM: pTagBoundary,
		INPUT: formElementTagBoundary,
		OPTGROUP: {OPTGROUP: true, OPTION: true},
		OPTION: {OPTION: true},
		OUTPUT: formElementTagBoundary,
		PROGRESS: formElementTagBoundary,
		SELECT: formElementTagBoundary,
		TEXTAREA: formElementTagBoundary,
	};

class Parser
{
	constructor( html, options, entityEncoder )
	{
		this.options = Parser.setupOptions( options );
		this.lexer = new Lexer( html );
		this.entityEncoder = entityEncoder;
	}
	
	static setupOptions( options )
	{
		options = Object.assign( {}, defaultOptions, options );
		if ( options.encodeEntities instanceof RegExp )
			options.encodeEntities = globalizeRegExp( options.encodeEntities );
		return Object.freeze( options );
	}
	
	static isNameCharStart( chr )
	{
		return chr === ":" || chr === "_" || (chr >= "A" && chr <= "Z") || (chr >= "a" && chr <= "z") ||
			(chr >= "\xC0" && chr <= "\xD6") || (chr >= "\xD8" && chr <= "\xF6") ||
			(chr >= "\xF8" && chr <= "\u02FF") || (chr >= "\u0370" && chr <= "\u037D") ||
			(chr >= "\u037F" && chr <= "\u1FFF") || chr === "\u200C" || chr === "\u200D" ||
			(chr >= "\u2070" && chr <= "\u218F") || (chr >= "\u2C00" && chr <= "\u2FEF") ||
			(chr >= "\u3001" && chr <= "\uD7FF") || (chr >= "\uF900" && chr <= "\uFDCF") ||
			(chr >= "\uFDF0" && chr <= "\uFFFD") || (chr >= "\u10000" && chr <= "\uEFFFF");
	}
	
	static isNameChar( chr )
	{
		return Parser.isNameCharStart( chr ) ||
			(chr >= "0" && chr <= "9") || chr === "-" || chr === "." || chr === "\xB7" ||
			(chr >= "\u0300" && chr <= "\u036F") || chr === "\u203F" || chr === "\u2040";
	}
	
	parseHTML()
	{
		var rootNode = createNode( Node.DOCUMENT_FRAGMENT_NODE ),
			scopeChain = [rootNode], theChar;
		
		rootNode[PARSER_OPTIONS] = this.options;
		
		if ( this.options.trimWhitespace )
			theChar = this.lexer.skipWhiteSpace();
		else theChar = this.lexer.getChar();
		
		while ( theChar !== EOF && scopeChain.length > 0 )
		{
			if ( theChar === "<" )
				this.parseTag( scopeChain );
			else this.parseText( scopeChain );
			
			if ( this.options.trimWhitespace )
				theChar = this.lexer.skipWhiteSpace();
			else theChar = this.lexer.getChar();
		}
		
		return rootNode;
	}
	
	parseTag( scopeChain )
	{
		var node, name, selfClosing, state = STATE_START_TAG,
			tagStartIdx = this.lexer.index,
			theChar = this.lexer.getNextChar(),
			startIdx, endIdx;
		
		if ( theChar !== EOF )
	Main:
		while ( theChar !== ">" && theChar !== EOF )
		{
			startIdx = this.lexer.index;
			
			if ( state === STATE_START_TAG )
			{
				if ( theChar === "!" || theChar === "?" )
				{
					if ( this.options.allowProcessingInstructions && this.lexer.match( "?" ) )
					{
						startIdx = this.lexer.index;
						theChar = this.lexer.getChar();
					PINode:
						if ( Parser.isNameCharStart( theChar ) )
						{
							node = createNode( Node.PROCESSING_INSTRUCTION_NODE );
							
							// Find target's name.
							while ( theChar !== EOF && Parser.isNameChar( theChar ) )
								theChar = this.lexer.getNextChar();
							
							// If we have a non-whitespace character here that isn't EOF or
							// the end '?>', then we've come across an invalid name character
							// in the target name and this tag should be treated as a comment.
							if ( !this.lexer.isWhiteSpace( theChar ) && theChar !== EOF &&
									!(theChar === "?" && this.lexer.peek() === ">") )
								break PINode;
							
							node.target = this.lexer.str.slice( startIdx, this.lexer.index );
							
							this.lexer.skipWhiteSpace();
							startIdx = this.lexer.index;
							this.lexer.goToString( "?>" );
							node.nodeValue = this.lexer.str.slice( startIdx, this.lexer.index );
							this.lexer.advance( 1 );
							scopeChain[0].childNodes.push( node );
							setNodeParent( node, scopeChain[0] );
							break;
						}
						
						// Go back to before the first '?' to include everything between the
						// angle brackets in the comment we're going to create from this tag.
						this.lexer.advance( startIdx - this.lexer.index - 1 );
					}
					
					if ( this.options.allowCDATA && this.lexer.match( "![CDATA[" ) )
					{
						node = createNode( Node.CDATA_SECTION_NODE );
						startIdx = this.lexer.index;
						this.lexer.goToString( "]]>" );
						node.nodeValue = this.lexer.str.slice( startIdx, this.lexer.index );
						this.lexer.advance( 2 );
						scopeChain[0].childNodes.push( node );
						setNodeParent( node, scopeChain[0] );
						break;
					}
					else if ( this.lexer.match( "!DOCTYPE", false ) )
					{
						this.lexer.skipWhiteSpace();
						startIdx = this.lexer.index;
						this.lexer.goToString( ">" );
						
						let rootNode = scopeChain[scopeChain.length - 1];
						
						if ( rootNode.doctype )
							break;
						else if ( rootNode.childNodes.length > 0 )
							for ( let i = rootNode.childNodes.length - 1; i >= 0; i-- )
								if ( rootNode.childNodes[i].nodeType < Node.TEXT_NODE || rootNode.childNodes[i].nodeType > Node.COMMENT_NODE )
									break Main;
						
						let params = this.lexer.str.slice( startIdx, this.lexer.index ).split( spacesRE );
						node = createNode( Node.DOCUMENT_TYPE_NODE );
						node.name = toLowerCase.call( params.shift() );
						
						if ( params.length > 1 )
						{
							let idType = toLowerCase.call( params.shift() );
							params = params.join( " " ).split( '"' );
							if ( params[0] === "" ) switch ( idType )
							{
								case "public":
									params.shift();
									node.publicId = params.shift();
									
								case "system":
									params.shift();
									node.systemId = params.shift();
							}
						}
						
						if ( !node.publicId ) node.publicId = "";
						if ( !node.systemId ) node.systemId = "";
						
						rootNode.childNodes.push( node );
						rootNode.doctype = node;
						setNodeParent( node, rootNode );
						break;
					}
					else
					{
						let endTag;
						if ( this.lexer.match( "!--" ) )
						{
							if ( !this.lexer.match( ">" ) && !this.lexer.match( "->" ) )
								endTag = "-->";
						}
						else
						{
							if ( theChar === "!" ) // Don't skip question marks that show up here.
								this.lexer.getNextChar();
							endTag = ">";
						}
						
						node = createNode( Node.COMMENT_NODE );
						startIdx = this.lexer.index;
						if ( endTag ) this.lexer.goToString( endTag );
						node.nodeValue = this.lexer.str.slice( startIdx, this.lexer.index );
						this.lexer.advance( endTag ? endTag.length - 1 : -1 );
						scopeChain[0].childNodes.push( node );
						setNodeParent( node, scopeChain[0] );
						break;
					}
				}
				else if ( theChar === "/" )
				{
					theChar = this.lexer.getNextChar();
					state = STATE_END_TAG;
					startIdx += 1;
				}
			}
			
			if ( state === STATE_ATTRIBUTE )
			{
				// Find an attribute name.
				while ( (this.lexer.index === startIdx && theChar === "=") ||
						(!this.lexer.isWhiteSpace( theChar ) &&
 						!attributeNameExclusions[theChar] &&
 						theChar !== EOF) )
					theChar = this.lexer.getNextChar();
				endIdx = this.lexer.index;
			}
			else
			{
				// Find a tag name.
				while ( ((theChar >= "a" && theChar <= "z") || (theChar >= "A" && theChar <= "Z") ||
						(this.lexer.index > startIdx && ((theChar >= "0" && theChar <= "9") || theChar === "-" || theChar === "_" || theChar === ":"))) &&
						theChar !== EOF )
					theChar = this.lexer.getNextChar();
				endIdx = this.lexer.index;
				if ( theChar === EOF )
				{
					this.addTextNode( scopeChain, tagStartIdx, endIdx, false );
					return;
				}
				theChar = this.lexer.skipWhiteSpace();
				
				if ( state === STATE_END_TAG )
					theChar = this.lexer.goToString( ">" );
			}
			
			if ( startIdx === endIdx )
			{
				// Found an illegal character while searching for an attribute or tag name.
				if ( this.options.allowSelfClosingSyntax && theChar === "/" && this.lexer.peek() === ">" )
				{
					// If self-closing tag syntax is allowed, and we've found "/>", then we
					// need to close the tag at the top of the scope chain.
					theChar = this.lexer.getNextChar();
					state = STATE_END_TAG;
					name = scopeChain[0][TAG_NAME];
				}
				else if ( state === STATE_START_TAG )
				{
					this.lexer.goToString( "<" );
					this.addTextNode( scopeChain, tagStartIdx, this.lexer.index, false );
					tagStartIdx = this.lexer.index;
					theChar = this.lexer.getNextChar();
					continue;
				}
				else if ( state === STATE_END_TAG )
				{
					if ( startIdx === this.lexer.index ) break; // This throws "</>" away.
					node = this.addTextNode( scopeChain, startIdx, this.lexer.index );
					node[NODE_TYPE] = Node.COMMENT_NODE;
					break;
				}
				else
				{
					// All other illegal characters are simply skipped over, along with any
					// following whitespace.
					this.lexer.getNextChar();
					theChar = this.lexer.skipWhiteSpace();
					continue;
				}
			}
			else
			{
				name = this.lexer.str.slice( startIdx, endIdx );
				if ( state !== STATE_ATTRIBUTE )
					name = toUpperCase.call( name );
				theChar = this.lexer.skipWhiteSpace();
			}
			
			switch ( state )
			{
				case STATE_START_TAG:
					node = createNode( Node.ELEMENT_NODE );
					node[TAG_NAME] = name;
					while ( tagBoundaries.hasOwnProperty( node[TAG_NAME] ) && tagBoundaries[node[TAG_NAME]][scopeChain[0][TAG_NAME]] )
						scopeChain.splice( 0, 1 );
					scopeChain[0].childNodes.push( node );
					setNodeParent( node, scopeChain[0] );
					state = STATE_ATTRIBUTE;
					selfClosing = selfClosingTags[node[TAG_NAME]];
					if ( selfClosing !== true ) scopeChain.unshift( node );
					break;
					
				case STATE_ATTRIBUTE:
					let value = true;
					
					if ( this.options.lowerAttributeCase )
						name = toLowerCase.call( name );
					
					if ( theChar === "=" )
					{
						this.lexer.getNextChar();
						theChar = this.lexer.skipWhiteSpace();
						startIdx = this.lexer.index;
						
						if ( theChar === '"' || theChar === "'" )
						{
							this.lexer.getNextChar();
							this.lexer.goToString( theChar );
							endIdx = this.lexer.index;
							startIdx += 1;
							this.lexer.getNextChar();
							theChar = this.lexer.skipWhiteSpace();
						}
						else // Unquoted attribute value
						{
							while ( !this.lexer.isWhiteSpace( theChar ) &&
									//!unquotedAttributeExclusions[theChar] &&
									theChar !== ">" &&
									(!this.options.allowSelfClosingSyntax || !(theChar === "/" && this.lexer.peek() === ">")) &&
									theChar !== EOF )
								theChar = this.lexer.getNextChar();
							endIdx = this.lexer.index;
							theChar = this.lexer.skipWhiteSpace();
						}
						
						if ( node.attributes.hasOwnProperty( name ) ) break;
						value = this.lexer.str.slice( startIdx, endIdx );
						
						if ( value === "" )
							value = true;
						else if ( this.options.decodeEntities )
							value = this.entityEncoder.decode( value );
					}
					else if ( node.attributes.hasOwnProperty( name ) ) break;
					
					node.attributes[name] = value;
					break;
					
				case STATE_END_TAG:
					for ( let i = 0; i < scopeChain.length; i++ )
						if ( scopeChain[i][TAG_NAME] === name )
						{
							node = scopeChain[i];
							while ( scopeChain.length > 0 && scopeChain[0] !== node )
								scopeChain.shift();
							scopeChain.shift();
							break;
						}
					break;
			}
		}
		else this.addTextNode( scopeChain, tagStartIdx, this.lexer.index, false );
		
		this.lexer.getNextChar();
	}
	
	parseText( scopeChain )
	{
		var startIdx = this.lexer.index,
			preserveContent = false;
		
		if ( scopeChain[0][TAG_NAME] === "SCRIPT" || scopeChain[0][TAG_NAME] === "STYLE" )
		{
			this.lexer.goToString( "<\/"+ scopeChain[0][TAG_NAME], false );
			preserveContent = true;
		}
		else this.lexer.goToString( "<" );
		
		this.addTextNode( scopeChain, startIdx, this.lexer.index, preserveContent );
	}
	
	addTextNode( scopeChain, startIdx, endIdx, preserveContent )
	{
		var node = createNode( Node.TEXT_NODE ),
			value = this.lexer.str.slice( startIdx, endIdx );
		
		if ( preserveContent != null )
		{
			if ( this.options.trimWhitespace )
				value = value.trim();
			else if ( this.options.collapseWhitespace && !preserveContent )
				value = value.replace( spacesRE, " " );
			
			if ( this.options.decodeEntities && !preserveContent )
				value = this.entityEncoder.decode( value );
		}
		
		node.nodeValue = value;
		scopeChain[0].childNodes.push( node );
		setNodeParent( node, scopeChain[0] );
		
		return node;
	}
}

class ImageData {
    constructor(widthOrData, heightOrWidth, settingsOrHeight, settings) {
        var _a, _b;
        const rgbaArray = (widthOrData instanceof Uint8ClampedArray) ? widthOrData : null;
        let colorSpace = "srgb";
        if (rgbaArray) {
            console.log(`[ImageData] Warning: Array initializer support is experimental! ( new ImageData([${rgbaArray.length}b ${(_b = (_a = rgbaArray === null || rgbaArray === void 0 ? void 0 : rgbaArray.constructor) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "Array"}], ${Array.from(arguments).slice(1).join(',')}) )`);
            this.width = heightOrWidth;
            this.height = typeof settingsOrHeight === "number" ? settingsOrHeight : undefined;
            colorSpace = (typeof settingsOrHeight === "object" ? settingsOrHeight : (typeof settings === "object" ? settings : { colorSpace: "srgb" })).colorSpace;
        }
        else {
            this.width = widthOrData;
            this.height = heightOrWidth;
            colorSpace = (typeof settingsOrHeight === "object" ? settingsOrHeight : { colorSpace: "srgb" }).colorSpace;
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
        }
        else {
            this.data = new Uint8ClampedArray(this.width * this.height * 4);
        }
    }
}
// Export onto the global scope
if (globalThis && typeof globalThis.ImageData !== "object") {
    // @ts-ignore
    globalThis.ImageData = ImageData;
}

// https://html.spec.whatwg.org/multipage/canvas.html#canvasrenderingcontext2d
const FILL_STYLE = Symbol("fill-style");
class CanvasRenderingContext2D {
    get fillStyle() {
        return this[FILL_STYLE];
    }
    set fillStyle(newStyle) {
        console.log(`${this}→fillStyle = ${newStyle}`);
        this[FILL_STYLE] = newStyle;
    }
    // CanvasRect
    clearRect(x, y, w, h) {
        throw new Error("Not implemented");
    }
    fillRect(x, y, w, h) {
        const { r, g, b, a } = this.fillStyleRGBA;
        const alpha = a * 255 | 0;
        const data = this.canvas[CANVAS_DATA];
        // Optimization: full-canvas fill
        if (x === 0 && y === 0 && data.length === w * h * 4) {
            for (let i = 0; i < data.length; i += 4) {
                if (i < 100)
                    console.log(`→ fill #${i} rgba(${data[i]},${data[i + 1]},${data[i + 2]} @ ${data[i + 3]}) => rgba(${r},${g},${b} @ ${alpha})`);
                data[i + 0] = r;
                data[i + 1] = g;
                data[i + 2] = b;
                data[i + 3] = alpha;
            }
            console.log(`${this}→fillRect( ${Array.from(arguments).join(', ')} ) whole canvas with ${r},${g},${b} @ ${alpha}`);
            console.log(data);
            return;
        }
        for (let row = y; row < y + h; ++row) {
            const startIdx = row * 4 + x;
            const endIdx = row * 4 + x + w;
            for (let i = startIdx; i < endIdx; ++i) {
                data[i + 0] = r;
                data[i + 1] = g;
                data[i + 2] = b;
                data[i + 3] = alpha;
            }
        }
        console.log(`${this}→fillRect( ${Array.from(arguments).join(', ')} ) with ${r},${g},${b} @ ${alpha}`);
    }
    strokeRect(x, y, w, h) {
        throw new Error("Not implemented");
    }
    constructor(parentCanvas) {
        this.canvas = parentCanvas;
        // defaults
        this.fillStyle = "#000";
    }
    drawImage(image, x1, y1, w1, h1, x2, y2, w2, h2) {
        if (image instanceof globalThis.HTMLCanvasElement) {
            w1 = w1 !== null && w1 !== void 0 ? w1 : image.width;
            h1 = h1 !== null && h1 !== void 0 ? h1 : image.height;
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
                    const sr = srcPixels[si];
                    const sg = srcPixels[si + 1];
                    const sb = srcPixels[si + 2];
                    const sa = srcPixels[si + 3];
                    // destination pixel
                    const di = ((y2 + row) * srcImage.width + x2 + col) * 4;
                    const dr = dstPixels[di];
                    const dg = dstPixels[di + 1];
                    const db = dstPixels[di + 2];
                    const da = dstPixels[di + 3];
                    // blend pixels using premultiplied alpha and the default 'source-over' composition
                    // https://drafts.fxtf.org/compositing/#porterduffcompositingoperators_srcover
                    const dstcontrib = (1 - sa / 255);
                    dstPixels[di + 0] = sr * (sa / 255) + dr * (da / 255) * dstcontrib | 0;
                    dstPixels[di + 1] = sg * (sa / 255) + dg * (da / 255) * dstcontrib | 0;
                    dstPixels[di + 2] = sb * (sa / 255) + db * (da / 255) * dstcontrib | 0;
                    dstPixels[di + 3] = sa + da * dstcontrib | 0;
                    if (row === col) {
                        console.log(`→ [${row},${col}]: imgdata#${si} rgba(${sr},${sg},${sb} @ ${sa}) + canvas#${di} rgba(${dr},${dg},${db} @ ${da}) => rgba(${dstPixels[di]},${dstPixels[di + 1]},${dstPixels[di + 2]} @ ${dstPixels[di + 3]})`);
                    }
                }
            }
            console.log(`${this}→drawImage( <${image.constructor.name}> ${Array.from(arguments).join(', ')} )`);
            return;
        }
        //let dx,dy,dw,dh;
        //let sx,sy,sw,sh;
        console.log(`${this} Not implemented: only canvas sources supported: drawImage( <${image.constructor.name}> ${Array.from(arguments).join(', ')} )`);
    }
    createImageData(widthOrImagedata, height, settings) {
        if (widthOrImagedata instanceof ImageData) {
            return new ImageData(widthOrImagedata.data, widthOrImagedata.width, widthOrImagedata.height);
        }
        return new ImageData(widthOrImagedata, height, settings);
    }
    getImageData(sx, sy, sw, sh, settings) {
        if (sx === 0 && sy === 0 && sw === this.canvas.width && sh === this.canvas.height && !settings) {
            console.log(`${this}→getImageData( ${Array.from(arguments).join(', ')} ) whole canvas ${this.canvas.width}x${this.canvas.height}`);
            return new ImageData(this.canvas[CANVAS_DATA], this.canvas.width, this.canvas.height);
        }
        console.log(`${this} Not implemented: context2d.getImageData( ${Array.from(arguments).join(', ')} )`);
        const id = new ImageData(sw, sh, settings);
        return id;
    }
    putImageData(imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
        let premultWarnLow, premultWarnZero;
        const canvas = this.canvas[CANVAS_DATA];
        if (dirtyX === undefined) {
            if (dx === 0 && dy === 0 && imagedata.width === this.canvas.width && imagedata.height === this.canvas.height) {
                console.log(`${this}→putImageData( ${Array.from(arguments).join(', ')} ) whole canvas ${this.canvas.width}x${this.canvas.height}`);
                for (let col = 0; col < imagedata.height; ++col) {
                    for (let row = 0; row < imagedata.width; ++row) {
                        const idx = (col * imagedata.width + row) * 4;
                        const alpha = imagedata.data[idx + 3], r = imagedata.data[idx + 0], g = imagedata.data[idx + 1], b = imagedata.data[idx + 2];
                        // Transparent pixels that are not fully black/white have browser inconsistencies
                        // Context for these warnings:
                        // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData#data_loss_due_to_browser_optimization
                        if (alpha === 0 && (r | g | b) !== 0 && (r & g & b) !== 255) {
                            premultWarnZero = true;
                        }
                        else if (alpha < 255 && (r | g | b) !== 0 && (r & g & b) !== 255) {
                            premultWarnLow = true;
                        }
                        canvas[idx + 0] = r;
                        canvas[idx + 1] = g;
                        canvas[idx + 2] = b;
                        canvas[idx + 3] = alpha; //a
                    }
                }
                if (premultWarnLow) {
                    console.log(`${this} Compat warning: image contained colored non-opaque pixels (alpha<255), the result be inconsistent with observed browser behavior.`);
                }
                if (premultWarnZero) {
                    console.log(`${this} Compat warning: image contained fully transparent colored pixels (alpha=0), the result of this operation may differ from browser behavior.`);
                }
                return;
            }
            console.log(`${this} Not implemented: non-whole-canvas putImageData( ${Array.from(arguments).join(', ')} )`);
            return;
        }
        console.log(`${this} Not implemented: context2d.putImageData( ${Array.from(arguments).join(', ')} )`);
    }
    setTransform(matrixOrA, b, c, d, e, f) {
        console.log(`${this} Not implemented: context2d.setTransform( ${Array.from(arguments).join(', ')} )`);
    }
    // Stringifies the context object with its canvas & unique ID to ease debugging
    get [Symbol.toStringTag]() {
        return `${this.canvas[Symbol.toStringTag]}::context2d`;
    }
    // https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
    get fillStyleRGBA() {
        let c;
        let r = 0, g = 0, b = 0, a = 1;
        // Named color ('white', 'black', etc)
        if (CSS_NAMED_COLORS.has(this.fillStyle)) {
            c = HTMLColorToRGBA(CSS_NAMED_COLORS.get(this.fillStyle));
            if (c)
                return c;
        }
        // HTML color (#aaa, #bbccdd, #rrggbbaa)
        c = HTMLColorToRGBA(this.fillStyle);
        if (c)
            return c;
        // rgb() color definition
        c = HTMLColorToRGBA(this.fillStyle);
        if (c)
            return c;
        return { r, g, b, a };
    }
}
// TODO: these are only the basic colors
const CSS_NAMED_COLORS = new Map([
    ["black", "#000000"],
    ["silver", "#c0c0c0"],
    ["gray", "#808080"],
    ["white", "#ffffff"],
    ["maroon", "#800000"],
    ["red", "#ff0000"],
    ["purple", "#800080"],
    ["fuchsia", "#ff00ff"],
    ["green", "#008000"],
    ["lime", "#00ff00"],
    ["olive", "#808000"],
    ["yellow", "#ffff00"],
    ["navy", "#000080"],
    ["blue", "#0000ff"],
    ["teal", "#008080"],
    ["aqua", "#00ffff"],
]);
function HTMLColorToRGBA(color) {
    var _a, _b;
    let r = 0, g = 0, b = 0, a = 0;
    let matched, wasMatched;
    // Match longform
    matched = (_a = color.match(/^#(?<r>[0-9a-f]{2})(?<g>[0-9a-f]{2})(?<b>[0-9a-f]{2})(?<a>[0-9a-f]{2})?$/)) === null || _a === void 0 ? void 0 : _a.groups;
    if ((matched === null || matched === void 0 ? void 0 : matched.r) && (matched === null || matched === void 0 ? void 0 : matched.g) && (matched === null || matched === void 0 ? void 0 : matched.b)) {
        r = parseInt(matched.r, 16);
        g = parseInt(matched.g, 16);
        b = parseInt(matched.b, 16);
        a = matched.a ? parseInt(matched.a, 10) : 1.0;
        wasMatched = true;
    }
    // Match short form
    matched = (_b = color.match(/^#(?<r>[0-9a-f]{1})(?<g>[0-9a-f]{1})(?<b>[0-9a-f]{1})(?<a>[0-9a-f]{1})?$/)) === null || _b === void 0 ? void 0 : _b.groups;
    if ((matched === null || matched === void 0 ? void 0 : matched.r) && (matched === null || matched === void 0 ? void 0 : matched.g) && (matched === null || matched === void 0 ? void 0 : matched.b)) {
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

// https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element
// Implementation
const WIDTH = Symbol("canvas-width");
const HEIGHT = Symbol("canvas-height");
const CONTEXT = Symbol("canvas-context");
const EID = Symbol("element-id");
// Access canvas data (for the Context or testing/debugging)
const CANVAS_DATA = Symbol("accesscanvas-data");
class HTMLCanvasElement extends Node {
    get width() {
        console.debug(`${this}→width? (${this[WIDTH]})`);
        return this[WIDTH];
    }
    get height() {
        console.debug(`${this}→height? (${this[HEIGHT]})`);
        return this[HEIGHT];
    }
    set width(width) {
        console.debug(`${this}→width = ${width}`);
        this[WIDTH] = width;
        this.resize(this[WIDTH], this[HEIGHT]);
    }
    set height(height) {
        console.debug(`${this}→height = ${height}`);
        this[HEIGHT] = height;
        this.resize(this[WIDTH], this[HEIGHT]);
    }
    //getContext(contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext | null;
    //getContext(contextId: string, options?: any): RenderingContext | null;
    getContext(contextId, _options) {
        if (contextId != "2d")
            throw new Error(`Not implemented: ${contextId}`);
        this[CONTEXT] = this[CONTEXT] || new CanvasRenderingContext2D(this);
        if (!(this[CONTEXT] instanceof CanvasRenderingContext2D))
            throw new Error(`Context invalid`);
        return this[CONTEXT];
    }
    toDataURL(_type = "image/png", _quality) {
        throw new Error("Not implemented");
    }
    toBlob(_callback, _type = "image/png", _quality) {
        throw new Error("Not implemented");
    }
    get clientWidth() {
        return this.width;
    }
    get clientHeight() {
        return this.height;
    }
    constructor() {
        super(EXTEND_NODE);
        // Assign a new pseudo-random element ID
        this[EID] = (Math.random() * (Math.pow(36, 6)) | 0).toString(36);
        // The default size of a new canvas in most implementations
        this.resize(300, 150);
    }
    // Stringifies the object including its unique element tag
    get [Symbol.toStringTag]() {
        return `HTMLCanvasElement#${this[EID]}`;
    }
    resize(width, height) {
        this[WIDTH] = width;
        this[HEIGHT] = height;
        this[CANVAS_DATA] = new Uint8ClampedArray(this[WIDTH] * this[HEIGHT] * 4);
        console.debug(`${this}→reset, new size: ${this[WIDTH]}x${this[HEIGHT]} (${this[CANVAS_DATA].length}b)`);
    }
}
// Export onto the global scope
if (globalThis && typeof globalThis.HTMLCanvasElement !== "object") {
    // @ts-ignore
    globalThis.HTMLCanvasElement = HTMLCanvasElement;
}

function createCanvasNode( nodeType )
{
	const node = new HTMLCanvasElement();

	node[NODE_TYPE] = nodeType;
	node.nodeValue = null;
	node[PARENT_NODE] = null;
	node[OWNER] = null;
	
	switch ( nodeType )
	{
		case Node.ELEMENT_NODE:
			node[TAG_NAME] = null;
			node.attributes = {};
			// fallthrough
			
		case Node.DOCUMENT_NODE:
		case Node.DOCUMENT_FRAGMENT_NODE:
			node.childNodes = [];
	}
	
	return node;
}

const decodingRE = /&(#\d+|#[xX][0-9a-fA-F]+|[0-9a-zA-Z]+);?/g,
	
	// From 'SyntaxCharacter' in section 21.2.1 (Patterns) of the ECMAScript 6.0 spec.
	regExpEscapeRE = /[\^$\\.*+?()[\]{}|]/g,
	
	_defaultEntities = processEntities( {
		"amp": "&",
		"apos": "'",
		"copy": 169,
		"gt": ">",
		"lt": "<",
		"nbsp": 160,
		"quot": '"'
	} );

let defaultEntities = _defaultEntities;

class EntityEncoder
{
	constructor( entities )
	{
		this.entities = entities || "default";
	}
	
	encode( string, what )
	{
		if ( !this.encodingReplacements ) return string;
		return string.replace( what instanceof RegExp ? globalizeRegExp( what ) : this.encodingRE, chr => this.encodingReplacements[chr] || chr );
	}
	
	decode( string )
	{
		if ( !this.decodingReplacements ) return string;
		return string.replace( decodingRE, ( _, m ) =>
		{
			if ( m[0] === "#" )
			{
				if ( m[1] === "x" || m[1] === "X" )
					m = parseInt( m.slice( 2 ), 16 ) | 0;
				else m = m.slice( 1 ) | 0;
				return String.fromCodePoint( m );
			}
			return this.decodingReplacements[m] || this.decodingReplacements[m.toLowerCase()] || _;
		} );
	}
	
	set entities( entities )
	{
		if ( entities === "default" )
			entities = defaultEntities;
		else if ( !entities || !(entities.encodingRE instanceof RegExp) )
			entities = processEntities( entities );
		
		this.encodingRE = entities.encodingRE;
		this.encodingReplacements = entities.encodingReplacements;
		this.decodingReplacements = entities.decodingReplacements;
	}
	
	static set defaultEntities( entities )
	{
		if ( entities && typeof entities === "object" )
			defaultEntities = processEntities( Object.assign( {}, entities ) );
		else defaultEntities = _defaultEntities;
	}
}

function processEntities( entities )
{
	var result = {
			encodingRE: null,
			encodingReplacements: null,
			decodingReplacements: null
		};
	
	if ( entities && typeof entities === "object" )
	{
		const escapes = {},
			unescapes = {},
			entityList = [];
		
		for ( let k in entities )
			if ( entities.hasOwnProperty( k ) )
			{
				let entity = entities[k];
				
				if ( Number.isFinite( entity ) )
					entity = String.fromCodePoint( entity );
				else if ( typeof entity !== "string" || entity === "" )
					continue;
				
				entityList.push( entity.replace( regExpEscapeRE, "\\$&" ) );
				if ( !escapes.hasOwnProperty( entity ) || (k.length + 2) < escapes[entity].length )
					escapes[entity] = "&"+ k +";";
				unescapes[k] = entity;
			}
		
		if ( entityList.length > 0 )
		{
			result.encodingRE = new RegExp( entityList.join( "|" ), "g" );
			result.encodingReplacements = escapes;
			result.decodingReplacements = unescapes;
		}
	}
	
	if ( !result.encodingRE )
		result.encodingRE = new RegExp( "(?:)", "g" );
	
	return result;
}

/* @END_UNIT_TESTS */

const ENTITY_ENCODER = Symbol( "entityEncoder" );

class DOM extends Node
{
	constructor( html, options )
	{
		const node = createNode( Node.DOCUMENT_FRAGMENT_NODE, DOM );
		node[PARSER_OPTIONS] = Parser.setupOptions( options );
		node[ENTITY_ENCODER] = new EntityEncoder( node[PARSER_OPTIONS].entities );
		node.innerHTML = html;
		return node;
	}
	
	get documentElement() {return this[DOCUMENT_ELEMENT] || null}
	
	get innerHTML()
	{
		let html = "";
		for ( let i = 0; i < this.childNodes.length; i++ )
			html += serializeNode( this.childNodes[i] );
		return html;
	}
	set innerHTML( html )
	{
		this[NODE_TYPE] = Node.DOCUMENT_FRAGMENT_NODE;
		if ( html && typeof html === "string" )
		{
			const rootNode = new Parser( html, this[PARSER_OPTIONS], this[ENTITY_ENCODER] ).parseHTML();
			
			detachNodes( this.childNodes );
			
			if ( rootNode.doctype )
				this[DOCTYPE] = rootNode.doctype;
			else this[DOCTYPE] = null;
			
			this.childNodes = rootNode.childNodes;
			for ( let i = 0; i < this.childNodes.length; i++ )
				setNodeParent( this.childNodes[i], this );
			
			setupDocument( this );
		}
		else this.childNodes.length = 0;
	}
	
	get outerHTML() {return null}
	set outerHTML( v ) {}
	
	get doctype()
	{
		return this[DOCTYPE] || null;
	}
	set doctype( val )
	{
		if ( val )
		{
			let doctype = this[DOCTYPE];
			if ( val instanceof Node )
			{
				if ( val.nodeType === Node.DOCUMENT_TYPE_NODE && val !== doctype )
				{
					this[DOCTYPE] = val;
					if ( doctype ) this.replaceChild( val, doctype );
					else this.insertBefore( val, this.firstChild );
				}
			}
			else if ( typeof val === "object" )
			{
				if ( !doctype )
					this[DOCTYPE] = this.insertBefore( this.createDocumentType( val.name, val.publicId, val.systemId ), this.firstChild );
				else setupDocumentType( doctype, val.name, val.publicId, val.systemId );
			}
		}
		else if ( val === null && this[DOCTYPE] )
		{
			this.removeChild( this[DOCTYPE] );
			this[DOCTYPE] = null;
		}
	}
	
	get head()
	{
		return this[HEAD] || null;
	}
	
	get title()
	{
		const head = this.head;
		if ( head )
		{
			const title = head.getElementsByTagName( "title" );
			if ( title.length > 0 )
				return title[0].textContent;
		}
		return "";
	}
	set title( val )
	{
		const head = this.head;
		if ( head )
		{
			let title = head.getElementsByTagName( "title" );
			if ( title.length <= 0 )
				title = head.appendChild( this.createElement( "title" ) );
			else title = title[0];
			title.textContent = val;
		}
	}
	
	get body()
	{
		return this[BODY] || null;
	}
	set body( val )
	{
		if ( val instanceof Node && val.nodeType === Node.ELEMENT_NODE &&
			(val.tagName === "BODY" || val.tagName === "FRAMESET") &&
			val !== this[BODY] && this[DOCUMENT_ELEMENT] )
		{
			if ( this[BODY] ) this[BODY].parentNode.replaceChild( val, this[BODY] );
			else this[DOCUMENT_ELEMENT].appendChild( val );
		}
	}

	get entityEncoder()
	{
		return this[ENTITY_ENCODER];
	}

	createElement( tagName )
	{
		if ( tagName && typeof tagName === "string" )
		{
			const node = createNodeForTagName( tagName );
			node[TAG_NAME] = tagName.toUpperCase();
			return node;
		}
	}

	createTextNode( text )
	{
		return createTextBasedNode( Node.TEXT_NODE, text );
	}

	createComment( data )
	{
		return createTextBasedNode( Node.COMMENT_NODE, data );
	}

	createCDATASection( data )
	{
		return createTextBasedNode( Node.CDATA_SECTION_NODE, data, "]]>" );
	}

	createProcessingInstruction( target, data )
	{
	NewNode:
		if ( target && typeof target === "string" )
		{
			if ( Parser.isNameCharStart( target[0] ) )
				for ( let i = 1; i < target.length; i++ )
				{
					if ( !Parser.isNameChar( target[i] ) )
						break NewNode;
				}
			else break NewNode;
			
			const node = createTextBasedNode( Node.PROCESSING_INSTRUCTION_NODE, data, "?>" );
			node.target = target;
			return node;
		}
		throw new Error( "Invalid target name "+ JSON.stringify( target ) +"." );
	}

	createDocumentType( name, publicId, systemId )
	{
		return setupDocumentType( createNode( Node.DOCUMENT_TYPE_NODE ), name, publicId, systemId );
	}

	getElementsByName( name )
	{
		const nodeList = [];
		if ( name && typeof name === "string" )
			this.forEach( node =>
			{
				if ( node.attributes && node.attributes.name === name )
					nodeList.push( node );
			} );
		return nodeList;
	}
}

function createTextBasedNode( type, text, disallowed = false )
{
	const node = createNode( type );
	node.nodeValue = "";
	if ( text && typeof text === "string" )
	{
		if ( disallowed && typeof disallowed === "string" && text.indexOf( disallowed ) !== -1 )
			throw new Error( "The data provided ('"+ text +"') contains '"+ disallowed +"'." );
		node.nodeValue += text;
	}
	return node;
}

function setupDocumentType( doctype, name, publicId, systemId )
{
	if ( name && typeof name === "string" )
	{
		doctype.name = name.toLowerCase();
		
		if ( publicId && typeof publicId === "string" )
			doctype.publicId = publicId;
		else doctype.publicId = "";
		
		if ( systemId && typeof systemId === "string" )
			doctype.systemId = systemId;
		else doctype.systemId = "";
	}
	else doctype.name = doctype.publicId = doctype.systemId = "";
	
	return doctype;
}

function createNodeForTagName( tagName )
{
	switch ( tagName.toLowerCase() )
	{
		case 'canvas':
			return createCanvasNode( Node.ELEMENT_NODE );
		default:
			return createNode( Node.ELEMENT_NODE );
	}
}

/* @START_UNIT_TESTS */
DOM.parseSelector = parseSelector;
/* @END_UNIT_TESTS */

DOM.Node = Node;
DOM.EntityEncoder = EntityEncoder;

module.exports = DOM;
//# sourceMappingURL=fauxdom-with-canvas.tests.cjs.map
