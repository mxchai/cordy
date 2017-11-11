//////////// cordy Babel plugin ////////////
module.exports = function(babel) {
  var t = babel.types;

  function handleExpression(expression) {
    return 0;
  }


  /**
   * chainBinaryOr - Used in ArrayExpression to generate the
   * taint expression
   *
   * @param  {type} arrElements ArrayExpression.init.elements
   * @return {type}             description
   */
  function chainBinaryOr(arrElements) {
    if (arrElements.length == 1) {
      return getTaint(arrElements[0]);
    } else {
      return t.BinaryExpression(
        '|',
        chainBinaryOr(arrElements.slice(0, arrElements.length - 1)),
        chainBinaryOr(arrElements.slice(arrElements.length - 1))
      );
    }
  }

  /**
   * getTaint - returns the taint value of node
   *
   * @param  {type} node VariableDeclarator.init
   * @return {type}      taint expression of node
   */
  function getTaint(node) {
    if (t.isIdentifier(node)) {
      var tmId = t.identifier("taintMap");
      var tmExpression = t.MemberExpression(
        tmId,
        t.identifier(node.name)
      );
      return tmExpression;
    } else if (t.isLiteral(node)) {
      return t.numericLiteral(0);
    } else if (t.isCallExpression(node)) {
      console.log("call expression :(");
    } else {
        return 0;
    }
  }

  /**
   * createTaintStatusUpdate -
   * helper function to create taintMap.<varName> = taint
   *
   * @param  {Path} path        Path object from Babel
   * @param  {String} varName
   * @return {null}             Instruments the code, no return value
   */
  function createTaintStatusUpdate(path, lhsName, rhsTaint) {
    var name = t.identifier(
      lhsName
    );

    var tmId = t.identifier(
      "taintMap"
    );

    var tmExpression = t.MemberExpression(
      tmId,
      name
    )

    var expr = t.expressionStatement(
      t.assignmentExpression(
        "=",
        tmExpression,
        rhsTaint
      )
    );
    expr.isClean = true;
    path.insertAfter(expr);
  }

  //////////// Instrumentation functions ////////////
  /**
   * handleVariableDeclarator - dispatch method for VariableDeclarator
   *
   * @param  {AST node} varDeclarator AST type VariableDeclarator(id, init)
   * @param  {Path} path              Babel path object
   * @return {null}                   Instruments the code, no return value
   */
  function handleVariableDeclarator(varDeclarator, path) {
    var lhsName = varDeclarator.id.name;

      //////////// Identifier ////////////
    if (t.isIdentifier(varDeclarator.init)) {
      var rhsTaint = getTaint(varDeclarator.init);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// Literal ////////////
    } else if (t.isLiteral(varDeclarator.init)) {
      // t.isLiteral is not a public method, but is a useful
      // undocumented function that tests for AST Literal nodes
      var rhsTaint = getTaint(varDeclarator.init)
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// ArrayExpression ////////////
    } else if (t.isArrayExpression(varDeclarator.init)) {
      var arrElements = varDeclarator.init.elements;
      var rhsTaint = chainBinaryOr(arrElements);
      createTaintStatusUpdate(path, lhsName, rhsTaint);
    }
  }

  function instrumentVariableDeclaration(path) {
    // Avoid infinite loop where Babel instruments newly added nodes
    if (path.node.isClean) { return; }

    // Handle each declarator
    for (var i = 0; i < path.node.declarations.length; i++) {
      var declarator = path.node.declarations[i];
      handleVariableDeclarator(declarator, path);
    }
  }

  //////////// Visitor pattern for instrumentation ////////////
  return {
    visitor: {
      VariableDeclaration: function(path) {
        instrumentVariableDeclaration(path);
      },
    }
  };
};
