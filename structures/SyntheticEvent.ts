export interface SyntheticEvent {
    currentTarget: EventTarget;
    clientX: number;
    clientY: number;
    stopPropagation(): void;
    target: EventTarget;
}