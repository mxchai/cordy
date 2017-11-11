//////////// Helper functions ////////////
function getTaint() {
  return 0;
}

//////////// cordy Babel plugin ////////////
module.exports = function(babel) {
  var t = babel.types;

  /**
   * createTaintStatusUpdate -
   * helper function to create taintMap.<varName> = taint
   *
   * @param  {Path} path Path object from Babel
   * @param  {String} varName
   * @return {null} Instruments the code, no return value
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
  function handleVariableDeclarator(varDeclarator, path) {
    // varDeclarator is of AST type VariableDeclarator(id, init)
    if (t.isIdentifier(varDeclarator.init)) {
      var lhsName = varDeclarator.id.name;
      var tmId = t.identifier("taintMap");
      var rhsTaint = t.MemberExpression(
        tmId,
        t.identifier(varDeclarator.init.name)
      );
      createTaintStatusUpdate(path, lhsName, rhsTaint);

    } else if (t.isLiteral(varDeclarator.init)) {
      // t.isLiteral is not a public method, but is a useful
      // undocumented function that tests for AST Literal nodes
      var lhsName = varDeclarator.id.name;
      var rhsTaint = t.numericLiteral(0)
      createTaintStatusUpdate(path, lhsName, rhsTaint);

    } else if (t.isArrayExpression) {

      console.log("hola amigos!");
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
