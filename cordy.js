//////////// Helper functions ////////////
function getTaintStatus() {
  return 0;
}

//////////// cordy Babel plugin ////////////
module.exports = function(babel) {
  var t = babel.types;

  //////////// Helper functions ////////////
  function createTaintStatusUpdate(path, declarator) {
    var name = t.identifier(
      declarator.id.name
    );

    var tmId = t.identifier(
      "taint_map"
    );

    var tmExpression = t.MemberExpression(
      tmId,
      name
    )

    var expr = t.expressionStatement(
      t.assignmentExpression(
        "=",
        tmExpression,
        t.numericLiteral(0)
      )
    );
    expr.isClean = true;
    path.insertAfter(expr);
  }

  //////////// Instrumentation functions ////////////
  function handleVariableDeclarator(declarator, path) {
      if (t.isLiteral(declarator.init)) {
        createTaintStatusUpdate(path, declarator);
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
