import "@/global.css";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export default function PreScan() {
    const router = useRouter();

    function startScan() {
        (router as any).push("/(tabs)/scan");
    }

    return (
        <View className="flex-1 items-center justify-center bg-background p-safe-offset-5">
            <Text className="text-foreground font-bold mb-4 text-lg">
                Ready to scan?
            </Text>
            <Pressable
                className="flex-row items-center rounded bg-primary px-6 py-3"
                onPress={startScan}
            >
                <Text className="text-white font-semibold mr-3">Start Scan</Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={1} />
            </Pressable>
        </View>
    );
}
