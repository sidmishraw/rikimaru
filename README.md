# rikimaru

**rikimaru** is the VS Code extension that lets you search files in the [OpenGenus/cosmos](https://github.com/OpenGenus/cosmos) repository right from the VS Code editor. The extension uses GitHub's code search API.

After searching and finding your desired file, just select it and see the contents in VS Code directly. 

Streamlined searches for you! :D

## Features

Search [cosmos](https://github.com/OpenGenus/cosmos) right from your editor :D

Following is the demo GIF:

![](./rikimaru-demo-v0.0.2.gif)

## Requirements

You'll need to have a GitHub `username` and `personal access token`.

## Extension Settings

The command for `rikimaru` is `rikimaru.search`. You could bind a key combination for easy access. You could also invoke the command from the command palette - default keybinding is `CMD + SHIFT + P` on Mac OSX.

This extension contributes the following settings:

* `rikimaru.user.github.name`: Your GitHub username
* `rikimaru.user.github.personal-token`: Your GitHub personal access token

## Known Issues

None so far. If you find any please report or send in a PR! :D

## Release Notes

### v0.0.2:

* Incorporated VSCode's Webview API to display the contents of the file directly inside VSCode. Needs the latest version of VSCode for this functionality.

### v0.0.1:

* Initial release.

---

`-Sid`
