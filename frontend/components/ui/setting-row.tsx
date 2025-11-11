import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";

type SettingRowProps = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description?: string;
    onPress?: () => void;
    pillColor?: string;
    textColor?: string;
    iconBg?: string;
    variant?: "primary" | "default";
};

export default function SettingRow({
    label,
    icon,
    description,
    onPress,
    pillColor = "#4338CA",
    textColor = "#0f172a",
    iconBg = "#eef2ff",
    variant = "default",
}: SettingRowProps) {
    const containerClasses =
        variant === "primary"
            ? "flex-row items-center justify-between rounded-full bg-[#00a0d6] px-6 py-3.5"
            : "flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3.5";

    return (
        <Pressable onPress={onPress} className={containerClasses}>
            <View className="flex-row items-center gap-3">
                <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: iconBg }}
                >
                    <Ionicons name={icon} size={20} color={pillColor} />
                </View>
                <View>
                    <Text
                        className="text-base font-semibold"
                        style={{ color: textColor }}
                    >
                        {label}
                    </Text>
                    {description ? (
                        <Text className="text-sm" style={{ color: textColor }}>
                            {description}
                        </Text>
                    ) : null}
                </View>
            </View>
            <Ionicons
                name="chevron-forward"
                size={18}
                color={variant === "primary" ? "#ffffff" : "#94A3B8"}
            />
        </Pressable>
    );
}
