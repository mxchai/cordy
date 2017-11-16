var fs = require('fs')
var htmlParser = require('parse5');

// This parser will return a list of ids of DOM elements that accept user inputs

var name = process.argv[2];
fs.readFile(name, 'utf8', function (err,data) {
	if (err) {
		return console.log(err);
	}

  // There should only be one HTML node
  var htmlNode = getNodes('html', htmlParser.parse(data).childNodes)[0];
  var bodyNode = getNodes('body', htmlNode.childNodes)[0];

  var listOfFormNodes = [].concat.apply([],DFS_formNodes(bodyNode, []));
  var listOfVulnerableDomIds = [];

  for (var index in listOfFormNodes) {
    var formNode = listOfFormNodes[index];
    var listOfInputIds = getVulnerableInputIds(formNode);
    var listOfTextAreaIds = getVulnerableTextAreaIds(formNode);
    listOfVulnerableDomIds = listOfVulnerableDomIds.concat(listOfInputIds.concat(listOfTextAreaIds));
  }
  console.log(listOfVulnerableDomIds);
});

function DFS_formNodes(node, accum) {
  if (node.childNodes.length === 0) {
    return [];
  } else { // nodes has childNodes,
    // Need to recursively look for formNodes
    var listOfFirstLevelFormNodes = getNodes('form', node.childNodes);
    accum.push(listOfFirstLevelFormNodes);
    var otherChildNodes = node.childNodes.filter(dummy);
    for (var index in otherChildNodes) {
      var child = otherChildNodes[index];
      var childList = DFS_formNodes(child, accum);
      accum.push(childList);
    }
    return accum;
  }
}

function dummy(node) {
  return node.nodeName !== 'form' && node.nodeName !== 'script' && node.nodeName !== '#text';
}

// Returns the node, where nodeName === name
function getNodes(name, arr) {
  var listOfElements = [];
  for (var index in arr) {
    var node = arr[index];
    if (node.nodeName === name) {
      listOfElements.push(node);
    }
  }
  return listOfElements
}

function getVulnerableTextAreaIds(formNode) {
  var listOfTextAreaNodes = getNodes('textarea', formNode.childNodes);
  var listOfIds = [];
  for (var index in listOfTextAreaNodes) {
    var textAreaNode = listOfTextAreaNodes[index];
    listOfIds.push(getIdOfNode(textAreaNode));
  }
  return listOfIds;
}

function getVulnerableInputIds(formNode) {
  var listOfInputTextType = getNodes('input', formNode.childNodes).filter(isInputTextType);
  var listOfIds = [];
  for (var index in listOfInputTextType) {
    var inputTextNode = listOfInputTextType[index];
    listOfIds.push(getIdOfNode(inputTextNode));
  }
  return listOfIds;
}

// This function assumes (isInputTextType(node) === true ||
// node.nodeName === 'textarea') && the node's id is defined
function getIdOfNode(node) {
  var attributes = node.attrs;
  for (var index in attributes) {
    var attribute = attributes[index];
    if (attribute.name === 'id') {
      return attribute.value;
    }
  }
}

function isInputTextType(node) {
  if (node.nodeName === 'input') {
    return isTextType(node);
  }
}

// This function assumes that node.nodeName === 'input'
function isTextType(node) {
  var attributes = node.attrs;
  for (var index in attributes) {
    var attribute = attributes[index];
    if (attribute.name === 'type') {
      return attribute.value === 'text';
    }
  }
  return false;
}
