import { TextDocument, Position, CompletionItem, workspace, window, CompletionItemKind } from "vscode";
import { join as joinPath } from "path";
import { readFile, access } from 'fs/promises';

const re = /{{([a-zA-Z._\-]*)}}/;
const root = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : null;

type TranslationDataItem = {
    htmlPath: string,
    jsonPath: string,
    translation: null | string[]
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

export function syncWithConfiguration() {
    if(!root) return;
    data = [];
    mapHTML.clear();
    mapJSON.clear();
    var f;
    var item: TranslationDataItem;
    var htmlPath: string;
    var jsonPath: string;
    let config = workspace.getConfiguration("html-translator");

    // files
    let files = config.get("files");
    if(!Array.isArray(files)) return;
    let errors: number[] = [];
    for(var i=0; i<files.length; i++) {
        f = files[i];
        if(f && typeof f === "object" && typeof f.source === "string" && typeof f.texts === "string") {
            htmlPath = joinPath(root, f.source);
            jsonPath = joinPath(root, f.texts);
            Promise.all([access(htmlPath), access(jsonPath)])
            .then(() => {
                item = { htmlPath, jsonPath, translation: null };
                mapHTML.set(htmlPath, item);
                mapJSON.set(jsonPath, item);
                data.push(item);
            })
            .catch(() => {
                window.showErrorMessage("Could not access some files");
            })
        } else {
            errors.push(i);
        }
    }
    if(errors.length) {
        window.showErrorMessage(`Invalid files configuration of elements of index ${errors.join(", ")}`);
        errors.length = 0;
    }

    // languages
}

export function loadTranslationsFor(doc: TextDocument) {
    const item = mapHTML.get(doc.uri.fsPath);
    if(!item) return;
    if(item.translation) return;
    readFile(item.jsonPath, {encoding: "utf-8"})
    .then(txt => {
        const res = parseTranslationDocumentText(txt);
        item.translation = res;
        console.log("Loaded " + item.jsonPath);
    })
    .catch(err => {
        console.error("Could not open file " + item.jsonPath);
        console.error(err);
    });
}

export function unloadTranslationsFor(doc: TextDocument) {
    const item = mapHTML.get(doc.uri.fsPath);
    if(!item) return;
    item.translation = null;
}

export function updateTranslationsFrom(doc: TextDocument) {
    const item = mapJSON.get(doc.uri.fsPath);
    if(!item) return;
    const res = parseTranslationDocumentText(doc.getText());
    item.translation = res;
    console.log("Updated " + item.jsonPath);
}

export function getSuggestions(doc: TextDocument, pos: Position): null|CompletionItem[] {
    const item = mapHTML.get(doc.uri.fsPath);
    if(!item || !item.translation) return null;
    const exp = re.exec(doc.lineAt(pos.line).text);
    if(!exp) return null;

    let written: string = exp[1];
    return item.translation
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
