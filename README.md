# Taint Policy

## Source
- `getElementById`
- `fs.root.getFile`

## Sink
- `alert`
- `fileWrite.write`
- `document.write`
- Functions which allow information from the app to flow outside (go research on this)

## Propagation Policy: Expression

### Identifier
```
LHS = identifier
getTaint(LHS) = getTaint(identifier)
```

### Literal
```
LHS = "hello"
getTaint(LHS) = 0;
```
Assign `0` to LHS, because Literals do not start with any taint.

### ArrayExpression
```
LHS = [1,2,"hello","world"]
getTaint(RHS) = getTaint(array[0]) OR getTaint(array[1]) OR ...
getTaint(LHS) = getTaint(RHS)
```
Scan through the array, and evaluate each `Expression` found in the array.

### ObjectExpression
```
LHS = {hello: "world", 1:2}
getTaint(RHS) = map OR over each getTaint(Property)
getTaint(LHS) = getTaint
```
Iterate though each Property of the ObjectExpression, then `OR` their taint together, much like ArrayExpression.

### FunctionExpression
Apparently this appears when you declare a function callback within another function. Need to think of how to handle this, and the callback case (which will probably get very thorny...)

### CallExpression
```
LHS = foo()
getTaint(LHS) = getTaint(foo)
```
CallExpression is a function call.

### UnaryExpression
```
getTaint(LHS) = getTaint(operand)
```
Not yet coded.

### BinaryExpression
```
getTaint(LHS) = getTaint(operand1) OR getTaint(operand2)
```
Taint is simply the OR of the two operands on the RHS.

### LogicalExpression
```
getTaint(LHS) = getTaint(operand1) OR getTaint(operand2)
```
Not yet coded, but the logic is exactly the same as BinaryExpression

### AssignmentExpression
```
var foo = a;
foo = bar();
```
Not yet coded.
I think can use the var declarator logic.

## Propagation Policy: Statements and Declarations

### FunctionDeclaration
Instrument every function that is declared and update them in the `taint.fn.<local variable>` map.

### VariableDeclaration
Catch every VariableDeclaration and update the taint of LHS. Basically, everything described in the previous section, **Propagation Policy: Expression**, applies to VariableDeclaration.
