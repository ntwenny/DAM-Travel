import * as React from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

interface BudgetDialogProps {
    initialValue: number;
    onSave: (value: number) => void;
}

export function BudgetDialog({ initialValue, onSave }: BudgetDialogProps) {
    const [value, setValue] = React.useState(String(initialValue));
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSave = () => {
        const numericValue = parseFloat(value);
        if (!Number.isNaN(numericValue)) {
            onSave(numericValue);
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost">Edit Budget</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Budget</DialogTitle>
                    <DialogDescription>
                        Enter your new total budget.
                    </DialogDescription>
                </DialogHeader>
                <Input
                    value={value}
                    onChangeText={setValue}
                    keyboardType="numeric"
                    placeholder="Enter budget"
                />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">
                            <Text>Cancel</Text>
                        </Button>
                    </DialogClose>
                    <Button onPress={handleSave}>
                        <Text>Save</Text>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
