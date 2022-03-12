import { join as joinPath } from "path";
import { readFile, access } from 'fs/promises';
import { workspace } from "vscode"

import { 
    root, 
    TranslationDataItem, addTranslationDataItem, clearTranslationItems,
    setDefaultEscapingStrings, updateEscapingStrings
} from "./data";

import { parseTranslationDocumentText } from './traslation-json';


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
        let item: TranslationDataItem = { htmlPath, jsonPath, keys, valid: true };
        addTranslationDataItem(item);
        return null;
    })
    .catch(() =>  "Could not open " + jsonPath)
}

/**
 * @param obj object to parse
 * @returns error string or null
 */
function parseEscapes(obj: unknown): string | null {
    if(!obj) return (setDefaultEscapingStrings(), null);
    if(
        Array.isArray(obj) && obj.length == 2 &&
        typeof obj[0] == "string" && typeof obj[1] == "string"
    ) {
        return updateEscapingStrings(obj[0], obj[1]);
    }
    setDefaultEscapingStrings();
    return "Invalid escape strings: expected array of two string with length > 2, rolling back to default {{ }}";
}

/**
 * Parses the extension configuration
 * @returns promise that resolves to a list of error messages, is any
 */
export default async function parseConfig(): Promise<string[] | null> {
    if(!root) return null;
    clearTranslationItems();
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