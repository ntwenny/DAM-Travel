import React, { useEffect } from "react";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";

interface AnimatedViewProps {
    children: React.ReactNode;
    duration?: number;
}

const AnimatedView = ({ children, duration = 500 }: AnimatedViewProps) => {
    const opacity = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    useEffect(() => {
        opacity.value = withTiming(1, {
            duration,
            easing: Easing.inOut(Easing.ease),
        });
    }, [duration, opacity]);

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

export default AnimatedView;
