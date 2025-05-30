'use strict';
import { SHOULD_BE_USE_WEB } from '../common';
import type { AnimatedPropsAdapterFunction } from '../commonTypes';
import type { DependencyList, UseAnimatedStyleInternal } from './commonTypes';
import { useAnimatedStyle } from './useAnimatedStyle';

// TODO: we should make sure that when useAP is used we are not assigning styles

type UseAnimatedProps = <Props extends object>(
  updater: () => Partial<Props>,
  dependencies?: DependencyList | null,
  adapters?:
    | AnimatedPropsAdapterFunction
    | AnimatedPropsAdapterFunction[]
    | null,
  isAnimatedProps?: boolean
) => Partial<Props>;

function useAnimatedPropsJS<Props extends object>(
  updater: () => Props,
  deps?: DependencyList | null,
  adapters?:
    | AnimatedPropsAdapterFunction
    | AnimatedPropsAdapterFunction[]
    | null
) {
  return (useAnimatedStyle as UseAnimatedStyleInternal<Props>)(
    updater,
    deps,
    adapters,
    true
  );
}

const useAnimatedPropsNative = useAnimatedStyle;

/**
 * Lets you create an animated props object which can be animated using shared
 * values.
 *
 * @param updater - A function returning an object with properties you want to
 *   animate.
 * @param dependencies - An optional array of dependencies. Only relevant when
 *   using Reanimated without the Babel plugin on the Web.
 * @param adapters - An optional function or array of functions allowing to
 *   adopt prop naming between JS and the native side.
 * @returns An animated props object which has to be passed to `animatedProps`
 *   property of an Animated component that you want to animate.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedProps
 */
export const useAnimatedProps: UseAnimatedProps = SHOULD_BE_USE_WEB
  ? (useAnimatedPropsJS as UseAnimatedProps)
  : useAnimatedPropsNative;
