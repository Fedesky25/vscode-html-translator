import { workspace, SnippetString, Uri } from "vscode";
import { charCodesOf, isLetterOrDigit } from './string-utils';

export let opening = "{{";
export let closing = "}}";
export let completeSnippet: SnippetString;
// const defaultRegExp = /{{\s*([a-zA-Z._\-]*)\s*}}/;
export const root = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : "";

export const allowedInEscape = charCodesOf("._");
const allowedInUrl = charCodesOf("./_ #$");

export type TranslationDataItem = {
    htmlPath: string,
    jsonPath: string,
    outPath?: string,
    keys: string[],
    valid: boolean
}

let langs: string[];
let data: TranslationDataItem[];
const mapHTML: Map<string, TranslationDataItem> = new Map();
const mapJSON: Map<string, TranslationDataItem> = new Map();

export const fromHTML = (uri: Uri) => mapHTML.get(uri.fsPath);
export const fromJSON = (uri: Uri) => mapJSON.get(uri.fsPath);

export function addTranslationDataItem(item: TranslationDataItem) {
    mapHTML.set(item.htmlPath, item);
    mapJSON.set(item.jsonPath, item);
    data.push(item);
}

export function clearTranslationItems() {
    mapHTML.clear();
    mapJSON.clear();
    data = []
    console.log("Translation items cleared");
}

export function updateEscapingStrings(s1: string, s2: string): string|null {
    if(!s1 || !s2) {
        opening = "}}"; closing = "{{";
        completeSnippet = new SnippetString("{{$0}}");
        return "Escaping strings must be non-empty";
    }
    const c1 = s1.charCodeAt(s1.length-1);
    const c2 = s2.charCodeAt(0);
    if(isLetterOrDigit(c1) || allowedInEscape.includes(c1) || isLetterOrDigit(c2) || allowedInEscape.includes(c2)) {
        opening = "}}"; closing = "{{";
        completeSnippet = new SnippetString("{{$0}}");
        return "Invalid escape strings: inner-most characters must be different from letters, digits, or . _";
    }
    opening = s1;
    closing = s2;
    completeSnippet = new SnippetString().appendText(opening).appendTabstop(0).appendText(closing);
    return null;
}

export function setDefaultEscapingStrings() {
    opening = "{{";
    closing = "}}";
    completeSnippet = new SnippetString("{{$0}}");
}