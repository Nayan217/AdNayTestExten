import * as vscode from 'vscode';
import { TreeDataProvider } from './TreeDataProvider';
import { samDat } from './sampleDate/sampleData'; // Adjusted import path after moving file to src

export class TabViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _treeProviders: Map<string, TreeDataProvider> = new Map();
    private _currentTab = 'tab1';

    constructor(private readonly _extensionUri: vscode.Uri) {
        // Log counts of each data set
        console.log("Initializing TabViewProvider with data:");

        // Writable
        const writableItems = samDat.app_items.filter(item =>
            samDat.developer_apps.hasOwnProperty(item.r_fv_id)
        );
        console.log(`Writable items count: ${writableItems.length}`);

        // Read-Only
        const readOnlyItems = samDat.app_items.filter(item =>
            !samDat.developer_apps.hasOwnProperty(item.r_fv_id) &&
            item.r_is_external === 0
        );
        console.log(`Read-Only items count: ${readOnlyItems.length}`);

        // FilesDownloaded
        const filesDownloadedItems = samDat.filesDownload;
        console.log(`FilesDownloaded items count: ${filesDownloadedItems.length}`);

        // Initialize providers
        this._treeProviders.set('writable', new TreeDataProvider(writableItems));
        this._treeProviders.set('readonly', new TreeDataProvider(readOnlyItems));
        this._treeProviders.set('files', new TreeDataProvider(filesDownloadedItems));
    }



    // ... rest of the class ...

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        console.log('Resolving webview view');
        this._view = webviewView;

        try {
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [this._extensionUri]
            };

            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
            console.log('Webview HTML set');

            // Handle messages from the webview
            webviewView.webview.onDidReceiveMessage(message => {
                console.log(`Received message from webview: ${message.command}`);
                switch (message.command) {
                    case 'switchTab':
                        console.log(`Switching to tab: ${message.tab}`);
                        this._currentTab = message.tab;
                        this.updateTree();
                        this.updateButtonText();
                        break;
                    case 'filterChanged':
                        console.log(`Filter changed: ${message.filter}`);
                        this._treeProviders.get(this._currentTab)?.setFilter(message.filter);
                        this.updateTree();
                        break;
                    case 'toggleItem':
                        console.log(`Toggling item: ${message.itemId} in tab ${message.tab}`);
                        this.toggleItem(message.tab/* , message.itemId */);
                        break;
                    case 'initialized':
                        this.updateTree();
                        this.updateSelection();
                        this.updateButtonText();
                        break;
                }
            });

            // Initial tree rendering
            console.log('Performing initial tree rendering');
            this.updateTree();
            this.updateSelection();
        } catch (error) {
            console.error('Error resolving webview:', error);
            webviewView.webview.html = this._getErrorHtml();
        }
    }

    private _getErrorHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error</title>
        </head>
        <body>
            <h1>Error Loading View</h1>
            <p>Please check the extension logs for details.</p>
        </body>
        </html>`;
    }

    public getSelectedItems(): string[] {
        return this._treeProviders.get(this._currentTab)?.getSelectedItems() || [];
    }
    public toggleItem(itemId: string) {
        const provider = this._treeProviders.get(this._currentTab);
        if (provider) {
            provider.toggleItem(itemId);
            this.updateSelection();
        }
    }
    private updateTree() {
        if (this._view) {
            const items = this._treeProviders.get(this._currentTab)?.getTreeItems() || [];
            console.log(`Sending ${items.length} items to webview for tab: ${this._currentTab}`);

            this._view.webview.postMessage({
                command: 'updateTree',
                items: items
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'tabView.js')
        ).toString();

        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'styles.css')
        ).toString();

        return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flavor Manager</title>
        <link rel="stylesheet" href="${styleUri}">
    </head>
    <body>
        <div class="header">
            <div class="search-container">
                <input id="searchInput" type="text" placeholder="Search items...">
                <button id="searchButton">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            
            <div class="tabs">
                <div class="tab active" data-tab="writable">Writable</div>
                <div class="tab" data-tab="readonly">Read-Only</div>
                <div class="tab" data-tab="files">FilesDownloaded</div>
            </div>
        </div>
        
        <div class="items-container" id="itemsContainer"></div>
        
        <div class="footer">
            <button class="action-button" id="actionButton">Checkout Writable App</button>
        </div>
        <script>
            // Add script error handling
            window.addEventListener('error', function(e) {
                console.error('Script error:', e.message, 'at', e.filename, e.lineno);
                document.getElementById('itemsContainer').innerHTML = 
                    '<div class="no-items">Script error: ' + e.message + '</div>';
            });
        </script>
        <script src="${scriptUri}"></script>
         <script>
            console.log('HTML loaded successfully');
        </script>
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
    private updateButtonText() {
        if (this._view) {
            let buttonText = '';
            switch (this._currentTab) {
                case 'writable':
                    buttonText = 'Checkout Writable App';
                    break;
                case 'readonly':
                    buttonText = 'Checkout Read-Only App';
                    break;
                case 'files':
                    buttonText = 'Repair Framework';
                    break;
                default:
                    buttonText = 'Process Selected Items';
            }

            this._view.webview.postMessage({
                command: 'updateButton',
                text: buttonText
            });
        }
    }
    // Add to toggleItem() method:
    // public toggleItem(tab: string, item: string) {
    //     this._treeProviders.get(tab)?.toggleItem(item);
    //     this.updateSelection();
    // }
}