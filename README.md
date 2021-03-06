# vscode html-translator extension

VScode extension which helps the developer writing down multi-lingual version of static html files.
Eventually it will provide also a compilation of the files.

## Features

Instead of hard-writing the text in html files, this extesion allows you to specify all the translated text in a separate json file and to refer to those strings in the paired html file (with code completition) inside escaped sections. 

<!-- Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow. -->

### Work in progress

* Hhtml file compilation
* Some way to refer to a language name and identifier

<!-- ## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them. -->

## Extension commands

* `html-translator.start`: it activates the extension, loads the configuration and the translation json files, and starts the code completition.
* `html-translator.stop`: unload all data and stops all code completition.
* `html-translator.compile`: currently work in progress

## Extension Settings

The behaviour of this extension depends on some settings.

* `html-translator.files`: array of objects specifying source html and translated texts json files.
* `html-translator.languages`: array of string language identifiers for which translate.
* `html-translato.escape-strings`: pair of opening and closing strings used to escape from regular html and provide suggestions; default is `["{{", "}}"]`.

## Known Issues

The extension is in early development...

## Release Notes

The extension has no releases yet

<!-- ## 0.1.0 -->


