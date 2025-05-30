import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Animated, { SlideOutLeft, SlideOutRight } from 'react-native-reanimated';

type ParamList = {
  First?: React.Component;
  Second?: React.Component;
};

const Stack = createNativeStackNavigator<ParamList>();

function First({ navigation }: NativeStackScreenProps<ParamList, 'First'>) {
  return (
    <>
      <Button title="Navigate" onPress={() => navigation.navigate('Second')} />
      <View style={styles.container} />
    </>
  );
}

function Second() {
  const [state, setState] = React.useState(false);
  return (
    <>
      <Button title="Toggle" onPress={() => setState((prev) => !prev)} />
      <View style={styles.container}>
        {state && (
          <Animated.View
            exiting={SlideOutLeft.duration(3000)}
            style={[styles.box, styles.blue]}
          />
        )}
      </View>
    </>
  );
}

export default function NestedNativeStacksWithLayout() {
  const [visible, setVisible] = React.useState(true);

  return (
    <>
      <Button title="Toggle" onPress={() => setVisible((prev) => !prev)} />
      {visible && (
        <>
          <Animated.View
            exiting={SlideOutRight.duration(5000)}
            style={[styles.box, styles.green]}
          />
          <Stack.Navigator initialRouteName="First">
            <Stack.Screen name="First" component={First} />
            <Stack.Screen name="Second" component={Second} />
          </Stack.Navigator>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 300,
    backgroundColor: 'red',
  },
  box: {
    width: 100,
    height: 100,
  },
  blue: { backgroundColor: 'blue' },
  green: { backgroundColor: 'green' },
});
