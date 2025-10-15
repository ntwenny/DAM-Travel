import "@/global.css";
import {
    CameraMode,
    CameraType,
    CameraView,
    useCameraPermissions,
} from "expo-camera";
import { CameraOffIcon, RotateCcwIcon } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function App() {
    const insets = useSafeAreaInsets();
    // Assumption: tab bar height used by the app's tab navigator.
    // Adjust this value if your tab bar uses a different height.
    const TAB_BAR_HEIGHT = 64;
    const bottomOffset = insets.bottom + TAB_BAR_HEIGHT + 8;
    const [permission, requestPermission] = useCameraPermissions();
    const [mode, setMode] = useState<CameraMode>("picture");
    const [facing, setFacing] = useState<CameraType>("front");
    const [recording, setRecording] = useState(true);

    const cameraReference = useRef<CameraView>(null);

    const reverseCamera = useCallback(() => {
        setFacing((prev) => (prev === "front" ? "back" : "front"));
    }, []);

    return (
        <View className="flex-1 bg-background">
            {!permission?.granted && (
                <View className="flex-1 items-center justify-center m-safe-offset-5">
                    <CameraOffIcon
                        size={64}
                        color="#FFFFFF"
                        strokeWidth={0.75}
                    />
                    <Text className="mb-4 text-foreground font-bold pt-5">
                        Please Allow Camera Access
                    </Text>
                    <Pressable
                        className="rounded bg-primary border-muted border-2 px-4 py-2"
                        onPress={requestPermission}
                    >
                        <Text className="font-semibold text-white">
                            Grant Permission
                        </Text>
                    </Pressable>
                </View>
            )}
            <CameraView
                className="absolute z-10"
                active={true}
                ref={cameraReference}
                mode={mode}
                facing={facing}
                style={StyleSheet.absoluteFillObject}
            ></CameraView>
            {/* CameraView Overlay Using Absolute Positioning */}
            <View className="flex flex-1 p-4 justify-end">
                <View className="flex flex-row justify-center bg-purple-500">
                    <View className="w-full relative">
                        {/* Centered capture circle */}
                        <View className="absolute left-0 right-0 bottom-5 items-center">
                            <View className="rounded-full h-20 w-20 border-4 bg-white border-muted" />
                        </View>

                        {/* Right-aligned icon */}
                        <Pressable
                            className="absolute bottom-6 right-5 rounded-full p-2"
                            onPress={reverseCamera}
                        >
                            <RotateCcwIcon
                                size={40}
                                color="white"
                                strokeWidth={0.75}
                            />
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
}
