import { MouseEventCallback, SyntheticEventCallback, TouchEventCallback } from './structures/EventCallbacks';
import { PointerEventsMap } from './structures/PointerEventsMap';
import { PointerEventsMapCallbacks } from './structures/PointerEventsMapCallback';
import { BasePointerEventType, PointerEventType } from './structures/PointerEventType';
import { SyntheticEvent } from './structures/SyntheticEvent';

export class PointerEventHandler {

    private subscribersMap: Map<Node, Partial<PointerEventsMap>>;
    private syntheticEvent: SyntheticEvent;

    private tapStartElement: EventTarget | null = null;

    constructor() {
        this.syntheticEvent = this.createSyntheticEvent();
        this.subscribersMap = new Map();
    }

    public flushAll(): void {
        [...this.subscribersMap.keys()].forEach(element => {
            const eventsMap: Partial<PointerEventsMap> = this.subscribersMap.get(element);
            Object.keys(eventsMap).forEach(type => this.removeEventListenerByType(element, type as PointerEventType));
        })
    }

    public addEventListener(element: Node, type: PointerEventType, callback: SyntheticEventCallback): void {
        switch (type) {
            case PointerEventType.ActionStart:
            case PointerEventType.ActionMove:
            case PointerEventType.ActionEnd:
                this.addBaseEvent(element, type, callback);
                break;
            case PointerEventType.ActionClickTap:
                this.addActionClickTapEvent(element, type, callback);
                break;
        }
    }

    public removeEventListenerByType(element: Node, type: PointerEventType): void {
        if (!this.subscribersMap.has(element)) {
            return;
        }
        const eventsMap: Partial<PointerEventsMap> = this.subscribersMap.get(element);
        if (!eventsMap[type]) {
            return;
        }
        const callbacksObjects: PointerEventsMapCallbacks[] = [...eventsMap[type]];
        callbacksObjects.forEach(callbacks => {
            this.removeEventListener(element, type, callbacks.refCallback);
        });


    }

    public removeEventListener(element: Node, type: PointerEventType, callback: SyntheticEventCallback): void {
        switch (type) {
            case PointerEventType.ActionStart:
            case PointerEventType.ActionMove:
            case PointerEventType.ActionEnd:
                this.removeBaseEvent(element, type, callback);
                break;
            case PointerEventType.ActionClickTap:
                this.removeActionClickTapEvent(element, type, callback);
                break;
        }
    }

    private createSyntheticEvent(): SyntheticEvent {
        return {
            clientX: null,
            clientY: null,
            currentTarget: null,
            stopPropagation: null,
            target: null,
        }
    }

    private addBaseEvent(element: Node, type: BasePointerEventType, callback: SyntheticEventCallback): void {
        const mouseEventName: string = this.getMouseEventName(type);
        const touchEventName: string = this.getTouchEventName(type);
        const mouseCallback: MouseEventCallback = (e: MouseEvent) => callback(this.mouseToSynthetic(e));
        const touchCallback: TouchEventCallback = (e: TouchEvent) => {
            e.preventDefault();
            callback(this.touchToSynthetic(e));
        };
        element.addEventListener(mouseEventName, mouseCallback);
        element.addEventListener(touchEventName, touchCallback);
        const callbacksObject: PointerEventsMapCallbacks = {
            mouseCallback: mouseCallback,
            refCallback: callback,
            touchCallback: touchCallback
        }
        this.addCallbacksObject(element, type, callbacksObject);
    }

    private addActionClickTapEvent(element: Node, type: PointerEventType.ActionClickTap, callback: SyntheticEventCallback): void {
        const mouseEventName: string = this.getMouseEventName(type);
        const mouseCallback: MouseEventCallback = (e: MouseEvent) => callback(this.mouseToSynthetic(e));
        element.addEventListener(mouseEventName, mouseCallback);
        const mouseStartcallbacksObject: PointerEventsMapCallbacks = {
            mouseCallback,
            refCallback: callback,
            touchCallback: null,
        }
        this.addCallbacksObject(element, PointerEventType.ActionClickTap, mouseStartcallbacksObject);

        const touchStartEventName: string = this.getTouchEventName(PointerEventType.ActionStart);
        const touchEndEventName: string = this.getTouchEventName(PointerEventType.ActionEnd);
        const touchStartCallback: TouchEventCallback = (e: TouchEvent) => {
            e.preventDefault();
            this.tapStartElement = e.target;
        }
        const touchEndCallback: TouchEventCallback = (e: TouchEvent) => {
            e.preventDefault();
            if (this.tapStartElement === e.target) {
                callback(this.touchToSynthetic(e));
            }
            this.tapStartElement = null;
        }

        element.addEventListener(touchStartEventName, touchStartCallback);
        element.addEventListener(touchEndEventName, touchEndCallback);

        const touchStartcallbacksObject: PointerEventsMapCallbacks = {
            mouseCallback: null,
            refCallback: callback,
            touchCallback: touchStartCallback,
            isHelperCallback: true
        }
        const touchEndcallbacksObject: PointerEventsMapCallbacks = {
            mouseCallback: null,
            refCallback: callback,
            touchCallback: touchEndCallback,
            isHelperCallback: true
        }
        this.addCallbacksObject(element, PointerEventType.ActionStart, touchStartcallbacksObject);
        this.addCallbacksObject(element, PointerEventType.ActionEnd, touchEndcallbacksObject);
    }

