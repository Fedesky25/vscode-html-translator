"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wantsTranslations = exports.getSuggestions = exports.updateTranslationsFrom = exports.unloadTranslationsFor = exports.loadTranslationsFor = exports.syncWithConfiguration = void 0;
const vscode_1 = require("vscode");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const re = /{{([a-zA-Z._\-]*)}}/;
const root = vscode_1.workspace.workspaceFolders ? vscode_1.workspace.workspaceFolders[0].uri.fsPath : null;
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
function syncWithConfiguration() {
    if (!root)
        return;
    data = [];
    mapHTML.clear();
    mapJSON.clear();
    var f;
    var item;
    var htmlPath;
    var jsonPath;
    let config = vscode_1.workspace.getConfiguration("html-translator");
    // files
    let files = config.get("files");
    if (!Array.isArray(files))
        return;
    let errors = [];
    for (var i = 0; i < files.length; i++) {
        f = files[i];
        if (f && typeof f === "object" && typeof f.source === "string" && typeof f.texts === "string") {
            htmlPath = (0, path_1.join)(root, f.source);
            jsonPath = (0, path_1.join)(root, f.texts);
            Promise.all([(0, promises_1.access)(htmlPath), (0, promises_1.access)(jsonPath)])
                .then(() => {
                item = { htmlPath, jsonPath, translation: null };
                mapHTML.set(htmlPath, item);
                mapJSON.set(jsonPath, item);
                data.push(item);
            })
                .catch(() => {
                vscode_1.window.showErrorMessage("Could not access some files");
            });
        }
        else {
            errors.push(i);
        }
    }
    if (errors.length) {
        vscode_1.window.showErrorMessage(`Invalid files configuration of elements of index ${errors.join(", ")}`);
        errors.length = 0;
    }
    // languages
}
exports.syncWithConfiguration = syncWithConfiguration;
function loadTranslationsFor(doc) {
    const item = mapHTML.get(doc.uri.fsPath);
    if (!item)
        return;
    if (item.translation)
        return;
    (0, promises_1.readFile)(item.jsonPath, { encoding: "utf-8" })
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
exports.loadTranslationsFor = loadTranslationsFor;
function unloadTranslationsFor(doc) {
    const item = mapHTML.get(doc.uri.fsPath);
    if (!item)
        return;
    item.translation = null;
}
exports.unloadTranslationsFor = unloadTranslationsFor;
function updateTranslationsFrom(doc) {
    const item = mapJSON.get(doc.uri.fsPath);
    if (!item)
        return;
    const res = parseTranslationDocumentText(doc.getText());
    item.translation = res;
    console.log("Updated " + item.jsonPath);
}
exports.updateTranslationsFrom = updateTranslationsFrom;
function getSuggestions(doc, pos) {
    const item = mapHTML.get(doc.uri.fsPath);
    if (!item || !item.translation)
        return null;
    const exp = re.exec(doc.lineAt(pos.line).text);
    if (!exp)
        return null;
    let written = exp[1];
    return item.translation
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