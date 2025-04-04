import type { NodePath } from '@babel/core';
import type {
  CallExpression,
  Directive,
  FunctionDeclaration,
} from '@babel/types';
import { isBlockStatement, isDirectiveLiteral } from '@babel/types';

import type { ReanimatedPluginPass } from './types';
import { replaceWithFactoryCall } from './utils';
import { makeWorkletFactoryCall } from './workletFactoryCall';

/** @returns `true` if the function was workletized, `false` otherwise. */
export function processIfWithWorkletDirective(
  path: NodePath<FunctionDeclaration>,
  state: ReanimatedPluginPass
): boolean {
  if (!isBlockStatement(path.node.body)) {
    // If the function body is not a block statement we can safely assume that it's not a worklet
    // since it's the case of an arrow function with immediate return
    // eg. `const foo = () => 1;`
    return false;
  }
  if (!hasWorkletDirective(path.node.body.directives)) {
    return false;
  }
  processWorklet(path, state);
  return true;
}

/**
 * Replaces
 *
 * - `FunctionDeclaration`,
 * - `FunctionExpression`,
 * - `ArrowFunctionExpression`
 * - `ObjectMethod`
 *
 * With a workletized version of itself.
 */
export function processWorklet(
  path: NodePath<FunctionDeclaration>,
  state: ReanimatedPluginPass
): void {
  const workletFactoryCall = makeWorkletFactoryCall(path, state);

  substituteWorkletWithWorkletFactoryCall(path, workletFactoryCall);

  path.scope.getProgramParent().crawl();
  path.scope.crawl();
  path.visit();
  const programPath = path.findParent((p) => p.isProgram());
  programPath!.visit();
}

function hasWorkletDirective(directives: Directive[]): boolean {
  return directives.some(
    (directive) =>
      isDirectiveLiteral(directive.value) && directive.value.value === 'worklet'
  );
}

function substituteWorkletWithWorkletFactoryCall(
  path: NodePath<FunctionDeclaration>,
  workletFactoryCall: CallExpression
): void {
  const name = 'id' in path.node ? path.node.id?.name : undefined;
  replaceWithFactoryCall(path, name, workletFactoryCall);
}
