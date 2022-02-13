import { TextDocument, Position, CompletionItem, workspace, CompletionItemKind } from "vscode";
import { join as joinPath } from "path";
import { readFile, access } from 'fs/promises';

const re = /{{\s*([a-zA-Z._\-]*)\s*}}/;
const root = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : "";

type TranslationDataItem = {
    htmlPath: string,
    jsonPath: string,
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


export async function parseConfig(): Promise<string[] | null> {
    if(!root) return null;
    clearAll();
    let config = workspace.getConfiguration("html-translator");
    // files
    let files = config.get("files");
    if(!Array.isArray(files)) return ["Files in configuration is not an array"];
    return Promise.all(files.map(parseConfigFilesItem))
    .then(messages => {
        console.log("Config parsed");
        console.log(data);
        let errors = messages.filter(v => !!v) as string[];
        return errors.length ? errors : null;
    });
    // languages
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

export function getSuggestions(doc: TextDocument, pos: Position): null|CompletionItem[] {
    const item = mapHTML.get(doc.uri.fsPath);
    if(!item || !item.valid) return null;
    const exp = re.exec(doc.lineAt(pos.line).text);
    if(!exp) return null;

    let written: string = exp[1];
    return item.keys
    .filter(v => v.startsWith(written))
    .map(v => new CompletionItem(v, CompletionItemKind.Constant));

    // var at: any = item.translation;
    // let pieces = written.split('.');
    // console.log(pieces);
    // let last = pieces[pieces.length-1];
    // for(var i=0; i<pieces.length-1; i++) {
    //     at = at[pieces[i]];
    //     if(!at) return null;
    // }
    // const res = Object.keys(at)
    // .filter(k => k.startsWith(last))
    // .map(v => new CompletionItem(v, CompletionItemKind.Constant))

    // return res;
}

export function wantsTranslations(doc: TextDocument) {
    return mapHTML.has(doc.uri.fsPath);
}
