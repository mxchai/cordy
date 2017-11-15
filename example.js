var a = 10;
var b = a;
var c = [1,a,b];
var d = {foo:1, bar:a, baz:"string"};
var e = hey(a, b);

function hey(a, b) {
  var e = a;
  var f = [a,b,c];
  return d + b;
}

function bye(c,d) {
  var foo = 123;
  var bar = c;
}

var z = 20;

function hey1(a) {
  var param = a;
}

function hey2(f) {
  var globally = a;
}

function hey3(f) {
  var a = 90;
  var local = a;
}
