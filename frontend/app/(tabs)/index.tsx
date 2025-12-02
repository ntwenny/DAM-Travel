import "@/global.css";
import { useNavigation } from "@react-navigation/native";
import {
    CameraMode,
    CameraType,
    CameraView,
    useCameraPermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import {
    ArrowLeftIcon,
    CameraIcon,
    CameraOffIcon,
    ImageIcon,
    RefreshCcwIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useUser } from "@/hooks/useUser";
import { uploadBytes, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/button";

export default function ScanScreen() {
    const navigation = useNavigation();
    const router = useRouter();
    const { user, userProfile } = useUser();
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>("back");
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [lastPicked, setLastPicked] = useState<string | null>(null);
    const mode: CameraMode = "picture";
    const cameraReference = useRef<CameraView>(null);

    useEffect(() => {
        if (permission) {
            console.log(
                permission.granted
                    ? "Camera permission granted"
                    : "Camera permission not granted"
            );
        }
    }, [permission]);

    function toggleCameraFacing() {
        setFacing((prev) => (prev === "front" ? "back" : "front"));
    }

    async function takePicture() {
        if (!cameraReference.current) {
            return;
        }

        const photo = await cameraReference.current.takePictureAsync();
        console.log("Photo taken:", photo.uri);
        setPhotoUri(photo.uri);
        setLastPicked(photo.uri);
    }

    async function pickImageFromLibrary() {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            console.log("Picked image:", uri);
            setPhotoUri(uri);
            setLastPicked(uri);
        }
    }

    function retakePicture() {
        setPhotoUri(null);
    }

    async function uploadCurrentPhoto() {
        if (!photoUri || !user || !userProfile?.currentTripId) {
            return;
        }

        try {
            const tripItemId = Date.now().toString();
            const response = await fetch(photoUri);
            const blob = await response.blob();
            const storageRef = ref(
                storage,
                `users/${user.uid}/${userProfile.currentTripId}/${tripItemId}.jpg`
            );
            await uploadBytes(storageRef, blob);

            router.push({
                pathname: "/similar-products",
                params: {
                    tripId: userProfile.currentTripId,
                    tripItemId,
                },
            });

            setPhotoUri(null);
        } catch (error) {
            console.error("Failed to upload photo", error);
        }
    }

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

            {permission?.granted && !photoUri && (
                <>
                    <CameraView
                        className="absolute z-10"
                        active={true}
                        ref={cameraReference}
                        mode={mode}
                        facing={facing}
                        style={StyleSheet.absoluteFillObject}
                    />

                    <Pressable
                        onPress={() => {
                            navigation.navigate("finance" as never);
                        }}
                        className="absolute top-12 left-5 bg-black/40 p-3 rounded-full z-20"
                    >
                        <ArrowLeftIcon
                            color="white"
                            size={24}
                            strokeWidth={2}
                        />
                    </Pressable>

                    <Pressable
                        onPress={toggleCameraFacing}
                        className="absolute top-12 right-10 bg-primary p-4 rounded-full border-2 border-white"
                    >
                        <RefreshCcwIcon
                            color="white"
                            size={24}
                            strokeWidth={2}
                        />
                    </Pressable>

                    <Pressable
                        onPress={pickImageFromLibrary}
                        className="absolute bottom-10 left-10 rounded-xl border-2 border-gray-300 overflow-hidden bg-gray-200"
                        style={{ width: 55, height: 55 }}
                    >
                        {lastPicked ? (
                            <Image
                                source={{ uri: lastPicked }}
                                style={{ width: "100%", height: "100%" }}
                            />
                        ) : (
                            <View className="flex-1 items-center justify-center">
                                <ImageIcon
                                    color="black"
                                    size={24}
                                    strokeWidth={2}
                                />
                            </View>
                        )}
                    </Pressable>

                    <Pressable
                        onPress={takePicture}
                        className="absolute bottom-10 self-center bg-white p-5 rounded-full border-4 border-gray-300"
                    >
                        <CameraIcon color="black" size={28} strokeWidth={2} />
                    </Pressable>
                </>
            )}

            {photoUri && (
                <View className="flex-1 items-center justify-center bg-black">
                    <Image
                        source={{ uri: photoUri }}
                        className="w-80 h-96 rounded-lg"
                        resizeMode="contain"
                    />

                    <View className="flex-row gap-6 mt-6">
                        <Pressable
                            onPress={retakePicture}
                            className="bg-gray-700 px-4 py-2 rounded-lg"
                        >
                            <Text className="text-white font-semibold">
                                Retake
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={uploadCurrentPhoto}
                            className="bg-primary px-4 py-2 rounded-lg"
                        >
                            <Text className="text-white font-semibold">
                                Save / Upload
                            </Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}
