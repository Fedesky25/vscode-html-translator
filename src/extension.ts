// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { parseConfig, clearAll, updateTranslationsFrom, getSuggestions } from "./data";


let outputChannel: vscode.OutputChannel;

async function syncWithConfig() {
	outputChannel.appendLine("Reading files configuration...")
	let errs = await parseConfig();
	if(errs) {
		errs.forEach(outputChannel.appendLine);
		vscode.window.showErrorMessage("One or more thing went wrong", "See errors").then(v => v && outputChannel.show());
	} else {
		outputChannel.appendLine("Everything is all good to go");
	}
	outputChannel.appendLine("");
}


export function activate(context: vscode.ExtensionContext) {

	outputChannel = vscode.window.createOutputChannel("HTML translator");

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
export function deactivate() {
	outputChannel.dispose();
}
