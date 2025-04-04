import type { NodePath, PluginItem } from '@babel/core';
import type { FunctionDeclaration } from '@babel/types';

import type { ReanimatedPluginPass } from './types';
import { processIfWithWorkletDirective } from './workletSubstitution';

module.exports = function (): PluginItem {
  return {
    name: 'reanimated',
    visitor: {
      FunctionDeclaration: {
        enter(
          path: NodePath<FunctionDeclaration>,
          state: ReanimatedPluginPass
        ) {
          processIfWithWorkletDirective(path, state);
        },
      },
    },
  };
};
