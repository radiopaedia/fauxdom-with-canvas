import Node, {createNode} from "./node.js";
import {HTMLCanvasElement} from "./js-canvas/HTMLCanvasElement.js";
import {NODE_TYPE, PARENT_NODE, OWNER, TAG_NAME} from "./utils.js";

export function createCanvasNode( nodeType )
{
	const node = createNode( CanvasNode.prototype );
	console.log('creating a CanvasNode', node);
	
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

export default class CanvasNode extends HTMLCanvasElement {

}
