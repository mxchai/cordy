function checkTaint() {
  var lineNum = arguments[0];
  var result = 0;
  for (var i = 1; i < arguments.length; i++) {
    result |= arguments[i];
  }

  if (result === 1) {
    console.log("CORDY WARNING: Line " + lineNum + " might be tainted.");
  }
}
var taint = {};
taint.fn = {};
var a = 10;
taint.a = 0;
var b = a;
taint.b = taint.a;
var c = [1, a, b];
taint.c = 0 | taint.a | taint.b;
var d = { foo: 1, bar: a, baz: "string" };
taint.d = 0 | taint.a | 0;
var e = hey(a, b, taint.a, taint.b);
taint.e = taint.fn.hey;
var f = foo.bar;
taint.f = taint.foo;
var g = a + b + c;

taint.g = taint.a | taint.b | taint.c;
taint.hey = {};
taint.fn.hey = 0;
function hey(a, b, taint_a, taint_b) {
  var e = a;
  taint.hey.e = taint_a;
  var f = [a, b, c];
  taint.hey.f = taint_a | taint_b | taint.c;
  var w = e + f + b;
  taint.hey.w = taint.hey.e | taint.hey.f | taint_b;
  var y = a + b;
  taint.hey.y = taint_a | taint_b;

  var __retVal = d + b;

  taint.hey.__retVal = taint.d | taint_b;
  taint.fn.hey = taint.hey.__retVal;
  return __retVal;
}

taint.bye = {};
taint.fn.bye = 0;
function bye(c, d, taint_c, taint_d) {
  var foo = 123;
  taint.bye.foo = 0;
  var bar = c;
  taint.bye.bar = taint_c;
}

var z = 20;

taint.z = 0;
taint.hey1 = {};
taint.fn.hey1 = 0;
function hey1(a, taint_a) {
  var param = a;
  taint.hey1.param = taint_a;
}

taint.hey2 = {};
taint.fn.hey2 = 0;
function hey2(f, taint_f) {
  var globally = a;
  taint.hey2.globally = taint.a;
}

taint.hey3 = {};
taint.fn.hey3 = 0;
function hey3(f, taint_f) {
  var a = 90;
  taint.hey3.a = 0;
  var local = a;
  taint.hey3.local = taint.hey3.a;
}

taint.hey = {};
taint.fn.hey = 0;
function hey(a, b, taint_a, taint_b) {
  var __retVal = a + b;

  taint.hey.__retVal = taint_a | taint_b;
  taint.fn.hey = taint.hey.__retVal;
  return __retVal;
}

taint.hey1 = {};
taint.fn.hey1 = 0;
function hey1() {
  var __retVal = hey(1, 2, 0, 0);

  taint.hey1.__retVal = taint.fn.hey;
  taint.fn.hey1 = taint.hey1.__retVal;
  return __retVal;
}

taint.hey2 = {};
taint.fn.hey2 = 0;
function hey2(a, taint_a) {
  var __retVal = a;
  taint.hey2.__retVal = taint_a;
  taint.fn.hey2 = taint.hey2.__retVal;
  return __retVal;
}

taint.hey3 = {};
taint.fn.hey3 = 0;
function hey3(a, b, taint_a, taint_b) {
  var __retVal = a + b + hey(a, b);

  taint.hey3.__retVal = taint_a | taint_b | taint.fn.hey;
  taint.fn.hey3 = taint.hey3.__retVal;
  return __retVal;
}

taint.createFile2 = {};
taint.fn.createFile2 = 0;
function createFile2() {
  window.requestFileSystem(a, b, cordyAnonymous0, cordyAnonymous1);
  taint.cordyAnonymous1 = {};
  taint.fn.cordyAnonymous1 = 0;

  function cordyAnonymous1() {
    console.log('b');
  }

  taint.cordyAnonymous0 = {};
  taint.fn.cordyAnonymous0 = 0;

  function cordyAnonymous0() {
    var a = 1 + 2;
    taint.cordyAnonymous0.a = 0 | 0;
  }
}

var a = new Hello();
taint.a = 0;
var b = new Bye(1, x);

taint.b = 0 | taint.x;
var a = document.getElementById('hello').value;

taint.a = 1;
var contentsToWrite = document.getElementById("write-to-file").value;
taint.contentsToWrite = 1;
var blob = new Blob([contentsToWrite], { type: 'text/plain' });
taint.blob = taint.contentsToWrite | 0;
checkTaint(68, taint.blob);
fileWriter.write(blob);