// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { syncWithConfiguration, loadTranslationsFor, unloadTranslationsFor, updateTranslationsFrom, getSuggestions } from "./data";


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	syncWithConfiguration();
	vscode.window.visibleTextEditors.forEach(editor => loadTranslationsFor(editor.document));

	const configChange = vscode.workspace.onDidChangeConfiguration((e) => {
		if(!e.affectsConfiguration("html-translator")) return;
		// if(e.affectsConfiguration("html-translator.languages")) 
		// if(e.affectsConfiguration("html-translator.files")) 
		syncWithConfiguration();
	});

	const openDocumentDisposable = vscode.workspace.onDidOpenTextDocument(loadTranslationsFor);
	const closeDocumentDisposable = vscode.workspace.onDidCloseTextDocument(unloadTranslationsFor);
	const translUpdate = vscode.workspace.onDidSaveTextDocument(updateTranslationsFrom);

	const completition =  vscode.languages.registerCompletionItemProvider("html", {
		provideCompletionItems: getSuggestions
	}, '.', '{');

	context.subscriptions.push(configChange, openDocumentDisposable, closeDocumentDisposable, translUpdate, completition);
}

// this method is called when your extension is deactivated
export function deactivate() {}
