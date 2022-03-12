// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { getSuggestions, diagnose, updateDiagnostics } from "./diagnostics";
import { updateTranslationsFrom } from './traslation-json';
import { clearTranslationItems } from "./data";
import parseConfig from './config-parser';


let disposables: vscode.Disposable | null;

export function activate(context: vscode.ExtensionContext) {

	const diagnostics = vscode.languages.createDiagnosticCollection("html-translation");
	const outputChannel = vscode.window.createOutputChannel("HTML translator");

	function stop() {
		clearTranslationItems()
		if(disposables) {
			outputChannel.appendLine("Disposing autocompletition and diagnostrics");
			disposables.dispose();
			disposables = null;
		}
	}

	function start() {
		if(!disposables) {
			outputChannel.appendLine("Activating autocompletition and diagnostics");
			disposables = vscode.Disposable.from(
				vscode.languages.registerCompletionItemProvider("html", { provideCompletionItems: getSuggestions }, '.'),
				vscode.workspace.onDidSaveTextDocument(updateTranslationsFrom),
				vscode.workspace.onDidCloseTextDocument(doc => diagnostics.delete(doc.uri)),
				vscode.workspace.onDidChangeTextDocument(e => updateDiagnostics(e,diagnostics)),
				vscode.window.onDidChangeActiveTextEditor(editor => {
					if(!editor) return;
					diagnose(editor.document, diagnostics);
				})
			);
		}
		diagnostics.clear();
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
			if(vscode.window.activeTextEditor) {
				diagnose(vscode.window.activeTextEditor.document, diagnostics);
			}
		});
	}

	context.subscriptions.push(
		diagnostics, outputChannel,
		vscode.commands.registerCommand("html-translator.stop", stop),
		vscode.commands.registerCommand("html-translator.start", start),
		vscode.workspace.onDidChangeConfiguration(e => {
			if(!e.affectsConfiguration("html-translator")) return;
			if(!disposables) return;
			vscode.window.showInformationMessage(
				"Changes to the configuration were detected. In order for them to take effect html-translator must be restarted",
				"Restart"
			).then(v => v && start());
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() {
	disposables?.dispose();
}
