#pragma once

#include <jsi/jsi.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <memory>

using namespace facebook;

namespace worklets {

class RNRuntimeWorkletDecorator {
  // TODO: Rename to `RNRuntimeWorkletsDecorator` or something more suitable.
 public:
  static void decorate(
      jsi::Runtime &rnRuntime,
      jsi::Object &&jsiWorkletsModuleProxy);
};

} // namespace worklets
