# adhinayan README

This is the README for your extension "adhinayan". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**


/////////////////

/////////////////

/////////////////

/////////////////

# Version Manager Extension

A VS Code extension for managing version compatibility between klobase and vsix versions.

## Features

This extension helps you determine the correct vsix version to use based on your klobase version, and vice versa.

### Commands

The extension provides three main commands accessible via the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

1. **Version Manager: Check Klobase Version Compatibility**
   - Enter a klobase version (e.g., `7-2-150`)
   - Get the minimum required vsix version
   - Example: For klobase `7-2-150`, you need vsix `7.0.5` or higher

2. **Version Manager: Check Vsix Version Compatibility**
   - Enter a vsix version (e.g., `7.0.5`)
   - Get the maximum supported klobase version
   - Example: Vsix `7.0.5` can be used up to klobase version `7-2-185`

3. **Version Manager: Show All Version Mappings**
   - Opens a webview panel displaying all version mappings
   - Shows both klobase→vsix and vsix→klobase compatibility tables

## Configuration

The extension requires a `version_dependent.json` file in your workspace root with the following structure:

```json
{
  "klobase_vsix_version_dependent": {
    "7-2-150": "7.0.5",
    "7-2-185": "7.0.6",
    "7-2-220": "7.0.7",
    "7-2-250": "7.0.8"
  },
  "vsix_klobase_version_dependent": {
    "7.0.4": "7-2-150",
    "7.0.5": "7-2-185",
    "7.0.6": "7-2-220",
    "7.0.7": "7-2-250"
  }
}
```

### Mapping Definitions

- **klobase_vsix_version_dependent**: Maps klobase versions to their minimum required vsix versions
- **vsix_klobase_version_dependent**: Maps vsix versions to the maximum klobase version they support

## Usage

1. Open a workspace/folder in VS Code that contains `version_dependent.json`
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the Command Palette
3. Type "Version Manager" to see available commands
4. Select the command you need and follow the prompts

## Requirements

- VS Code version 1.106.0 or higher
- A `version_dependent.json` file in your workspace root

## Extension Settings

This extension does not contribute any settings at this time.

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial release of Version Manager extension:
- Check klobase version compatibility
- Check vsix version compatibility
- View all version mappings in a webview panel
- Smart version comparison for recommendations

---

## For Developers

### Building the Extension

```bash
npm install
npm run compile
```

### Running Tests

```bash
npm test
```

### Packaging the Extension

```bash
npm run package
```

This will create a `.vsix` file that can be installed in VS Code.

## License

[Your License Here]

