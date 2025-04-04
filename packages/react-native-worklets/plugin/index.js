"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/utils.js
var require_utils = __commonJS({
  "lib/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.replaceWithFactoryCall = exports2.isRelease = void 0;
    var types_1 = require("@babel/types");
    function isRelease() {
      var _a, _b;
      const pattern = /(prod|release|stag[ei])/i;
      return !!(((_a = process.env.BABEL_ENV) === null || _a === void 0 ? void 0 : _a.match(pattern)) || ((_b = process.env.NODE_ENV) === null || _b === void 0 ? void 0 : _b.match(pattern)));
    }
    exports2.isRelease = isRelease;
    function replaceWithFactoryCall(toReplace, name, factoryCall) {
      if (!name || !needsDeclaration(toReplace)) {
        toReplace.replaceWith(factoryCall);
      } else {
        const replacement = (0, types_1.variableDeclaration)("const", [
          (0, types_1.variableDeclarator)((0, types_1.identifier)(name), factoryCall)
        ]);
        toReplace.replaceWith(replacement);
      }
    }
    exports2.replaceWithFactoryCall = replaceWithFactoryCall;
    function needsDeclaration(nodePath) {
      return (0, types_1.isScopable)(nodePath.parent) || (0, types_1.isExportNamedDeclaration)(nodePath.parent);
    }
  }
});

// lib/workletFactory.js
var require_workletFactory = __commonJS({
  "lib/workletFactory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeWorkletFactory = void 0;
    var types_1 = require("@babel/types");
    function makeWorkletFactory(fun, state) {
      removeWorkletDirective(fun);
      const closureVariables = [];
      fun.traverse({
        ReferencedIdentifier(path) {
          if (path.isJSXIdentifier()) {
            return;
          }
          if (fun.scope.hasOwnBinding(path.node.name)) {
            return;
          }
          closureVariables.push((0, types_1.identifier)(path.node.name));
        }
      }, state);
      const funExpression = (0, types_1.functionExpression)(null, fun.node.params, fun.node.body, fun.node.generator, fun.node.async);
      const statements = [
        (0, types_1.variableDeclaration)("const", [
          (0, types_1.variableDeclarator)((0, types_1.identifier)(fun.node.id.name), funExpression)
        ])
      ];
      statements.push((0, types_1.returnStatement)((0, types_1.identifier)(fun.node.id.name)));
      const workletFactory = (0, types_1.functionExpression)((0, types_1.identifier)("Factory"), closureVariables, (0, types_1.blockStatement)(statements));
      return { workletFactory, closureVariables };
    }
    exports2.makeWorkletFactory = makeWorkletFactory;
    function removeWorkletDirective(fun) {
      fun.traverse({
        DirectiveLiteral(path) {
          if (path.node.value === "worklet" && path.getFunctionParent() === fun) {
            path.parentPath.remove();
          }
        }
      });
    }
  }
});

// lib/workletFactoryCall.js
var require_workletFactoryCall = __commonJS({
  "lib/workletFactoryCall.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeWorkletFactoryCall = void 0;
    var types_1 = require("@babel/types");
    var workletFactory_1 = require_workletFactory();
    function makeWorkletFactoryCall(path, state) {
      const { workletFactory, closureVariables } = (0, workletFactory_1.makeWorkletFactory)(path, state);
      const workletFactoryCall = (0, types_1.callExpression)(workletFactory, closureVariables);
      const replacement = workletFactoryCall;
      return replacement;
    }
    exports2.makeWorkletFactoryCall = makeWorkletFactoryCall;
  }
});

// lib/workletSubstitution.js
var require_workletSubstitution = __commonJS({
  "lib/workletSubstitution.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.processWorklet = exports2.processIfWithWorkletDirective = void 0;
    var types_1 = require("@babel/types");
    var utils_1 = require_utils();
    var workletFactoryCall_1 = require_workletFactoryCall();
    function processIfWithWorkletDirective(path, state) {
      if (!(0, types_1.isBlockStatement)(path.node.body)) {
        return false;
      }
      if (!hasWorkletDirective(path.node.body.directives)) {
        return false;
      }
      processWorklet(path, state);
      return true;
    }
    exports2.processIfWithWorkletDirective = processIfWithWorkletDirective;
    function processWorklet(path, state) {
      const workletFactoryCall = (0, workletFactoryCall_1.makeWorkletFactoryCall)(path, state);
      substituteWorkletWithWorkletFactoryCall(path, workletFactoryCall);
      path.scope.getProgramParent().crawl();
      path.scope.crawl();
      path.visit();
      const programPath = path.findParent((p) => p.isProgram());
      programPath.visit();
    }
    exports2.processWorklet = processWorklet;
    function hasWorkletDirective(directives) {
      return directives.some((directive) => (0, types_1.isDirectiveLiteral)(directive.value) && directive.value.value === "worklet");
    }
    function substituteWorkletWithWorkletFactoryCall(path, workletFactoryCall) {
      var _a;
      const name = "id" in path.node ? (_a = path.node.id) === null || _a === void 0 ? void 0 : _a.name : void 0;
      (0, utils_1.replaceWithFactoryCall)(path, name, workletFactoryCall);
    }
  }
});

// lib/plugin.js
Object.defineProperty(exports, "__esModule", { value: true });
var workletSubstitution_1 = require_workletSubstitution();
module.exports = function() {
  return {
    name: "reanimated",
    visitor: {
      FunctionDeclaration: {
        enter(path, state) {
          (0, workletSubstitution_1.processIfWithWorkletDirective)(path, state);
        }
      }
    }
  };
};
//# sourceMappingURL=index.js.map
