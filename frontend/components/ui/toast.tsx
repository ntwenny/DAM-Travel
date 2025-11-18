import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    AlertCircle,
    Info,
    X,
    type LucideIcon,
} from "lucide-react-native";
import * as React from "react";
import { View, type ViewProps, TouchableOpacity } from "react-native";

const toastVariants = {
    success: {
        icon: CheckCircle2,
        className: "bg-primary",
        iconClass: "text-foreground",
        titleClass: "text-foreground",
        descriptionClass: "text-foreground/90",
    },
    error: {
        icon: AlertCircle,
        className: "bg-destructive border-destructive-foreground/20",
        iconClass: "text-destructive-foreground",
        titleClass: "text-destructive-foreground",
        descriptionClass: "text-destructive-foreground/90",
    },
    info: {
        icon: Info,
        className: "bg-card border-info-foreground/20",
        iconClass: "text-foreground",
        titleClass: "text-foreground",
        descriptionClass: "text-foreground/90",
    },
};

type ToastVariant = keyof typeof toastVariants;

const ToastContext = React.createContext<{
    variant: ToastVariant;
}>({
    variant: "info",
});

interface ToastProps extends ViewProps {
    variant?: ToastVariant;
    onClose?: () => void;
}

const Toast = React.forwardRef<View, ToastProps>(
    ({ className, variant = "info", onClose, ...props }, ref) => {
        const variantProps = toastVariants[variant];
        return (
            <ToastContext.Provider value={{ variant }}>
                <View
                    ref={ref}
                    role="status"
                    className={cn(
                        "relative w-full flex-row items-center space-x-4 rounded-lg border p-4",
                        variantProps.className,
                        className
                    )}
                    {...props}
                />
            </ToastContext.Provider>
        );
    }
);
Toast.displayName = "Toast";

const ToastIcon = React.forwardRef<
    React.ElementRef<typeof Icon>,
    Partial<React.ComponentPropsWithoutRef<typeof Icon>> & {
        icon?: LucideIcon;
    }
>(({ className, icon, ...props }, ref) => {
    const { variant } = React.useContext(ToastContext);
    const variantProps = toastVariants[variant];
    const IconComponent = icon || variantProps.icon;
    return (
        <Icon
            as={IconComponent}
            className={cn("h-6 w-6", variantProps.iconClass, className)}
            {...props}
        />
    );
});
ToastIcon.displayName = "ToastIcon";

const ToastContent = React.forwardRef<View, ViewProps>(
    ({ className, ...props }, ref) => {
        return (
            <View
                ref={ref}
                className={cn("px-4 flex-1", className)}
                {...props}
            />
        );
    }
);
ToastContent.displayName = "ToastContent";

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => {
    const { variant } = React.useContext(ToastContext);
    const variantProps = toastVariants[variant];
    return (
        <Text
            ref={ref}
            className={cn(
                "text-sm font-[JosefinSans-Bold]",
                variantProps.titleClass,
                className
            )}
            {...props}
        />
    );
});
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof Text>,
    React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => {
    const { variant } = React.useContext(ToastContext);
    const variantProps = toastVariants[variant];
    return (
        <Text
            ref={ref}
            className={cn(
                "text-sm font-[Josefin_Bold]",
                variantProps.descriptionClass,
                className
            )}
            {...props}
        />
    );
});
ToastDescription.displayName = "ToastDescription";

const ToastClose = React.forwardRef<
    React.ElementRef<typeof TouchableOpacity>,
    React.ComponentPropsWithoutRef<typeof TouchableOpacity>
>(({ className, ...props }, ref) => {
    const { variant } = React.useContext(ToastContext);
    const variantProps = toastVariants[variant];
    return (
        <TouchableOpacity
            ref={ref}
            className={cn(
                "absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2",
                className
            )}
            {...props}
        >
            <X className={cn("h-4 w-4", variantProps.iconClass)} />
        </TouchableOpacity>
    );
});
ToastClose.displayName = "ToastClose";

export {
    Toast,
    ToastIcon,
    ToastContent,
    ToastTitle,
    ToastDescription,
    ToastClose,
    toastVariants,
    type ToastProps,
    type ToastVariant,
};
