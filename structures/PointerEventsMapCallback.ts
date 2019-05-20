import { SyntheticEventCallback } from "./EventCallbacks";

export interface PointerEventsMapCallbacks {
    refCallback: SyntheticEventCallback;
    mouseCallback: (e: MouseEvent) => void;
    touchCallback: (e: TouchEvent) => void;
    isHelperCallback?: boolean;
}