import * as vscode from 'vscode';
import { TreeDataProvider } from './TreeDataProvider';

export class TabViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _treeProviders: Map<string, TreeDataProvider> = new Map();
    private _currentTab = 'tab1';

    constructor(private readonly _extensionUri: vscode.Uri) {
        // Initialize tree data providers for each tab
        this._treeProviders.set('tab1', new TreeDataProvider(['Apple', 'Banana', 'Cherry']));
        this._treeProviders.set('tab2', new TreeDataProvider(['Dog', 'Elephant', 'Fox']));
        this._treeProviders.set('tab3', new TreeDataProvider(['Red', 'Green', 'Blue']));
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'switchTab':
                    this._currentTab = message.tab;
                    this.updateTree();
                    break;
                case 'filterChanged':
                    this._treeProviders.get(this._currentTab)?.setFilter(message.filter);
                    break;
            }
        });

        // Initial tree rendering
        this.updateTree();
        this.updateSelection();
    }

    public getSelectedItems(): string[] {
        return this._treeProviders.get(this._currentTab)?.getSelectedItems() || [];
    }

    private updateTree() {
        if (this._view) {
            const items = this._treeProviders.get(this._currentTab)?.getTreeItems() || [];
            this._view.webview.postMessage({
                command: 'updateTree',
                items: items
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'tabView.js')
        );

        return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Multi-Tab View</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: var(--vscode-font-family); padding: 10px; }
          .search-container { margin-bottom: 10px; display: flex; }
          #searchInput { flex: 1; padding: 5px; }
          .tabs { display: flex; margin-bottom: 10px; border-bottom: 1px solid var(--vscode-sideBar-border); }
          .tab { padding: 8px 15px; cursor: pointer; border: 1px solid transparent; }
          .tab.active { border-color: var(--vscode-sideBar-border) var(--vscode-sideBar-border) transparent; border-bottom: none; }
          .tree-container { min-height: 200px; overflow-y: auto; }
          .tree-item { padding: 5px 0; cursor: pointer; }
          .tree-item.selected { background: var(--vscode-list-inactiveSelectionBackground); }
          .action-button { margin-top: 15px; padding: 8px 12px; width: 100%; }
        </style>
      </head>
      <body>
        <div class="search-container">
          <input id="searchInput" type="text" placeholder="Search items...">
          <button id="searchButton">Search</button>
        </div>
        
        <div class="tabs">
          <div class="tab active" data-tab="tab1">Tab 1</div>
          <div class="tab" data-tab="tab2">Tab 2</div>
          <div class="tab" data-tab="tab3">Tab 3</div>
        </div>
        
        <div class="tree-container" id="treeContainer"></div>
        
        <button class="action-button" id="actionButton">Process Selected Items</button>
        
        <script src="${scriptUri}"></script>
      </body>
      </html>`;
    }
    public getTreeProvider(tabId: string): TreeDataProvider | undefined {
        return this._treeProviders.get(tabId);
    }
    // Add to TabViewProvider class
    private updateSelection() {
        if (this._view) {
            const selected = this.getSelectedItems();
            this._view.webview.postMessage({
                command: 'updateSelection',
                selectedItems: selected
            });
        }
    }
    // Add to toggleItem() method:
    public toggleItem(tab: string, item: string) {
        this._treeProviders.get(tab)?.toggleItem(item);
        this.updateSelection(); // Add this line
    }
}