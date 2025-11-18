import { useLogs } from "@/hooks/useLogs";
import { TrashIcon, ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function DiagnosticsScreen() {
    const { logs, clearLogs } = useLogs();
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 p-4">
                <View className="flex-row justify-between items-center mb-4">
                    <Pressable
                        onPress={() => router.back()}
                        className="mb-4 w-[10%]"
                    >
                        <ArrowLeft className="m-2" size={18} color="white" />
                    </Pressable>
                    <Pressable onPress={clearLogs} className="mb-4 w-[10%]">
                        <TrashIcon className="m-2" size={18} color="white" />
                    </Pressable>
                </View>
                <ScrollView className="flex-1 bg-card rounded-md border border-border">
                    <Text className="p-4 text-foreground font-mono text-xs">
                        {logs.length > 0 ? logs.join("\n") : "No logs yet..."}
                    </Text>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
