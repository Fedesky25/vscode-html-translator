// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { parseConfig, clearAll, updateTranslationsFrom, getSuggestions, diagnose } from "./data";

let disposables: vscode.Disposable | null;

export function activate(context: vscode.ExtensionContext) {

	const diagnostics = vscode.languages.createDiagnosticCollection("html-translation");
	const outputChannel = vscode.window.createOutputChannel("HTML translator");

	function stop() {
		clearAll();
		if(disposables) {
			disposables.dispose();
			disposables = null;
		}
	}

	function start() {
		if(!disposables) {
			disposables = vscode.Disposable.from(
				vscode.languages.registerCompletionItemProvider("html", { provideCompletionItems: getSuggestions }, '.'),
				vscode.workspace.onDidSaveTextDocument(updateTranslationsFrom),
				vscode.workspace.onDidCloseTextDocument(doc => diagnostics.delete(doc.uri)),
				vscode.workspace.onDidChangeTextDocument(e => diagnose(e.document, diagnostics)),
				vscode.window.onDidChangeActiveTextEditor(editor => {
					if(!editor) return;
					diagnose(editor.document, diagnostics);
				})
			);
		}
		outputChannel.appendLine("Reading files configuration...");
		parseConfig().then(errs => {
			if(errs) {
				errs.forEach(outputChannel.appendLine);
				vscode.window.showErrorMessage("One or more things went wrong", "See errors")
				.then(v => v && outputChannel.show());
			} else {
				outputChannel.appendLine("Everything is good to go!");
			}
			outputChannel.appendLine("");
		});
	}

	context.subscriptions.push(
		diagnostics, outputChannel,
		vscode.commands.registerCommand("html-translator.stop", stop),
		vscode.commands.registerCommand("html-translator.start", start),
	);
}

// this method is called when your extension is deactivated
export function deactivate() {
	disposables?.dispose();
}
