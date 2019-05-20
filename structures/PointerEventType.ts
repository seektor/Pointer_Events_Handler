export enum PointerEventType {
    ActionStart = 'ActionStart',
    ActionMove = 'ActionMove',
    ActionEnd = 'ActionEnd',
    ActionClickTap = 'ActionClickTap',
}

export type BasePointerEventType = PointerEventType.ActionStart | PointerEventType.ActionMove | PointerEventType.ActionEnd;