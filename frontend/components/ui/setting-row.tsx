import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";

type SettingRowProps = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description?: string;
    onPress?: () => void;
};

export default function SettingRow({
    label,
    icon,
    description,
    onPress,
}: SettingRowProps) {
    return (
        <Pressable
            onPress={onPress}
            className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3.5"
        >
            <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50">
                    <Ionicons name={icon} size={20} color="#4338CA" />
                </View>
                <View>
                    <Text className="text-base font-semibold text-slate-900">
                        {label}
                    </Text>
                    {description ? (
                        <Text className="text-sm text-slate-500">
                            {description}
                        </Text>
                    ) : null}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </Pressable>
    );
}
