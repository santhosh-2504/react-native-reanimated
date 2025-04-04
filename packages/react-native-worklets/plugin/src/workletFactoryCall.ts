import type { NodePath } from '@babel/core';
import type { CallExpression, FunctionDeclaration } from '@babel/types';
import { callExpression } from '@babel/types';

import type { ReanimatedPluginPass } from './types';
import { makeWorkletFactory } from './workletFactory';

export function makeWorkletFactoryCall(
  path: NodePath<FunctionDeclaration>,
  state: ReanimatedPluginPass
): CallExpression {
  const { workletFactory, closureVariables } = makeWorkletFactory(path, state);

  const workletFactoryCall = callExpression(workletFactory, closureVariables);

  const replacement = workletFactoryCall;

  return replacement;
}
