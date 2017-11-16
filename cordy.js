//////////// cordy Babel plugin ////////////
module.exports = function(babel) {
  var t = babel.types;
  var scope = "";
  var lhsScope = "";

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
      let tmId = scope ? t.identifier("taint." + scope) : t.identifier("taint");
      let tmExpression = t.MemberExpression(
        tmId,
        t.identifier(node.name)
      );
      return tmExpression;
    } else if (t.isLiteral(node)) {
      return t.numericLiteral(0);
    } else if (t.isCallExpression(node)) {
      let tmId = t.identifier("taint.fn");
      let rhsTaint = t.MemberExpression(
        tmId,
        t.identifier(node.callee.name)
      );
      return rhsTaint
    } else if (t.isMemberExpression(node)) {
      let name = node.object.name;
      let tmId = t.identifier("taint");
      let rhsTaint = t.MemberExpression(
        tmId,
        t.identifier(name)
      );
      return rhsTaint;
    } else {
        return 0;
    }
  }

  /**
   * createTaintStatusUpdate -
   * helper function to create taint.<varName> = taint
   *
   * @param  {Path} path        Path object from Babel
   * @param  {String} lhsName
   * @param  {String} rhsTaint
   * @return {null}             Instruments the code, no return value
   */
  function createTaintStatusUpdate(path, lhsName, rhsTaint) {
    let name = t.identifier(
      lhsName
    );

    let tmId = t.identifier(
      lhsScope ? "taint." + lhsScope : (scope ? "taint." + scope : "taint")
    );

    let tmExpression = t.MemberExpression(
      tmId,
      name
    )

    let expr = t.expressionStatement(
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
    let rhs = varDeclarator.init;
    let lhsName = varDeclarator.id.name;

      //////////// Identifier ////////////
    if (t.isIdentifier(rhs)) {
      let hasOwnBinding = path.scope.hasOwnBinding(rhs.name);
      let hasBinding = path.scope.hasBinding(rhs.name);
      let isLocalVar = isLocalVariableInBlockStatement(path, rhs.name);

      let rhsIsParam = hasOwnBinding && !isLocalVar;
      let rhsIsLocalVar = isLocalVar;
      let rhsIsNotLocalNotParam = !rhsIsParam && !rhsIsLocalVar;

      let rhsTaint = "";

      if (t.isBlockStatement(path.parent)) {
        if (rhsIsParam) {
          rhsTaint = t.identifier(`taint_${rhs.name}`);
        } else if (rhsIsLocalVar) {
          let funcDeclaration = path.parentPath.parent;
          scope = funcDeclaration.id.name;
          rhsTaint = getTaint(rhs);
        } else if (rhsIsNotLocalNotParam) {
          scope = "";
          rhsTaint = getTaint(rhs);
        }
      } else {
        scope = "";
        rhsTaint = getTaint(rhs);
      }
      createTaintStatusUpdate(path, lhsName, rhsTaint);
      scope = "";

      //////////// Literal ////////////
    } else if (t.isLiteral(rhs)) {
      // t.isLiteral is not a public method, but is a useful
      // undocumented function that tests for AST Literal nodes
      let rhsTaint = getTaint(rhs)
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// ArrayExpression ////////////
    } else if (t.isArrayExpression(rhs)) {
      let arrElements = rhs.elements;
      let rhsTaint = chainBinaryOr(arrElements);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// ObjectExpression ////////////
    } else if (t.isObjectExpression(rhs)) {
      // Extract all values of properties
      let arrValues = [];
      for (let i = 0; i < rhs.properties.length; i++) {
        let property = rhs.properties[i];
          arrValues.push(property.value);
      }
      let rhsTaint = chainBinaryOr(arrValues);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// CallExpression ////////////
    } else if (t.isCallExpression(rhs)) {
      // Add more arguments to a CallExpress e.g. taint.<arg>
      let arrLength = rhs.arguments.length;
      for (let i = 0; i < arrLength; i++) {
        rhs.arguments.push(getTaint(rhs.arguments[i]));
      }
      let rhsTaint = getTaint(rhs)
      createTaintStatusUpdate(path, lhsName, rhsTaint);
    } else if (t.isMemberExpression(rhs)) {
      let rhsTaint = getTaint(rhs)
      createTaintStatusUpdate(path, lhsName, rhsTaint);
    }
  }

  /**
   * isLocalVariableInBlockStatement
   *
   * @param  {Path} path              Babel path object
   * @param  {String} varName         Variable string name
   * @return {Boolean}                Result of check
   */
  function isLocalVariableInBlockStatement(path, varName) {
    let body = path.parent.body;
    for (index in body) {
      let node = body[index];
      if (node.type === 'VariableDeclaration') {
        // NOTE: this can only do one level deep
        let name = node.declarations[0].id.name;
        if (name === varName) return true
      }
    }
    return false;
  }

  function instrumentVariableDeclaration(path) {
    // Avoid infinite loop where Babel instruments newly added nodes
    if (path.node.isClean) { return; }
    // Handle each declarator
    let arrLength = path.node.declarations.length;
    for (let i = 0; i < arrLength; i++) {
      let declarator = path.node.declarations[i];
      if (t.isBlockStatement(path.parent)) {
        let funcDeclaration = path.parentPath.parent;
        lhsScope = funcDeclaration.id.name;
        handleVariableDeclarator(declarator, path);
        lhsScope = "";
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
    let node = path.node;

    // hacky(path);

    let arrLength = node.params.length;
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
