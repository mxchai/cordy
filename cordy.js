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
   * @param  {Path} path        Babel path object
   * @return {type}             description
   */
  function chainBinaryOr(arrElements, path) {
    if (arrElements.length == 1) {
      return getTaint(arrElements[0], path);
    } else {
      return t.BinaryExpression(
        '|',
        chainBinaryOr(arrElements.slice(0, arrElements.length - 1), path),
        chainBinaryOr(arrElements.slice(arrElements.length - 1), path)
      );
    }
  }

  /**
   * getTaint - returns the taint value of node
   *
   * @param  {type} node VariableDeclarator.init
   * @param  {Path} path              Babel path object
   * @return {type}      taint expression of node
   */
  function getTaint(node, path) {
    if (t.isIdentifier(node)) {
      let hasOwnBinding = path.scope.hasOwnBinding(node.name);
      let hasBinding = path.scope.hasBinding(node.name);
      let isLocalVar = isLocalVariableInBlockStatement(path, node.name);

      let nodeIsParam = hasOwnBinding && !isLocalVar;
      let nodeIsLocalVar = isLocalVar;
      let nodeIsNotLocalNotParam = !nodeIsParam && !nodeIsLocalVar;
      if (t.isBlockStatement(path.parent)) {
        if (nodeIsParam) {
          return t.identifier(`taint_${node.name}`);

        } else if (nodeIsLocalVar) {
          let funcDeclaration = path.parentPath.parent;
          scope = funcDeclaration.id.name;
        } else if (nodeIsNotLocalNotParam) {
          scope = "";
        }
      } else {
        scope = "";
      }
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
    } else if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) {
      return chainBinaryExprVar(node, path);
    } else {
        return 0;
    }
  }

  /**
   * chainBinaryExprVar. Recursive function because an
   * expression like 1 + 2 + 3 is actually 2 BinaryExpressions
   * that looks like ((1 + 2) + 3))
   *
   * @param  {type} node BinaryExpression or LogicalExpression
   * @param  {Path} path Babel path object
   * @return {type}      taint expression of node
   */
  function chainBinaryExprVar(node, path) {
    if (!t.isBinaryExpression(node) && !t.isLogicalExpression(node)) {
      return getTaint(node, path);
    } else {
      return t.BinaryExpression(
        '|',
        chainBinaryExprVar(node.left, path),
        chainBinaryExprVar(node.right, path)
      )
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
   * handleVariable - dispatch method for VariableDeclarator
   *
   * @param  {AST node} varDeclarator AST type VariableDeclarator(id, init)
   * @param  {Path} path              Babel path object
   * @return {null}                   Instruments the code, no return value
   */
  function handleVariableDeclarator(varDeclarator, path) {
    let lhsName = varDeclarator.id.name;
    let rhs = varDeclarator.init;
      //////////// Identifier ////////////
    if (t.isIdentifier(rhs)) {
      let rhsTaint = getTaint(rhs, path);
      createTaintStatusUpdate(path, lhsName, rhsTaint);
      scope = "";

      //////////// Literal ////////////
    } else if (t.isLiteral(rhs)) {
      // t.isLiteral is not a public method, but is a useful
      // undocumented function that tests for AST Literal nodes
      let rhsTaint = getTaint(rhs, path);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// ArrayExpression ////////////
    } else if (t.isArrayExpression(rhs)) {
      let arrElements = rhs.elements;
      let rhsTaint = chainBinaryOr(arrElements, path);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// ObjectExpression ////////////
    } else if (t.isObjectExpression(rhs)) {
      // Extract all values of properties
      let arrValues = [];
      for (let i = 0; i < rhs.properties.length; i++) {
        let property = rhs.properties[i];
          arrValues.push(property.value);
      }
      let rhsTaint = chainBinaryOr(arrValues, path);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// CallExpression ////////////
    } else if (t.isCallExpression(rhs)) {
      // Add more arguments to a CallExpress e.g. taint.<arg>
      let arrLength = rhs.arguments.length;
      for (let i = 0; i < arrLength; i++) {
        rhs.arguments.push(getTaint(rhs.arguments[i], path));
      }
      let rhsTaint = getTaint(rhs, path);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// MemberExpression ////////////
    } else if (t.isMemberExpression(rhs)) {
      let rhsTaint = getTaint(rhs, path);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// BinaryExpression and LogicalExpression ////////////
    } else if (t.isBinaryExpression(rhs) || t.isLogicalExpression(rhs)) {
      let rhsTaint = getTaint(rhs, path);
      createTaintStatusUpdate(path, lhsName, rhsTaint);

      //////////// UnaryExpression ////////////
    } else if (t.isUnaryExpression(rhs)) {
      // for UnaryExpression, essentially we can throw away the operator
      // and assign the taint to be that of its argument
      let rhsTaint = getTaint(rhs.argument, path);
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

  function instrumentFunctionDeclaration(path) {
    if (path.node.isClean) { return; }
    let node = path.node;
    let arrLength = node.params.length;
    for (let i = 0; i < arrLength; i++) {
      node.params.push(t.Identifier("taint_" + node.params[i].name));
    }
  }

  function instrumentReturnStatement(path) {
    let arg = path.node.argument;
    let retVarDeclarator = t.variableDeclarator(
      t.identifier('__retVal'),
      arg
    )
    let retVarDeclaration = t.variableDeclaration(
      "var",
      [retVarDeclarator]
    )
    path.insertBefore(retVarDeclaration);

    let retStmt = t.returnStatement(
      t.identifier('__retVal')
    );
    retStmt.isClean = true;
    path.replaceWith(retStmt);
  }

  //////////// Visitor pattern for instrumentation ////////////
  return {
    visitor: {
      VariableDeclaration: function(path) {
        if (path.node.isClean) { return; }
        instrumentVariableDeclaration(path);
      },
      FunctionDeclaration: function(path) {
        if (path.node.isClean) { return; }
        instrumentFunctionDeclaration(path);
      },
      ReturnStatement: function(path) {
        if (path.node.isClean) { return; }
        instrumentReturnStatement(path);
      }
    }
  };
};
