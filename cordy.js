//////////// cordy Babel plugin ////////////
module.exports = function(babel) {
  var assert = require('assert');
  var run = require('./run.js');
  var t = babel.types;
  var scope = "";
  var lhsScope = "";
  var anonymousCount = 0;
  var sourceIds = run.sourceIds;
  console.log(sourceIds);
  var sourceFxns = ["document.getElementById", "get", "document.get.getSth"];
  var sinks = ["write", "fileWriter.write", "writer.write", "fileWriter.hey.write"];

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
    if (arrElements.length == 0) {
      return t.numericLiteral(0);
    } else if (arrElements.length == 1) {
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
    //////////////////////// isIdentifier /////////////////////////
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

      ///////////////////////// isLiteral //////////////////////////
    } else if (t.isLiteral(node)) {
      return t.numericLiteral(0);

      ////////////////////// isCallExpression /////////////////////
    } else if (t.isCallExpression(node)) {
      let tmId = t.identifier("taint.fn");
      let rhsTaint = t.MemberExpression(
        tmId,
        t.identifier(node.callee.name)
      );
      return rhsTaint

      //////////////////// isMemberExpression //////////////////////
    } else if (t.isMemberExpression(node)) {
      if (isSourceExpression(node)) {
        return getSourceIdTaint(node);
      } else {
          let name = node.object.name;
          let tmId = t.identifier("taint");
          let rhsTaint = t.MemberExpression(
            tmId,
            t.identifier(name)
          );
          return rhsTaint;
      }
      ///////////////////// isBinaryExpression ////////////////////
    } else if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) {
      return chainBinaryExprVar(node, path);

      ///////////////////// isArrayExpression ////////////////////
    } else if (t.isArrayExpression(node)) {
      let arrElements = node.elements;
      let rhsTaint = chainBinaryOr(arrElements, path);
      return rhsTaint;

      ///////////////////// Return untainted otherwise ////////////////////
    } else {
      return t.numericLiteral(0);
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
      let rhsTaint = getTaint(rhs, path)
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

      //////////// New Expression ////////////
    } else if (t.isNewExpression(rhs)) {
      let rhsTaint = chainBinaryOr(rhs.arguments, path);
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
    let functionName = node.id.name;
    // Sets taint.fn.<function name> = 0 initially, in case
    // a variable is assigned to a void function
    let taintFnResultDefault = t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.identifier(`taint.fn.${functionName}`),
        t.numericLiteral(0)
      )
    );
    taintFnResultDefault.isClean = true;
    let taintFnNameExpression = t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.identifier(`taint.${functionName}`),
        t.objectExpression(
          []
        )
      )
    );
    taintFnNameExpression.isClean = true;
    path.insertBefore(taintFnNameExpression);
    path.insertBefore(taintFnResultDefault);

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

    let fnName = path.parentPath.parent.id.name;
    let lExpression = t.MemberExpression(
      t.identifier('taint.fn'),
      t.identifier(fnName)
    );
    let rExpression = t.MemberExpression(
      t.identifier(`taint.${fnName}`),
      t.identifier('__retVal')
    );
    let fnTaint = t.expressionStatement(
      t.assignmentExpression(
        "=",
        lExpression,
        rExpression
      )
    )
    fnTaint.isClean = true;
    path.insertBefore(fnTaint);

    let retStmt = t.returnStatement(
      t.identifier('__retVal')
    );
    retStmt.isClean = true;
    path.replaceWith(retStmt);
  }

  function instrumentProgram(path) {
    let taintDeclaration = t.variableDeclaration(
      "var",
      [
        t.variableDeclarator(
          t.identifier('taint'),
          t.objectExpression(
            []
          )
        )
      ]
    )
    taintDeclaration.isClean = true;

    let taintFnDeclaration = t.expressionStatement(
      t.assignmentExpression(
        "=",
        t.identifier('taint.fn'),
        t.objectExpression(
          []
        )
      )
    );
    taintFnDeclaration.isClean = true;
    path.unshiftContainer('body', taintFnDeclaration);
    path.unshiftContainer('body', taintDeclaration);
  }

  /**
   * Check if node is of form x.("id").y
   * 1. y is value or innerHTML
   * 2. x is in sourceFxns array
   *
   * @param  {Object} node Esprima node
   * @return {Boolean}     Whether node is a match expression above
   */
  function isSourceExpression(node) {
    // Note: currently check consists of these parts
    // 1. check if node.object is callExpression
    // 2. check if *.value or *.innerHTML
    // 3. check if * is inside sourceFxns array

    if (!t.isCallExpression(node.object)) {
      return false;
    }

    if (node.property.name !== 'value' && node.property.name !== 'innerHTML') {
      return false;
    }

    var callee = node.object.callee;
    for(index in sourceFxns) {
      if(t.isMemberExpression(callee) && matchMemberExpression(sourceFxns[index], callee)) {
        return true;
      } else if (t.isIdentifier(callee) && callee.name === sourceFxns[index]) {
        return true;
      }
    }
    return false;
  }

  /**
   *  getSourceIdTaint - returns taint value of node
   *  Requires node to be source expression (isSourceExpression)
   *  Assumption: assumes all args are literals
   *  Returns 1 if at least one arguments is an id in sourceIds, otherwise 0 is returned
   *  sourceIds is a list of ids returned by the HTML parser
   * @param  {Object} node Esprima node
   * @return {Boolean}     taint of node
   */
  function getSourceIdTaint(node) {
    assert(isSourceExpression(node));

    var args = node.object.arguments;
    for(index in args) {
      if (sourceIds.indexOf(args[index].value) > -1) {
        return t.numericLiteral(1);
      }
    }
    return t.numericLiteral(0);
  }

  function isSink(callee) {
    for (index in sinks) {
      if(t.isMemberExpression(callee) && matchMemberExpression(sinks[index], callee)) {
        return true;
      } else if (t.isIdentifier(callee) && callee.name === sinks[index]) {
        return true;
      }
    }
    return false;
  }

  function createCheckTaintCall(path, exprArgs) {
    let exprArgTaint = exprArgs.map(arg => getTaint(arg, path));
    let lineNum = t.numericLiteral(exprArgs[0].loc.start.line);
    exprArgTaint.unshift(lineNum);
    let expr = t.expressionStatement(
      t.callExpression(
        t.identifier("checkTaint"),
        exprArgTaint
      )
    );
    expr.isClean = true;
    path.insertBefore(expr);
  }

