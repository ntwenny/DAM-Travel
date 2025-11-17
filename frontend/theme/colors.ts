import { Platform } from "react-native";

const IOS_SYSTEM_COLORS = {
    white: "rgb(255, 255, 255)",
    black: "rgb(0, 0, 0)",
    light: {
        background: "rgb(245, 247, 250)",
        foreground: "rgb(26, 34, 56)",
        card: "rgb(227, 234, 242)",
        primary: "rgb(58, 91, 160)",
        destructive: "rgb(45, 30, 47)",
        // The following are not in the new theme, keeping old values
        grey6: "rgb(248, 248, 248)",
        grey5: "rgb(238, 238, 237)",
        grey4: "rgb(227, 228, 227)",
        grey3: "rgb(212, 214, 211)",
        grey2: "rgb(181, 184, 179)",
        grey: "rgb(160, 165, 158)",
        root: "rgb(246, 248, 245)",
    },
    dark: {
        background: "rgba(245, 204, 183, 1)",
        foreground: "rgb(230, 234, 243)",
        card: "rgba(186, 188, 229, 1)",
        primary: "rgb(58, 91, 160)",
        destructive: "rgb(160, 74, 108)",
        // The following are not in the new theme, keeping old values
        grey6: "rgb(29, 30, 28)",
        grey5: "rgb(48, 50, 47)",
        grey4: "rgb(61, 63, 59)",
        grey3: "rgb(81, 85, 79)",
        grey2: "rgb(124, 129, 121)",
        grey: "rgb(162, 167, 160)",
        root: "rgb(2, 4, 1)",
    },
} as const;

const ANDROID_COLORS = {
    white: "rgb(255, 255, 255)",
    black: "rgb(0, 0, 0)",
    light: {
        background: "rgb(248, 249, 248)",
        foreground: "rgb(3, 3, 3)",
        card: "rgb(255, 255, 255)",
        primary: "rgb(120, 174, 117)",
        destructive: "rgb(186, 26, 26)",
        // The following are not in the new theme, keeping old values
        grey6: "rgb(249, 249, 249)",
        grey5: "rgb(239, 239, 239)",
        grey4: "rgb(228, 229, 228)",
        grey3: "rgb(213, 214, 213)",
        grey2: "rgb(182, 184, 182)",
        grey: "rgb(161, 164, 161)",
        root: "rgb(248, 249, 248)",
    },
    dark: {
        background: "rgb(1, 2, 1)",
        foreground: "rgb(251, 253, 251)",
        card: "rgb(28, 35, 28)",
        primary: "rgb(120, 174, 117)",
        destructive: "rgb(147, 0, 10)",
        // The following are not in the new theme, keeping old values
        grey6: "rgb(28, 28, 28)",
        grey5: "rgb(46, 47, 46)",
        grey4: "rgb(59, 60, 59)",
        grey3: "rgb(79, 81, 79)",
        grey2: "rgb(122, 125, 122)",
        grey: "rgb(160, 163, 160)",
        root: "rgb(1, 2, 1)",
    },
} as const;

const WEB_COLORS = {
    white: "rgb(255, 255, 255)",
    black: "rgb(0, 0, 0)",
    light: {
        background: "rgb(248, 249, 248)",
        foreground: "rgb(3, 3, 3)",
        card: "rgb(255, 255, 255)",
        primary: "rgb(120, 174, 117)",
        destructive: "rgb(186, 26, 26)",
        // The following are not in the new theme, keeping old values
        grey6: "rgb(249, 249, 249)",
        grey5: "rgb(239, 239, 239)",
        grey4: "rgb(228, 229, 228)",
        grey3: "rgb(213, 214, 213)",
        grey2: "rgb(182, 184, 182)",
        grey: "rgb(161, 164, 161)",
        root: "rgb(248, 249, 248)",
    },
    dark: {
        background: "rgb(1, 2, 1)",
        foreground: "rgb(251, 253, 251)",
        card: "rgb(28, 35, 28)",
        primary: "rgb(120, 174, 117)",
        destructive: "rgb(147, 0, 10)",
        // The following are not in the new theme, keeping old values
        grey6: "rgb(28, 28, 28)",
        grey5: "rgb(46, 47, 46)",
        grey4: "rgb(59, 60, 59)",
        grey3: "rgb(79, 81, 79)",
        grey2: "rgb(122, 125, 122)",
        grey: "rgb(160, 163, 160)",
        root: "rgb(1, 2, 1)",
    },
} as const;

const COLORS =
    Platform.OS === "ios"
        ? IOS_SYSTEM_COLORS
        : Platform.OS === "android"
          ? ANDROID_COLORS
          : WEB_COLORS;

export { COLORS };
