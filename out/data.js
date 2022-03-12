"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDiagnostics = exports.diagnose = exports.getSuggestions = exports.clearAll = exports.updateTranslationsFrom = exports.parseConfig = exports.addTranslationDataItem = exports.root = exports.defaultRegExp = exports.completeSnippet = exports.closing = exports.opening = void 0;
const vscode_1 = require("vscode");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const string_utils_1 = require("./string-utils");
exports.opening = "{{";
exports.closing = "}}";
exports.defaultRegExp = /{{\s*([a-zA-Z._\-]*)\s*}}/;
exports.root = vscode_1.workspace.workspaceFolders ? vscode_1.workspace.workspaceFolders[0].uri.fsPath : "";
const allowedInEscape = (0, string_utils_1.charCodesOf)("._");
const allowedInUrl = (0, string_utils_1.charCodesOf)("./_ #$");
var CODES;
(function (CODES) {
    CODES[CODES["empty"] = 0] = "empty";
    CODES[CODES["nonexistent"] = 1] = "nonexistent";
})(CODES || (CODES = {}));
;
const SOURCE = "HTML translator";
let langs;
let data;
const mapHTML = new Map();
const mapJSON = new Map();
function addTranslationDataItem(item) {
    mapHTML.set(item.htmlPath, item);
    mapJSON.set(item.jsonPath, item);
    data.push(item);
}
exports.addTranslationDataItem = addTranslationDataItem;
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
    let htmlPath = (0, path_1.join)(exports.root, obj.source);
    try {
        await (0, promises_1.access)(htmlPath);
    }
    catch {
        return "Could not open " + htmlPath;
    }
    let jsonPath = (0, path_1.join)(exports.root, obj.texts);
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
    exports.opening = "{{";
    exports.closing = "}}";
    if (!obj)
        return null;
    let error = null;
    if (Array.isArray(obj) && obj.length == 2 &&
        typeof obj[0] == "string" && obj[0].length > 1 &&
        typeof obj[1] == "string" && obj[1].length > 1) {
        const c1 = obj[0].charCodeAt(obj[0].length - 1);
        const c2 = obj[1].charCodeAt(0);
        if ((0, string_utils_1.isLetterOrDigit)(c1) || allowedInEscape.includes(c1) || (0, string_utils_1.isLetterOrDigit)(c2) || allowedInEscape.includes(c2)) {
            error = "Invalid escape strings: inner-most characters must be different from letters, digits, or . _";
        }
        else {
            exports.opening = obj[0];
            exports.closing = obj[1];
        }
    }
    else {
        error = "Invalid escape strings: expected array of two string with length > 2, rolling back to default {{ }}";
    }
    exports.completeSnippet = new vscode_1.SnippetString().appendText(exports.opening).appendTabstop(0).appendText(exports.closing);
    return error;
}
/**
 * Parses the extension configuration
 * @returns promise that resolves to a list of error messages, is any
 */
