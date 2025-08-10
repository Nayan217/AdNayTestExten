import * as vscode from 'vscode';
import { TabViewProvider } from './TabViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('EXTENSION ACTIVATED!');
    console.log('Extension URI:', context.extensionUri.toString());
    console.log('TabViewProvider created');
    // const treeDataProvider = new MyTreeDataProvider();
    // vscode.window.registerTreeDataProvider('adhinayan-container', treeDataProvider);
    /* const provider = new TabViewProvider(context.extensionUri);
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
    } */

    const oMinimalProvider = new MinimalProvider();
    vscode.window.registerWebviewViewProvider(
        'adhinayan-container',
        oMinimalProvider
    );

    /* context.subscriptions.push(
        vscode.commands.registerCommand('adhinayan.performAction', () => {
            const selectedItems = provider.getSelectedItems();
            vscode.window.showInformationMessage(
                `Processing ${selectedItems.length} items: ${selectedItems.join(', ')}`
            );
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('adhinayan.toggleItem', (tab: string, item: string) => {
            provider.getTreeProvider(tab)?.toggleItem(item);
        })
    ); */
}

/* export class MyTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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
} */

export class MinimalProvider implements vscode.WebviewViewProvider {
    resolveWebviewView(webviewView: vscode.WebviewView) {
        console.log('MINIMAL PROVIDER RESOLVED!');
        webviewView.webview.html = `<h1>Webview is working!</h1>`;
    }
}

export function deactivate() { }