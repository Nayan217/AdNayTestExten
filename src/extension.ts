import * as vscode from "vscode";
import { TabViewProvider } from "./TabViewProvider";
import { samDat } from "./sampleDate/sampleData";
let updateAppPanel: vscode.WebviewPanel;
type RepoActions = "commit" | "update" | "checkout" | "delete" | "ping" | "registerUser" | "updateLog" | "revert" | "updateFileStatus" | "renamed" | "resolveConflict" | "getDownlodedApp" | "repair" | "stop" | "releasedVersionsCheckout" | "checkReleasedVersionsCheckout";
let maxNumOfFlvToCheckout = 4;
export function activate(context: vscode.ExtensionContext) {
	console.log("EXTENSION ACTIVATED!");
	console.log("Extension URI:", context.extensionUri.toString());
	console.log("TabViewProvider created");
	createStatusBarItem("Checkout", "Update workspace", "extension.checkout");
	createStatusBarItem("Update All", "Update selected apps from the repository", "extension.updateApp");
	createStatusBarItem("Repair Framework", "Update external apps", "extension.repair");
	context.subscriptions.push(
		vscode.commands.registerCommand("extension.checkout", async (event) => {
			await repoActionForApps("checkout");
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("extension.updateApp", async (event) => {
			await repoActionForApps("update");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.repair", async (event) => {
			try {
				if (updateAppPanel) {
					updateAppPanel.dispose();
				}

				let downloadedApp = getDownlodedApp();
				if (downloadedApp && !downloadedApp.length) {
					vscode.window.showInformationMessage("No app found to repair");
					return;
				}
				updateAppPanel = vscode.window.createWebviewPanel("catCodingx", "Repostiory", vscode.ViewColumn.One, { enableScripts: true });
				let temp = downloadedApp.map((app: any) => app.split("@@")[0] + "-" + app.split("@@")[1]);
				temp = temp.filter((item: any, index: any) => temp.indexOf(item) === index);
				updateAppPanel.webview.html = getAppListWebView(temp, "repair");
				let downloadeAppMap: any = {};
				for (let app of downloadedApp) {
					downloadeAppMap[app.split("@@")[0] + "-" + app.split("@@")[1]] = app.split("@@")[2];
				}
				updateAppPanel.webview.onDidReceiveMessage(async (message) => {
					switch (message.command) {
						case "operationOnSelectedApps":
							if (message.data.selectedApps.length === 0) {
								vscode.window.showInformationMessage("No Files selected");
								updateAppPanel.dispose();
							} else {
								let appsToDownload = message.data.selectedApps.map((a: any) => {
									let numIndex = a.indexOf("-") > -1 ? a.indexOf("-") : a.lastIndexOf("_");
									let flavor = a.slice(0, numIndex);
									let ver = a.slice(numIndex + 1);
									return flavor + "@@" + ver + "@@" + downloadeAppMap[a];
								});
								// let res: any = await sendRequestToNodeServer("repair", {
								// 	appZipToDownloaded: appsToDownload,
								// });
								debugger;
								// vscode.window.showInformationMessage(res);//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
								// let edited_res: any = await responseCheck(res);
								// vscode.window.showInformationMessage(edited_res);
								updateAppPanel.dispose();
								// await restartServer(); //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
							}
					}
				});
			} catch (error: any) {
				vscode.window.showErrorMessage("Error during repair" + error.message);
			}
		})
	);

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

//#region

// function getAppListWebView(appList: string[], action: string, checkOutFVs?: string[], checkReleasedVersions?: boolean, internalNonEditableFVs?: string[]) {
// 	appList = appList || [];
// 	internalNonEditableFVs = internalNonEditableFVs || [];
// 	checkOutFVs = checkOutFVs || [];

// 	// stable sort
// 	try {
// 		appList = appList.slice().sort();
// 	} catch (e) {}
// 	try {
// 		internalNonEditableFVs = internalNonEditableFVs.slice().sort();
// 	} catch (e) {}
// 	try {
// 		checkOutFVs = checkOutFVs.slice().sort();
// 	} catch (e) {}

// 	const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_\-]/g, "_");

// 	// Build writable list HTML; mark items that are part of checkOutFVs as "checkout-disabled"
// 	const writableHtml = appList
// 		.map((app) => {
// 			const isCheckoutDisabled = checkOutFVs.indexOf(app) !== -1;
// 			return `
//       <div class="fv-card ${isCheckoutDisabled ? "disabled-checkout" : ""}" data-name="${app.toLowerCase()}" data-value="${app}" id="w_${safeId(app)}">
//         <div class="left-indicator ${isCheckoutDisabled ? "muted" : ""}"></div>
//         <div class="fv-label">${app}${isCheckoutDisabled ? '<span class="ro-badge"> (checked-out)</span>' : ""}</div>
//       </div>
//     `;
// 		})
// 		.join("");

// 	// Build internal read-only
// 	const internalHtml = internalNonEditableFVs
// 		.map(
// 			(app) => `
//     <div class="fv-card internal" data-name="${app.toLowerCase()}" data-value="${app}" id="i_${safeId(app)}">
//       <div class="left-indicator muted"></div>
//       <div class="fv-label">${app}<span class="ro-badge"> (readonly)</span></div>
//     </div>
//   `
// 		)
// 		.join("");

// 	// Pre-count used for checkout action limit (includes internal + checkoutFVs)
// 	const preCount = (internalNonEditableFVs ? internalNonEditableFVs.length : 0) + (checkOutFVs ? checkOutFVs.length : 0);
// 	const MAX_TOTAL = 4;
// 	const availableSlots = Math.max(0, MAX_TOTAL - preCount);

// 	const showReleasedBtn = !!checkReleasedVersions;

// 	const html = `<!doctype html>
// <html>
// <head>
// <meta charset="utf-8" />
// <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
// <meta name="viewport" content="width=device-width, initial-scale=1.0">
// <title>Apps</title>
// <style>
//   :root{
//     --bg:#18191b; --panel:#242526; --card:#2b2c2e; --muted:#9aa0a6; --accent:#1877f2; --accent-2:#2ecc71; --text:#e6e6e6;
//   }
//   html,body{height:100%;margin:0;font-family: "Segoe UI", Roboto, Arial;background:var(--bg);color:var(--text);}
//   .container{display:flex;flex-direction:column;height:100vh;padding:12px;box-sizing:border-box;gap:8px;}
//   header{font-weight:700;font-size:14px;padding:8px 10px;color:var(--text);border-radius:6px;}
//   .searchWrap{display:flex;gap:8px;align-items:center;}
//   #fvSearch{width:90%;padding:10px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.04);background:#151515;color:var(--text);outline:none;}
//   .tabs{display:flex;gap:8px;margin-top:6px;}
//   .tab{padding:10px 14px;border-radius:6px 6px 0 0;background:transparent;color:var(--muted);cursor:pointer;position:relative;}
//   .tab.active{color:var(--text);}
//   .tab.active::after{content:'';position:absolute;left:0;right:0;bottom:-2px;height:3px;background:var(--accent);border-radius:3px 3px 0 0;}
//   .panel{background:var(--panel);border-radius:8px;padding:0;flex:1;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 0 rgba(0,0,0,0.4);}
//   .list{overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px;}
//   .fv-card{background:var(--card);padding:14px 18px;border-radius:8px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:12px;transition:box-shadow .08s, transform .06s;}
//   .fv-card:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,0.6);}
//   .fv-card.selected{box-shadow:0 8px 24px rgba(24,119,242,0.12);border-left:6px solid var(--accent);padding-left:12px;}
//   .left-indicator{width:6px;height:36px;border-radius:4px;background:transparent;flex:0 0 auto;}
//   .left-indicator.muted{background:rgba(255,255,255,0.05);}
//   .fv-card.internal{opacity:0.6;cursor:default;}
//   .fv-card.disabled-checkout{opacity:0.7;cursor:default;}
//   .fv-label{font-size:16px;color:var(--text);}
//   .ro-badge{font-size:12px;color:var(--muted);margin-left:8px;}
//   .footer-fixed{display:flex;flex-direction:column;gap:6px;position:sticky;bottom:0;z-index:5;}
//   .bottomBar{display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;background:#0f1112;}
//   .selectedSummary{flex:1;color:var(--muted);font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:flex;align-items:center;gap:8px;}
//   .loader{width:18px;height:18px;border-radius:50%;border:3px solid rgba(255,255,255,0.08);border-top-color:var(--text);animation:spin 1s linear infinite;}
//   @keyframes spin{to{transform:rotate(360deg);}}
//   .actions{display:flex;gap:12px;}
//   .btn{padding:12px 18px;border-radius:6px;border:none;cursor:pointer;font-weight:700;font-size:15px;}
//   .btn.checkout{background:var(--accent);color:#fff;box-shadow:0 6px 0 rgba(24,119,242,0.12);}
//   .btn.released{background:var(--accent-2);color:#fff;box-shadow:0 6px 0 rgba(46,204,113,0.08);}
//   .btn:active{transform:translateY(1px);}
//   .list::-webkit-scrollbar{width:12px;}
//   .list::-webkit-scrollbar-thumb{background:#111;border-radius:6px;border:3px solid rgba(0,0,0,0.0);}
//   .muted{opacity:0.45;}
//   .hint{font-size:12px;color:var(--muted);padding:6px 12px;}
// </style>
// </head>
// <body>
//   <div class="container">
//     <header>ADHINAYAN: ADHINAYAN VIEW</header>

//     <div class="searchWrap">
//       <input id="fvSearch" placeholder="Search..." oninput="onSearch()" />
//     </div>

//     <div class="tabs" role="tablist">
//       <div class="tab active" id="tabWritable" onclick="openTab('writable')">Writable</div>
//       <div class="tab" id="tabInternal" onclick="openTab('internal')">Read-Only</div>
//     </div>

//     <div class="panel">
//       <div id="writablePanel" class="list" aria-hidden="false">
//         ${writableHtml || '<div class="hint">No writable items</div>'}
//       </div>

//       <div id="internalPanel" class="list" aria-hidden="true" style="display:none">
//         ${internalHtml || '<div class="hint">No read-only items</div>'}
//       </div>
//     </div>

//     <div class="footer-fixed">
//       <div class="bottomBar">
//         <!-- LOADER and waiting text shown in place of "Selected:" -->
//         <div class="selectedSummary" id="selectedSummary">
//           <div class="loader" id="summaryLoader"></div>
//           <div id="summaryText">Waiting...</div>
//         </div>

//         <div class="actions">
//           <button class="btn checkout" id="checkoutBtn">Checkout</button>
//           ${showReleasedBtn ? '<button class="btn released" id="releasedBtn">Checkout Released Version</button>' : ""}
//         </div>
//       </div>
//       <div style="font-size:12px;color:var(--muted);padding:6px 2px;">
//         <span>Max total (including read-only / checked-out) = <strong>${MAX_TOTAL}</strong>. Pre-occupied: <strong>${preCount}</strong>. Available slots: <strong id="availableSlots">${availableSlots}</strong></span>
//       </div>
//     </div>
//   </div>

// <script>
// (function(){
//   const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
//   const MAX_TOTAL = ${MAX_TOTAL};
//   const preCount = ${preCount};
//   let available = ${availableSlots};
//   const isCheckoutAction = ${action === "checkout" ? "true" : "false"};

//   // internal selection set
//   const selected = new Set();

//   // helpers
//   const q = (s, ctx=document) => ctx.querySelector(s);
//   const qa = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));

//   function initClickable(){
//     // writable cards (exclude internal and disabled-checkout)
//     qa('#writablePanel .fv-card').forEach(card => {
//       const isDisabled = card.classList.contains('disabled-checkout');
//       if (isDisabled) {
//         card.classList.add('muted');
//         // mark as occupied visually (we do not add to selected set)
//         return;
//       }
//       card.addEventListener('click', (ev) => {
//         const val = card.getAttribute('data-value');
//         if (!val) return;

//         // enforce max selection if checkout action
//         if (isCheckoutAction) {
//           const currentlySelectedCount = selected.size;
//           if (!selected.has(val) && currentlySelectedCount >= available) {
//             // flash card to indicate limit reached
//             flash(card);
//             return;
//           }
//         }

//         if (selected.has(val)) { selected.delete(val); card.classList.remove('selected'); }
//         else { selected.add(val); card.classList.add('selected'); }
//         refreshSelectedSummary();
//       });

//       // keyboard accessibility
//       card.setAttribute('tabindex', '0');
//       card.addEventListener('keydown', (ev) => {
//         if (ev.key === ' ' || ev.key === 'Enter') { card.click(); ev.preventDefault(); }
//       });
//     });

//     // internal cards: mark muted and not clickable
//     qa('#internalPanel .fv-card').forEach(c => { c.classList.add('muted'); });
//   }

//   function flash(el){
//     const prev = el.style.boxShadow;
//     el.style.boxShadow = '0 0 0 3px rgba(200,50,50,0.14)';
//     setTimeout(() => el.style.boxShadow = prev, 350);
//   }

//   function openTab(name){
//     const wTab = q('#tabWritable'), iTab = q('#tabInternal');
//     const wPanel = q('#writablePanel'), iPanel = q('#internalPanel');
//     if (name === 'writable') { wTab.classList.add('active'); iTab.classList.remove('active'); wPanel.style.display='flex'; iPanel.style.display='none'; }
//     else { iTab.classList.add('active'); wTab.classList.remove('active'); iPanel.style.display='flex'; wPanel.style.display='none'; }
//     onSearch(); // apply existing filter
//   }

//   function onSearch(){
//     const qv = (q('#fvSearch').value || '').trim().toLowerCase();
//     const activePanel = q('#tabWritable').classList.contains('active') ? q('#writablePanel') : q('#internalPanel');
//     qa('.fv-card', activePanel).forEach(el => {
//       const name = (el.getAttribute('data-name') || '').toLowerCase();
//       el.style.display = (!qv || name.indexOf(qv) !== -1) ? 'flex' : 'none';
//     });
//   }

//   function refreshSelectedSummary(){
//     // NOTE: as requested, the visible summary area shows the loader + waiting text
//     // We still update the extension-visible selected set when Checkout is clicked.
//     // But showAvailableSlots update is useful to the user
//     const availEl = q('#availableSlots');
//     if (availEl) {
//       const usedBySelection = selected.size;
//       const availNow = Math.max(0, ${availableSlots} - usedBySelection);
//       availEl.textContent = availNow;
//     }
//     // (we intentionally do not change the loader text here)
//   }

//   // Checkout button
//   q('#checkoutBtn').addEventListener('click', () => {
//     const arr = Array.from(selected);
//     // send even if empty, extension handles
//     if (vscode) vscode.postMessage({ type: 'checkout', selected: arr });
//   });

//   // Released versions button: prefer existing global showPopup() if present
//   const relBtn = q('#releasedBtn');
//   if (relBtn) {
//     relBtn.addEventListener('click', () => {
//       const arr = Array.from(selected);
//       // if existing showPopup function exists, call it (preserve old behavior)
//       if (typeof window.showPopup === 'function') {
//         try { window.showPopup(arr); return; } catch(e) { /* fallthrough */ }
//       }
//       // fallback - post message to extension host
//       if (vscode) vscode.postMessage({ type: 'checkoutReleased', selected: arr });
//     });
//   }

//   // init
//   window.addEventListener('load', () => {
//     initClickable();
//     refreshSelectedSummary();
//     // if available slots is 0, visually disable writable items
//     if (isCheckoutAction && ${availableSlots} <= 0) {
//       qa('#writablePanel .fv-card').forEach(c => {
//         c.classList.add('muted');
//         c.setAttribute('aria-disabled','true');
//       });
//     }
//   });

//   // message handler from extension host (if needed)
//   window.addEventListener('message', (ev) => {
//     const msg = ev.data;
//     if (!msg) return;
//     if (msg.type === 'setSelected') {
//       // msg.selected expected to be array
//       selected.clear();
//       (msg.selected || []).forEach(s => selected.add(s));
//       // reflect in UI
//       qa('.fv-card').forEach(el => {
//         const v = el.getAttribute('data-value');
//         if (selected.has(v)) el.classList.add('selected'); else el.classList.remove('selected');
//       });
//       refreshSelectedSummary();
//     }
//   });

// })(); // end IIFE
// </script>
// </body>
// </html>`;

// 	return html;
// }

//#endregion

//#region 2
// function getAppListWebView(appList: string[], action: RepoActions, checkOutFVs?: string[], checkReleasedVersions?: boolean, internalNonEditableFVs?: string[]) {
// 	appList = appList || [];
// 	checkOutFVs = checkOutFVs || [];
// 	internalNonEditableFVs = internalNonEditableFVs || [];

// 	// stable sort
// 	try {
// 		appList = appList.slice().sort();
// 	} catch (e) {}
// 	try {
// 		checkOutFVs = checkOutFVs.slice().sort();
// 	} catch (e) {}
// 	try {
// 		internalNonEditableFVs = internalNonEditableFVs.slice().sort();
// 	} catch (e) {}

// 	const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_\-]/g, "_");

// 	const isCheckoutAction = action === "checkout";

// 	// IMPORTANT CHANGE: preCount now counts ONLY checkOutFVs.length (internalNonEditableFVs are NOT counted).
// 	const iCheckOutFVslength = checkOutFVs.length || 0;
// 	const preCount = isCheckoutAction ? iCheckOutFVslength : 0;

// 	const MAX_TOTAL = typeof maxNumOfFlvToCheckout !== "undefined" ? (maxNumOfFlvToCheckout as any) : 4;
// 	const availableSlots = isCheckoutAction ? Math.max(0, MAX_TOTAL - preCount) : Infinity;

// 	// Build writable list HTML; mark items that are part of checkOutFVs as "disabled-checkout"
// 	const writableHtml = appList
// 		.map((app) => {
// 			const isCheckoutDisabled = checkOutFVs.indexOf(app) !== -1;
// 			const disabledLabel = isCheckoutDisabled ? '<span class="ro-badge"> (checked-out)</span>' : "";
// 			return `
//       <div class="fv-card ${isCheckoutDisabled ? "disabled-checkout" : ""}" data-name="${app.toLowerCase()}" data-value="${app}" id="w_${safeId(app)}">
//         <div class="left-indicator ${isCheckoutDisabled ? "muted" : ""}"></div>
//         <div class="fv-label">${app}${disabledLabel}</div>
//       </div>
//     `;
// 		})
// 		.join("");

// 	// Build internal read-only
// 	const internalHtml = internalNonEditableFVs
// 		.map(
// 			(app) => `
//     <div class="fv-card internal" data-name="${app.toLowerCase()}" data-value="${app}" id="i_${safeId(app)}">
//       <div class="left-indicator muted"></div>
//       <div class="fv-label">${app}<span class="ro-badge"> (readonly)</span></div>
//     </div>
//   `
// 		)
// 		.join("");

// 	const showTabs = isCheckoutAction;
// 	const showReleasedBtn = isCheckoutAction && !!checkReleasedVersions;
// 	const mainBtnDisabledAttr = isCheckoutAction && iCheckOutFVslength >= MAX_TOTAL ? "disabled" : "";
// 	const serializedAppList = JSON.stringify(appList);
// 	const htmlHead = returnHtmlHead ? returnHtmlHead() : `<!doctype html><html><head><meta charset="utf-8"/></head><body>`;
// 	const actionLabel = typeof action === "string" ? action.toUpperCase() : ("" + action).toUpperCase();

// 	const html = `<!doctype html>
//   <html>
//   ${htmlHead}
//   <body id="body_main">
//     <style>
//       :root{
//         --bg:#18191b; --panel:#242526; --card:#2b2c2e; --muted:#9aa0a6; --accent:#1877f2; --accent-2:#2ecc71; --text:#e6e6e6;
//       }
//       html,body{height:100%;margin:0;font-family: "Segoe UI", Roboto, Arial;background:var(--bg);color:var(--text);}
//       .container{display:flex;flex-direction:column;height:100vh;padding:12px;box-sizing:border-box;gap:8px;}
//       header{font-weight:700;font-size:14px;padding:8px 10px;color:var(--text);border-radius:6px;}
//       .searchWrap{display:flex;gap:8px;align-items:center;}
//       #fvSearch{width:100%;padding:10px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.04);background:#151515;color:var(--text);outline:none;}
//       .tabs{display:flex;gap:8px;margin-top:6px;}
//       .tab{padding:10px 14px;border-radius:6px 6px 0 0;background:transparent;color:var(--muted);cursor:pointer;position:relative;}
//       .tab.active{color:var(--text);}
//       .tab.active::after{content:'';position:absolute;left:0;right:0;bottom:-2px;height:3px;background:var(--accent);border-radius:3px 3px 0 0;}
//       .panel{background:var(--panel);border-radius:8px;padding:0;flex:1;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 0 rgba(0,0,0,0.4);}
//       .list{overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px;}
//       .fv-card{background:var(--card);padding:14px 18px;border-radius:8px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:12px;transition:box-shadow .08s, transform .06s;}
//       .fv-card:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,0.6);}
//       .fv-card.selected{box-shadow:0 8px 24px rgba(24,119,242,0.12);border-left:6px solid var(--accent);padding-left:12px;}
//       .left-indicator{width:6px;height:36px;border-radius:4px;background:transparent;flex:0 0 auto;}
//       .left-indicator.muted{background:rgba(255,255,255,0.05);}
//       .fv-card.internal{opacity:0.6;cursor:default;}
//       .fv-card.disabled-checkout{opacity:0.7;cursor:default;}
//       .fv-label{font-size:16px;color:var(--text);}
//       .ro-badge{font-size:12px;color:var(--muted);margin-left:8px;}
//       .footer-fixed{display:flex;flex-direction:column;gap:6px;position:sticky;bottom:0;z-index:5;}
//       .bottomBar{display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;background:#0f1112;}
//       .selectedSummary{flex:1;color:var(--muted);font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;display:flex;align-items:center;gap:8px;}
//       .loader{display:none;width:18px;height:18px;border-radius:50%;border:3px solid rgba(255,255,255,0.08);border-top-color:var(--text);animation:spin 1s linear infinite;}
//       .loader.show{display:inline-block;}
//       @keyframes spin{to{transform:rotate(360deg);}}
//       .actions{display:flex;gap:12px;}
//       .btn{padding:12px 18px;border-radius:6px;border:none;cursor:pointer;font-weight:700;font-size:15px;}
//       .btn.checkout{background:var(--accent);color:#fff;box-shadow:0 6px 0 rgba(24,119,242,0.12);}
//       .btn.released{background:var(--accent-2);color:#fff;box-shadow:0 6px 0 rgba(46,204,113,0.08);}
//       .btn:active{transform:translateY(1px);}
//       .list::-webkit-scrollbar{width:12px;}
//       .list::-webkit-scrollbar-thumb{background:#111;border-radius:6px;border:3px solid rgba(0,0,0,0.0);}
//       .muted{opacity:0.45;}
//       .hint{font-size:12px;color:var(--muted);padding:6px 12px;}
//     </style>

//     <div class="container">
//       <header>ADHINAYAN: ADHINAYAN VIEW</header>

//       <div class="searchWrap">
//         <input id="fvSearch" placeholder="Search..." />
//       </div>

//       ${
// 		showTabs
// 			? `<div class="tabs" role="tablist">
//         <div class="tab active" id="tabWritable">Writable</div>
//         <div class="tab" id="tabInternal">Read-Only</div>
//       </div>`
// 			: ""
//       }

//       <div class="panel">
//         <div id="writablePanel" class="list" aria-hidden="false" style="${showTabs ? "" : "display:flex;"}">
//           ${writableHtml || '<div class="hint">No writable items</div>'}
//         </div>

//         ${
// 		showTabs
// 			? `<div id="internalPanel" class="list" aria-hidden="true" style="display:none">
//           ${internalHtml || '<div class="hint">No read-only items</div>'}
//         </div>`
// 			: ""
// 	}
//       </div>

//       <div class="footer-fixed">
//         <div class="bottomBar">
//           <div class="selectedSummary" id="selectedSummary">Selected: <span id="selList" style="color:var(--text); font-weight:600"></span></div>

//           <div class="actions">
//             <button class="btn checkout" id="mainActionBtn" ${mainBtnDisabledAttr}>${actionLabel}</button>
//             ${showReleasedBtn ? `<button class="btn released" id="releasedBtn">Checkout Released Version</button>` : ""}
//           </div>
//         </div>

//         ${
// 		isCheckoutAction
// 			? `<div style="font-size:12px;color:var(--muted);padding:6px 2px;">
//           <span>Max total (including read-only / checked-out) = <strong>${MAX_TOTAL}</strong>. Pre-occupied: <strong>${iCheckOutFVslength}</strong>. Available slots: <strong id="availableSlots">${isFinite(availableSlots) ? availableSlots : 0}</strong></span>
//         </div>`
// 			: ""
// 	}
//       </div>
//     </div>

//     <!-- popup HTML (same structure as your previous implementation) -->
//     <div id="popup" class="relesed_popup_style" style="display:none;">
//       <h3 style="margin-top:0;color: #00cc9d;">Checkout Released Version</h3>
//       <div style="display:flex; justify-content:space-between; gap:10px;">
//         <select id="AppSelection" class="assigned_app_select"></select>
//         <input type="text" id="versionSelectionInput" class="version_input" placeholder="Version">
//       </div>
//       <div style="margin-top:20px; text-align:right;">
//         <button id="popupCancel" style="background-color: #505152 !important" class='button-8'>Cancel</button>
//         <button id="popupSubmit" class='button-8'>Submit</button>
//       </div>
//     </div>
//     <div id="overlay" class="relesed_popup_style_background" style="display:none;"></div>

//     <div id="loaderWrap" style="display:none; padding: 8px;">
//       <div class="loader" id="globalLoader"></div>
//       <div id="waitText" style="color:var(--muted); margin-left:8px;"></div>
//     </div>

//     <script>
//       const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
//       const APP_LIST_FROM_HOST = ${serializedAppList};
//       const MAX_TOTAL_LOCAL = ${MAX_TOTAL};
//       const preCountLocal = ${preCount};
//       const availableSlotsLocal = ${isFinite(availableSlots) ? availableSlots : 0};
//       const isCheckoutActionLocal = ${isCheckoutAction ? "true" : "false"};

//       // selection management
//       let selected = [];

//       // helpers
//       const q = (s, ctx=document) => ctx.querySelector(s);
//       const qa = (s, ctx=document) => Array.from((ctx||document).querySelectorAll(s));

//       function onlyUnique(value, index, self) { return self.indexOf(value) === index; }

//       // initialize interactive behavior (tabs, search, clicks)
//       function initUI() {
//         const searchEl = q('#fvSearch');
//         if (searchEl) searchEl.addEventListener('input', applyFilter);

//         // tabs only if present
//         const tabW = q('#tabWritable'), tabI = q('#tabInternal');
//         if (tabW && tabI) {
//           tabW.addEventListener('click', () => openTab('writable'));
//           tabI.addEventListener('click', () => openTab('internal'));
//         }

//         // attach card click handlers
//         qa('#writablePanel .fv-card').forEach(card => {
//           const isDisabled = card.classList.contains('disabled-checkout');
//           if (isDisabled) {
//             card.classList.add('muted');
//             // we do not add checked-out to selected; they just occupy slots
//             return;
//           }
//           card.addEventListener('click', () => {
//             const val = card.getAttribute('data-value');
//             if (!val) return;

//             // enforce selection limit for checkout
//             if (isCheckoutActionLocal) {
//               // allowed to select up to availableSlotsLocal - selected.length
//               if (!selected.includes(val) && selected.length >= availableSlotsLocal) {
//                 flash(card);
//                 // show warning to extension host (matching original behavior)
//                 if (vscode) {
//                   vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: 'You can only select up to ' + MAX_TOTAL_LOCAL + ' apps, including those already checked out.' }});
//                 }
//                 return;
//               }
//             }
//             // toggle selection
//             if (selected.includes(val)) {
//               selected = selected.filter(s => s !== val);
//               card.classList.remove('selected');
//             } else {
//               selected.push(val);
//               card.classList.add('selected');
//             }
//             selected = selected.filter(onlyUnique);
//             refreshSelectedSummary();
//           });

//           card.setAttribute('tabindex', '0');
//           card.addEventListener('keydown', (ev) => {
//             if (ev.key === ' ' || ev.key === 'Enter') { card.click(); ev.preventDefault(); }
//           });
//         });

//         // internal list visual mute
//         qa('#internalPanel .fv-card').forEach(c => c.classList.add('muted'));

//         // hook up footer buttons
//         const mainBtn = q('#mainActionBtn');
//         if (mainBtn) mainBtn.addEventListener('click', mainActionClicked);
//         const relBtn = q('#releasedBtn');
//         if (relBtn) relBtn.addEventListener('click', () => { showPopup(); });

//         // popup buttons
//         const popupCancelBtn = q('#popupCancel');
//         if (popupCancelBtn) popupCancelBtn.addEventListener('click', popupCancel);
//         const popupSubmitBtn = q('#popupSubmit');
//         if (popupSubmitBtn) popupSubmitBtn.addEventListener('click', popupSubmit);

//         // if availableSlotsLocal == 0 disable new selection
//         if (isCheckoutActionLocal && availableSlotsLocal <= 0) {
//           qa('#writablePanel .fv-card').forEach(c => {
//             if (!c.classList.contains('disabled-checkout')) c.classList.add('muted');
//           });
//         }

//         refreshSelectedSummary();
//       }

//       function flash(el) {
//         const prev = el.style.boxShadow;
//         el.style.boxShadow = '0 0 0 3px rgba(200,50,50,0.14)';
//         setTimeout(() => el.style.boxShadow = prev, 350);
//       }

//       function openTab(name) {
//         const wTab = q('#tabWritable'), iTab = q('#tabInternal');
//         const wPanel = q('#writablePanel'), iPanel = q('#internalPanel');
//         if (!wTab || !iTab || !wPanel || !iPanel) return;
//         if (name === 'writable') {
//           wTab.classList.add('active'); iTab.classList.remove('active');
//           wPanel.style.display='flex'; iPanel.style.display='none';
//         } else {
//           iTab.classList.add('active'); wTab.classList.remove('active');
//           iPanel.style.display='flex'; wPanel.style.display='none';
//         }
//         applyFilter();
//       }

//       function applyFilter() {
//         const qv = (q('#fvSearch') && q('#fvSearch').value || '').trim().toLowerCase();
//         const activePanel = (q('#tabWritable') && q('#tabWritable').classList.contains('active')) ? q('#writablePanel') : (q('#internalPanel') || q('#writablePanel'));
//         if (!activePanel) return;
//         qa('.fv-card', activePanel).forEach(el => {
//           const name = (el.getAttribute('data-name') || '').toLowerCase();
//           el.style.display = (!qv || name.indexOf(qv) !== -1) ? 'flex' : 'none';
//         });
//       }

//       function refreshSelectedSummary() {
//         const selList = q('#selList');
//         if (selList) selList.textContent = selected.join(', ');
//         // update available slots display if present
//         const availEl = q('#availableSlots');
//         if (availEl && isCheckoutActionLocal) {
//           const availNow = Math.max(0, availableSlotsLocal - selected.length);
//           availEl.textContent = availNow;
//         }
//       }

//       // main action clicked (checkout/update/revert/repair)
//       function mainActionClicked() {
//         // build selectedApps from selected[] (new selection)
//         const selectedApps = selected.slice(); // copy
//         // if checkout, respect existing checked-out items (original code sliced if over limit)
//         if (isCheckoutActionLocal) {
//           const allowedSelections = Math.max(MAX_TOTAL_LOCAL - iCheckOutFVslength, 0);
//           if (selectedApps.length > allowedSelections) {
//             selectedApps.splice(allowedSelections);
//           }
//         }
//         showWaitingText(selectedApps);
//         if (vscode) {
//           vscode.postMessage({
//             command: 'operationOnSelectedApps',
//             data: {
//               selectedApps: selectedApps
//             }
//           });
//         }
//       }

//       // show waiting (loader + text) - matches original messages
//       function showWaitingText(selectedApps) {
//         const loader = q('#globalLoader');
//         const waitWrap = q('#loaderWrap');
//         const waitText = q('#waitText');
//         const mainBtn = q('#mainActionBtn');
//         const otherBtns = qa('.button-8, #releasedBtn');

//         if (waitWrap) waitWrap.style.display = 'flex';
//         if (loader) loader.classList.add('show');

//         if (mainBtn) mainBtn.disabled = true;
//         otherBtns.forEach(b => { try{ b.disabled = true; } catch(e){} });

//         const btnText = mainBtn ? (mainBtn.innerText || '') : actionLabel;
//         let message = '';
//         if (btnText === "CHECKOUT") {
//           message = 'Workspace checkout of '+ (selectedApps.join(" , ") || '') +' started. Relax we are working for you. Please wait for some time';
//         } else if (btnText === "REVERT") {
//           message = 'Revert of '+ (selectedApps.join(" , ") || '') +' started. Relax we are working for you. Please wait for some time';
//         } else if (btnText === "UPDATE") {
//           message = 'Update of '+ (selectedApps.join(" , ") || '') +' started. Relax we are working for you. Please wait for some time';
//         } else if (btnText === "REPAIR") {
//           message = 'Repair of '+ (selectedApps.join(" , ") || '') +' started. Relax we are working for you. Please wait for some time';
//         } else {
//           message = 'Operation started for ' + (selectedApps.join(" , ") || '') + '. Please wait...';
//         }
//         if (waitText) waitText.innerText = message;
//       }

//       function getFlavorVersionFromFv(fvid) {
//         if (!fvid?.length) return null;
//         let lst = fvid.lastIndexOf("_");
//         let flavor = fvid.slice(0, lst);
//         return flavor;
//       }

//       window.showPopup = function showPopup() {
//         q('#popup').style.display = 'block';
//         q('#overlay').style.display = 'block';
//         const AppSelectionDropdown = q('#AppSelection');
//         if (!AppSelectionDropdown) return;
//         AppSelectionDropdown.innerHTML = '';
//         (APP_LIST_FROM_HOST || []).forEach(app => {
//           const option = document.createElement("option");
//           option.value = getFlavorVersionFromFv(app) || app;
//           option.textContent = getFlavorVersionFromFv(app) || app;
//           AppSelectionDropdown.appendChild(option);
//         });
//       };

//       window.popupCancel = function popupCancel() {
//         q('#popup').style.display = 'none';
//         q('#overlay').style.display = 'none';
//       };

//       window.popupSubmit = function popupSubmit() {
//         const selectedApp = q('#AppSelection') && q('#AppSelection').value;
//         const version = q('#versionSelectionInput') && q('#versionSelectionInput').value;
//         if (!selectedApp || selectedApp == "" || !version || version == "") {
//           if (vscode) {
//             vscode.postMessage({
//               command: 'showWarningMessage',
//               data: { warningMessage: "Please fill in both the application and version fields." }
//             });
//           }
//           return;
//         }
//         q('#popup').style.display = 'none';
//         q('#overlay').style.display = 'none';
//         const selectedApps = [];
//         selectedApps.push(selectedApp + "_" + version);
//         showWaitingText(selectedApps);
//         if (vscode) {
//           vscode.postMessage({
//             command: 'operationOnSelectedApps',
//             data: {
//               selectedApps: selectedApps,
//               actionType: "releasedVersionsCheckout"
//             }
//           });
//         }
//       };

//       window.addEventListener('load', () => {
//         initUI();
//       });

//       window.addEventListener('message', (ev) => {
//         const msg = ev.data;
//         if (!msg) return;
//         if (msg.type === 'setSelected') {
//           selected = msg.selected || [];
//           qa('.fv-card').forEach(el => {
//             const v = el.getAttribute('data-value');
//             if (selected.includes(v)) el.classList.add('selected'); else el.classList.remove('selected');
//           });
//           refreshSelectedSummary();
//         }
//       });
//     </script>
//   </body>
//   </html>`;

// 	return html;
// }
//#endregion 2

//#region 3
// function getAppListWebView(appList: string[], action: RepoActions, checkOutFVs?: string[], checkReleasedVersions?: boolean, internalNonEditableFVs?: string[]) {
// 	// compatibility: optional arrays
// 	appList = appList || [];
// 	checkOutFVs = checkOutFVs || [];
// 	internalNonEditableFVs = internalNonEditableFVs || [];

// 	// stable sort
// 	try {
// 		appList.sort();
// 		internalNonEditableFVs.sort();
// 		checkOutFVs.sort();
// 	} catch (e) {}

// 	// Pre-count uses only checkOutFVs.length
// 	const iCheckOutFVslength = checkOutFVs.length || 0;
// 	const MAX_TOTAL = typeof maxNumOfFlvToCheckout !== "undefined" ? (maxNumOfFlvToCheckout as any) : 4;
// 	const isCheckoutAction = action === "checkout";
// 	const showReleasedBtn = isCheckoutAction && !!checkReleasedVersions;

// 	// helper to sanitize id
// 	const safeId = (s: string) => (s || "").replace(/[^a-zA-Z0-9_\-]/g, "_");

// 	// card HTML builder
// 	const cardHtml = (app: string, from: "writable" | "internal", checkedOut: boolean) => {
// 		const id = from === "internal" ? `int-${app}` : app;
// 		const safe = safeId(id);
// 		const checkedClass = checkedOut ? "checked-out" : "";
// 		const selectableClass = checkedOut ? "not-selectable" : "selectable";
// 		const badge = checkedOut ? '<span class="ro-badge"> (checked-out)</span>' : "";
// 		return `<div class="fv-card ${checkedClass} ${selectableClass}" id="${safe}" data-value="${app}" data-name="${app.toLowerCase()}" tabindex="${checkedOut ? -1 : 0}">
//       <div class="fv-label">${app}${badge}</div>
//     </div>`;
// 	};

// 	// build lists
// 	const writableHtml = appList.map((a) => cardHtml(a, "writable", checkOutFVs.includes(a))).join("");
// 	const internalHtml = internalNonEditableFVs.map((a) => cardHtml(a, "internal", checkOutFVs.includes(a))).join("");

// 	// headings / texts
// 	let heading = "";
// 	let comment = "";
// 	let warning = "";
// 	let warnDisplay = "none";
// 	if (action == "checkout") {
// 		heading = " Checkout Apps";
// 		comment = "Choose the Apps which you want to Check out from the Repository.";
// 		warning = `Note: You can have a maximum of ${MAX_TOTAL} active Apps checked out at any point of time.\n\tServer restart will be done after Checkout`;
// 		warnDisplay = "block";
// 	} else if (action == "update") {
// 		heading = " Update Apps";
// 		comment = "Select the apps to take update from Repository";
// 	} else if (action == "revert") {
// 		heading = " Revert Apps";
// 		comment = "Select the apps to revert it back. Note : Local Deleted , Local Modified and Conflict files will be reverted back";
// 		warning = "Warning: All the changes which are not committed or saved will be lost and App will be restored to latest version from the Repository.";
// 		warnDisplay = "block";
// 	} else if (action == "repair") {
// 		heading = " Repair Apps";
// 		comment = "Select the apps to repair. It will update external apps";
// 		warning = `Note: Server restart will be done after repair`;
// 		warnDisplay = "block";
// 	}

// 	const headSection = typeof returnHtmlHead === "function" ? returnHtmlHead() : `<!doctype html><head></head>`;

// 	// serialize arrays for JS usage
// 	const serializedAppList = JSON.stringify(appList);
// 	const serializedInternal = JSON.stringify(internalNonEditableFVs);
// 	const serializedCheckouts = JSON.stringify(checkOutFVs);

// 	return `<!DOCTYPE html>
//   ${headSection}
//   <body id="body_main" style="background:#0b0c0d;color:#e6e6e6;font-family:Segoe UI, Roboto, Arial;margin:0;">
//     <style>
//       .container { padding:16px; display:flex; flex-direction:column; gap:10px; height:100vh; box-sizing:border-box; }
//       h2 { margin:0; font-size:14px; color:#fff; }
//       .muted { color:#9aa0a6; }
//       .warning_message_color { color:#f0a95b; white-space:pre-line; }
//       #fvSearch { width:100%; padding:10px; border-radius:6px; border:1px solid #222; background:#0f1112; color:#e6e6e6; }
//       .tabs { display:flex; gap:8px; margin-top:8px; }
//       .tab { padding:8px 12px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.06); color:#cfd6da; cursor:pointer; }
//       .tab.active { background:#1f2933; color:#fff; box-shadow: inset 0 -3px 0 #1877f2; }
//       .panel { background:#0f1112; border-radius:8px; padding:12px; flex:1; display:flex; flex-direction:column; overflow:hidden; }
//       .listWrap { overflow:auto; padding:8px 4px; display:flex; flex-direction:column; gap:12px; }
//       .fv-card { background:#2a2b2d; padding:18px; border-radius:8px; display:flex; align-items:center; cursor:pointer; transition: transform .08s, box-shadow .08s; outline:none; }
//       .fv-card:hover { transform: translateY(-2px); box-shadow:0 10px 20px rgba(0,0,0,0.5); }
//       .fv-card.selected { border-left:6px solid #1877f2; padding-left:14px; box-shadow:0 12px 28px rgba(24,119,242,0.06); }
//       .fv-card.not-selectable { opacity:0.6; cursor:default; }
//       .fv-label { font-size:16px; color:#e6e6e6; }
//       .ro-badge { font-size:12px; color:#9aa0a6; margin-left:8px; }
//       .footer { background:#070808; padding:12px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; bottom:12px; }
//       .btn { padding:10px 18px; border-radius:8px; border:none; cursor:pointer; font-weight:700; }
//       .btn.primary { background:#1877f2; color:#fff; box-shadow: 0 6px 0 rgba(24,119,242,0.12); }
//       .btn.secondary { background:#2ecc71; color:#fff; }
//       /* New loader styles */
//       .waiting-area { display:none; align-items:center; gap:12px; padding:8px 12px; border-radius:8px; background: rgba(0,0,0,0.25); }
//       .spinner { width:18px; height:18px; border-radius:50%; border:3px solid rgba(0,0,0,0); border-top-color: #00cc9d; border-right-color: rgba(0,0,0,0); border-bottom-color: rgba(0,0,0,0); border-left-color: rgba(0,0,0,0); animation: spin 1s linear infinite; flex:0 0 18px; }
//       .wait-message { color:#00cc9d; font-size:13px; line-height:1.3; max-width:780px; word-break:break-word; }
//       @keyframes spin { to { transform: rotate(360deg); } }
//       .meta { color:#9aa0a6; font-size:13px; }
//       .listWrap::-webkit-scrollbar { width:12px; }
//       .listWrap::-webkit-scrollbar-thumb { background:#161616; border-radius:8px; }
//       @media (max-width:640px) {
//         .wait-message { font-size:12px; max-width:240px; }
//       }
//     </style>

//     <div class="container">
//       <div style="display:flex; flex-direction:column; gap:6px;">
//         <h2>App Action</h2>
//         <div class="muted">${comment}</div>
//         <p class="warning_message_color" style="display:${warnDisplay}; margin:6px 0;">${warning}</p>
//       </div>

//       <div style="display:flex; gap:12px; align-items:center;">
//         <input id="fvSearch" placeholder="Search..." />
//       </div>

//       ${isCheckoutAction ? `<div class="tabs"><div id="tabWritable" class="tab active">Writable</div><div id="tabInternal" class="tab">Read-Only</div></div>` : ""}

//       <div class="panel">
//         <div id="writablePanel" class="listWrap" style="${isCheckoutAction ? "" : "display:flex;"}">
//           ${writableHtml || '<div class="meta">No writable items</div>'}
//         </div>

//         ${
// 		isCheckoutAction
// 			? `<div id="internalPanel" class="listWrap" style="display:none;">
//           ${internalHtml || '<div class="meta">No read-only items</div>'}
//         </div>`
// 			: ""
// 	}
//       </div>

//       <div class="footer" id="footerBar">
//         <div style="display:flex; align-items:center; gap:12px;">
//           <!-- waiting area (hidden by default). single spinner + wrapped message in green -->
//           <div id="waitingArea" class="waiting-area" role="status" aria-live="polite">
//             <div class="spinner" id="spinnerEl" aria-hidden="true"></div>
//             <div id="waitText" class="wait-message"></div>
//           </div>
//         </div>

//         <div style="display:flex; gap:10px; align-items:center;">
//           <button id="mainActionBtn" class="btn primary" ${iCheckOutFVslength >= MAX_TOTAL ? "disabled" : ""}>${String(action).toUpperCase()}</button>
//           ${showReleasedBtn ? `<button id="releasedBtn" class="btn secondary">Checkout Released Version</button>` : ""}
//         </div>
//       </div>
//     </div>

//     <!-- popup markup -->
//     <div id="popup" class="relesed_popup_style" style="display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:#0f1112; padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.04);">
//       <h3 style="margin-top:0;color: #00cc9d;">Checkout Released Version</h3>
//       <div style="display:flex; gap:10px; margin-top:8px;">
//         <select id="AppSelection" class="assigned_app_select"></select>
//         <input type="text" id="versionSelectionInput" class="version_input" placeholder="Version" style="padding:8px; border-radius:6px; background:#111; color:#e6e6e6; border:1px solid #222;" />
//       </div>
//       <div style="margin-top:16px; text-align:right;">
//         <button id="popupCancel" class="button-8" onClick=popupCancel() style="margin-right:8px; padding:8px 12px; border-radius:6px; background:#505152; color:#fff;">Cancel</button>
//         <button id="popupSubmit" class="button-8" onClick=popupSubmit() style="padding:8px 12px; border-radius:6px; background:#1877f2; color:#fff;">Submit</button>
//       </div>
//     </div>
//     <div id="overlay" class="relesed_popup_style_background" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9998;"></div>

//     <script>
//       const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;

//       const APP_LIST = ${serializedAppList};
//       const INTERNAL_LIST = ${serializedInternal};
//       const CHECKOUTS = ${serializedCheckouts};
//       const MAX_TOTAL_JS = ${MAX_TOTAL};
//       const PRE_COUNT = ${iCheckOutFVslength};
//       const IS_CHECKOUT = ${isCheckoutAction ? "true" : "false"};

//       const selectedSet = new Set();

//       function q(sel, ctx=document) { return ctx.querySelector(sel); }
//       function qa(sel, ctx=document) { return Array.from((ctx||document).querySelectorAll(sel)); }

//       // toggles selection (card-style). Selection limit enforced only for checkout action
//       function toggleCardSelection(cardEl) {
//         if (!cardEl) return;
//         if (cardEl.classList.contains('checked-out')) {
//           flash(cardEl);
//           return;
//         }
//         const val = cardEl.getAttribute('data-value');
//         if (!val) return;
//         const willSelect = !cardEl.classList.contains('selected');

//         if (willSelect && IS_CHECKOUT) {
//           // when checkout, ensure selectedSet.size + PRE_COUNT + 1 <= MAX_TOTAL_JS
//           if ((selectedSet.size + PRE_COUNT + 1) > MAX_TOTAL_JS) {
//             // deny
//             if (vscode) {
//               vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: 'You can only select up to ' + MAX_TOTAL_JS + ' apps, including those already checked out.' }});
//             } else {
//               alert('You can only select up to ' + MAX_TOTAL_JS + ' apps, including those already checked out.');
//             }
//             flash(cardEl);
//             return;
//           }
//         }

//         if (willSelect) {
//           selectedSet.add(val);
//           cardEl.classList.add('selected');
//         } else {
//           selectedSet.delete(val);
//           cardEl.classList.remove('selected');
//         }
//       }

//       function flash(el) {
//         const prev = el.style.boxShadow;
//         el.style.boxShadow = '0 0 0 4px rgba(255,80,80,0.12)';
//         setTimeout(() => el.style.boxShadow = prev, 300);
//       }

//       function attachCardHandlers() {
//         qa('.fv-card').forEach(card => {
//           if (!card.classList.contains('not-selectable')) {
//             card.addEventListener('click', () => toggleCardSelection(card));
//             card.addEventListener('keydown', (ev) => {
//               if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); toggleCardSelection(card); }
//             });
//           }
//         });
//       }

//       // search
//       function applySearchFilter() {
//         const qv = (q('#fvSearch').value || '').toLowerCase().trim();
//         const activePanel = IS_CHECKOUT && q('#tabInternal') && q('#tabInternal').classList.contains('active') ? q('#internalPanel') : q('#writablePanel');
//         if (!activePanel) return;
//         qa('.fv-card', activePanel).forEach(card => {
//           const nm = (card.getAttribute('data-name') || '').toLowerCase();
//           card.style.display = (!qv || nm.indexOf(qv) !== -1) ? 'flex' : 'none';
//         });
//       }

//       // tabs (only for checkout)
//       function initTabs() {
//         if (!IS_CHECKOUT) return;
//         q('#tabWritable').addEventListener('click', () => {
//           q('#tabWritable').classList.add('active'); q('#tabInternal').classList.remove('active');
//           q('#writablePanel').style.display = ''; q('#internalPanel').style.display = 'none';
//           applySearchFilter();
//         });
//         q('#tabInternal').addEventListener('click', () => {
//           q('#tabInternal').classList.add('active'); q('#tabWritable').classList.remove('active');
//           q('#internalPanel').style.display = ''; q('#writablePanel').style.display = 'none';
//           applySearchFilter();
//         });
//       }

//       // waiting UI: show/hide
//       function showWaitingText(selectedApps) {
//         const waitingArea = q('#waitingArea');
//         const waitText = q('#waitText');
//         const mainBtn = q('#mainActionBtn');
//         const relBtn = q('#releasedBtn');

//         if (waitingArea) waitingArea.style.display = 'flex';

//         if (waitText) {
//           const btnText = mainBtn ? (mainBtn.innerText || '').toUpperCase() : '${String(action).toUpperCase()}';
//           let message = '';
//           if (btnText === 'CHECKOUT') {
//             message = 'Workspace checkout of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
//           } else if (btnText === 'REVERT') {
//             message = 'Revert of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
//           } else if (btnText === 'UPDATE') {
//             message = 'Update of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
//           } else if (btnText === 'REPAIR') {
//             message = 'Repair of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
//           } else {
//             message = (selectedApps.join(' , ') || '') + ' started.\\nPlease wait...';
//           }
//           // use line breaks
//           waitText.innerText = message;
//         }

//         if (mainBtn) mainBtn.disabled = true;
//         if (relBtn) relBtn.disabled = true;
//       }

//       function hideWaitingText() {
//         const waitingArea = q('#waitingArea');
//         const waitText = q('#waitText');
//         const mainBtn = q('#mainActionBtn');
//         const relBtn = q('#releasedBtn');
//         if (waitingArea) waitingArea.style.display = 'none';
//         if (waitText) waitText.textContent = '';
//         if (mainBtn) mainBtn.disabled = false;
//         if (relBtn) relBtn.disabled = false;
//       }

//       // main action handler
//       function mainActionHandler() {
//         const selectedApps = Array.from(selectedSet);
//         if (IS_CHECKOUT) {
//           const allowedSelections = Math.max(MAX_TOTAL_JS - PRE_COUNT, 0);
//           if (selectedApps.length > allowedSelections) {
//             selectedApps.splice(allowedSelections);
//           }
//         }
//         showWaitingText(selectedApps);
//         if (vscode) {
//           vscode.postMessage({ command: 'operationOnSelectedApps', data: { selectedApps: selectedApps }});
//         }
//       }

//       // popup helpers
//       function getFlavorVersionFromFv(fvid) {
//         if (!fvid?.length) return null;
//         let lst = fvid.lastIndexOf("_");
//         let flavor = fvid.slice(0, lst);
//         return flavor;
//       }

//       window.showPopup = function() {
//         q('#popup').style.display = 'block';
//         q('#overlay').style.display = 'block';
//         const AppSelectionDropdown = q('#AppSelection');
//         AppSelectionDropdown.innerHTML = '';
//         (APP_LIST || []).forEach(app => {
//           const opt = document.createElement('option');
//           opt.value = getFlavorVersionFromFv(app) || app;
//           opt.textContent = getFlavorVersionFromFv(app) || app;
//           AppSelectionDropdown.appendChild(opt);
//         });
//       };

//       window.popupCancel = function() {
//         q('#popup').style.display = 'none';
//         q('#overlay').style.display = 'none';
//       };

//       window.popupSubmit = function() {
//         const selectedApp = q('#AppSelection') && q('#AppSelection').value;
//         const version = q('#versionSelectionInput') && q('#versionSelectionInput').value;
//         if (!selectedApp || selectedApp === "" || !version || version === "") {
//           if (vscode) vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: "Please fill in both the application and version fields." }});
//           return;
//         }
//         q('#popup').style.display = 'none';
//         q('#overlay').style.display = 'none';
//         const selectedApps = [ selectedApp + '_' + version ];
//         showWaitingText(selectedApps);
//         if (vscode) vscode.postMessage({ command: 'operationOnSelectedApps', data: { selectedApps: selectedApps, actionType: "releasedVersionsCheckout" }});
//       };

//       // released button hookup
//       if (q('#releasedBtn')) {
//         q('#releasedBtn').addEventListener('click', () => {
//           if (typeof window.showPopup === 'function') {
//             try { window.showPopup(); return; } catch(e) {}
//           }
//           if (vscode) vscode.postMessage({ command: 'checkoutReleased', data: {} });
//         });
//       }

//       // main button hookup
//       q('#mainActionBtn').addEventListener('click', mainActionHandler);

//       // init on load
//       window.addEventListener('load', () => {
//         attachCardHandlers();
//         initTabs();
//         q('#fvSearch').addEventListener('input', applySearchFilter);

//         // apply check-out visual marks (non-selectable)
//         (CHECKOUTS || []).forEach(app => {
//           const id1 = safeId(app);
//           const id2 = safeId('int-' + app);
//           const e1 = document.getElementById(id1);
//           const e2 = document.getElementById(id2);
//           if (e1) { e1.classList.add('checked-out'); e1.classList.add('not-selectable'); e1.setAttribute('aria-disabled','true'); }
//           if (e2) { e2.classList.add('checked-out'); e2.classList.add('not-selectable'); e2.setAttribute('aria-disabled','true'); }
//         });
//       });

//       // allow host to hide loader after operation
//       window.hideWaitingText = hideWaitingText;

//       // helper to create safeId on client side (same as above)
//       function safeId(s) { return (s || '').replace(/[^a-zA-Z0-9_\\-]/g, '_'); }

//     </script>
//   </body>
//   </html>`;
// }
//#endregion 3

//#region 4
// function getAppListWebView(appList: string[], action: RepoActions, checkOutFVs?: string[], checkReleasedVersions?: boolean, internalNonEditableFVs?: string[]) {
// 	// ensure arrays exist
// 	appList = appList || [];
// 	checkOutFVs = checkOutFVs || [];
// 	internalNonEditableFVs = internalNonEditableFVs || [];

// 	try {
// 		appList.sort();
// 		internalNonEditableFVs.sort();
// 		checkOutFVs.sort();
// 	} catch (e) {
// 		/* ignore */
// 	}

// 	const iCheckOutFVslength = checkOutFVs.length || 0; // preCount: only checkOutFVs
// 	const MAX_TOTAL = typeof maxNumOfFlvToCheckout !== "undefined" ? (maxNumOfFlvToCheckout as any) : 4;
// 	const isCheckoutAction = action === "checkout";
// 	const showReleasedBtn = isCheckoutAction && !!checkReleasedVersions;

// 	const safeId = (s: string) => (s || "").replace(/[^a-zA-Z0-9_\-]/g, "_");

// 	const cardHtml = (app: string, from: "writable" | "internal", checkedOut: boolean) => {
// 		const id = from === "internal" ? `int-${app}` : app;
// 		const safe = safeId(id);
// 		const checkedClass = checkedOut ? "checked-out" : "";
// 		const selectableClass = checkedOut ? "not-selectable" : "selectable";
// 		const badge = checkedOut ? '<span class="ro-badge"> (checked-out)</span>' : "";
// 		return `<div class="fv-card ${checkedClass} ${selectableClass}" id="${safe}" data-value="${app}" data-name="${app.toLowerCase()}" tabindex="${checkedOut && isCheckoutAction ? -1 : 0}">
//       <div class="fv-label">${app}${badge}</div>
//     </div>`;
// 	};

// 	const writableHtml = appList.map((a) => cardHtml(a, "writable", checkOutFVs.includes(a))).join("");
// 	const internalHtml = internalNonEditableFVs.map((a) => cardHtml(a, "internal", checkOutFVs.includes(a))).join("");

// 	// texts
// 	let heading = "";
// 	let comment = "";
// 	let warning = "";
// 	let warnDisplay = "none";
// 	if (action == "checkout") {
// 		heading = " Checkout Apps";
// 		comment = "Choose the Apps which you want to Check out from the Repository.";
// 		warning = `Note: You can have a maximum of ${MAX_TOTAL} active Apps checked out at any point of time.\n\tServer restart will be done after Checkout`;
// 		warnDisplay = "block";
// 	} else if (action == "update") {
// 		heading = " Update Apps";
// 		comment = "Select the apps to take update from Repository";
// 	} else if (action == "revert") {
// 		heading = " Revert Apps";
// 		comment = "Select the apps to revert it back. Note : Local Deleted , Local Modified and Conflict files will be reverted back";
// 		warning = "Warning: All the changes which are not committed or saved will be lost and App will be restored to latest version from the Repository.";
// 		warnDisplay = "block";
// 	} else if (action == "repair") {
// 		heading = " Repair Apps";
// 		comment = "Select the apps to repair. It will update external apps";
// 		warning = `Note: Server restart will be done after repair`;
// 		warnDisplay = "block";
// 	}

// 	const headSection = typeof returnHtmlHead === "function" ? returnHtmlHead() : `<!doctype html><head></head>`;

// 	const serializedAppList = JSON.stringify(appList);
// 	const serializedInternal = JSON.stringify(internalNonEditableFVs);
// 	const serializedCheckouts = JSON.stringify(checkOutFVs);

// 	return `<!DOCTYPE html>
//   ${headSection}
//   <body id="body_main" style="background:#0b0c0d;color:#e6e6e6;font-family:Segoe UI, Roboto, Arial;margin:0;">
//     <style>
//       /* layout & style (keeps previous look) */
//       .container { padding:16px; display:flex; flex-direction:column; gap:10px; height:100vh; box-sizing:border-box; }
//       h2 { margin:0; font-size:14px; color:#fff; }
//       .muted { color:#9aa0a6; }
//       .warning_message_color { color:#f0a95b; white-space:pre-line; }
//       #fvSearch { width:100%; padding:10px; border-radius:6px; border:1px solid #222; background:#0f1112; color:#e6e6e6; }
//       .controls { display:flex; gap:12px; align-items:center; }
//       .tabs { display:flex; gap:8px; margin-top:8px; }
//       .tab { padding:8px 12px; border-radius:6px; background:transparent; border:1px solid rgba(255,255,255,0.06); color:#cfd6da; cursor:pointer; }
//       .tab.active { background:#1f2933; color:#fff; box-shadow: inset 0 -3px 0 #1877f2; }
//       .panel { background:#0f1112; border-radius:8px; padding:12px; flex:1; display:flex; flex-direction:column; overflow:hidden; }
//       .listWrap { overflow:auto; padding:8px 4px; display:flex; flex-direction:column; gap:12px; }
//       .fv-card { background:#2a2b2d; padding:18px; border-radius:8px; display:flex; align-items:center; cursor:pointer; transition: transform .08s, box-shadow .08s; outline:none; }
//       .fv-card:hover { transform: translateY(-2px); box-shadow:0 10px 20px rgba(0,0,0,0.5); }
//       .fv-card.selected { border-left:6px solid #1877f2; padding-left:14px; box-shadow:0 12px 28px rgba(24,119,242,0.06); }
//       .fv-card.not-selectable { opacity:0.6; cursor:default; }
//       .fv-label { font-size:16px; color:#e6e6e6; }
//       .ro-badge { font-size:12px; color:#9aa0a6; margin-left:8px; }
//       .footer { background:#070808; padding:12px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; bottom:12px; }
//       .btn { padding:10px 18px; border-radius:8px; border:none; cursor:pointer; font-weight:700; }
//       .btn.primary { background:#1877f2; color:#fff; box-shadow: 0 6px 0 rgba(24,119,242,0.12); }
//       .btn.secondary { background:#2ecc71; color:#fff; }

//       /* waiting area */
//       .waiting-area { display:none; align-items:center; gap:12px; padding:8px 12px; border-radius:8px; background: rgba(0,0,0,0.25); }
//       .spinner { width:18px; height:18px; border-radius:50%; border:3px solid rgba(0,0,0,0); border-top-color: #00cc9d; animation: spin 1s linear infinite; }
//       .wait-message { color:#00cc9d; font-size:13px; line-height:1.3; max-width:780px; word-break:break-word; }
//       @keyframes spin { to { transform: rotate(360deg); } }

//       /* global waiting mode class - disables interactions visually and functionally */
//       .waiting-mode .fv-card { pointer-events:none; opacity:0.6; }
//       .waiting-mode .tab, .waiting-mode button, .waiting-mode #fvSearch, .waiting-mode .assigned_app_select, .waiting-mode .version_input { pointer-events:none; opacity:0.6; }
//       .waiting-mode .tab.active { opacity:0.6; }
//       .waiting-mode #popup, .waiting-mode #overlay { pointer-events:none; } /* popup still can be shown via code, but user cannot interact while waiting */

//       .meta { color:#9aa0a6; font-size:13px; }
//       .listWrap::-webkit-scrollbar { width:12px; }
//       .listWrap::-webkit-scrollbar-thumb { background:#161616; border-radius:8px; }
//       .selectAllWrap { display:flex; align-items:center; gap:8px; }
//     </style>

//     <div class="container">
//       <div style="display:flex; flex-direction:column; gap:6px;">
//         <h2>ADHINAYAN: ADHINAYAN VIEW</h2>
//         <div class="muted">${comment}</div>
//         <p class="warning_message_color" style="display:${warnDisplay}; margin:6px 0;">${warning}</p>
//       </div>

//       <div class="controls">
//         <input id="fvSearch" placeholder="Search..." />
//         <!-- Select All only when NOT checkout -->
//         ${!isCheckoutAction ? `<div class="selectAllWrap"><input id="SelectAll12" type="checkbox" /><label for="SelectAll12" style="cursor:pointer;">Select All</label></div>` : ""}
//       </div>

//       ${isCheckoutAction ? `<div class="tabs"><div id="tabWritable" class="tab active">Writable</div><div id="tabInternal" class="tab">Read-Only</div></div>` : ""}

//       <div class="panel">
//         <div id="writablePanel" class="listWrap" style="${isCheckoutAction ? "" : "display:flex;"}">
//           ${writableHtml || '<div class="meta">No writable items</div>'}
//         </div>

//         ${isCheckoutAction ? `<div id="internalPanel" class="listWrap" style="display:none;">${internalHtml || '<div class="meta">No read-only items</div>'}</div>` : ""}
//       </div>

//       <div class="footer" id="footerBar">
//         <div style="display:flex; align-items:center; gap:12px;">
//           <div id="waitingArea" class="waiting-area" role="status" aria-live="polite">
//             <div class="spinner" id="spinnerEl" aria-hidden="true"></div>
//             <div id="waitText" class="wait-message"></div>
//           </div>
//         </div>

//         <div style="display:flex; gap:10px; align-items:center;">
//           <button id="mainActionBtn" class="btn primary" ${iCheckOutFVslength >= MAX_TOTAL ? "disabled" : ""}>${String(action).toUpperCase()}</button>
//           ${showReleasedBtn ? `<button id="releasedBtn" class="btn secondary">Checkout Released Version</button>` : ""}
//         </div>
//       </div>
//     </div>

//     <!-- popup markup (preserved) -->
//     <div id="popup" class="relesed_popup_style" style="display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:#0f1112; padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.04);">
//       <h3 style="margin-top:0;color: #00cc9d;">Checkout Released Version</h3>
//       <div style="display:flex; gap:10px; margin-top:8px;">
//         <select id="AppSelection" class="assigned_app_select"></select>
//         <input type="text" id="versionSelectionInput" class="version_input" placeholder="Version" style="padding:8px; border-radius:6px; background:#111; color:#e6e6e6; border:1px solid #222;" />
//       </div>
//       <div style="margin-top:16px; text-align:right;">
//         <button id="popupCancel" class="button-8" onClick=popupCancel() style="margin-right:8px; padding:8px 12px; border-radius:6px; background:#505152; color:#fff;">Cancel</button>
//         <button id="popupSubmit" class="button-8" onClick=popupSubmit() style="padding:8px 12px; border-radius:6px; background:#1877f2; color:#fff;">Submit</button>
//       </div>
//     </div>
//     <div id="overlay" class="relesed_popup_style_background" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9998;"></div>

//     <script>
//       const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;

//       const APP_LIST = ${serializedAppList};
//       const INTERNAL_LIST = ${serializedInternal};
//       const CHECKOUTS = ${serializedCheckouts};
//       const MAX_TOTAL_JS = ${MAX_TOTAL};
//       const PRE_COUNT = ${iCheckOutFVslength};
//       const IS_CHECKOUT = ${isCheckoutAction ? "true" : "false"};

//       const selectedSet = new Set();

//       function q(sel, ctx=document) { return ctx.querySelector(sel); }
//       function qa(sel, ctx=document) { return Array.from((ctx||document).querySelectorAll(sel)); }

//       // Toggle selection for a card.
//       // Note: checked-out items are selectable only when NOT in checkout mode.
//       function toggleCardSelection(cardEl) {
//         if (!cardEl) return;
//         if (cardEl.classList.contains('checked-out') && IS_CHECKOUT) {
//           flash(cardEl);
//           return;
//         }
//         const val = cardEl.getAttribute('data-value');
//         if (!val) return;
//         const willSelect = !cardEl.classList.contains('selected');

//         if (willSelect && IS_CHECKOUT) {
//           if ((selectedSet.size + PRE_COUNT + 1) > MAX_TOTAL_JS) {
//             // deny
//             if (vscode) {
//               vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: 'You can only select up to ' + MAX_TOTAL_JS + ' apps, including those already checked out.' }});
//             } else {
//               alert('You can only select up to ' + MAX_TOTAL_JS + ' apps, including those already checked out.');
//             }
//             flash(cardEl);
//             return;
//           }
//         }

//         if (willSelect) {
//           selectedSet.add(val);
//           cardEl.classList.add('selected');
//         } else {
//           selectedSet.delete(val);
//           cardEl.classList.remove('selected');
//         }
//       }

//       function flash(el) {
//         const prev = el.style.boxShadow;
//         el.style.boxShadow = '0 0 0 4px rgba(255,80,80,0.12)';
//         setTimeout(() => el.style.boxShadow = prev, 300);
//       }

//       function attachCardHandlers() {
//         qa('.fv-card').forEach(card => {
//           // allow selecting checked-out when not in checkout mode; otherwise block
//           card.addEventListener('click', () => toggleCardSelection(card));
//           card.addEventListener('keydown', (ev) => {
//             if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); toggleCardSelection(card); }
//           });
//         });
//       }

//       function applySearchFilter() {
//         const qv = (q('#fvSearch').value || '').toLowerCase().trim();
//         const activePanel = (IS_CHECKOUT && q('#tabInternal') && q('#tabInternal').classList.contains('active')) ? q('#internalPanel') : q('#writablePanel');
//         if (!activePanel) return;
//         qa('.fv-card', activePanel).forEach(card => {
//           const nm = (card.getAttribute('data-name') || '').toLowerCase();
//           card.style.display = (!qv || nm.indexOf(qv) !== -1) ? 'flex' : 'none';
//         });
//       }

//       function initTabs() {
//         if (!IS_CHECKOUT) return;
//         q('#tabWritable').addEventListener('click', () => {
//           q('#tabWritable').classList.add('active'); q('#tabInternal').classList.remove('active');
//           q('#writablePanel').style.display = ''; q('#internalPanel').style.display = 'none';
//           applySearchFilter();
//         });
//         q('#tabInternal').addEventListener('click', () => {
//           q('#tabInternal').classList.add('active'); q('#tabWritable').classList.remove('active');
//           q('#internalPanel').style.display = ''; q('#writablePanel').style.display = 'none';
//           applySearchFilter();
//         });
//       }

//       // Select All (only exists when not checkout): select/deselect all cards across both lists.
//       const selectAllEl = q('#SelectAll12');
//       if (selectAllEl) {
//         selectAllEl.addEventListener('change', (ev) => {
//           const checked = ev.currentTarget.checked;
//           // If checked, select everything (including checked-out) because not checkout mode
//           const cards = qa('.fv-card');
//           if (checked) {
//             cards.forEach(c => {
//               const val = c.getAttribute('data-value');
//               if (val) {
//                 selectedSet.add(val);
//                 c.classList.add('selected');
//               }
//             });
//           } else {
//             cards.forEach(c => c.classList.remove('selected'));
//             selectedSet.clear();
//           }
//         });
//       }

//       // waiting UI: show/hide and toggle "everything disabled"
//       function showWaitingText(selectedApps) {
//         const waitingArea = q('#waitingArea');
//         const waitText = q('#waitText');
//         const mainBtn = q('#mainActionBtn');
//         const relBtn = q('#releasedBtn');

//         // show waiting area
//         if (waitingArea) waitingArea.style.display = 'flex';

//         // set message text
//         if (waitText) {
//           const btnText = mainBtn ? (mainBtn.innerText || '').toUpperCase() : '${String(action).toUpperCase()}';
//           let message = '';
//           if (btnText === 'CHECKOUT') {
//             message = 'Workspace checkout of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
//           } else if (btnText === 'REVERT') {
//             message = 'Revert of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
//           } else if (btnText === 'UPDATE') {
//             message = 'Update of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
//           } else if (btnText === 'REPAIR') {
//             message = 'Repair of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
//           } else {
//             message = (selectedApps.join(' , ') || '') + ' started.\\nPlease wait...';
//           }
//           waitText.innerText = message;
//         }

//         // add waiting-mode class to body to disable interactions globally
//         document.body.classList.add('waiting-mode');

//         // explicitly disable buttons and inputs (for older browsers)
//         qa('button').forEach(b => b.disabled = true);
//         const search = q('#fvSearch'); if (search) search.disabled = true;
//         if (selectAllEl) selectAllEl.disabled = true;
//         qa('#popupCancel, #popupSubmit').forEach(b => b.disabled = true);
//       }

//       function hideWaitingText() {
//         const waitingArea = q('#waitingArea');
//         const waitText = q('#waitText');
//         if (waitingArea) waitingArea.style.display = 'none';
//         if (waitText) waitText.textContent = '';
//         document.body.classList.remove('waiting-mode');

//         // re-enable controls
//         qa('button').forEach(b => b.disabled = false);
//         const search = q('#fvSearch'); if (search) search.disabled = false;
//         if (selectAllEl) selectAllEl.disabled = false;
//         qa('#popupCancel, #popupSubmit').forEach(b => b.disabled = false);

//         // But respect initial main action disabled when preCount >= MAX_TOTAL
//         const mainBtn = q('#mainActionBtn'); if (mainBtn) {
//           if (PRE_COUNT >= MAX_TOTAL_JS && IS_CHECKOUT) mainBtn.disabled = true;
//           else mainBtn.disabled = false;
//         }
//       }

//       function mainActionHandler() {
//         // collect selected apps
//         const selectedApps = Array.from(selectedSet);
//         if (IS_CHECKOUT) {
//           const allowedSelections = Math.max(MAX_TOTAL_JS - PRE_COUNT, 0);
//           if (selectedApps.length > allowedSelections) {
//             selectedApps.splice(allowedSelections);
//           }
//         }
//         showWaitingText(selectedApps);
//         if (vscode) {
//           vscode.postMessage({ command: 'operationOnSelectedApps', data: { selectedApps: selectedApps }});
//         }
//       }

//       // popup helpers (preserve original behavior)
//       function getFlavorVersionFromFv(fvid) {
//         if (!fvid?.length) return null;
//         let lst = fvid.lastIndexOf("_");
//         let flavor = fvid.slice(0, lst);
//         return flavor;
//       }

//       window.showPopup = function() {
//         q('#popup').style.display = 'block';
//         q('#overlay').style.display = 'block';
//         const AppSelectionDropdown = q('#AppSelection');
//         AppSelectionDropdown.innerHTML = '';
//         (APP_LIST || []).forEach(app => {
//           const opt = document.createElement('option');
//           opt.value = getFlavorVersionFromFv(app) || app;
//           opt.textContent = getFlavorVersionFromFv(app) || app;
//           AppSelectionDropdown.appendChild(opt);
//         });
//       };

//       window.popupCancel = function() {
//         q('#popup').style.display = 'none';
//         q('#overlay').style.display = 'none';
//       };

//       window.popupSubmit = function() {
//         const selectedApp = q('#AppSelection') && q('#AppSelection').value;
//         const version = q('#versionSelectionInput') && q('#versionSelectionInput').value;
//         if (!selectedApp || selectedApp === "" || !version || version === "") {
//           if (vscode) vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: "Please fill in both the application and version fields." }});
//           return;
//         }
//         q('#popup').style.display = 'none';
//         q('#overlay').style.display = 'none';
//         const selectedApps = [ selectedApp + '_' + version ];
//         showWaitingText(selectedApps);
//         if (vscode) vscode.postMessage({ command: 'operationOnSelectedApps', data: { selectedApps: selectedApps, actionType: "releasedVersionsCheckout" }});
//       };

//       if (q('#releasedBtn')) {
//         q('#releasedBtn').addEventListener('click', () => {
//           if (typeof window.showPopup === 'function') { try { window.showPopup(); return; } catch(e) {} }
//           if (vscode) vscode.postMessage({ command: 'checkoutReleased', data: {} });
//         });
//       }

//       q('#mainActionBtn').addEventListener('click', mainActionHandler);

//       window.addEventListener('load', () => {
//         attachCardHandlers();
//         initTabs();
//         q('#fvSearch').addEventListener('input', applySearchFilter);

//         // mark checkouts visually when present
//         (CHECKOUTS || []).forEach(app => {
//           const id1 = safeId(app);
//           const id2 = safeId('int-' + app);
//           const e1 = document.getElementById(id1);
//           const e2 = document.getElementById(id2);
//           if (e1) { e1.classList.add('checked-out'); e1.classList.add('not-selectable'); e1.setAttribute('aria-disabled','true'); }
//           if (e2) { e2.classList.add('checked-out'); e2.classList.add('not-selectable'); e2.setAttribute('aria-disabled','true'); }
//         });
//       });

//       // allow host to hide loader after operation finishes
//       window.hideWaitingText = hideWaitingText;
//       // allow host to query selected apps
//       window.__getSelectedApps = () => Array.from(selectedSet);
//     </script>
//   </body>
//   </html>`;
// }
//#endregion 4

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
