/* eslint-disable @typescript-eslint/no-var-requires */
import type { NodePath } from '@babel/core';
import type {
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  ReturnStatement,
  VariableDeclaration,
} from '@babel/types';
import {
  blockStatement,
  functionExpression,
  identifier,
  returnStatement,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';

import type { ReanimatedPluginPass, WorkletizableFunction } from './types';

export function makeWorkletFactory(
  fun: NodePath<FunctionDeclaration>,
  state: ReanimatedPluginPass
): { workletFactory: FunctionExpression; closureVariables: Identifier[] } {
  removeWorkletDirective(fun);

  const closureVariables: Identifier[] = [];

  fun.traverse(
    {
      ReferencedIdentifier(path) {
        if (path.isJSXIdentifier()) {
          return;
        }
        if (fun.scope.hasOwnBinding(path.node.name)) {
          return;
        }
        closureVariables.push(identifier(path.node.name));
      },
    },
    state
  );

  const funExpression = functionExpression(
    null,
    fun.node.params,
    fun.node.body,
    fun.node.generator,
    fun.node.async
  );

  const statements: Array<
    VariableDeclaration | ExpressionStatement | ReturnStatement
  > = [
    variableDeclaration('const', [
      variableDeclarator(identifier(fun.node.id!.name), funExpression),
    ]),
  ];

  statements.push(returnStatement(identifier(fun.node.id!.name)));

  const workletFactory = functionExpression(
    identifier('Factory'),
    closureVariables,
    blockStatement(statements)
  );

  return { workletFactory, closureVariables };
}

function removeWorkletDirective(fun: NodePath<WorkletizableFunction>): void {
  fun.traverse({
    DirectiveLiteral(path) {
      if (path.node.value === 'worklet' && path.getFunctionParent() === fun) {
        path.parentPath.remove();
      }
    },
  });
}
