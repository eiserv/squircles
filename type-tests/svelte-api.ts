import type { Action } from "svelte/action";
import type { Attachment } from "svelte/attachments";
import { squircle, type SquircleGeometryOptions } from "../src/svelte/index.js";
import { applySquircle } from "../src/dom/index.js";

const action: Action<HTMLElement, SquircleGeometryOptions | undefined> = squircle;
const attachment: Attachment<HTMLElement> = (element) => applySquircle(element);
void action;
void attachment;
