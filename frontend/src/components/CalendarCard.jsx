import React from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { DatePicker as AriaDatePicker, Dialog as AriaDialog, Group as AriaGroup, Button as AriaButton } from "react-aria-components";
import { Button } from "./base/buttons/button";
import { Calendar } from "./calendar";

const now = today(getLocalTimeZone());

export const CalendarCardDemo = () => (
    <AriaDatePicker aria-label="Calendar card" defaultValue={now}>
        <AriaGroup className="flex items-center">
            <AriaButton className="px-4 py-2 bg-white-container-low border border-outline-variant rounded-xl font-headline font-bold text-sm text-on-surface hover:bg-white-container transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>Select Date</span>
            </AriaButton>
        </AriaGroup>
        <AriaDialog className="rounded-3xl bg-white shadow-xl ring-1 ring-outline-variant p-0 outline-none animate-scale-in">
            <div className="flex px-5 pt-5 pb-3">
                <Calendar />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-outline-variant/50 p-4 bg-white-container-low/30 rounded-b-3xl">
                <Button size="sm" color="secondary" slot="close">
                    Cancel
                </Button>
                <Button size="sm" color="primary" slot="close">
                    Apply
                </Button>
            </div>
        </AriaDialog>
    </AriaDatePicker>
);
