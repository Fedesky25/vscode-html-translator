import { TextDocument, Position, CompletionItem, workspace, CompletionItemKind, Uri } from "vscode";
import { join as joinPath } from "path";
import { readFile, access } from 'fs/promises';
import { getTyped, charCodesOf, isLetterOrDigit } from './utils';

let opening = "{{";
let closing = "}}";
let re: RegExp;
const defaultRegExp = /{{\s*([a-zA-Z._\-]*)\s*}}/;
const root = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : "";

type TranslationDataItem = {
    htmlPath: string,
    jsonPath: string,
    outPath?: string,
    keys: string[],
    valid: boolean
}

let data: TranslationDataItem[];
const mapHTML: Map<string, TranslationDataItem> = new Map();
const mapJSON: Map<string, TranslationDataItem> = new Map();

interface myObject {
    [key: string]: any
}


function recursiveParse(obj: myObject, baseKey: string = ''): string[] {
    const res: string[] = [];
    var value: any;
    for(var key in obj) {
        value = obj[key];
        if(typeof value !== "object") continue;
        if(value.en || value.it || Object.keys(value).length == 0) res.push(baseKey+key);
        else res.push(...recursiveParse(value, baseKey+key+'.'));
    }
    return res;
}


function parseTranslationDocumentText(text: string): null | string[] {
    const obj = JSON.parse(text);
    if(!obj || typeof obj !== "object") return null;
    const res: string[] = recursiveParse(obj);
    // console.log("Parsed", res);
    return res.length ? res : null;
}


async function parseConfigFilesItem(obj: any, index: number): Promise<null|string> {
    if(!obj || typeof obj !== "object") return "File #" + index + " is not an object";
    if(typeof obj.source !== "string" || typeof obj.texts !== "string") return "Files pair #" + index + " must contain string values for source and texts";
    let htmlPath = joinPath(root, obj.source);
    try { await access(htmlPath) } 
    catch { return "Could not open " + htmlPath }
    let jsonPath = joinPath(root, obj.texts);
    return await readFile(jsonPath, {encoding: "utf-8"})
    .then(parseTranslationDocumentText)
    .then(keys => {
        if(!keys) return "Translations invalid format at " + jsonPath;
        let item = { htmlPath, jsonPath, keys, valid: true };
        mapHTML.set(htmlPath, item);
        mapJSON.set(jsonPath, item);
        data.push(item);
        return null;
    })
    .catch(() =>  "Could not open " + jsonPath)
}

/**
 * @param obj object to parse
 * @returns error string or null
 */
function parseEscapes(obj: unknown): string | null {
    if(!obj) {
        re = defaultRegExp;
        opening = "{{";
        closing = "}}";
        return null;
    }
    if(
        Array.isArray(obj) && obj.length == 2 &&
        typeof obj[0] == "string" && obj[0].length > 1 && 
        typeof obj[1] == "string" && obj[1].length > 1
    ) {
        if(
            isLetterOrDigit(obj[0].charCodeAt(obj.length-1))
            || isLetterOrDigit(obj[1].charCodeAt(0))
        ) {
            re = defaultRegExp;
            opening = "{{";
            closing = "}}";
            return "Invalid escape strings: inner-most character must not be letter or digits";
        }
        try {
            re = new RegExp(obj[0] + "\s*([a-zA-Z._\-]*)\s*" + obj[1]);
            opening = obj[0];
            closing = obj[1];
            return null;
        }
        catch(err) {
            re = defaultRegExp;
            console.error(err);
            return "Error at regular expression creation: rolling back to default {{ }}";
        }
    } else {
        re = defaultRegExp;
        opening = "{{";
        closing = "}}";
        return "Invalid escape strings: expected array of two string with length > 2, rolling back to default {{ }}";
    }
}

/**
 * Parses the extension configuration
 * @returns promise that resolves to a list of error messages, is any
 */
export async function parseConfig(): Promise<string[] | null> {
    if(!root) return null;
    clearAll();
    let config = workspace.getConfiguration("html-translator");
    // escape chars
    let escape_err = parseEscapes(config.get("escape-strings"));
    // files
    let files = config.get("files");
    if(!Array.isArray(files)) return escape_err 
        ? ["Files in configuration is not an array", escape_err] 
        : ["Files in configuration is not an array"];
    
    // promise result
    let tasks = files.map(parseConfigFilesItem)
    return Promise.all(tasks)
    .then(messages => {
        console.log("Configuration parsed");
        // console.log(data);
        let errors = messages.filter(v => !!v) as string[];
        if(escape_err) errors.push(escape_err);
        return errors.length ? errors : null;
    });
}

export function updateTranslationsFrom(doc: TextDocument) {
    const item = mapJSON.get(doc.uri.fsPath);
    if(!item) return;
    const res = parseTranslationDocumentText(doc.getText());
    if(res) {
        item.keys = res;
        item.valid = true;
    } else {
        item.valid = false;
    }
    console.log("Updated " + item.jsonPath);
}

export function clearAll() {
    mapHTML.clear();
    mapJSON.clear();
    data = [];
    console.log("Everything cleared");
}


const allowedInEscape = charCodesOf("._");
const allowedInUrl = charCodesOf("./_#$");

export function getSuggestions(doc: TextDocument, pos: Position): null|CompletionItem[] {
    const item = mapHTML.get(doc.uri.fsPath);
    if(!item || !item.valid) return null;
    const line = doc.lineAt(pos.line).text;

    const written = getTyped(line, pos.character, opening, closing, allowedInEscape);
    if(written === null) return null;

    const dot_index = written.lastIndexOf(".");
    const matches = item.keys.filter(v => v.startsWith(written));
    if(!matches.length) return null;        

    return dot_index === -1
    ? matches.map(v => new CompletionItem(v, CompletionItemKind.EnumMember))
    : matches.map(v => new CompletionItem(v.substring(dot_index+1), CompletionItemKind.EnumMember));
}

export function wantsTranslations(doc: TextDocument) {
    return mapHTML.has(doc.uri.fsPath);
}
