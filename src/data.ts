import { 
    TextDocument, Position, CompletionItem, workspace, CompletionItemKind, 
    SnippetString, Range, DiagnosticCollection, Diagnostic, DiagnosticSeverity, 
    TextDocumentChangeEvent 
} from "vscode";
import { join as joinPath } from "path";
import { readFile, access } from 'fs/promises';
import { 
    charCodesOf, isLetterOrDigit,
    firstNonSpace, lastNonSpace,
    matchStringBefore, matchStringAfter,
    getTypedBefore, firstNonTyping,
    countNewLines
} from './string-utils';

let opening = "{{";
let closing = "}}";
let completeSnippet: SnippetString;
const defaultRegExp = /{{\s*([a-zA-Z._\-]*)\s*}}/;
const root = workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : "";

const allowedInEscape = charCodesOf("._");
const allowedInUrl = charCodesOf("./_ #$");

enum CODES { empty, nonexistent };
const SOURCE = "HTML translator";

type TranslationDataItem = {
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
    opening = "{{";
    closing = "}}";
    if(!obj) return null;
    let error: string | null = null;
    if(
        Array.isArray(obj) && obj.length == 2 &&
        typeof obj[0] == "string" && obj[0].length > 1 && 
        typeof obj[1] == "string" && obj[1].length > 1
    ) {
        const c1 = obj[0].charCodeAt(obj[0].length-1);
        const c2 = obj[1].charCodeAt(0);
        if(isLetterOrDigit(c1) || allowedInEscape.includes(c1) || isLetterOrDigit(c2) || allowedInEscape.includes(c2)) {
            error = "Invalid escape strings: inner-most characters must be different from letters, digits, or . _";
        } else {
            opening = obj[0];
            closing = obj[1];
        }
    } else {
        error = "Invalid escape strings: expected array of two string with length > 2, rolling back to default {{ }}";
    }
    completeSnippet = new SnippetString().appendText(opening).appendTabstop(0).appendText(closing);
    return error;
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

export function getSuggestions(doc: TextDocument, pos: Position): null|CompletionItem[] {
    const item = mapHTML.get(doc.uri.fsPath);
    if(!item || !item.valid) return null;
    const line = doc.lineAt(pos.line).text;
    const col = pos.character;

    if(matchStringAfter(closing, line, firstNonSpace(line,col)))
    {
        const s = getTypedBefore(line, col, allowedInEscape);
        if(!s || !matchStringBefore(opening, line, lastNonSpace(line, col-s.length-1))) return null;
        console.log("Load suggestions");
        const dot_index = s.lastIndexOf(".");
        const matches = item.keys.filter(v => v.startsWith(s));
        if(!matches.length) return null;
        return dot_index === -1
        ? matches.map(v => new CompletionItem(v, CompletionItemKind.EnumMember))
        : matches.map(v => new CompletionItem(v.substring(dot_index+1), CompletionItemKind.EnumMember));  
    }
    else
    {
        if(!matchStringBefore(opening, line, col-1)) return null;
        console.log("Suggest snippet");
        const item = new CompletionItem("translated item ", CompletionItemKind.Snippet);
        item.insertText = new SnippetString("${0:textID}").appendText(closing);
        return [item];
    }
}

function createDiagEmpty(line: number, pos: number): Diagnostic {
    let res = new Diagnostic(
        new Range(line,pos,line,pos),
        "No translated text specified",
        DiagnosticSeverity.Warning
    );
    res.code = CODES.empty;
    res.source = SOURCE;
    return res;
}

function createDiagNonExistent(line: number, start: number, stop: number, what: string) {
    let res = new Diagnostic(
        new Range(line, start, line, stop),
        `"${what}" is not a valid translated text`,
        DiagnosticSeverity.Warning
    );
    res.code = CODES.nonexistent;
    res.source = SOURCE;
    return res;
}

function shiftDiagnostic(diagnostic: Diagnostic, delta: number) {
    let res = new Diagnostic(
        new Range(diagnostic.range.start.translate(delta), diagnostic.range.end.translate(delta)),
        diagnostic.message,
        diagnostic.severity
    );
    res.code = diagnostic.code;
    res.source = diagnostic.source;
    return res;
}

function diagnoseLine(line: string, index: number, keys: string[], diagnostics: Diagnostic[]) {
    var start: number;
    var stop: number;
    var piece: string;
    var site = line.indexOf(opening);
    while(site !== -1) {
        start = firstNonSpace(line, site+opening.length);
        stop = firstNonTyping(line, start, allowedInEscape);
        site = firstNonSpace(line, stop);
        if(matchStringAfter(closing, line, site)) {
            site += closing.length;
            if(start === stop) diagnostics.push(createDiagEmpty(index,start));
            else {
                piece = line.substring(start, stop);
                if(!keys.includes(piece)) diagnostics.push(createDiagNonExistent(index,start,stop,piece));
            }
        }
        site = line.indexOf(opening, site);
    }
}

export function diagnose(doc: TextDocument, collection: DiagnosticCollection) {
    const item = mapHTML.get(doc.uri.fsPath);
    if(!item || !item.valid) return;
    let diagnostics: Diagnostic[] = [];
    for(var i=0; i<doc.lineCount; i++) diagnoseLine(doc.lineAt(i).text, i, item.keys, diagnostics);
    collection.set(doc.uri, diagnostics);
}

export function updateDiagnostics(ev: TextDocumentChangeEvent, collection: DiagnosticCollection) {
    const uri = ev.document.uri;
    const item = mapHTML.get(uri.fsPath);
    if(!item || !item.valid) return;
    const len = ev.contentChanges.length;
    if(!len) return;
    const doc = ev.document;
    const old = collection.get(uri);
    if(!old) return diagnose(doc, collection);

    let i: number;
    const oldSize = old.length;
    const diagnostics: Diagnostic[] = [];
    let firstLine = ev.contentChanges[len-1].range.start.line;
    let lastOld = 0;
    // if there is valid old diagnostic retrieve it till the first changed line
    // console.log(`previous-diagnostics-size=${oldSize}, first-line-change=${firstLine}`);
    // changes ordered in line decreasing order
    for(i=0; i<oldSize && old[i].range.start.line < firstLine; i++) diagnostics.push(old[i]);
    lastOld = i;
    if(len == 1) {
        const change = ev.contentChanges[0];
        const insertedLines = countNewLines(change.text);
        const removedLines = change.range.end.line - change.range.start.line;
        const delta = insertedLines - removedLines;
        console.log(" > one change: line-delta="+delta);
        for(i=0; i<=insertedLines; i++) {
            diagnoseLine(doc.lineAt(firstLine+i).text, firstLine+i, item.keys, diagnostics);
        }
        i = lastOld;
        while(i<oldSize && old[i].range.start.line === firstLine) i++;
        if(delta) while(i<oldSize) diagnostics.push(shiftDiagnostic(old[i++], delta));
        else while(i<oldSize) diagnostics.push(old[i++]);
    }
    else {
        if(len == 2) {
            // when a new line first text is empty, the second starts with \r\n and continues with white spaces
            const t1 = ev.contentChanges[0].text;
            const t2 = ev.contentChanges[1].text;
            if(
                (!t1 && t2.startsWith("\r\n") && firstNonSpace(t2,2) === t2.length) || 
                (!t2 && t1.startsWith("\r\n") && firstNonSpace(t1,2) === t1.length)
            ) {
                console.log(" > new line");
                for(i = lastOld; i<oldSize; i++) diagnostics.push(shiftDiagnostic(old[i],1));
            } else {
                for(i=firstLine; i<doc.lineCount; i++) diagnoseLine(doc.lineAt(i).text, i, item.keys, diagnostics);
            }
        }
        else {
            for(i=firstLine; i<doc.lineCount; i++) diagnoseLine(doc.lineAt(i).text, i, item.keys, diagnostics);
        }
    }
    collection.set(uri, diagnostics);
}