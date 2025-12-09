import AnimatedView from "./ui/animated-view";
import { SocialConnections } from "@/components/social-connections";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { CloudIcon } from "lucide-react-native";
import * as React from "react";
import { type TextInput, View, Image } from "react-native";

type SignInFormProps = {
    onSubmit: (email: string, password: string) => Promise<void> | void;
    onSwitch: () => void;
    loading?: boolean;
    errorMessage?: string | null;
};

export function SignInForm({
    onSubmit,
    onSwitch,
    loading = false,
    errorMessage,
}: SignInFormProps) {
    const passwordInputRef = React.useRef<TextInput>(null);
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");

    function handleEmailSubmitEditing() {
        passwordInputRef.current?.focus();
    }

    const handleSubmit = React.useCallback(() => {
        if (!email.trim() || !password || loading) {
            return;
        }
        onSubmit(email.trim(), password);
    }, [email, password, loading, onSubmit]);

    const disableSubmit = loading || !email.trim() || !password;

    return (
        <AnimatedView>
            <View className="gap-6">
                <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
                    <CardHeader>
                        <View className="items-center mb-2">
                            <Image
                                source={require("./logo/skypocketlogo.png")}
                                style={{
                                    width: 160,
                                    height: 100,
                                    resizeMode: "contain",
                                }}
                            />
                        </View>
                        <CardTitle className="text-center">
                            <Text className="text-xl sm:text-left font-[Josefin_Bold]">
                                Welcome back to SkyPocket!
                            </Text>
                        </CardTitle>
                        <CardDescription className="text-center sm:text-left">
                            Sign in with your email to jump back into your
                            trips.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="gap-6">
                        <View className="gap-6">
                            <View className="gap-1.5">
                                <Label htmlFor="email">Email </Label>
                                <Input
                                    id="email"
                                    placeholder="m@example.com"
                                    keyboardType="email-address"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                    onSubmitEditing={handleEmailSubmitEditing}
                                    returnKeyType="next"
                                    submitBehavior="submit"
                                />
                            </View>
                            <View className="gap-1.5">
                                <View className="flex-row items-center">
                                    <Label htmlFor="password">Password</Label>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="web:h-fit ml-auto px-1 py-0 sm:h-4"
                                        onPress={() => {
                                            // TODO: Navigate to forgot password screen
                                        }}
                                    >
                                        Forgot your password?
                                    </Button>
                                </View>
                                <Input
                                    ref={passwordInputRef}
                                    id="password"
                                    secureTextEntry
                                    returnKeyType="send"
                                    value={password}
                                    onChangeText={setPassword}
                                    onSubmitEditing={handleSubmit}
                                />
                            </View>
                            {Boolean(errorMessage) && (
                                <Text className="text-destructive text-sm">
                                    {errorMessage}
                                </Text>
                            )}
                            <Button
                                className="w-full"
                                onPress={handleSubmit}
                                disabled={disableSubmit}
                            >
                                <Text>
                                    {loading ? "Signing in…" : "Sign in"}
                                </Text>
                            </Button>
                        </View>

                        <View className="flex-row items-center">
                            <Label>Don&apos;t have an account? </Label>
                            <Button
                                variant="link"
                                size="sm"
                                className="text-lg"
                                onPress={onSwitch}
                                disabled={loading}
                            >
                                Sign up
                            </Button>
                        </View>
                        <View className="flex-row items-center">
                            <Separator className="flex-1" />
                            <Text className="text-muted-foreground px-4 text-sm">
                                or
                            </Text>
                            <Separator className="flex-1" />
                        </View>
                        <SocialConnections />
                    </CardContent>
                </Card>
            </View>
        </AnimatedView>
    );
}
