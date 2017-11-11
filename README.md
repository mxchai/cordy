# Taint Policy

## Source
- `getElementById`

## Sink
- `alert`
- Functions which allow information from the app to flow outside (go research on this)

## Propagation Policy: Expression

### Identifier
getTaint(LHS) = getTaint(identifier)

### Literal
Just assign `0` to LHS.

getTaint(LHS) = 0;

### ArrayExpression
Scan through the array, and evaluate each `Expression` found in the array.

getTaint(RHS) = getTaint(array[0]) `OR` getTaint(array[1]) `OR` ...

### ObjectExpression
Iterate though each Property of the ObjectExpression.

getTaint(LHS) = map OR over the getTaint(Property)

### CallExpression


### UnaryExpression

### BinaryExpression

### LogicalExpression

### AssignmentExpression
This is the one we are looking at.

## Propagation Policy: Statements and Declarations

### ExpressionStatement

### FunctionDeclaration
Instrument every function that is declared and update them in the `taint.fn.<local variable>` map.

### VariableDeclaration
Catch every VariableDeclaration and update the taint of LHS.
