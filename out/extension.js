"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const data_1 = require("./data");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    (0, data_1.syncWithConfiguration)();
    vscode.window.visibleTextEditors.forEach(editor => (0, data_1.loadTranslationsFor)(editor.document));
    const configChange = vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration("html-translator"))
            return;
        // if(e.affectsConfiguration("html-translator.languages")) 
        // if(e.affectsConfiguration("html-translator.files")) 
        (0, data_1.syncWithConfiguration)();
    });
    const openDocumentDisposable = vscode.workspace.onDidOpenTextDocument(data_1.loadTranslationsFor);
    const closeDocumentDisposable = vscode.workspace.onDidCloseTextDocument(data_1.unloadTranslationsFor);
    const translUpdate = vscode.workspace.onDidSaveTextDocument(data_1.updateTranslationsFrom);
    const completition = vscode.languages.registerCompletionItemProvider("html", {
        provideCompletionItems: data_1.getSuggestions
    }, '.', '{');
    context.subscriptions.push(configChange, openDocumentDisposable, closeDocumentDisposable, translUpdate, completition);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map