/**
 * Match a MemberExpression node against a name.
 * @param  {String} name Name of the expected member expression (e.g. `foo.bar`)
 * @param  {Object} node Esprima node
 * @return {Boolean}     Does the node match the name
 */
function matchMemberExpression(name, node) {
  var nameParts = name.split('.');

  if (node.type !== 'MemberExpression' || node.property.name !== nameParts[nameParts.length - 1]) {
    return false;
  }

  function match(node, index) {
    if (node.type === 'MemberExpression') {
      if (node.property.name !== nameParts[index]) return false;
      return match(node.object, --index);
    }
    if (node.type === 'Identifier' && node.name === nameParts[index] && index === 0) {
      return true;
    }
  }

  return match(node.object, nameParts.length - 2);
};

  function instrumentExpressionStatement(path) {
    if (t.isCallExpression(path.node.expression)) {
      if (isSink(path.node.expression.callee)) {
        createCheckTaintCall(path, path.node.expression.arguments)
      } else {
        let newArgList = []
        let args = path.node.expression.arguments;
        for (index in args) {
          let node = args[index];
          if (t.isFunctionExpression(node)) {
            let fnId = t.identifier(`cordyAnonymous${anonymousCount}`);
            anonymousCount++;
            let fnParams = node.params;
            let fnBody = node.body;
            let fnDeclaration = t.FunctionDeclaration(
              fnId,
              fnParams,
              fnBody
            );
            path.insertAfter(fnDeclaration);
            newArgList.push(fnId);
          } else {
            newArgList.push(node);
          }
        }
        path.node.expression.arguments = newArgList;
      }
    } else if (t.isAssignmentExpression(path.node.expression)) {
      let node = path.node.expression;
      // Assumption: LHS is always an Identifier
      let lhsName = node.left.name;
      let rhsTaint = getTaint(node.right, path);
      // Handle AssignmentExpression within Functions
      if (t.isBlockStatement(path.parent)) {
        let funcDeclaration = path.parentPath.parent;
        lhsScope = funcDeclaration.id.name;
        createTaintStatusUpdate(path, lhsName, rhsTaint);
        lhsScope = "";
      } else {
        lhsScope = "";
        createTaintStatusUpdate(path, lhsName, rhsTaint);
      }
    }
  }

  //////////// Visitor pattern for instrumentation ////////////
  return {
    visitor: {
      Program: function(path) {
        if (path.node.isClean) { return; }
        instrumentProgram(path);
      },
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
      },
      ExpressionStatement: function(path) {
        if (path.node.isClean) { return; }
        instrumentExpressionStatement(path);
      }
    }
  };
};
