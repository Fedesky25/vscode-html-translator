"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wantsTranslations = exports.getSuggestions = exports.clearAll = exports.updateTranslationsFrom = exports.parseConfig = void 0;
const vscode_1 = require("vscode");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const re = /{{\s*([a-zA-Z._\-]*)\s*}}/;
const root = vscode_1.workspace.workspaceFolders ? vscode_1.workspace.workspaceFolders[0].uri.fsPath : "";
let data;
const mapHTML = new Map();
const mapJSON = new Map();
function recursiveParse(obj, baseKey = '') {
    const res = [];
    var value;
    for (var key in obj) {
        value = obj[key];
        if (typeof value !== "object")
            continue;
        if (value.en || value.it || Object.keys(value).length == 0)
            res.push(baseKey + key);
        else
            res.push(...recursiveParse(value, baseKey + key + '.'));
    }
    return res;
}
function parseTranslationDocumentText(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== "object")
        return null;
    const res = recursiveParse(obj);
    // console.log("Parsed", res);
    return res.length ? res : null;
}
async function parseConfigFilesItem(obj, index) {
    if (!obj || typeof obj !== "object")
        return "File #" + index + " is not an object";
    if (typeof obj.source !== "string" || typeof obj.texts !== "string")
        return "Files pair #" + index + " must contain string values for source and texts";
    let htmlPath = (0, path_1.join)(root, obj.source);
    try {
        await (0, promises_1.access)(htmlPath);
    }
    catch {
        return "Could not open " + htmlPath;
    }
    let jsonPath = (0, path_1.join)(root, obj.texts);
    return await (0, promises_1.readFile)(jsonPath, { encoding: "utf-8" })
        .then(parseTranslationDocumentText)
        .then(keys => {
        if (!keys)
            return "Translations invalid format at " + jsonPath;
        let item = { htmlPath, jsonPath, keys, valid: true };
        mapHTML.set(htmlPath, item);
        mapJSON.set(jsonPath, item);
        data.push(item);
        return null;
    })
        .catch(() => "Could not open " + jsonPath);
}
async function parseConfig() {
    if (!root)
        return null;
    clearAll();
    let config = vscode_1.workspace.getConfiguration("html-translator");
    // files
    let files = config.get("files");
    if (!Array.isArray(files))
        return ["Files in configuration is not an array"];
    return Promise.all(files.map(parseConfigFilesItem))
        .then(messages => {
        console.log("Config parsed");
        console.log(data);
        let errors = messages.filter(v => !!v);
        return errors.length ? errors : null;
    });
    // languages
}
exports.parseConfig = parseConfig;
function updateTranslationsFrom(doc) {
    const item = mapJSON.get(doc.uri.fsPath);
    if (!item)
        return;
    const res = parseTranslationDocumentText(doc.getText());
    if (res) {
        item.keys = res;
        item.valid = true;
    }
    else {
        item.valid = false;
    }
    console.log("Updated " + item.jsonPath);
}
exports.updateTranslationsFrom = updateTranslationsFrom;
function clearAll() {
    mapHTML.clear();
    mapJSON.clear();
    data = [];
    console.log("Everything cleared");
}
exports.clearAll = clearAll;
function getSuggestions(doc, pos) {
    const item = mapHTML.get(doc.uri.fsPath);
    if (!item || !item.valid)
        return null;
    const exp = re.exec(doc.lineAt(pos.line).text);
    if (!exp)
        return null;
    let written = exp[1];
    return item.keys
        .filter(v => v.startsWith(written))
        .map(v => new vscode_1.CompletionItem(v, vscode_1.CompletionItemKind.Constant));
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
exports.getSuggestions = getSuggestions;
function wantsTranslations(doc) {
    return mapHTML.has(doc.uri.fsPath);
}
exports.wantsTranslations = wantsTranslations;
//# sourceMappingURL=data.js.map