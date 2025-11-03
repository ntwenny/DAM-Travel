import { Text, TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { LayoutChangeEvent, Pressable } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

// Mobile-friendly button variants (no web-only pseudo selectors)
const buttonVariants = cva(
    "shrink-0 flex-row items-center justify-center gap-2 rounded-md",
    {
        variants: {
            variant: {
                default: "bg-primary shadow-sm",
                destructive: "bg-destructive shadow-sm",
                outline: "border border-border bg-background",
                secondary: "bg-secondary shadow-sm",
                ghost: "bg-transparent",
                link: "bg-transparent p-0 h-auto",
            },
            size: {
                default: "h-10 px-4",
                sm: "h-8 px-3",
                lg: "h-12 px-6",
                icon: "h-10 w-10 p-0",
            },
            disabled: {
                true: "opacity-50",
                false: "",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            disabled: false,
        },
    }
);

const buttonTextVariants = cva("text-sm font-medium", {
    variants: {
        variant: {
            default: "text-primary-foreground",
            destructive: "text-destructive-foreground",
            outline: "text-foreground",
            secondary: "text-secondary-foreground",
            ghost: "text-foreground",
            link: "text-primary underline",
        },
        size: {
            default: "",
            sm: "text-xs",
            lg: "text-base",
            icon: "text-sm",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});

interface ButtonProps
    extends Omit<React.ComponentProps<typeof Pressable>, "children">,
        VariantProps<typeof buttonVariants>,
        VariantProps<typeof buttonTextVariants> {
    children?: React.ReactNode;
    textClassName?: string;
    loading?: boolean;
}

function Button({
    className,
    variant,
    size,
    disabled,
    children,
    textClassName,
    loading = false,
    ...props
}: ButtonProps) {
    // Animated shared values
    const scale = useSharedValue(1);
    const rippleScale = useSharedValue(0);
    const rippleOpacity = useSharedValue(0);
    const rippleX = useSharedValue(0);
    const rippleY = useSharedValue(0);
    const width = useSharedValue(0);
    const height = useSharedValue(0);

    const onLayout = (e: LayoutChangeEvent) => {
        width.value = e.nativeEvent.layout.width;
        height.value = e.nativeEvent.layout.height;
        props?.onLayout?.(e);
    };

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animatedRippleStyle = useAnimatedStyle(() => ({
        opacity: rippleOpacity.value,
        transform: [
            { translateX: rippleX.value - width.value / 2 },
            { translateY: rippleY.value - height.value / 2 },
            { scale: rippleScale.value },
        ],
    }));

    const triggerRipple = (x: number, y: number) => {
        rippleX.value = x;
        rippleY.value = y;
        rippleOpacity.value = 0.25;
        rippleScale.value = 0;
        rippleScale.value = withTiming(1, {
            duration: 350,
            easing: Easing.out(Easing.quad),
        });
        rippleOpacity.value = withTiming(0, {
            duration: 420,
            easing: Easing.out(Easing.quad),
        });
    };

    return (
        <Pressable
            accessibilityRole="button"
            disabled={disabled || loading}
            className={cn("overflow-hidden", className)}
            {...props}
            onPressIn={(e) => {
                if (!disabled && !loading) {
                    const { locationX, locationY } = e.nativeEvent;
                    scale.value = withSequence(
                        withTiming(0.94, {
                            duration: 85,
                            easing: Easing.out(Easing.quad),
                        }),
                        withSpring(0.98, { damping: 14, stiffness: 180 })
                    );
                    triggerRipple(locationX, locationY);
                }
                props?.onPressIn?.(e);
            }}
            onPressOut={(e) => {
                if (!disabled && !loading) {
                    scale.value = withSpring(1, {
                        damping: 15,
                        stiffness: 180,
                    });
                }
                props?.onPressOut?.(e);
            }}
        >
            {() => {
                const textCtx = buttonTextVariants({ variant, size });
                return (
                    <TextClassContext.Provider value={textCtx}>
                        <Animated.View
                            onLayout={onLayout}
                            style={animatedButtonStyle}
                            pointerEvents={disabled ? "none" : "auto"}
                            className={cn(
                                buttonVariants({ variant, size, disabled }),
                                "relative overflow-hidden",
                                loading && "opacity-80"
                            )}
                        >
                            <Animated.View
                                pointerEvents="none"
                                style={animatedRippleStyle}
                                className={cn(
                                    "absolute left-1/2 top-1/2 h-full w-full rounded-full bg-white/40 dark:bg-white/25"
                                )}
                            />
                            {typeof children === "string" ? (
                                <Text className={cn(textClassName)}>
                                    {children}
                                </Text>
                            ) : (
                                children
                            )}
                        </Animated.View>
                    </TextClassContext.Provider>
                );
            }}
        </Pressable>
    );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
