import "@/global.css";
import {
    CameraMode,
    CameraType,
    CameraView,
    useCameraPermissions,
} from "expo-camera";
import { CameraOffIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
export default function App() {
    const [permission, requestPermission] = useCameraPermissions();
    const [mode, setMode] = useState<CameraMode>("picture");
    const [facing, setFacing] = useState<CameraType>("front");
    const [recording, setRecording] = useState(true);

    const cameraReference = useRef<CameraView>(null);
    useEffect(() => {
        setTimeout(() => {
            if (permission?.granted) {
                console.log("Camera permission granted");
            } else {
                console.log("Camera permission not granted");
            }
        }, 1000);
    }, [permission]);
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
        </View>
    );
}
