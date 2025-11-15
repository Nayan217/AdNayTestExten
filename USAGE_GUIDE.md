# Version Manager Extension - Usage Guide

## Overview

The Version Manager extension helps developers manage compatibility between klobase and vsix versions by providing an easy way to look up version dependencies.

## Understanding Version Mappings

### Klobase → Vsix Dependency

The `klobase_vsix_version_dependent` mapping shows the **minimum** vsix version required for each klobase version:

```json
"klobase_vsix_version_dependent": {
  "7-2-150": "7.0.5",  // klobase 7-2-150 requires at least vsix 7.0.5
  "7-2-185": "7.0.6",  // klobase 7-2-185 requires at least vsix 7.0.6
  "7-2-220": "7.0.7",  // klobase 7-2-220 requires at least vsix 7.0.7
  "7-2-250": "7.0.8"   // klobase 7-2-250 requires at least vsix 7.0.8
}
```

**Interpretation**: If you're using klobase version 7-2-150, you must use vsix version 7.0.5 or any higher version (7.0.6, 7.0.7, 7.0.8, etc.).

### Vsix → Klobase Dependency

The `vsix_klobase_version_dependent` mapping shows the **maximum** klobase version that each vsix version can support:

```json
"vsix_klobase_version_dependent": {
  "7.0.4": "7-2-150",  // vsix 7.0.4 works up to klobase 7-2-150
  "7.0.5": "7-2-185",  // vsix 7.0.5 works up to klobase 7-2-185
  "7.0.6": "7-2-220",  // vsix 7.0.6 works up to klobase 7-2-220
  "7.0.7": "7-2-250"   // vsix 7.0.7 works up to klobase 7-2-250
}
```

**Interpretation**: If you're using vsix version 7.0.5, you can use it with klobase versions up to and including 7-2-185, but not beyond.

## Usage Examples

### Example 1: Checking Klobase Version

**Scenario**: You're working with klobase version 7-2-185 and want to know which vsix version to use.

**Steps**:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Version Manager: Check Klobase Version"
3. Enter: `7-2-185`
4. **Result**: "For klobase version 7-2-185, you need minimum vsix version 7.0.6 or higher"

**What this means**: You can use vsix 7.0.6, 7.0.7, 7.0.8, or any higher version with klobase 7-2-185.

### Example 2: Checking Vsix Version

**Scenario**: You have vsix version 7.0.6 installed and want to know which klobase versions are compatible.

**Steps**:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Version Manager: Check Vsix Version"
3. Enter: `7.0.6`
4. **Result**: "Vsix version 7.0.6 can be used up to klobase version 7-2-220"

**What this means**: With vsix 7.0.6, you can use any klobase version up to and including 7-2-220, but not 7-2-250 or higher.

### Example 3: Version Not in Mappings

**Scenario**: You're checking a version that's not explicitly listed in the mappings.

**For Klobase**:
- Input: `7-2-175` (not in mappings)
- **Result**: "Klobase version 7-2-175 not found in mappings. Based on version 7-2-150, you should use vsix version 7.0.5 or higher"
- **Explanation**: The extension finds the closest lower version (7-2-150) and uses its recommendation.

**For Vsix**:
- Input: `7.0.55` (not in mappings)
- **Result**: Similar intelligent fallback based on the closest lower version.

### Example 4: Viewing All Mappings

**Scenario**: You want to see the complete compatibility matrix.

**Steps**:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Version Manager: Show All Version Mappings"
3. Press Enter

**Result**: A webview panel opens showing:
- Table 1: Klobase versions with their minimum vsix requirements
- Table 2: Vsix versions with their maximum klobase support

## Common Use Cases

### 1. Upgrading Klobase

When upgrading klobase:
1. Check your current klobase version against the target klobase version
2. Use the extension to find the required vsix version
3. Upgrade vsix first if needed, then upgrade klobase

### 2. Upgrading Vsix

When upgrading vsix:
1. Check your current vsix version
2. Verify it supports your klobase version
3. If not, you may need to upgrade klobase as well

### 3. New Project Setup

When setting up a new project:
1. Determine your klobase version requirement
2. Use the extension to find the compatible vsix version
3. Install the appropriate versions

## Version Format

- **Klobase versions**: Use dash-separated format (e.g., `7-2-150`)
- **Vsix versions**: Use dot-separated format (e.g., `7.0.5`)

## Troubleshooting

### "version_dependent.json not found"

**Problem**: The extension can't find the configuration file.

**Solution**:
1. Ensure you have a workspace/folder open in VS Code
2. Verify `version_dependent.json` exists in the workspace root
3. The file must be at the top level, not in a subdirectory

### "No workspace folder is open"

**Problem**: VS Code doesn't have a folder open.

**Solution**:
1. Open a folder: File → Open Folder
2. Navigate to your project directory
3. Make sure it contains `version_dependent.json`

### Invalid JSON Format

**Problem**: The extension returns an error when reading the file.

**Solution**:
1. Validate your JSON syntax
2. Ensure proper structure with both mapping objects
3. Check for trailing commas, missing quotes, etc.

## Tips

1. **Keep Mappings Updated**: Regularly update `version_dependent.json` as new versions are released
2. **Use Webview for Reference**: Keep the mappings panel open while working on version upgrades
3. **Test Compatibility**: After upgrading, verify everything works as expected
4. **Document Changes**: When updating versions in your project, document which versions you're using

## Advanced: Updating Version Mappings

To add new version mappings:

1. Open `version_dependent.json` in your workspace
2. Add new entries to both mappings:

```json
{
  "klobase_vsix_version_dependent": {
    // ... existing entries ...
    "7-2-300": "7.0.9"  // New entry
  },
  "vsix_klobase_version_dependent": {
    // ... existing entries ...
    "7.0.8": "7-2-300"  // Corresponding entry
  }
}
```

3. Save the file
4. The extension will immediately use the new mappings

## Support

For issues or questions about the extension, please refer to the project repository or contact the development team.
