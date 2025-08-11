import * as vscode from 'vscode';
import { TabViewProvider } from './TabViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('EXTENSION ACTIVATED!');
    console.log('Extension URI:', context.extensionUri.toString());
    console.log('TabViewProvider created');
    // const treeDataProvider = new MyTreeDataProvider();
    // vscode.window.registerTreeDataProvider('adhinayan-container', treeDataProvider);

    const provider = new TabViewProvider(context.extensionUri);
    console.log('TabViewProvider created');

    try {
        // Register webview provider with correct ID
        const registration = vscode.window.registerWebviewViewProvider(
            'adhinayan-container', // Must match package.json view ID
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );

        context.subscriptions.push(registration);
        console.log('Webview provider registered successfully');
    } catch (error) {
        console.error('Error registering webview provider:', error);
    }



    context.subscriptions.push(
        vscode.commands.registerCommand('adhinayan.performAction', () => {
            const selectedItems = provider.getSelectedItems();

            if (selectedItems.length === 0) {
                vscode.window.showInformationMessage('No items selected');
                return;
            }
            debugger;
           /*  const message = selectedItems.map(item =>
                `• ${item.r_app_name || item.r_flavor} (${item.r_version})`
            ).join('\n');

            vscode.window.showInformationMessage(
                `Processing ${selectedItems.length} items:\n${message}`
            ); */
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('adhinayan.toggleItem', (tab: string, itemId: string) => {
            provider.getTreeProvider(tab)?.toggleItem(itemId);
        })
    );
}

export class MyTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        return Promise.resolve([
            new vscode.TreeItem('Item 1'),
            new vscode.TreeItem('Item 2'),
            new vscode.TreeItem('Item 3')
        ]);
    }
}



export function deactivate() { }