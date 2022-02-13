"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const data_1 = require("./data");
let outputChannel;
async function syncWithConfig() {
    outputChannel.appendLine("Reading files configuration...");
    let errs = await (0, data_1.parseConfig)();
    if (errs) {
        errs.forEach(outputChannel.appendLine);
        vscode.window.showErrorMessage("One or more thing went wrong", "See errors").then(v => v && outputChannel.show());
    }
    else {
        outputChannel.appendLine("Everything is all good to go");
    }
    outputChannel.appendLine("");
}
function activate(context) {
    outputChannel = vscode.window.createOutputChannel("html-translator");
    const configChange = vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration("html-translator"))
            return;
        // if(e.affectsConfiguration("html-translator.languages")) 
        // if(e.affectsConfiguration("html-translator.files")) 
        syncWithConfig();
    });
    const start = vscode.commands.registerCommand("html-translator.start", syncWithConfig);
    const stop = vscode.commands.registerCommand("html-translator.stop", data_1.clearAll);
    // const openDocumentDisposable = vscode.workspace.onDidOpenTextDocument(loadTranslationsFor);
    // const closeDocumentDisposable = vscode.workspace.onDidCloseTextDocument(unloadTranslationsFor);
    const translUpdate = vscode.workspace.onDidSaveTextDocument(data_1.updateTranslationsFrom);
    const completition = vscode.languages.registerCompletionItemProvider("html", {
        provideCompletionItems: data_1.getSuggestions
    }, '.');
    context.subscriptions.push(configChange, start, stop, translUpdate, completition);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
    outputChannel.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map