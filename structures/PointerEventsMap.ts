import { PointerEventsMapCallbacks } from "./PointerEventsMapCallback";
import { PointerEventType } from "./PointerEventType";

export type PointerEventsMap = { -readonly [key in keyof typeof PointerEventType]?: PointerEventsMapCallbacks[] };