async function parseConfig() {
    if (!exports.root)
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
function getSuggestions(doc, pos) {
    const item = mapHTML.get(doc.uri.fsPath);
    if (!item || !item.valid)
        return null;
    const line = doc.lineAt(pos.line).text;
    const col = pos.character;
    if ((0, string_utils_1.matchStringAfter)(exports.closing, line, (0, string_utils_1.firstNonSpace)(line, col))) {
        const s = (0, string_utils_1.getTypedBefore)(line, col, allowedInEscape);
        if (!s || !(0, string_utils_1.matchStringBefore)(exports.opening, line, (0, string_utils_1.lastNonSpace)(line, col - s.length - 1)))
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
        if (!(0, string_utils_1.matchStringBefore)(exports.opening, line, col - 1))
            return null;
        console.log("Suggest snippet");
        const item = new vscode_1.CompletionItem("translated item ", vscode_1.CompletionItemKind.Snippet);
        item.insertText = new vscode_1.SnippetString("${0:textID}").appendText(exports.closing);
        return [item];
    }
}
exports.getSuggestions = getSuggestions;
function createDiagEmpty(line, pos) {
    let res = new vscode_1.Diagnostic(new vscode_1.Range(line, pos, line, pos), "No translated text specified", vscode_1.DiagnosticSeverity.Warning);
    res.code = CODES.empty;
    res.source = SOURCE;
    return res;
}
function createDiagNonExistent(line, start, stop, what) {
    let res = new vscode_1.Diagnostic(new vscode_1.Range(line, start, line, stop), `"${what}" is not a valid translated text`, vscode_1.DiagnosticSeverity.Warning);
    res.code = CODES.nonexistent;
    res.source = SOURCE;
    return res;
}
function shiftDiagnostic(diagnostic, delta) {
    let res = new vscode_1.Diagnostic(new vscode_1.Range(diagnostic.range.start.translate(delta), diagnostic.range.end.translate(delta)), diagnostic.message, diagnostic.severity);
    res.code = diagnostic.code;
    res.source = diagnostic.source;
    return res;
}
function diagnoseLine(line, index, keys, diagnostics) {
    var start;
    var stop;
    var piece;
    var site = line.indexOf(exports.opening);
    while (site !== -1) {
        start = (0, string_utils_1.firstNonSpace)(line, site + exports.opening.length);
        stop = (0, string_utils_1.firstNonTyping)(line, start, allowedInEscape);
        site = (0, string_utils_1.firstNonSpace)(line, stop);
        if ((0, string_utils_1.matchStringAfter)(exports.closing, line, site)) {
            site += exports.closing.length;
            if (start === stop)
                diagnostics.push(createDiagEmpty(index, start));
            else {
                piece = line.substring(start, stop);
                if (!keys.includes(piece))
                    diagnostics.push(createDiagNonExistent(index, start, stop, piece));
            }
        }
        site = line.indexOf(exports.opening, site);
    }
}
function diagnose(doc, collection) {
    const item = mapHTML.get(doc.uri.fsPath);
    if (!item || !item.valid)
        return;
    let diagnostics = [];
    for (var i = 0; i < doc.lineCount; i++)
        diagnoseLine(doc.lineAt(i).text, i, item.keys, diagnostics);
    collection.set(doc.uri, diagnostics);
}
exports.diagnose = diagnose;
function updateDiagnostics(ev, collection) {
    const uri = ev.document.uri;
    const item = mapHTML.get(uri.fsPath);
    if (!item || !item.valid)
        return;
    const len = ev.contentChanges.length;
    if (!len)
        return;
    const doc = ev.document;
    const old = collection.get(uri);
    if (!old)
        return diagnose(doc, collection);
    let i;
    const oldSize = old.length;
    const diagnostics = [];
    let firstLine = ev.contentChanges[len - 1].range.start.line;
    let lastOld = 0;
    // if there is valid old diagnostic retrieve it till the first changed line
    // console.log(`previous-diagnostics-size=${oldSize}, first-line-change=${firstLine}`);
    // changes ordered in line decreasing order
    for (i = 0; i < oldSize && old[i].range.start.line < firstLine; i++)
        diagnostics.push(old[i]);
    lastOld = i;
    if (len == 1) {
        const change = ev.contentChanges[0];
        const insertedLines = (0, string_utils_1.countNewLines)(change.text);
        const removedLines = change.range.end.line - change.range.start.line;
        const delta = insertedLines - removedLines;
        console.log(" > one change: line-delta=" + delta);
        for (i = 0; i <= insertedLines; i++) {
            diagnoseLine(doc.lineAt(firstLine + i).text, firstLine + i, item.keys, diagnostics);
        }
        i = lastOld;
        while (i < oldSize && old[i].range.start.line === firstLine)
            i++;
        if (delta)
            while (i < oldSize)
                diagnostics.push(shiftDiagnostic(old[i++], delta));
        else
            while (i < oldSize)
                diagnostics.push(old[i++]);
    }
    else {
        if (len == 2) {
            // when a new line first text is empty, the second starts with \r\n and continues with white spaces
            const t1 = ev.contentChanges[0].text;
            const t2 = ev.contentChanges[1].text;
            if ((!t1 && t2.startsWith("\r\n") && (0, string_utils_1.firstNonSpace)(t2, 2) === t2.length) ||
                (!t2 && t1.startsWith("\r\n") && (0, string_utils_1.firstNonSpace)(t1, 2) === t1.length)) {
                console.log(" > new line");
                for (i = lastOld; i < oldSize; i++)
                    diagnostics.push(shiftDiagnostic(old[i], 1));
            }
            else {
                for (i = firstLine; i < doc.lineCount; i++)
                    diagnoseLine(doc.lineAt(i).text, i, item.keys, diagnostics);
            }
        }
        else {
            for (i = firstLine; i < doc.lineCount; i++)
                diagnoseLine(doc.lineAt(i).text, i, item.keys, diagnostics);
        }
    }
    collection.set(uri, diagnostics);
}
exports.updateDiagnostics = updateDiagnostics;
//# sourceMappingURL=data.js.map