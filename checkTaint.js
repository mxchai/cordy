function checkTaint() {
  let lineNum = arguments[0];
  let result = 0;
  for (let i = 1; i < arguments.length; i++) {
    result |= arguments[i];
  }

  if (result) {
    console.log("CORDY WARNING: Line " + lineNum + " might be tainted.");
  }
}
