import { 
    CompletionItem, CompletionItemKind, 
    Diagnostic, DiagnosticCollection, DiagnosticSeverity, 
    Position, Range, SnippetString, 
    TextDocument, TextDocumentChangeEvent 
} from "vscode";

import { countNewLines, firstNonSpace, firstNonTyping, getTypedBefore, lastNonSpace, matchStringAfter, matchStringBefore } from './string-utils';
import { opening, closing, allowedInEscape, fromHTML } from './data';

enum CODES { empty, nonexistent };
const SOURCE = "HTML translator";

export function getSuggestions(doc: TextDocument, pos: Position): null|CompletionItem[] {
    const item = fromHTML(doc.uri);
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
    const item = fromHTML(doc.uri);
    if(!item || !item.valid) return;
    let diagnostics: Diagnostic[] = [];
    for(var i=0; i<doc.lineCount; i++) diagnoseLine(doc.lineAt(i).text, i, item.keys, diagnostics);
    collection.set(doc.uri, diagnostics);
}

export function updateDiagnostics(ev: TextDocumentChangeEvent, collection: DiagnosticCollection) {
    const uri = ev.document.uri;
    const item = fromHTML(uri);
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