//////////// cordy Babel plugin ////////////
module.exports = function(babel) {
  var t = babel.types;
  var scope = "";

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
      var tmId = scope ? t.identifier("taintMap." + scope) : t.identifier("taintMap");
      var tmExpression = t.MemberExpression(
        tmId,
        t.identifier(node.name)
      );
      return tmExpression;
    } else if (t.isLiteral(node)) {
      return t.numericLiteral(0);
    } else if (t.isCallExpression(node)) {
      // TODO: just return taintMap.function.<function name>
      console.log("call expression :(");
    } else if (t.isMemberExpression(node)) {
      console.log("member expression :(");
    } else {
        return 0;
    }
  }

  /**
   * createTaintStatusUpdate -
   * helper function to create taintMap.<varName> = taint
   *
   * @param  {Path} path        Path object from Babel
   * @param  {String} lhsName
   * @param  {String} rhsTaint
   * @return {null}             Instruments the code, no return value
   */
  function createTaintStatusUpdate(path, lhsName, rhsTaint) {



    var name = t.identifier(
      lhsName
    );

    var tmId = t.identifier(
      scope ? "taintMap." + scope : "taintMap"
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
    var rhs = varDeclarator.init;
    var lhsName = varDeclarator.id.name;

      //////////// Identifier ////////////
    if (t.isIdentifier(rhs)) {
      let scopeExists = path.scope.hasOwnBinding(rhs.name);
      console.log("============ " + rhs.name);
      console.log("============ " + scopeExists);
      if (!scopeExists) {
        scope = "";
      }
      var rhsTaint = getTaint(rhs);
      createTaintStatusUpdate(path, lhsName, rhsTaint);
      scope = "asdasd";

      //////////// Literal ////////////
    } else if (t.isLiteral(rhs)) {
      // t.isLiteral is not a public method, but is a useful
      // undocumented function that tests for AST Literal nodes
      var rhsTaint = getTaint(rhs)
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// ArrayExpression ////////////
    } else if (t.isArrayExpression(rhs)) {
      var arrElements = rhs.elements;
      var rhsTaint = chainBinaryOr(arrElements);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// ObjectExpression ////////////
    } else if (t.isObjectExpression(rhs)) {
      // Extract all values of properties
      var arrValues = [];
      for (var i = 0; i < rhs.properties.length; i++) {
        var property = rhs.properties[i];
          arrValues.push(property.value);
      }
      var rhsTaint = chainBinaryOr(arrValues);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// CallExpression ////////////
    } else if (t.isCallExpression(rhs)) {
      // Add more arguments to a CallExpress e.g. taint.<arg>
      var arrLength = rhs.arguments.length;
      for (let i = 0; i < arrLength; i++) {
        rhs.arguments.push(getTaint(rhs.arguments[i]));
      }
      // Pardon the code duplication
      var tmId = t.identifier("taintMap.function");
      var rhsTaint = t.MemberExpression(
        tmId,
        t.identifier(rhs.callee.name)
      );
      createTaintStatusUpdate(path, lhsName, rhsTaint);
    }
  }

  function instrumentVariableDeclaration(path) {
    // Avoid infinite loop where Babel instruments newly added nodes
    if (path.node.isClean) { return; }

    // Handle each declarator
    var arrLength = path.node.declarations.length;
    for (var i = 0; i < arrLength; i++) {
      var declarator = path.node.declarations[i];
      // console.log(path.parent);
      if (t.isBlockStatement(path.parent)) {
        let funcDeclaration = path.parentPath.parent;
        scope = funcDeclaration.id.name;
        handleVariableDeclarator(declarator, path);
        scope = "";
      } else {
        handleVariableDeclarator(declarator, path);
      }
    }
  }

  function hacky(path) {
    // Avoid infinite loop where Babel instruments newly added nodes
    if (path.node.isClean) { return; }

    // Handle each declarator within the functionBlock
    let functionBlock = path.node.body;
    let blockLength = functionBlock.length;

    for (let i = 0; i < blockLength; i++) {
      let statement = functionBlock[i];
      if (isVariableDeclaration(statement)) {
        handleVariableDeclarator(declarator, path);
      }
    }
  }

  function instrumentFunctionDeclaration(path) {
    if (path.node.isClean) { return; }
    var node = path.node;

    // hacky(path);

    var arrLength = node.params.length;
    for (let i = 0; i < arrLength; i++) {
      node.params.push(t.Identifier("taint_" + node.params[i].name));
    }
  }

  //////////// Visitor pattern for instrumentation ////////////
  return {
    visitor: {
      VariableDeclaration: function(path) {
        instrumentVariableDeclaration(path);
      },
      FunctionDeclaration: function(path) {
        instrumentFunctionDeclaration(path);
      }
    }
  };
};
