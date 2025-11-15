import * as vscode from "vscode";
import { TabViewProvider } from "./TabViewProvider";
import { samDat } from "./sampleDate/sampleData";
import {versionDependentData} from "./sampleDate/version_dependent";
import * as path from 'path';
import * as fs from 'fs';

let updateAppPanel: vscode.WebviewPanel;
type RepoActions = "commit" | "update" | "checkout" | "delete" | "ping" | "registerUser" | "updateLog" | "revert" | "updateFileStatus" | "renamed" | "resolveConflict" | "getDownlodedApp" | "repair" | "stop" | "releasedVersionsCheckout" | "checkReleasedVersionsCheckout";
let maxNumOfFlvToCheckout = 4;
export function activate(context: vscode.ExtensionContext) {
	console.log("EXTENSION ACTIVATED!");
	console.log("Extension URI:", context.extensionUri.toString());
	console.log("TabViewProvider created");
	//#region Repository Actions: Checkout , Update , Repair
	// createStatusBarItem("Checkout", "Update workspace", "extension.checkout");
	// createStatusBarItem("Update All", "Update selected apps from the repository", "extension.updateApp");
	// createStatusBarItem("Repair Framework", "Update external apps", "extension.repair");
	// context.subscriptions.push(
	// 	vscode.commands.registerCommand("extension.checkout", async (event) => {
	// 		await repoActionForApps("checkout");
	// 	})
	// );
	// context.subscriptions.push(
	// 	vscode.commands.registerCommand("extension.updateApp", async (event) => {
	// 		await repoActionForApps("update");
	// 	})
	// );

	// context.subscriptions.push(
	// 	vscode.commands.registerCommand("extension.repair", async (event) => {
	// 		try {
	// 			if (updateAppPanel) {
	// 				updateAppPanel.dispose();
	// 			}

	// 			let downloadedApp = getDownlodedApp();
	// 			if (downloadedApp && !downloadedApp.length) {
	// 				vscode.window.showInformationMessage("No app found to repair");
	// 				return;
	// 			}
	// 			updateAppPanel = vscode.window.createWebviewPanel("catCodingx", "Repostiory", vscode.ViewColumn.One, { enableScripts: true });
	// 			let temp = downloadedApp.map((app: any) => app.split("@@")[0] + "-" + app.split("@@")[1]);
	// 			temp = temp.filter((item: any, index: any) => temp.indexOf(item) === index);
	// 			updateAppPanel.webview.html = getAppListWebView(temp, "repair");
	// 			let downloadeAppMap: any = {};
	// 			for (let app of downloadedApp) {
	// 				downloadeAppMap[app.split("@@")[0] + "-" + app.split("@@")[1]] = app.split("@@")[2];
	// 			}
	// 			updateAppPanel.webview.onDidReceiveMessage(async (message) => {
	// 				switch (message.command) {
	// 					case "operationOnSelectedApps":
	// 						if (message.data.selectedApps.length === 0) {
	// 							vscode.window.showInformationMessage("No Files selected");
	// 							updateAppPanel.dispose();
	// 						} else {
	// 							let appsToDownload = message.data.selectedApps.map((a: any) => {
	// 								let numIndex = a.indexOf("-") > -1 ? a.indexOf("-") : a.lastIndexOf("_");
	// 								let flavor = a.slice(0, numIndex);
	// 								let ver = a.slice(numIndex + 1);
	// 								return flavor + "@@" + ver + "@@" + downloadeAppMap[a];
	// 							});
	// 							// let res: any = await sendRequestToNodeServer("repair", {
	// 							// 	appZipToDownloaded: appsToDownload,
	// 							// });
	// 							debugger;
	// 							// vscode.window.showInformationMessage(res);//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
	// 							// let edited_res: any = await responseCheck(res);
	// 							// vscode.window.showInformationMessage(edited_res);
	// 							updateAppPanel.dispose();
	// 							// await restartServer(); //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
	// 						}
	// 				}
	// 			});
	// 		} catch (error: any) {
	// 			vscode.window.showErrorMessage("Error during repair" + error.message);
	// 		}
	// 	})
	// );

	//#endregion

	const provider = new TabViewProvider(context.extensionUri);
	console.log("TabViewProvider created");

	try {
		// Register webview provider with correct ID
		const registration = vscode.window.registerWebviewViewProvider(
			"adhinayan-container", // Must match package.json view ID
			provider,
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
			}
		);

		context.subscriptions.push(registration);
		console.log("Webview provider registered successfully");
	} catch (error) {
		console.error("Error registering webview provider:", error);
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("adhinayan.performAction", () => {
			const selectedItems = provider.getSelectedItems();

			if (selectedItems.length === 0) {
				vscode.window.showInformationMessage("No items selected");
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
		vscode.commands.registerCommand("adhinayan.toggleItem", (tab: string, itemId: string) => {
			provider.getTreeProvider(tab)?.toggleItem(itemId);
		})
	);

	//#region Version Manager
	console.log('Version Manager extension is now active!');

	// Register command to check klobase version compatibility
	const checkKlobaseVersion = vscode.commands.registerCommand('VersionManagementTest.checkKlobaseVersion', async () => {
		const version = await vscode.window.showInputBox({
			prompt: 'Enter klobase version (e.g., 7-2-150)',
			placeHolder: '7-2-150'
		});

		if (version) {
			const result = getKlobaseRecommendation(context, version);
			const panel = vscode.window.createWebviewPanel(
				'klobaseVersionCheck',
				`Klobase Version: ${version}`,
				vscode.ViewColumn.One,
				{}
			);
			panel.webview.html = getVersionCheckWebview(version, result, 'Klobase');
		}
	});

	// Register command to check vsix version compatibility
	const checkVsixVersion = vscode.commands.registerCommand('VersionManagementTest.checkVsixVersion', async () => {
		const version = await vscode.window.showInputBox({
			prompt: 'Enter vsix version (e.g., 7.0.5)',
			placeHolder: '7.0.5'
		});

		if (version) {
			const result = getVsixRecommendation(context, version);
			const panel = vscode.window.createWebviewPanel(
				'vsixVersionCheck',
				`Vsix Version: ${version}`,
				vscode.ViewColumn.One,
				{}
			);
			panel.webview.html = getVersionCheckWebview(version, result, 'Vsix');
		}
	});

	// Register command to show all version mappings
	const showVersionMappings = vscode.commands.registerCommand('VersionManagementTest.showVersionMappings', () => {
		const mappings = loadVersionMappings(context);
		if (mappings) {
			const panel = vscode.window.createWebviewPanel(
				'versionMappings',
				'Version Mappings',
				vscode.ViewColumn.One,
				{}
			);

			panel.webview.html = getWebviewContent(mappings);
		}
	});

	context.subscriptions.push(checkKlobaseVersion, checkVsixVersion, showVersionMappings);
	//#endregion
}
function createStatusBarItem(text: string, tooltip: string, command: string) {
	let saveCurrent = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	saveCurrent.text = text; //💾🖫💾🖪🖬Å
	saveCurrent.tooltip = tooltip;
	saveCurrent.command = command;
	saveCurrent.show();
}

function getDownlodedApp() {
	let downloadApp = getlogFileData().filesDownload;
	return downloadApp ? downloadApp.map((d) => d.r_flavor + "@@" + d.r_version + "@@" + d.r_buildno) : [];
}
async function repoActionForApps(action: RepoActions) {
	try {
		if (updateAppPanel) {
			updateAppPanel.dispose();
		}
		updateAppPanel = vscode.window.createWebviewPanel("catCodingx", "Repostiory", vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
		let logContent = await getlogFileData();
		// if (action === "revert" || action === "update") {
		// 	vscode.window.showInformationMessage(`Please do the checkout first to use ${action} all`);
		// }
		let bReleasedVersionsCheckoutPossible = false;
		if (action === "checkout") {
			debugger;
			bReleasedVersionsCheckoutPossible = true;
		}
		updateAppPanel.webview.html = action === "checkout" ? getAppListWebView(logContent.writeAbleFVs, action, Object.keys(logContent.checkoutFVs || {}), bReleasedVersionsCheckoutPossible, logContent.internalNonEditableFVs) : getAppListWebView(Object.keys(logContent.checkoutFVs), action);
		updateAppPanel.webview.onDidReceiveMessage(async (message) => {
			let sAction = message?.data?.actionType;
			switch (message.command) {
				case "operationOnSelectedApps":
					try {
						if (message.data.selectedApps.length === 0) {
							vscode.window.showInformationMessage("No Apps selected");
							updateAppPanel.dispose();
							break;
						}
						if (action === "checkout" && sAction === "releasedVersionsCheckout") {
							debugger;
							let selectedApps = message.data.selectedApps;
						}
					} catch (error) {
						vscode.window.showWarningMessage(String(error));
					}
					updateAppPanel.dispose();

					break;
				case "showWarningMessage":
					if (message.data.warningMessage) {
						vscode.window.showWarningMessage(message.data.warningMessage);
					}
			}
		});
	} catch (error: any) {
		vscode.window.showErrorMessage("Login Error " + error.message);
	}
}

function getAppListWebView(appList: string[], action: RepoActions, checkOutFVs?: string[], checkReleasedVersions?: boolean, internalNonEditableFVs?: string[]) {
	// ensure arrays exist
	appList = appList || [];
	checkOutFVs = checkOutFVs || [];
	internalNonEditableFVs = internalNonEditableFVs || [];

	try {
		appList.sort();
		internalNonEditableFVs.sort();
		checkOutFVs.sort();
	} catch (e) {
		/* ignore */
	}

	const iCheckOutFVslength = checkOutFVs.length || 0; // preCount: only checkOutFVs
	const MAX_TOTAL = typeof maxNumOfFlvToCheckout !== "undefined" ? (maxNumOfFlvToCheckout as any) : 4;
	const isCheckoutAction = action === "checkout";
	const showReleasedBtn = isCheckoutAction && !!checkReleasedVersions;

	const safeId = (s: string) => (s || "").replace(/[^a-zA-Z0-9_\-]/g, "_");

	const cardHtml = (app: string, from: "writable" | "internal", checkedOut: boolean) => {
		const id = from === "internal" ? `int-${app}` : app;
		const safe = safeId(id);
		const checkedClass = checkedOut ? "checked-out" : "";
		const selectableClass = checkedOut ? "not-selectable" : "selectable";
		const badge = checkedOut ? '<span class="ro-badge"> (checked-out)</span>' : "";
		return `<div class="fv-card ${checkedClass} ${selectableClass}" id="${safe}" data-value="${app}" data-name="${app.toLowerCase()}" tabindex="${checkedOut && isCheckoutAction ? -1 : 0}">
      <div class="fv-label">${app}${badge}</div>
    </div>`;
	};

	const writableHtml = appList.map((a) => cardHtml(a, "writable", checkOutFVs.includes(a))).join("");
	const internalHtml = internalNonEditableFVs.map((a) => cardHtml(a, "internal", checkOutFVs.includes(a))).join("");

	// texts
	let heading = "";
	let comment = "";
	let warning = "";
	let warnDisplay = "none";
	if (action == "checkout") {
		heading = " Checkout Apps";
		comment = "Choose the Apps which you want to Check out from the Repository.";
		warning = `Note: You can have a maximum of ${MAX_TOTAL} active Apps checked out at any point of time.\n\tServer restart will be done after Checkout`;
		warnDisplay = "block";
	} else if (action == "update") {
		heading = " Update Apps";
		comment = "Select the apps to take update from Repository";
	} else if (action == "revert") {
		heading = " Revert Apps";
		comment = "Select the apps to revert it back. Note : Local Deleted , Local Modified and Conflict files will be reverted back";
		warning = "Warning: All the changes which are not committed or saved will be lost and App will be restored to latest version from the Repository.";
		warnDisplay = "block";
	} else if (action == "repair") {
		heading = " Repair Apps";
		comment = "Select the apps to repair. It will update external apps";
		warning = `Note: Server restart will be done after repair`;
		warnDisplay = "block";
	}

	const headSection = typeof returnHtmlHead === "function" ? returnHtmlHead() : `<!doctype html><head></head>`;

	const serializedAppList = JSON.stringify(appList);
	const serializedInternal = JSON.stringify(internalNonEditableFVs);
	const serializedCheckouts = JSON.stringify(checkOutFVs);

	return `<!DOCTYPE html>
  ${headSection}
  <body id="body_main" class="vscode-root">
    <style>
      /* Use VS Code theme variables. Fallbacks ensure legacy compatibility. */
      :root{
        --bg: var(--vscode-editor-background, #0b0c0d);
        --panel: var(--vscode-editorWidget-background, #0f1112);
        --card: var(--vscode-list-hoverBackground, #2a2b2d);
        --text: var(--vscode-editor-foreground, #e6e6e6);
        --muted: var(--vscode-descriptionForeground, #9aa0a6);
        --accent: var(--vscode-list-activeSelectionBackground, #1877f2);
        --accent-foreground: var(--vscode-list-activeSelectionForeground, #ffffff);
        --button-bg: var(--vscode-button-background, #1877f2);
        --button-fg: var(--vscode-button-foreground, #ffffff);
        --secondary-bg: var(--vscode-button-secondaryBackground, #2ecc71);
        --input-bg: var(--vscode-input-background, #111);
        --border: var(--vscode-editorWidget-border, rgba(255,255,255,0.04));
        --success: var(--vscode-terminal-ansiGreen, #00cc9d);
      }

      /* base layout */
      html,body { margin:0; padding:0; height:100%; }
      body.vscode-root { background: var(--bg); color: var(--text); font-family: "Segoe UI", Roboto, Arial; }
      .container { padding:16px; display:flex; flex-direction:column; gap:10px; height:100vh; box-sizing:border-box; }
      h2 { margin:0; font-size:14px; color:var(--text); }
      .muted { color:var(--muted); }
      .warning_message_color { color: var(--muted); white-space:pre-line; }

      /* controls */
      #fvSearch { width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--input-bg); color:var(--text); }
      .controls { display:flex; gap:12px; align-items:center; }

      /* tabs */
      .tabs { display:flex; gap:8px; margin-top:8px; }
      .tab { padding:8px 12px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.04); color:var(--muted); cursor:pointer; }
      .tab.active { background: rgba(255,255,255,0.02); color:var(--text); box-shadow: inset 0 -3px 0 var(--accent); }

      /* panels & cards */
      .panel { background: var(--panel); border-radius:8px; padding:12px; flex:1; display:flex; flex-direction:column; overflow:hidden; }
      .listWrap { overflow:auto; padding:8px 4px; display:flex; flex-direction:column; gap:12px; }
      .fv-card { background: var(--card); padding:18px; border-radius:8px; display:flex; align-items:center; cursor:pointer; transition: transform .08s, box-shadow .08s; outline:none; color:var(--text); border: 1px solid transparent; }
      .fv-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
      .fv-card.selected { border-left:6px solid var(--accent); padding-left:14px; box-shadow: 0 12px 28px rgba(0,0,0,0.12); }
      .fv-card.not-selectable { opacity:0.6; cursor:default; }
      .fv-label { font-size:16px; color:var(--text); }
      .ro-badge { font-size:12px; color:var(--muted); margin-left:8px; }

      /* footer & buttons */
      .footer { background: rgba(0,0,0,0.04); border-radius:8px; padding:12px; display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; bottom:12px; }
      .btn { padding:10px 18px; border-radius:8px; border:none; cursor:pointer; font-weight:700; color:var(--button-fg); }
      .btn.primary { background:var(--button-bg); color:var(--button-fg); box-shadow:0 6px 0 rgba(0,0,0,0.12); }
      .btn.secondary { background:var(--secondary-bg); color:var(--button-fg); }

      /* waiting area / spinner */
      .waiting-area { display:none; align-items:center; gap:12px; padding:8px 12px; border-radius:8px; background: rgba(0,0,0,0.06); }
      .spinner { width:18px; height:18px; border-radius:50%; border:3px solid transparent; border-top-color: var(--success); animation: spin 1s linear infinite; }
      .wait-message { color: var(--success); font-size:13px; line-height:1.3; max-width:780px; word-break:break-word; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* global waiting mode disables UI */
      .waiting-mode .fv-card, .waiting-mode .tab, .waiting-mode button, .waiting-mode #fvSearch, .waiting-mode .assigned_app_select, .waiting-mode .version_input { pointer-events:none; opacity:0.6; }
      .waiting-mode .tab.active { opacity:0.6; }
      .waiting-mode #popup, .waiting-mode #overlay { pointer-events:none; } /* user cannot interact while waiting */

      .meta { color:var(--muted); font-size:13px; }
      .listWrap::-webkit-scrollbar { width:12px; }
      .listWrap::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius:8px; }

      .selectAllWrap { display:flex; align-items:center; gap:8px; color:var(--muted); }
    </style>

    <div class="container">
      <div style="display:flex; flex-direction:column; gap:6px;">
        <h2>ADHINAYAN: ADHINAYAN VIEW</h2>
        <div class="muted">${comment}</div>
        <p class="warning_message_color" style="display:${warnDisplay}; margin:6px 0;">${warning}</p>
      </div>

      <div class="controls" style="font-size: medium;">
        <input id="fvSearch" placeholder="Search..." aria-label="Search items" />
        ${!isCheckoutAction ? `<div class="selectAllWrap"><input id="SelectAll12" type="checkbox" /><label for="SelectAll12" style="width: 80px;cursor:pointer;">Select All</label></div>` : ""}
      </div>

      ${isCheckoutAction ? `<div class="tabs"><div id="tabWritable" class="tab active">Writable</div><div id="tabInternal" class="tab">Read-Only</div></div>` : ""}

      <div class="panel" role="region">
        <div id="writablePanel" class="listWrap" style="${isCheckoutAction ? "" : "display:flex;"}">
          ${writableHtml || '<div class="meta">No writable items</div>'}
        </div>

        ${isCheckoutAction ? `<div id="internalPanel" class="listWrap" style="display:none;">${internalHtml || '<div class="meta">No read-only items</div>'}</div>` : ""}
      </div>

      <div class="footer" id="footerBar">
        <div style="display:flex; align-items:center; gap:12px;">
          <div id="waitingArea" class="waiting-area" role="status" aria-live="polite">
            <div class="spinner" id="spinnerEl" aria-hidden="true"></div>
            <div id="waitText" class="wait-message"></div>
          </div>
        </div>

        <div style="display:flex; gap:10px; align-items:center;">
          <button id="mainActionBtn" class="btn primary" ${iCheckOutFVslength >= MAX_TOTAL ? "disabled" : ""}>${String(action).toUpperCase()}</button>
          ${showReleasedBtn ? `<button id="releasedBtn" class="btn secondary">Checkout Released Version</button>` : ""}
        </div>
      </div>
    </div>

    <!-- popup markup (preserved) -->
    <div id="popup" class="relesed_popup_style" style="display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:var(--panel); padding:16px; border-radius:8px; border:1px solid var(--border);">
      <h3 style="margin-top:0;color: var(--success);">Checkout Released Version</h3>
      <div style="display:flex; gap:10px; margin-top:8px;">
        <select id="AppSelection" class="assigned_app_select" style="background:var(--input-bg); color:var(--text); border:1px solid var(--border); padding:8px; border-radius:6px;"></select>
        <input type="text" id="versionSelectionInput" class="version_input" placeholder="Version" style="padding:8px; border-radius:6px; background:var(--input-bg); color:var(--text); border:1px solid var(--border);" />
      </div>
      <div style="margin-top:16px; text-align:right;">
        <button id="popupCancel" class="button-8" onClick=popupCancel() style="margin-right:8px; padding:8px 12px; border-radius:6px; background:var(--border); color:var(--text);">Cancel</button>
        <button id="popupSubmit" class="button-8" onClick=popupSubmit() style="padding:8px 12px; border-radius:6px; background:var(--button-bg); color:var(--button-fg);">Submit</button>
      </div>
    </div>
    <div id="overlay" class="relesed_popup_style_background" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9998;"></div>

    <script>
      const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;

      const APP_LIST = ${serializedAppList};
      const INTERNAL_LIST = ${serializedInternal};
      const CHECKOUTS = ${serializedCheckouts};
      const MAX_TOTAL_JS = ${MAX_TOTAL};
      const PRE_COUNT = ${iCheckOutFVslength};
      const IS_CHECKOUT = ${isCheckoutAction ? "true" : "false"};

      const selectedSet = new Set();

      function q(sel, ctx=document) { return ctx.querySelector(sel); }
      function qa(sel, ctx=document) { return Array.from((ctx||document).querySelectorAll(sel)); }

      // Toggle selection for a card.
      function toggleCardSelection(cardEl) {
        if (!cardEl) return;
        if (cardEl.classList.contains('checked-out') && IS_CHECKOUT) {
          flash(cardEl);
          return;
        }
        const val = cardEl.getAttribute('data-value');
        if (!val) return;
        const willSelect = !cardEl.classList.contains('selected');

        if (willSelect && IS_CHECKOUT) {
          if ((selectedSet.size + PRE_COUNT + 1) > MAX_TOTAL_JS) {
            if (vscode) {
              vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: 'You can only select up to ' + MAX_TOTAL_JS + ' apps, including those already checked out.' }});
            } else {
              alert('You can only select up to ' + MAX_TOTAL_JS + ' apps, including those already checked out.');
            }
            flash(cardEl);
            return;
          }
        }

        if (willSelect) {
          selectedSet.add(val);
          cardEl.classList.add('selected');
        } else {
          selectedSet.delete(val);
          cardEl.classList.remove('selected');
        }
      }

      function flash(el) {
        const prev = el.style.boxShadow;
        el.style.boxShadow = '0 0 0 4px rgba(255,80,80,0.12)';
        setTimeout(() => el.style.boxShadow = prev, 300);
      }

      function attachCardHandlers() {
        qa('.fv-card').forEach(card => {
          card.addEventListener('click', () => toggleCardSelection(card));
          card.addEventListener('keydown', (ev) => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); toggleCardSelection(card); } });
        });
      }

      function applySearchFilter() {
        const qv = (q('#fvSearch').value || '').toLowerCase().trim();
        const activePanel = (IS_CHECKOUT && q('#tabInternal') && q('#tabInternal').classList.contains('active')) ? q('#internalPanel') : q('#writablePanel');
        if (!activePanel) return;
        qa('.fv-card', activePanel).forEach(card => {
          const nm = (card.getAttribute('data-name') || '').toLowerCase();
          card.style.display = (!qv || nm.indexOf(qv) !== -1) ? 'flex' : 'none';
        });
      }

      function initTabs() {
        if (!IS_CHECKOUT) return;
        q('#tabWritable').addEventListener('click', () => {
          q('#tabWritable').classList.add('active'); q('#tabInternal').classList.remove('active');
          q('#writablePanel').style.display = ''; q('#internalPanel').style.display = 'none';
          applySearchFilter();
        });
        q('#tabInternal').addEventListener('click', () => {
          q('#tabInternal').classList.add('active'); q('#tabWritable').classList.remove('active');
          q('#internalPanel').style.display = ''; q('#writablePanel').style.display = 'none';
          applySearchFilter();
        });
      }

      // Select All (only exists when not checkout): select/deselect all cards across both lists.
      const selectAllEl = q('#SelectAll12');
      if (selectAllEl) {
        selectAllEl.addEventListener('change', (ev) => {
          const checked = ev.currentTarget.checked;
          const cards = qa('.fv-card');
          if (checked) {
            cards.forEach(c => {
              const val = c.getAttribute('data-value');
              if (val) { selectedSet.add(val); c.classList.add('selected'); }
            });
          } else {
            cards.forEach(c => c.classList.remove('selected'));
            selectedSet.clear();
          }
        });
      }

      // waiting UI: show/hide and toggle "everything disabled"
      function showWaitingText(selectedApps) {
        const waitingArea = q('#waitingArea');
        const waitText = q('#waitText');
        const mainBtn = q('#mainActionBtn');
        const relBtn = q('#releasedBtn');

        if (waitingArea) waitingArea.style.display = 'flex';

        if (waitText) {
          const btnText = mainBtn ? (mainBtn.innerText || '').toUpperCase() : '${String(action).toUpperCase()}';
          let message = '';
          if (btnText === 'CHECKOUT') {
            message = 'Workspace checkout of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
          } else if (btnText === 'REVERT') {
            message = 'Revert of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
          } else if (btnText === 'UPDATE') {
            message = 'Update of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
          } else if (btnText === 'REPAIR') {
            message = 'Repair of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
          } else {
            message = (selectedApps.join(' , ') || '') + ' started.\\nPlease wait...';
          }
          waitText.innerText = message;
        }

        // add waiting-mode class to body to disable interactions globally
        document.body.classList.add('waiting-mode');

        // explicitly disable controls
        qa('button').forEach(b => b.disabled = true);
        const search = q('#fvSearch'); if (search) search.disabled = true;
        if (selectAllEl) selectAllEl.disabled = true;
        qa('#popupCancel, #popupSubmit').forEach(b => b.disabled = true);
      }

      function hideWaitingText() {
        const waitingArea = q('#waitingArea');
        const waitText = q('#waitText');
        if (waitingArea) waitingArea.style.display = 'none';
        if (waitText) waitText.textContent = '';
        document.body.classList.remove('waiting-mode');

        qa('button').forEach(b => b.disabled = false);
        const search = q('#fvSearch'); if (search) search.disabled = false;
        if (selectAllEl) selectAllEl.disabled = false;

        // respect initial main action disabled when preCount >= MAX_TOTAL
        const mainBtn = q('#mainActionBtn'); if (mainBtn) {
          if (PRE_COUNT >= MAX_TOTAL_JS && IS_CHECKOUT) mainBtn.disabled = true;
          else mainBtn.disabled = false;
        }
      }

      function mainActionHandler() {
        const selectedApps = Array.from(selectedSet);
        if (IS_CHECKOUT) {
          const allowedSelections = Math.max(MAX_TOTAL_JS - PRE_COUNT, 0);
          if (selectedApps.length > allowedSelections) selectedApps.splice(allowedSelections);
        }
        showWaitingText(selectedApps);
        if (vscode) vscode.postMessage({ command: 'operationOnSelectedApps', data: { selectedApps: selectedApps }});
      }

      // popup helpers
      function getFlavorVersionFromFv(fvid) {
        if (!fvid?.length) return null;
        let lst = fvid.lastIndexOf("_");
        let flavor = fvid.slice(0, lst);
        return flavor;
      }

      window.showPopup = function() {
        q('#popup').style.display = 'block';
        q('#overlay').style.display = 'block';
        const AppSelectionDropdown = q('#AppSelection');
        AppSelectionDropdown.innerHTML = '';
        (APP_LIST || []).forEach(app => {
          const opt = document.createElement('option');
          opt.value = getFlavorVersionFromFv(app) || app;
          opt.textContent = getFlavorVersionFromFv(app) || app;
          AppSelectionDropdown.appendChild(opt);
        });
      };

      window.popupCancel = function() {
        q('#popup').style.display = 'none'; q('#overlay').style.display = 'none';
      };

      window.popupSubmit = function() {
        const selectedApp = q('#AppSelection') && q('#AppSelection').value;
        const version = q('#versionSelectionInput') && q('#versionSelectionInput').value;
        if (!selectedApp || selectedApp === "" || !version || version === "") {
          if (vscode) vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: "Please fill in both the application and version fields." }});
          return;
        }
        q('#popup').style.display = 'none'; q('#overlay').style.display = 'none';
        const selectedApps = [ selectedApp + '_' + version ];
        showWaitingText(selectedApps);
        if (vscode) vscode.postMessage({ command: 'operationOnSelectedApps', data: { selectedApps: selectedApps, actionType: "releasedVersionsCheckout" }});
      };

      if (q('#releasedBtn')) {
        q('#releasedBtn').addEventListener('click', () => {
          if (typeof window.showPopup === 'function') { try { window.showPopup(); return; } catch(e) {} }
          if (vscode) vscode.postMessage({ command: 'checkoutReleased', data: {} });
        });
      }

      q('#mainActionBtn').addEventListener('click', mainActionHandler);

      window.addEventListener('load', () => {
        attachCardHandlers();
        initTabs();
        q('#fvSearch').addEventListener('input', applySearchFilter);

        // mark checkouts visually when present
        (CHECKOUTS || []).forEach(app => {
          const id1 = safeId(app);
          const id2 = safeId('int-' + app);
          const e1 = document.getElementById(id1);
          const e2 = document.getElementById(id2);
          if (e1) { e1.classList.add('checked-out'); e1.classList.add('not-selectable'); e1.setAttribute('aria-disabled','true'); }
          if (e2) { e2.classList.add('checked-out'); e2.classList.add('not-selectable'); e2.setAttribute('aria-disabled','true'); }
        });
      });

      window.hideWaitingText = hideWaitingText;
      window.__getSelectedApps = () => Array.from(selectedSet);
    </script>
  </body>
  </html>`;
}

function returnHtmlHead() {
	return `<head>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		body {
			font-family: Arial;
		}

		/* Style the tab */
		.tab {
			overflow: hidden;
			border: 1px solid #ccc;
			background-color: #f1f1f1;
		}

		/* Style the buttons inside the tab */
		.tab button {
			background-color: inherit;
			float: left;
			border: none;
			outline: none;
			cursor: pointer;
			padding: 14px 16px;
			transition: 0.3s;
			font-size: 17px;
		}

		/* PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - adding style for other buttons(.button-8) and using vscode style variables */
		.button-7, .button-8 {
			background-color: var(--vscode-button-background,#0095ff);
			border: 1px solid transparent;
			border-radius: 3px;
			box-shadow: rgba(255, 255, 255, .4) 0 1px 0 0 inset;
			box-sizing: border-box;
			color: #fff;
			cursor: pointer;
			display: inline-block;
			font-family: -apple-system, system-ui, "Segoe UI", "Liberation Sans", sans-serif;
			font-size: 13px;
			font-weight: 400;
			line-height: 1.15385;
			margin: 0;
			outline: none;
			padding: 8px .8em;
			position: relative;
			text-align: center;
			text-decoration: none;
			user-select: none;
			-webkit-user-select: none;
			touch-action: manipulation;
			vertical-align: baseline;
			white-space: nowrap;
		}

		/* PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - using vscode style variables in place of hardcoded colors */
		.button-7:hover,
		.button-7:focus {
			background-color:var(--vscode-button-hoverBackground,#07c);
		}

		/* PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - adding style for other buttons (.button-8) */
		.button-7:focus,.button-8:focus {
			box-shadow: 0 0 0 4px rgba(0, 149, 255, .15);
		}

		.button-7:active {
			background-color: #0064bd;
			box-shadow: none;
		}

		/* PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - adding style for other buttons (.button-8) */
		.button-7:disabled, .button-8:disabled {
			background-color: grey;
			cursor: not-allowed;
			color: #ccc;
		}
		/* PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 -for hiding the checkout Released version button if the function is not there to do released version checkout*/
		.HideOption{
			display: none !important;
		}

		/* Change background color of buttons on hover */
		.tab button:hover {
			background-color: #ddd;
		}

		/* Create an active/current tablink class */
		.tab button.active {
			background-color: #ccc;
		}

		/* Style the tab content */
		.tabcontent {
			display: none;
			padding: 6px 12px;
			/* width: 50%; *//* PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290 */
			height: 70%;
			border-top: none;
			transition: all 2s;
			-webkit-animation: fadeIn 1s;
			animation: fadeIn 1s;
		}

		.test {
			overflow: auto;
			width: 100%;
			height: 50%;
		}

		.tabcontent_1 {
			width: 50%;
			height: 50%;
			overflow: scroll;
		}

		.mt-5{
			margin-top:5px;
		}

		@-webkit-keyframes fadeIn {
			from {
				opacity: 0;
			}

			to {
				opacity: 1;
			}
		}

		@keyframes fadeIn {
			from {
				opacity: 0;
			}

			to {
				opacity: 1;
			}
		}

		.loader {
			width: 16px;
			height: 16px;
			border-radius: 50%;
			display: block;
			margin:15px auto;
			position: relative;
			background: #FFF;
			box-shadow: -24px 0 #FFF, 24px 0 #FFF;
			box-sizing: border-box;
			animation: shadowPulse 2s linear infinite;
		  }
		  
		  @keyframes shadowPulse {
			33% {
			  background: #FFF;
			  box-shadow: -24px 0 green, 24px 0 #FFF;
			}
			66% {
			  background: green;
			  box-shadow: -24px 0 #FFF, 24px 0 #FFF;
			}
			100% {
			  background: #FFF;
			  box-shadow: -24px 0 #FFF, 24px 0 green;
			}
		  }

		#waitText{
			color:green;
			font-size:1rem;
			text-align:center;
			margin-top:1%;
		}
		/*PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802- Using VSCODE theme colors and styles for popup*/
		.conflict_button_container{
			display: flex; 
			gap: 10px; 
			justify-content: start;
		}
		.newly_created_pvt_files{
			color:  var(--vscode-gitDecoration-addedResourceForeground);
		}
		.modified_pvt_files{
			color:  var(--vscode-gitDecoration-modifiedResourceForeground);
		}
		.deleted_pvt_files{
			color:  var(--vscode-gitDecoration-deletedResourceForeground);
		}
		.conflict_pvt_files{
			color:  var(--vscode-gitDecoration-conflictingResourceForeground);
		}
		.renamed_pvt_files{
			color:  var(--vscode-gitDecoration-renamedResourceForeground);
		}
		.warning_message_color{
			color: var(--vscode-notificationsWarningIcon-foreground, orange);
		}
		.relesed_popup_style {
			display: none;
			position: fixed;
			background:var(--vscode-tab-activeBackground,var(--vscode-tab-unfocusedActiveBackground, white));
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: auto;
			padding: 20px;
			border: 2px solid #00cc9d;
			border-radius: 8px;
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
			z-index: 1000;
		}
		.assigned_app_select {
			flex: 1;
			padding: 8px;
			border: 1px solid #ccc;
			border-radius: 4px;
		}
		.version_input {
			flex: 1;
			padding: 8px;
			border: 1px solid #ccc;
			border-radius: 4px;
		}
		.relesed_popup_style_background {
			display: none;
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(104, 104, 104, 0.404);
			z-index: 999;
		}
		.file-status-implier {
			display: flex;
			gap: 15px;
			justify-content: start;
			flex-wrap: wrap;
		}
	</style>
	<script src="./testlog.js"> </script>
</head>`.replace(/(\r\n|\n|\r)/gm, "");
}

function getlogFileData(flavorPath?: string) {
	return samDat;
}
export function deactivate() {}




//#region Version Manager

interface VersionMapping {
	klobase_vsix_version_dependent: { [key: string]: string };
	vsix_klobase_version_dependent: { [key: string]: string };
}
function loadVersionMappings(context: vscode.ExtensionContext): VersionMapping | null {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage('No workspace folder is open. Please open a folder containing version_dependent.json');
		return null;
	}

	// let versionFilePath = path.join(workspaceFolders[0].uri.fsPath, 'version_dependent.json');
	// if (!fs.existsSync(versionFilePath)) {
	// 	vscode.window.showErrorMessage('version_dependent.json not found in workspace root');
	// 	return null;
	// }

	try {
		// const content = fs.readFileSync(versionFilePath, 'utf-8');
		const content = JSON.stringify(versionDependentData);
		return JSON.parse(content) as VersionMapping;
	} catch (error) {
		vscode.window.showErrorMessage(`Error reading version_dependent.json: ${error}`);
		return null;
	}
}

function getKlobaseRecommendation(context: vscode.ExtensionContext, klobaseVersion: string): string {
	const mappings = loadVersionMappings(context);
	if (!mappings) {
		return 'Unable to load version mappings';
	}

	const minVsixVersion = mappings.klobase_vsix_version_dependent[klobaseVersion];
	
	if (minVsixVersion) {
		return `For klobase version ${klobaseVersion}, you need minimum vsix version ${minVsixVersion} or higher`;
	}

	// Find the version range this klobase version falls into
	// Versions are valid up to (but not including) the next mapped version
	const versions = Object.keys(mappings.klobase_vsix_version_dependent)
		.sort((a, b) => compareVersions(a, b));
	
	let applicableVersion = null;
	
	for (const ver of versions) {
		if (compareVersions(klobaseVersion, ver) < 0) {
			// klobaseVersion is lower than this threshold
			// Use this threshold's requirements
			applicableVersion = ver;
			break;
		}
	}

	if (applicableVersion) {
		const recommendedVsix = mappings.klobase_vsix_version_dependent[applicableVersion];
		return `For klobase version ${klobaseVersion}, you need minimum vsix version ${recommendedVsix} or higher (valid up to klobase ${applicableVersion})`;
	}

	// Version is higher than all mapped versions - use the highest mapped version
	if (versions.length > 0) {
		const highestVersion = versions[versions.length - 1];
		const recommendedVsix = mappings.klobase_vsix_version_dependent[highestVersion];
		return `Klobase version ${klobaseVersion} is higher than mapped versions. Based on version ${highestVersion}, you should use vsix version ${recommendedVsix} or higher`;
	}

	return `Klobase version ${klobaseVersion} not found in mappings. No recommendation available.`;
}

function getVsixRecommendation(context: vscode.ExtensionContext, vsixVersion: string): string {
	const mappings = loadVersionMappings(context);
	if (!mappings) {
		return 'Unable to load version mappings';
	}

	const maxKlobaseVersion = mappings.vsix_klobase_version_dependent[vsixVersion];
	
	if (maxKlobaseVersion) {
		return `Vsix version ${vsixVersion} can be used up to klobase version ${maxKlobaseVersion}`;
	}

	// Find the version range this vsix version falls into
	// Versions are valid up to (but not including) the next mapped version
	const versions = Object.keys(mappings.vsix_klobase_version_dependent)
		.sort((a, b) => compareVsixVersions(a, b));
	
	let applicableVersion = null;
	
	for (const ver of versions) {
		if (compareVsixVersions(vsixVersion, ver) < 0) {
			// vsixVersion is lower than this threshold
			// Use this threshold's maximum klobase support
			applicableVersion = ver;
			break;
		}
	}

	if (applicableVersion) {
		const maxKlobase = mappings.vsix_klobase_version_dependent[applicableVersion];
		return `Vsix version ${vsixVersion} can be used up to klobase version ${maxKlobase} (valid up to vsix ${applicableVersion})`;
	}

	// Version is higher than all mapped versions - use the highest mapped version
	if (versions.length > 0) {
		const highestVersion = versions[versions.length - 1];
		const maxKlobase = mappings.vsix_klobase_version_dependent[highestVersion];
		return `Vsix version ${vsixVersion} is higher than mapped versions. Based on version ${highestVersion}, it can be used up to klobase version ${maxKlobase}`;
	}

	return `Vsix version ${vsixVersion} not found in mappings. No recommendation available.`;
}

function compareVersions(v1: string, v2: string): number {
	const parts1 = v1.split('-').map(Number);
	const parts2 = v2.split('-').map(Number);
	
	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const p1 = parts1[i] || 0;
		const p2 = parts2[i] || 0;
		if (p1 !== p2) {
			return p1 - p2;
		}
	}
	return 0;
}

function compareVsixVersions(v1: string, v2: string): number {
	const parts1 = v1.split('.').map(Number);
	const parts2 = v2.split('.').map(Number);
	
	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const p1 = parts1[i] || 0;
		const p2 = parts2[i] || 0;
		if (p1 !== p2) {
			return p1 - p2;
		}
	}
	return 0;
}

