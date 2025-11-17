import * as React from "react";
import {
    Toast,
    ToastClose,
    ToastContent,
    ToastDescription,
    ToastIcon,
    ToastTitle,
    type ToastVariant,
} from "@/components/ui/toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View } from "react-native";
import Animated, {
    FadeInUp,
    FadeOutUp,
    LinearTransition,
} from "react-native-reanimated";

type ToastData = {
    id: string;
    title: string;
    description?: string;
    variant: ToastVariant;
};

type ToastContextType = {
    toast: (data: Omit<ToastData, "id">) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(
    undefined
);

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastData[]>([]);
    const insets = useSafeAreaInsets();

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = React.useCallback(
        (data: Omit<ToastData, "id">) => {
            const id = Date.now().toString();
            const newToast: ToastData = { id, ...data };
            setToasts((prev) => [newToast, ...prev]);

            const timer = setTimeout(() => {
                removeToast(id);
            }, 5000);

            return () => clearTimeout(timer);
        },
        [removeToast]
    );

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <View
                style={{
                    position: "absolute",
                    top: insets.top === 0 ? 24 : insets.top,
                    left: 16,
                    right: 16,
                    zIndex: 9999,
                }}
            >
                {toasts.map((t) => (
                    <Animated.View
                        key={t.id}
                        entering={FadeInUp}
                        exiting={FadeOutUp}
                        layout={LinearTransition}
                    >
                        <Toast
                            variant={t.variant}
                            onClose={() => removeToast(t.id)}
                        >
                            <ToastIcon />
                            <ToastContent className="gap-x-2">
                                <ToastTitle>{t.title}</ToastTitle>
                                {t.description && (
                                    <ToastDescription>
                                        {t.description}
                                    </ToastDescription>
                                )}
                            </ToastContent>
                            <ToastClose onPress={() => removeToast(t.id)} />
                        </Toast>
                    </Animated.View>
                ))}
            </View>
        </ToastContext.Provider>
    );
}
