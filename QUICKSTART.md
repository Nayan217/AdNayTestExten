# Version Manager Extension - Quick Start Guide

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions panel
3. Search for "Version Manager" (or install from .vsix file)
4. Click Install

## Setup

1. Ensure you have a `version_dependent.json` file in your workspace root:

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

2. Open your project folder in VS Code

## Using the Extension

### Quick Check - Klobase Version

1. Press `Ctrl+Shift+P` (Command Palette)
2. Type "klobase" and select **"Version Manager: Check Klobase Version Compatibility"**
3. Enter your klobase version (e.g., `7-2-150`)
4. See the minimum vsix version required

### Quick Check - Vsix Version

1. Press `Ctrl+Shift+P`
2. Type "vsix" and select **"Version Manager: Check Vsix Version Compatibility"**
3. Enter your vsix version (e.g., `7.0.5`)
4. See the maximum klobase version supported

### View All Mappings

1. Press `Ctrl+Shift+P`
2. Type "mappings" and select **"Version Manager: Show All Version Mappings"**
3. Browse the complete compatibility tables

## Common Scenarios

### Scenario 1: I'm upgrading klobase

**Question**: I want to upgrade from klobase 7-2-150 to 7-2-220. Do I need to upgrade vsix?

**Steps**:
1. Run "Check Klobase Version Compatibility"
2. Enter `7-2-220`
3. Result: "You need minimum vsix version 7.0.7"
4. If your current vsix < 7.0.7, upgrade vsix first

### Scenario 2: I have vsix 7.0.6 installed

**Question**: What's the highest klobase version I can use with vsix 7.0.6?

**Steps**:
1. Run "Check Vsix Version Compatibility"
2. Enter `7.0.6`
3. Result: "Can be used up to klobase version 7-2-220"
4. You can safely use any klobase version ≤ 7-2-220

### Scenario 3: I need a complete reference

**Question**: I want to see all compatible versions at once.

**Steps**:
1. Run "Show All Version Mappings"
2. A panel opens with two tables
3. Keep it open while planning upgrades

## Version Format Guide

- **Klobase**: Use dashes → `7-2-150`, `7-2-185`
- **Vsix**: Use dots → `7.0.5`, `7.0.6`

## Tips

✅ **DO**:
- Keep the webview panel open for reference
- Check compatibility before upgrading
- Update version_dependent.json when new versions release

❌ **DON'T**:
- Mix up version formats (dashes vs dots)
- Skip checking compatibility
- Forget to upgrade dependencies first

## Troubleshooting

### "version_dependent.json not found"
→ Create the file in your workspace root folder

### "No workspace folder is open"
→ Open a folder: File → Open Folder

### Commands don't appear
→ Reload VS Code: Ctrl+Shift+P → "Developer: Reload Window"

## Keyboard Shortcuts

No default shortcuts, but you can create custom ones:

1. File → Preferences → Keyboard Shortcuts
2. Search for "Version Manager"
3. Click the + icon to add a custom shortcut

## Need More Help?

- See `USAGE_GUIDE.md` for detailed examples
- See `EXTENSION_SUMMARY.md` for technical details
- See `README.md` for complete documentation

---

**Happy coding! 🚀**