    private addCallbacksObject(element: Node, type: PointerEventType, callbacksObject: PointerEventsMapCallbacks): void {
        if (!this.subscribersMap.has(element)) {
            this.subscribersMap.set(element, {});
        }
        const eventsMap: PointerEventsMap = this.subscribersMap.get(element);
        if (!eventsMap[type]) {
            eventsMap[type] = [];
        }
        const callbacksObjects: PointerEventsMapCallbacks[] = eventsMap[type];
        callbacksObjects.push(callbacksObject);
    }

    private removeBaseEvent(element: Node, type: BasePointerEventType, callback: SyntheticEventCallback, isHelperCallback?: boolean): void {
        if (!this.subscribersMap.has(element)) {
            return;
        }
        const eventsMap: Partial<PointerEventsMap> = this.subscribersMap.get(element);
        if (!eventsMap[type]) {
            return;
        }
        const eventsMapCallbacks: PointerEventsMapCallbacks[] = eventsMap[type];
        const matchingEventsMapCallbacks: PointerEventsMapCallbacks[] = eventsMapCallbacks.filter(callbacks => callbacks.refCallback === callback && callbacks.isHelperCallback === isHelperCallback);
        const mouseEventName: string = this.getMouseEventName(type);
        const touchEventName: string = this.getTouchEventName(type);
        matchingEventsMapCallbacks.forEach((callbacks) => {
            element.removeEventListener(mouseEventName, callbacks.mouseCallback);
            element.removeEventListener(touchEventName, callbacks.touchCallback);
            eventsMapCallbacks.splice(eventsMapCallbacks.indexOf(callbacks), 1);
        });
        if (eventsMapCallbacks.length === 0) {
            delete eventsMap[type];
            if (Object.keys(eventsMap).length === 0) {
                this.subscribersMap.delete(element);
            }
        }
    }

    private removeActionClickTapEvent(element: Node, type: PointerEventType.ActionClickTap, callback: SyntheticEventCallback): void {
        if (!this.subscribersMap.has(element)) {
            return;
        }
        const eventsMap: Partial<PointerEventsMap> = this.subscribersMap.get(element);
        if (!eventsMap[type]) {
            return;
        }
        const eventsMapCallbacks: PointerEventsMapCallbacks[] = eventsMap[type];
        const matchingEventsMapCallbacks: PointerEventsMapCallbacks[] = eventsMapCallbacks.filter(callbacks => callbacks.refCallback === callback);
        const mouseEventName: string = this.getMouseEventName(type);
        matchingEventsMapCallbacks.forEach((callbacks) => {
            element.removeEventListener(mouseEventName, callbacks.mouseCallback);
            eventsMapCallbacks.splice(eventsMapCallbacks.indexOf(callbacks), 1);
            this.removeBaseEvent(element, PointerEventType.ActionStart, callback, true);
            this.removeBaseEvent(element, PointerEventType.ActionEnd, callback, true);
        });
        if (eventsMapCallbacks.length === 0) {
            delete eventsMap[type];
            if (Object.keys(eventsMap).length === 0) {
                this.subscribersMap.delete(element);
            }
        }
    }

    private getMouseEventName(type: BasePointerEventType | PointerEventType.ActionClickTap): string {
        switch (type) {
            case PointerEventType.ActionEnd:
                return 'mouseup';
            case PointerEventType.ActionMove:
                return 'mousemove';
            case PointerEventType.ActionStart:
                return 'mousedown';
            case PointerEventType.ActionClickTap:
                return 'click';
        }
    }

    private getTouchEventName(type: BasePointerEventType): string {
        switch (type) {
            case PointerEventType.ActionEnd:
                return 'touchend';
            case PointerEventType.ActionMove:
                return 'touchmove';
            case PointerEventType.ActionStart:
                return 'touchstart';
        }
    }

    private nullifyEvent(event: SyntheticEvent): void {
        Object.keys(event).forEach((key) => this.syntheticEvent[key] = null);
    }

    private mouseToSynthetic(e: MouseEvent): SyntheticEvent {
        this.nullifyEvent(this.syntheticEvent);
        this.syntheticEvent.clientX = e.clientX;
        this.syntheticEvent.clientY = e.clientY;
        this.syntheticEvent.currentTarget = e.currentTarget;
        this.syntheticEvent.stopPropagation = e.stopPropagation.bind(e);
        this.syntheticEvent.target = e.target;
        return this.syntheticEvent;
    }

    private touchToSynthetic(e: TouchEvent): SyntheticEvent {
        this.nullifyEvent(this.syntheticEvent);
        this.syntheticEvent.clientX = e.touches[0].clientX;
        this.syntheticEvent.clientY = e.touches[0].clientY;
        this.syntheticEvent.currentTarget = e.currentTarget;
        this.syntheticEvent.stopPropagation = e.stopPropagation.bind(e);
        this.syntheticEvent.target = e.target;
        return this.syntheticEvent;
    }
}