"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const data_1 = require("./data");
let disposables;
function activate(context) {
    const diagnostics = vscode.languages.createDiagnosticCollection("html-translation");
    const outputChannel = vscode.window.createOutputChannel("HTML translator");
    function stop() {
        (0, data_1.clearAll)();
        if (disposables) {
            outputChannel.appendLine("Disposing autocompletition and diagnostrics");
            disposables.dispose();
            disposables = null;
        }
    }
    function start() {
        if (!disposables) {
            outputChannel.appendLine("Activating autocompletition and diagnostics");
            disposables = vscode.Disposable.from(vscode.languages.registerCompletionItemProvider("html", { provideCompletionItems: data_1.getSuggestions }, '.'), vscode.workspace.onDidSaveTextDocument(data_1.updateTranslationsFrom), vscode.workspace.onDidCloseTextDocument(doc => diagnostics.delete(doc.uri)), vscode.workspace.onDidChangeTextDocument(e => (0, data_1.diagnose)(e.document, diagnostics)), vscode.window.onDidChangeActiveTextEditor(editor => {
                if (!editor)
                    return;
                (0, data_1.diagnose)(editor.document, diagnostics);
            }));
        }
        outputChannel.appendLine("Reading files configuration...");
        (0, data_1.parseConfig)().then(errs => {
            if (errs) {
                errs.forEach(outputChannel.appendLine);
                vscode.window.showErrorMessage("One or more things went wrong", "See errors")
                    .then(v => v && outputChannel.show());
            }
            else {
                outputChannel.appendLine("Everything is good to go!");
            }
            outputChannel.appendLine("");
            if (vscode.window.activeTextEditor) {
                (0, data_1.diagnose)(vscode.window.activeTextEditor.document, diagnostics);
            }
        });
    }
    context.subscriptions.push(diagnostics, outputChannel, vscode.commands.registerCommand("html-translator.stop", stop), vscode.commands.registerCommand("html-translator.start", start), vscode.workspace.onDidChangeConfiguration(e => {
        if (!e.affectsConfiguration("html-translator"))
            return;
        if (!disposables)
            return;
        vscode.window.showInformationMessage("Changes to the configuration were detected. In order for them to take effect html-translator must be restarted", "Restart").then(v => v && start());
    }));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
    disposables?.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map