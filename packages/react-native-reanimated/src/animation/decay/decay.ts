'use strict';
import { ReanimatedError } from '../../common';
import type {
  Animation,
  AnimationCallback,
  Timestamp,
} from '../../commonTypes';
import { defineAnimation, getReduceMotionForAnimation } from '../util';
import { rigidDecay } from './rigidDecay';
import { rubberBandDecay } from './rubberBandDecay';
import type {
  DecayAnimation,
  DecayConfig,
  DefaultDecayConfig,
  InnerDecayAnimation,
} from './utils';
import { isValidRubberBandConfig } from './utils';

export type WithDecayConfig = DecayConfig;

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type withDecayType = (
  userConfig: DecayConfig,
  callback?: AnimationCallback
) => number;

function validateConfig(config: DefaultDecayConfig): void {
  'worklet';
  if (config.clamp) {
    if (!Array.isArray(config.clamp)) {
      throw new ReanimatedError(
        `\`config.clamp\` must be an array but is ${typeof config.clamp}.`
      );
    }
    if (config.clamp.length !== 2) {
      throw new ReanimatedError(
        `\`clamp array\` must contain 2 items but is given ${
          config.clamp.length as number
        }.`
      );
    }
  }
  if (config.velocityFactor <= 0) {
    throw new ReanimatedError(
      `\`config.velocityFactor\` must be greater then 0 but is ${config.velocityFactor}.`
    );
  }
  if (config.rubberBandEffect && !config.clamp) {
    throw new ReanimatedError(
      'You need to set `clamp` property when using `rubberBandEffect`.'
    );
  }
}

/**
 * Lets you create animations that mimic objects in motion with friction.
 *
 * @param config - The decay animation configuration - {@link DecayConfig}.
 * @param callback - A function called upon animation completion -
 *   {@link AnimationCallback}.
 * @returns An [animation
 *   object](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#animation-object)
 *   which holds the current state of the animation.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/animations/withDecay
 */
export const withDecay = function (
  userConfig: DecayConfig,
  callback?: AnimationCallback
): Animation<DecayAnimation> {
  'worklet';

  return defineAnimation<DecayAnimation>(0, () => {
    'worklet';
    const config: DefaultDecayConfig = {
      deceleration: 0.998,
      velocityFactor: 1,
      velocity: 0,
      rubberBandFactor: 0.6,
    };
    if (userConfig) {
      Object.keys(userConfig).forEach(
        (key) =>
          ((config as any)[key] = userConfig[key as keyof typeof userConfig])
      );
    }

    const decay: (animation: InnerDecayAnimation, now: number) => boolean =
      isValidRubberBandConfig(config)
        ? (animation, now) => rubberBandDecay(animation, now, config)
        : (animation, now) => rigidDecay(animation, now, config);

    function onStart(
      animation: DecayAnimation,
      value: number,
      now: Timestamp
    ): void {
      const initialVelocity = config.velocity;
      animation.current = value;
      animation.lastTimestamp = now;
      animation.startTimestamp = now;
      animation.initialVelocity = initialVelocity;
      animation.velocity = initialVelocity;

      validateConfig(config);

      if (animation.reduceMotion && config.clamp) {
        if (value < config.clamp[0]) {
          animation.current = config.clamp[0];
        } else if (value > config.clamp[1]) {
          animation.current = config.clamp[1];
        }
      }
    }

    // To ensure the animation is correctly initialized and starts as expected
    // we need to set its current value to undefined.
    // Setting current to 0 breaks the animation.
    return {
      onFrame: decay,
      onStart,
      callback,
      velocity: config.velocity ?? 0,
      initialVelocity: 0,
      current: undefined,
      lastTimestamp: 0,
      startTimestamp: 0,
      reduceMotion: getReduceMotionForAnimation(config.reduceMotion),
    } as DecayAnimation;
  });
} as unknown as withDecayType;
