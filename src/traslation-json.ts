import { TextDocument } from 'vscode';
import { fromJSON } from './data';

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

export function parseTranslationDocumentText(text: string): null | string[] {
    const obj = JSON.parse(text);
    if(!obj || typeof obj !== "object") return null;
    const res: string[] = recursiveParse(obj);
    // console.log("Parsed", res);
    return res.length ? res : null;
}

export function updateTranslationsFrom(doc: TextDocument) {
    const item = fromJSON(doc.uri);
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