import { useCallback, useEffect, useState } from "react";

export function useLogs() {
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const formatMessage = (args: any[]) => {
            return args
                .map((arg) => {
                    if (typeof arg === "string") {
                        return arg;
                    }
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return "Un-stringifiable object";
                    }
                })
                .join(" ");
        };

        console.log = (...args) => {
            setLogs((prev) => [...prev, `[LOG] ${formatMessage(args)}`]);
            originalLog.apply(console, args);
        };

        console.warn = (...args) => {
            setLogs((prev) => [...prev, `[WARN] ${formatMessage(args)}`]);
            originalWarn.apply(console, args);
        };

        console.error = (...args) => {
            setLogs((prev) => [...prev, `[ERROR] ${formatMessage(args)}`]);
            originalError.apply(console, args);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return { logs, clearLogs };
}
