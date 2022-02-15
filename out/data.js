"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wantsTranslations = exports.getSuggestions = exports.clearAll = exports.updateTranslationsFrom = exports.parseConfig = void 0;
const vscode_1 = require("vscode");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const utils_1 = require("./utils");
let opening = "{{";
let closing = "}}";
let re;
const defaultRegExp = /{{\s*([a-zA-Z._\-]*)\s*}}/;
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
/**
 * @param obj object to parse
 * @returns error string or null
 */
function parseEscapes(obj) {
    if (!obj) {
        re = defaultRegExp;
        opening = "{{";
        closing = "}}";
        return null;
    }
    if (Array.isArray(obj) && obj.length == 2 &&
        typeof obj[0] == "string" && obj[0].length > 1 &&
        typeof obj[1] == "string" && obj[1].length > 1) {
        if ((0, utils_1.isLetterOrDigit)(obj[0].charCodeAt(obj.length - 1))
            || (0, utils_1.isLetterOrDigit)(obj[1].charCodeAt(0))) {
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
        catch (err) {
            re = defaultRegExp;
            console.error(err);
            return "Error at regular expression creation: rolling back to default {{ }}";
        }
    }
    else {
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
async function parseConfig() {
    if (!root)
        return null;
    clearAll();
    let config = vscode_1.workspace.getConfiguration("html-translator");
    // escape chars
    let escape_err = parseEscapes(config.get("escape-strings"));
    // files
    let files = config.get("files");
    if (!Array.isArray(files))
        return escape_err
            ? ["Files in configuration is not an array", escape_err]
            : ["Files in configuration is not an array"];
    // promise result
    let tasks = files.map(parseConfigFilesItem);
    return Promise.all(tasks)
        .then(messages => {
        console.log("Configuration parsed");
        // console.log(data);
        let errors = messages.filter(v => !!v);
        if (escape_err)
            errors.push(escape_err);
        return errors.length ? errors : null;
    });
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
const allowedInEscape = (0, utils_1.charCodesOf)("._");
const allowedInUrl = (0, utils_1.charCodesOf)("./_ #$");
function getSuggestions(doc, pos) {
    const item = mapHTML.get(doc.uri.fsPath);
    if (!item || !item.valid)
        return null;
    const line = doc.lineAt(pos.line).text;
    const col = pos.character;
    if ((0, utils_1.matchStringAfter)(closing, line, (0, utils_1.firstNonSpace)(line, col))) {
        const s = (0, utils_1.getTypedBefore)(line, col, allowedInEscape);
        if (!s || !(0, utils_1.matchStringBefore)(opening, line, (0, utils_1.lastNonSpace)(line, col - s.length - 1)))
            return null;
        console.log("Load suggestions");
        const dot_index = s.lastIndexOf(".");
        const matches = item.keys.filter(v => v.startsWith(s));
        if (!matches.length)
            return null;
        return dot_index === -1
            ? matches.map(v => new vscode_1.CompletionItem(v, vscode_1.CompletionItemKind.EnumMember))
            : matches.map(v => new vscode_1.CompletionItem(v.substring(dot_index + 1), vscode_1.CompletionItemKind.EnumMember));
    }
    else {
        console.log("Suggest snippet");
        const ns = (0, utils_1.lastNonSpace)(line, col - 1);
        console.log(ns, col);
        if (!(0, utils_1.matchStringBefore)(opening, line, ns))
            return null;
        const item = new vscode_1.CompletionItem("translated text reference", vscode_1.CompletionItemKind.Snippet);
        if (ns !== col - 1)
            item.range = new vscode_1.Range(pos.line, ns, pos.line, col + 1);
        //item.range = new Range(pos.line, ns-opening.length, pos.line, col);
        item.insertText = new vscode_1.SnippetString("${0:textID}" + closing);
        return [item];
    }
}
exports.getSuggestions = getSuggestions;
function wantsTranslations(doc) {
    return mapHTML.has(doc.uri.fsPath);
}
exports.wantsTranslations = wantsTranslations;
//# sourceMappingURL=data.js.map