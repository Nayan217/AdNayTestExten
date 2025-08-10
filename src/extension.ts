import * as vscode from 'vscode';
import { TabViewProvider } from './TabViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "adhinayan" is now active!');
    
    const disposable = vscode.commands.registerCommand('adhinayan.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from AdNayTestExten!');
    });
    
    const provider = new TabViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'adhinayan.container',
            provider
        )
    );

    // Register command to process selected items
    context.subscriptions.push(
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
    );

    context.subscriptions.push(disposable);
}

export function deactivate() { }