function getVersionCheckWebview(version: string, recommendation: string, versionType: string): string {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Version Check Result</title>
		<style>
			body {
				font-family: var(--vscode-font-family);
				padding: 20px;
				color: var(--vscode-foreground);
				background-color: var(--vscode-editor-background);
			}
			.container {
				max-width: 800px;
				margin: 0 auto;
			}
			h1 {
				color: var(--vscode-foreground);
				border-bottom: 2px solid var(--vscode-panel-border);
				padding-bottom: 10px;
			}
			.version-input {
				background-color: var(--vscode-input-background);
				color: var(--vscode-input-foreground);
				padding: 15px;
				border-radius: 5px;
				margin: 20px 0;
				border: 1px solid var(--vscode-panel-border);
			}
			.version-label {
				font-weight: bold;
				font-size: 14px;
				color: var(--vscode-descriptionForeground);
				margin-bottom: 5px;
			}
			.version-value {
				font-size: 24px;
				font-weight: bold;
				color: var(--vscode-textLink-foreground);
			}
			.recommendation {
				background-color: var(--vscode-editor-inactiveSelectionBackground);
				padding: 20px;
				border-radius: 5px;
				margin: 20px 0;
				border-left: 4px solid var(--vscode-textLink-foreground);
			}
			.recommendation h2 {
				margin-top: 0;
				color: var(--vscode-foreground);
				font-size: 18px;
			}
			.recommendation p {
				margin: 10px 0;
				line-height: 1.6;
				font-size: 16px;
			}
			.info-box {
				background-color: var(--vscode-textBlockQuote-background);
				padding: 15px;
				border-radius: 5px;
				margin-top: 20px;
				border: 1px solid var(--vscode-panel-border);
			}
			.info-box p {
				margin: 5px 0;
				font-size: 14px;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<h1>${versionType} Version Compatibility Check</h1>
			
			<div class="version-input">
				<div class="version-label">Checked Version:</div>
				<div class="version-value">${version}</div>
			</div>

			<div class="recommendation">
				<h2>Compatibility Information</h2>
				<p>${recommendation}</p>
			</div>

			<div class="info-box">
				<p><strong>Note:</strong> This recommendation is based on the version mappings in your <code>version_dependent.json</code> file.</p>
				<p>Use the "Version Manager: Show All Version Mappings" command to see the complete compatibility matrix.</p>
			</div>
		</div>
	</body>
	</html>`;
}

function getWebviewContent(mappings: VersionMapping): string {
	const klobaseRows = Object.entries(mappings.klobase_vsix_version_dependent)
		.map(([klobase, vsix]) => `<tr><td>${klobase}</td><td>${vsix}</td></tr>`)
		.join('');
	
	const vsixRows = Object.entries(mappings.vsix_klobase_version_dependent)
		.map(([vsix, klobase]) => `<tr><td>${vsix}</td><td>${klobase}</td></tr>`)
		.join('');

	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Version Mappings</title>
		<style>
			body {
				font-family: var(--vscode-font-family);
				padding: 20px;
				color: var(--vscode-foreground);
			}
			h2 {
				color: var(--vscode-foreground);
				margin-top: 30px;
			}
			table {
				border-collapse: collapse;
				width: 100%;
				margin-top: 10px;
			}
			th, td {
				border: 1px solid var(--vscode-panel-border);
				padding: 8px;
				text-align: left;
			}
			th {
				background-color: var(--vscode-editor-background);
				font-weight: bold;
			}
			tr:nth-child(even) {
				background-color: var(--vscode-editor-background);
			}
		</style>
	</head>
	<body>
		<h1>Version Compatibility Mappings</h1>
		
		<h2>Klobase → Minimum Vsix Version</h2>
		<p>Shows the minimum vsix version required for each klobase version</p>
		<table>
			<tr>
				<th>Klobase Version</th>
				<th>Minimum Vsix Version</th>
			</tr>
			${klobaseRows}
		</table>

		<h2>Vsix → Maximum Klobase Version</h2>
		<p>Shows the maximum klobase version supported by each vsix version</p>
		<table>
			<tr>
				<th>Vsix Version</th>
				<th>Maximum Klobase Version</th>
			</tr>
			${vsixRows}
		</table>
	</body>
	</html>`;
}

//#endregion
