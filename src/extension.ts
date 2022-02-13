// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { parseConfig, clearAll, updateTranslationsFrom, getSuggestions } from "./data";


var outputChannel: vscode.OutputChannel;

async function syncWithConfig() {
	let errs = await parseConfig();
	if(!errs) return;
	if(!outputChannel) outputChannel = vscode.window.createOutputChannel("html-translator");
	errs.forEach(outputChannel.appendLine);
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// syncWithConfig();

	const configChange = vscode.workspace.onDidChangeConfiguration((e) => {
		if(!e.affectsConfiguration("html-translator")) return;
		// if(e.affectsConfiguration("html-translator.languages")) 
		// if(e.affectsConfiguration("html-translator.files")) 
		syncWithConfig();
	});
	
	const start = vscode.commands.registerCommand("html-translator.start", syncWithConfig);
	const stop = vscode.commands.registerCommand("html-translator.stop", clearAll);

	// const openDocumentDisposable = vscode.workspace.onDidOpenTextDocument(loadTranslationsFor);
	// const closeDocumentDisposable = vscode.workspace.onDidCloseTextDocument(unloadTranslationsFor);
	const translUpdate = vscode.workspace.onDidSaveTextDocument(updateTranslationsFrom);

	const completition =  vscode.languages.registerCompletionItemProvider("html", {
		provideCompletionItems: getSuggestions
	}, '.');

	context.subscriptions.push(configChange, start, stop, translUpdate, completition);

}

// this method is called when your extension is deactivated
export function deactivate() {}
