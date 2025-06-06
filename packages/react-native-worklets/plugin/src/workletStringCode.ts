import type { BabelFileResult, NodePath, PluginItem } from '@babel/core';
import { traverse } from '@babel/core';
import generate from '@babel/generator';
import type {
  ExpressionStatement,
  File as BabelFile,
  FunctionDeclaration,
  Identifier,
  VariableDeclaration,
} from '@babel/types';
import {
  assertBlockStatement,
  callExpression,
  functionExpression,
  identifier,
  isArrowFunctionExpression,
  isBlockStatement,
  isExpression,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifier,
  isObjectMethod,
  isProgram,
  memberExpression,
  objectPattern,
  objectProperty,
  thisExpression,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { strict as assert } from 'assert';
import * as convertSourceMap from 'convert-source-map';
import * as fs from 'fs';

import { workletTransformSync } from './transform';
import type { ReanimatedPluginPass, WorkletizableFunction } from './types';
import { workletClassFactorySuffix } from './types';
import { isRelease } from './utils';

const MOCK_SOURCE_MAP = 'mock source map';

export function buildWorkletString(
  fun: BabelFile,
  state: ReanimatedPluginPass,
  closureVariables: Array<Identifier>,
  workletName: string,
  inputMap: BabelFileResult['map']
): Array<string | null | undefined> {
  restoreRecursiveCalls(fun, workletName);

  const draftExpression = (fun.program.body.find((obj) =>
    isFunctionDeclaration(obj)
  ) ||
    fun.program.body.find((obj) => isExpressionStatement(obj)) ||
    undefined) as FunctionDeclaration | ExpressionStatement | undefined;

  assert(draftExpression, '[Reanimated] `draftExpression` is undefined.');

  const expression = isFunctionDeclaration(draftExpression)
    ? draftExpression
    : draftExpression.expression;

  assert(
    'params' in expression,
    "'params' property is undefined in 'expression'"
  );
  assert(
    isBlockStatement(expression.body),
    '[Reanimated] `expression.body` is not a `BlockStatement`'
  );

  const parsedClasses = new Set<string>();

  traverse(fun, {
    NewExpression(path) {
      if (!isIdentifier(path.node.callee)) {
        return;
      }
      const constructorName = path.node.callee.name;
      if (
        !closureVariables.some(
          (variable) => variable.name === constructorName
        ) ||
        parsedClasses.has(constructorName)
      ) {
        return;
      }
      const index = closureVariables.findIndex(
        (variable) => variable.name === constructorName
      );
      closureVariables.splice(index, 1);
      const workletClassFactoryName =
        constructorName + workletClassFactorySuffix;
      closureVariables.push(identifier(workletClassFactoryName));

      assertBlockStatement(expression.body);
      expression.body.body.unshift(
        variableDeclaration('const', [
          variableDeclarator(
            identifier(constructorName),
            callExpression(identifier(workletClassFactoryName), [])
          ),
        ])
      );
      parsedClasses.add(constructorName);
    },
  });

  const workletFunction = functionExpression(
    identifier(workletName),
    expression.params,
    expression.body,
    expression.generator,
    expression.async
  );

  const code = generate(workletFunction).code;

  assert(inputMap, '[Reanimated] `inputMap` is undefined.');

  const includeSourceMap = !(isRelease() || state.opts.disableSourceMaps);

  if (includeSourceMap) {
    // Clear contents array (should be empty anyways)
    inputMap.sourcesContent = [];
    // Include source contents in source map, because Flipper/iframe is not
    // allowed to read files from disk.
    for (const sourceFile of inputMap.sources) {
      inputMap.sourcesContent.push(
        fs.readFileSync(sourceFile).toString('utf-8')
      );
    }
  }

  const transformed = workletTransformSync(code, {
    filename: state.file.opts.filename,
    extraPlugins: [
      getClosurePlugin(closureVariables),
      ...(state.opts.extraPlugins ?? []),
    ],
    extraPresets: state.opts.extraPresets,
    compact: true,
    sourceMaps: includeSourceMap,
    inputSourceMap: inputMap,
    ast: false,
    babelrc: false,
    configFile: false,
    comments: false,
  });

  assert(transformed, '[Reanimated] `transformed` is null.');

  let sourceMap;
  if (includeSourceMap) {
    if (shouldMockSourceMap()) {
      sourceMap = MOCK_SOURCE_MAP;
    } else {
      sourceMap = convertSourceMap.fromObject(transformed.map).toObject();
      // sourcesContent field contains a full source code of the file which contains the worklet
      // and is not needed by the source map interpreter in order to symbolicate a stack trace.
      // Therefore, we remove it to reduce the bandwith and avoid sending it potentially multiple times
      // in files that contain multiple worklets. Along with sourcesContent.
      delete sourceMap.sourcesContent;
    }
  }

  return [transformed.code, JSON.stringify(sourceMap)];
}

/**
 * Function that restores recursive calls after the name of the worklet has
 * changed.
 */
function restoreRecursiveCalls(file: BabelFile, newName: string): void {
  traverse(file, {
    FunctionExpression(path) {
      if (!path.node.id) {
        // Function wasn't named, hence it couldn't have had recursive calls by its name.
        path.stop();
        return;
      }
      const oldName = path.node.id.name;
      const scope = path.scope;
      scope.rename(oldName, newName);
    },
  });
}

function shouldMockSourceMap() {
  // We don't want to pollute tests with source maps so we mock it
  // for all tests (except one)
  return process.env.REANIMATED_JEST_SHOULD_MOCK_SOURCE_MAP === '1';
}

function prependClosure(
  path: NodePath<WorkletizableFunction>,
  closureVariables: Array<Identifier>,
  closureDeclaration: VariableDeclaration
) {
  if (closureVariables.length === 0 || !isProgram(path.parent)) {
    return;
  }

  if (!isExpression(path.node.body)) {
    path.node.body.body.unshift(closureDeclaration);
  }
}

function prependRecursiveDeclaration(path: NodePath<WorkletizableFunction>) {
  if (
    isProgram(path.parent) &&
    !isArrowFunctionExpression(path.node) &&
    !isObjectMethod(path.node) &&
    path.node.id &&
    path.scope.parent
  ) {
    const hasRecursiveCalls =
      path.scope.parent.bindings[path.node.id.name]?.references > 0;
    if (hasRecursiveCalls) {
      path.node.body.body.unshift(
        variableDeclaration('const', [
          variableDeclarator(
            identifier(path.node.id.name),
            memberExpression(thisExpression(), identifier('_recur'))
          ),
        ])
      );
    }
  }
}

/** Prepends necessary closure variables to the worklet function. */
function getClosurePlugin(closureVariables: Array<Identifier>): PluginItem {
  const closureDeclaration = variableDeclaration('const', [
    variableDeclarator(
      objectPattern(
        closureVariables.map((variable) =>
          objectProperty(
            identifier(variable.name),
            identifier(variable.name),
            false,
            true
          )
        )
      ),
      memberExpression(thisExpression(), identifier('__closure'))
    ),
  ]);

  return {
    visitor: {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod':
        (path: NodePath<WorkletizableFunction>) => {
          prependClosure(path, closureVariables, closureDeclaration);
          prependRecursiveDeclaration(path);
        },
    },
  };
}
