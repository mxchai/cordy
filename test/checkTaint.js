function checkTaint() {
  var lineNum = arguments[0];
  var result = 0;
  for (var i = 1; i < arguments.length; i++) {
    result |= arguments[i];
  }

  if (result === 1) {
    console.log("CORDY WARNING: Line " + lineNum + " of the original JS file might be tainted.");
  }
}
