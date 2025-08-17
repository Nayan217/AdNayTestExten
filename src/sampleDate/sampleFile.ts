import { FileExplorer } from "./fileExplorer";
import * as querystring from "querystring";
import * as extract from "extract-zip";
import { ClientRequest } from "http";
import { TextEncoder } from "util";
import * as vscode from "vscode";
import { window } from "vscode";
import * as https from "https";
import * as zlib from "zlib";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
// import * as ts from "typescript"; //pr0076 importing typescript for finding compilation errors.//PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559 - Using locally/globally installed typescript
import * as os from "os"; //PR0014 Karthick 29 APR 2025 PROC - 17739
import { spawn, spawnSync, execSync } from "child_process"; //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
const vsClientIP = `https://localhost:`;
//var isInitailized: boolean;
let vsclientPort: string;
let savePanel: vscode.WebviewPanel;
let updateAppPanel: vscode.WebviewPanel;
let isKlarionWorksapce: boolean;
let _FileExplorer: FileExplorer;
//let zipDownloadPromise:DelayedPromise;
let isSetupFirstTime: boolean;
let isAutomationEnabled: boolean;
let sIdeName: string =
	"Procify IDE"; /* PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - using variable to store the name*/

interface stateType {
	[key: string]: { dirtystate: number; appFolder: string };
}
interface log {
	modified: stateType;
	newly_created: stateType;
	deleted: stateType;
	renamed: stateType;
	conflict: stateType;
}
enum FileStatus {
	localModified = "LM",
	localCreated = "LC",
	localDeleted = "LD",
	conflictResolved = "CR",
	conflict = "C",
	revert = "R",
	remoteModified = "RM",
	remoteCreated = "RC",
	remoteDeleted = "RD",
	uptodate = "UTD",
}
interface FileLogFormat {
	writeAbleFVs: string[];
	checkoutFVs: { [fvid: string]: { lct: number | bigint } };
	dependant_apps: { [appDir: string]: Array<string> };
	renamed?: { [appDir: string]: { r_file_path: string; r_file_path_new: string } };
	from_query?: {
		[appDir: string]: {
			[r_file_path: string]: {
				/** RepositoryFirstTime came to local from repository -> s_modified_on */
				trf?: number | bigint;
				/** RepositoryLatestTime read s_modified_on from repository as last update */
				trl?: number | bigint;
				/** DiskFirstTime after writing to disk this was the time as per fs modified time*/
				tdf?: number | bigint;
				/** DiskLatestTime read from disk as last update */
				tdl?: number | bigint;
				status?: FileStatus;
				i?: number; //inherited or not
				//does not capture rename.
			};
		};
	};
	checkout_fvs?: { [appName: string]: { status: string } };
	settup_status?: string;
	releasedApps?: { [fvid: string]: { lct: number | bigint; status?: string } }; //PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884 - added to store releasedApps statuses
	internalNonEditableApps?: string[]; //PR0050 @Nayan 13AUG2025 F7.2.XX_25_27-29 PROC-19721 - added to store internalApps
	app_items?: any[];
}
const maxNumOfFlvToCheckout = 4;
//PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14802- added releasedVersionsCheckout, checkReleasedVersionsCheckout
const actions = {
	commit: { url: "extension/commit", actionName: "commit" },
	update: { url: "extension/update", actionName: "update" },
	checkout: { url: "extension/checkout", actionName: "checkout" },
	delete: { url: "extension/delete", actionName: "delete" },
	ping: { url: "extension/ping", actionName: "ping" },
	registerUser: { url: "extension/registerUser", actionName: "registerUser" },
	updateLog: { url: "extension/updateLog", actionName: "updateLog" },
	revert: { url: "extension/revert", actionName: "revert" },
	updateFileStatus: { url: "extension/updateFileStatus", actionName: "updateFileStatus" },
	renamed: { url: "extension/renamed", actionName: "renamed" },
	resolveConflict: { url: "extension/resolveConflict", actionName: "resolveConflict" },
	getDownlodedApp: { url: "extension/getDownlodedApp", actionName: "getDownlodedApp" },
	repair: { url: "extension/repair", actionName: "repair" },
	stop: { url: "extension/stop", actionName: "stop" },
	releasedVersionsCheckout: {
		url: "extension/releasedVersionsCheckout",
		actionName: "releasedVersionsCheckout",
	},
	checkReleasedVersionsCheckout: {
		url: "extension/checkReleasedVersionsCheckout",
		actionName: "checkReleasedVersionsCheckout",
	},
};

//PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14802- added releasedVersionsCheckout, checkReleasedVersionsCheckout
type RepoActions =
	| "commit"
	| "update"
	| "checkout"
	| "delete"
	| "ping"
	| "registerUser"
	| "updateLog"
	| "revert"
	| "updateFileStatus"
	| "renamed"
	| "resolveConflict"
	| "getDownlodedApp"
	| "repair"
	| "stop"
	| "releasedVersionsCheckout"
	| "checkReleasedVersionsCheckout";

export async function activate(context: vscode.ExtensionContext, uri: string) {
	let workspacePath =
		vscode && vscode.workspace && vscode.workspace.workspaceFolders
			? vscode.workspace.workspaceFolders[0].uri.path.slice(1)
			: "";
	createStatusBarItem("Save", "Save current file to repository", "extension.singleSave");
	createStatusBarItem(
		"Delete",
		"Delete all pending files from repository",
		"extension.deletePending"
	);
	createStatusBarItem("Update", "Update current file from respository", "extension.update");
	createStatusBarItem("Revert", "Revert current file from respository", "extension.revert");
	createStatusBarItem("Save All", "Save all pending files to repository", "extension.saveAll");
	createStatusBarItem(
		"Update All",
		"Update selected apps from the repository",
		"extension.updateApp"
	);
	createStatusBarItem(
		"Revert All",
		"Revert selected apps from the repository",
		"extension.revertApps"
	);
	createStatusBarItem("Checkout", "Update workspace", "extension.checkout");
	// createStatusBarItem("Repair", "Update external apps", "extension.repair"); //PR0050 @Nayan 10MAY2024 PROC-5135 -commented
	createStatusBarItem("Repair Framework", "Update external apps", "extension.repair"); //PR0050 @Nayan 10MAY2024 PROC-5135 - added
	//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Changing klarion to Procify and Kloextension to Procify IDE
	window.showInformationMessage(`${sIdeName} extension is now Active`);
	console.log(`Congratulations, your extension ${sIdeName} is now ready!`);
	let isIdeFile = fs.existsSync(`${workspacePath}/vscodeide.json`);
	let isKlarionFile = fs.existsSync(`${workspacePath}/kloconfig/klarion.json`);
	//#region //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559 - Checking for empty dir
	// let isWorkspaceEmpty = Boolean(
	// 	!fs.readdirSync(workspacePath).length || fs.existsSync(`${workspacePath}/SVN`)
	// );
	const ignoredDirs = new Set(["SVN", "node_modules", ".vscode", "vscodeide.json", ".DS_Store"]);
	const contents = fs.readdirSync(workspacePath)?.filter((item) => !ignoredDirs.has(item));
	const isWorkspaceEmpty = contents.length === 0;
	if (isWorkspaceEmpty) await canProceed();
	//#endregion
	if ((isIdeFile && !isKlarionFile) || isWorkspaceEmpty) {
		isSetupFirstTime = true;
		//PR0050 @Nayan 04DEC2024 IPROC-12624 - commented below and added 2 lines after
		// let panel= await createWebview(context,uri);
		let nPortNumberToBeUsed = (await getPortToBeUsed()).defaultPortNumber;
		let panel = await createWebview(context, uri, nPortNumberToBeUsed);
		if (fs.existsSync(`${workspacePath}/vscodeide.json`)) {
			let ideFileContent = JSON.parse(
				fs.readFileSync(`${workspacePath}/vscodeide.json`, { encoding: "utf-8" })
			);
			isAutomationEnabled = ideFileContent.isAutomation;
			let setup_type = ideFileContent.setupType.toUpperCase() == "PRIVATE" ? "false" : "true";
			panel.webview.postMessage({
				command: "updateWebView",
				data: {
					isIdeFile: isIdeFile,
					isKlarionFile: isKlarionFile,
					url: ideFileContent.url,
					mmid: ideFileContent.mmid,
					password: ideFileContent.password,
					setup_type: setup_type,
					test_users: ideFileContent.testusers,
					vsclientPort: ideFileContent.vsclientPort,
				},
			});
			setTimeout(() => {
				panel.webview.postMessage({
					command: "forceSubmit",
				});
			}, 5000);
		}
	}
	//####### All events can be registered here#######
	context.subscriptions.push(
		vscode.workspace.onWillSaveTextDocument((e) => {
			if (
				e.document.uri.path.includes("src") &&
				!e.document.uri.path.includes("_gen.") &&
				_isKlarionWorksapce()
			) {
				fs.access(e.document.uri.fsPath, fs.constants.W_OK, (err: any) => {
					if (err) {
						window.showErrorMessage("Error:can not save a read only file");
					} else {
						//filesave();
					}
				});
			}
		})
	);
	vscode.window.onDidChangeActiveTextEditor(async (e) => {
		if (_isKlarionWorksapce()) {
			let entry = {
				uri: e?.document.uri,
				type: 1,
			};
			try {
				console.log("triggering reveal");
				let respTree = await _FileExplorer?.TreeView.reveal(entry, {
					select: true,
					focus: true,
					expand: true,
				});
				console.log(respTree);
			} catch (err) {
				console.log("error " + err);
			}
		}
	});
	vscode.workspace.onDidRenameFiles(async (event) => {
		//Getting Files Details
		let newp = event.files[0].newUri.path;
		let oldp = event.files[0].oldUri.path;
		let flavor_version: String = newp.split("src/")[1].split("/").shift() + "";
		let r_file_path_old = oldp.split("src/")[1].split("/").slice(1).join("/");
		let r_file_path_new = newp.split("src/")[1].split("/").slice(1).join("/");
		let flavor = flavor_version.split("_").slice(0, -1).join("_");
		let version = flavor_version.split("_").slice(-1)[0];
		if (oldp.includes("src") && !oldp.includes("_gen.") && _isKlarionWorksapce()) {
			//rename file logic
			if (!(await isServerRunning())) {
				await startRepoServer();
			}
			await waitForServerToRun();
			let reqData: { [key: string]: { r_file_path: string; r_file_path_new: string } } = {};
			reqData[flavor + "_" + version] = {
				r_file_path: r_file_path_old,
				r_file_path_new: r_file_path_new,
			};
			try {
				await sendRequestToNodeServer("renamed", { filesToBeRenamed: reqData });
			} catch (err) {}
		}
	});

	context.subscriptions.push(
		vscode.workspace.onDidDeleteFiles((event) => {
			//delete file logic
		})
	);
	context.subscriptions.push(
		vscode.workspace.onDidCreateFiles(async (event) => {
			if (event.files[0].path.includes("_gen.ts")) {
				fs.unlinkSync(event.files[0].path.slice(1));
				window.showInformationMessage("creation of _gen.ts file is not allowed");
			}
			//#region //PR0050 @Nayan 10MAY2024 PROC-6365
			let actaulFileName = event.files[0].path.split("/").pop();
			let regexToCheckFolder = /[A-Z]|[^\w_]/;
			if (
				event.files[0].path.includes("src/") &&
				regexToCheckFolder.test(actaulFileName) &&
				!actaulFileName.includes(".")
			) {
				fs.stat(event.files[0].fsPath, async (err, stats) => {
					if (stats.isDirectory()) {
						vscode.window.showInformationMessage(
							"Please create folders with lowercase letters, _ and numbers."
						);
					}
				});
			}
			//#endregion
			if (
				event.files[0].path.includes("src") &&
				!event.files[0].path.includes("_gen.") &&
				_isKlarionWorksapce()
			) {
				if (!(await isServerRunning())) {
					await startRepoServer();
				}
				//#region //PR0050 @Nayan 10MAY2024 PROC-6365
				let str = event.files[0].path;
				let result = await appFolderCheck(str);
				let stats = await fs.statSync(event.files[0].fsPath);
				if (stats.isFile() && !/^[a-z0-9_/-]*$/.test(result)) {
					fs.unlinkSync(event.files[0].path.slice(1));
					window.showInformationMessage(
						"Folder name must only contain lowercase letters, _ and numbers."
					);
					return;
				}
				//#endregion
				let actaulFileName = event.files[0].path.split("/").pop();
				// if(["entity","query","controller","util","rules","entity_gen","app_service","query_gen","index","media","css","js","view",'resources'].includes(actaulFileName))//PR0050 @Nayan 10MAY2024 PROC-7837-commented
				if (
					[
						"entity",
						"query",
						"controller",
						"util",
						"rules",
						"entity_gen",
						"app_service",
						"query_gen",
						"index",
						"media",
						"css",
						"js",
						"view",
						"resources",
						"workflow",
						"scheduler",
					].includes(actaulFileName)
				)
					//PR0050 @Nayan 10MAY2024 PROC-7837 - added
					return;
				let fileName = actaulFileName?.split(".").shift();
				let cdn_app_path = event.files[0].path.split("/src/")[1];
				let flavor_version: string = <string>cdn_app_path.split("/").shift();
				let logContent: FileLogFormat = await getlogFileData();
				if (logContent.internalNonEditableApps.includes(flavor_version)) {
					fs.unlinkSync(event.files[0].path.slice(1));
					return window.showInformationMessage(
						flavor_version + " is not assigned as a writable app."
					);
				}
				let flavor = flavor_version.split("_").slice(0, -1).join("_");
				let version = flavor_version.split("_")[flavor_version.split("_").length - 1];
				let fileToBeSaved: { [key: string]: string[] } = {};
				fileToBeSaved[flavor + "_" + version] = fileToBeSaved[flavor + "_" + version] || [];
				fileToBeSaved[flavor + "_" + version].push(
					cdn_app_path.split(flavor_version + "/")[1]
				);
				if (event.files[0].path.includes(".controller.js")) {
					//controller template
					let controllerTemplate = `sap.ui.define([\n\tbaseControllerPath()\n], function (oBaseController) {\n\t"use strict";\n\treturn oBaseController.extend("{flavor_name}.{flavor_version}.controller.{file_name}", {\n\t\tonInit: function () {\n\t\t\t// Do something here...\n\t\t},\n\t\tonAfterRendering: function () {\n\t\t\t// Do something here...\n\t\t},\n\t\tonBeforeRendering: function () {\n\t\t\t// Do something here...\n\t\t},\n\t\tonExit: function () {\n\t\t\t// Do something here...\n\t\t}\n\t});\n});`;
					vscode.workspace.fs.writeFile(
						event.files[0],
						new TextEncoder().encode(controllerTemplate)
					);
				} else if (event.files[0].path.includes(".controller.ts")) {
					let controllerTemplate = await getTemplateOnFileCreate(
						"controller",
						flavor,
						version,
						cdn_app_path,
						fileName
					);
					vscode.workspace.fs.writeFile(
						event.files[0],
						new TextEncoder().encode(controllerTemplate)
					);
				} else if (
					event.files[0].path.includes("/rules/") &&
					event.files[0].path.includes(".ts")
				) {
					//rules template
					let rulesTemplate = await getTemplateOnFileCreate(
						"rules",
						flavor,
						version,
						cdn_app_path,
						fileName
					);
					vscode.workspace.fs.writeFile(
						event.files[0],
						new TextEncoder().encode(rulesTemplate)
					);
					/*PR0037 @Prashant 29Dec2023 FBranch6-0 PROC3335 */
				}
				//#region //PR0050 @Nayan 10MAY2024 PROC-7966-commented
				// else if ((/src\/\w+|d+|d*\/entity\//g).test(event.files[0].path) && (event.files[0].path.includes(".ts"))) {
				// 	let EntityTemplate =  await getTemplateOnFileCreate("entity",flavor,version,cdn_app_path,fileName)
				// 	vscode.workspace.fs.writeFile(event.files[0], new TextEncoder().encode(EntityTemplate));
				// } else if ((/src\/\w+|d+|d*\/query\//g).test(event.files[0].path) && (event.files[0].path.includes(".ts"))) {
				// 	let EntityTemplate = await getTemplateOnFileCreate("query",flavor,version,cdn_app_path,fileName)
				// 	vscode.workspace.fs.writeFile(event.files[0], new TextEncoder().encode(EntityTemplate));
				// }
				//#endregion
				else if (/\/src\/\S*\/entity\/[a-zA-Z]\w*\.ts$/.test(event.files[0].path)) {
					//PR0050 @Nayan 10MAY2024 PROC-7966- different for query and entity
					let EntityTemplate = await getTemplateOnFileCreate(
						"entity",
						flavor,
						version,
						cdn_app_path,
						fileName
					);
					vscode.workspace.fs.writeFile(
						event.files[0],
						new TextEncoder().encode(EntityTemplate)
					);
				} else if (/\/src\/\S*\/query\/[a-zA-Z]\w*\.ts$/.test(event.files[0].path)) {
					let EntityTemplate = await getTemplateOnFileCreate(
						"query",
						flavor,
						version,
						cdn_app_path,
						fileName
					);
					vscode.workspace.fs.writeFile(
						event.files[0],
						new TextEncoder().encode(EntityTemplate)
					);
				} else if (/\/src\/\S*\/workflow\/[a-zA-Z]\w*\.ts$/.test(event.files[0].path)) {
					//PR0050 @Nayan 10MAY2024 PROC-7837
					let EntityTemplate = await getTemplateOnFileCreate(
						"workflow",
						flavor,
						version,
						cdn_app_path,
						fileName
					);
					vscode.workspace.fs.writeFile(
						event.files[0],
						new TextEncoder().encode(EntityTemplate)
					);
				}
				await waitForServerToRun();

				/*for entity and query files, require config need to be generated, 
			for that one commit is needed so that they can use their callbacks in private without committing further.*/ //PR0050 @Nayan 20May2024 -Commented
				await sendRequestToNodeServer("commit", {
					selectedFiles: fileToBeSaved,
					isSingleOperation: true,
				});
			}
		})
	);

	// async function appFolderCheck(path:string){//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
	// 	let str = path;
	// 	let appPath = str.substring(str.indexOf('src/') + 4, str.lastIndexOf('/')+1);
	// 	let result= appPath.substring(appPath.indexOf('/')+1, appPath.lastIndexOf('/'))
	// 	return result;
	// }

	/*MM0555 @Prashant 11Nov2023 FBranch6-0 I4631 */
	async function getTemplateOnFileCreate(
		templateFor: "controller" | "entity" | "rules" | "query" | "workflow",
		flavor: string,
		version: string,
		filePath: string,
		className: string
	) {
		let logContent: FileLogFormat = await getlogFileData();
		let appName: string = `${flavor}_${version}`;
		let isParentFilePresent: boolean = false;
		let workspacePath: string = (
			vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
		)[0].uri.path.slice(1);
		let srcFilePath = path.join(workspacePath, `src/${filePath}`);
		let closedModulePath = path
			.join(workspacePath, `closedmodules/${filePath}`)
			.replace(".ts", ".js");
		if (logContent.dependant_apps && logContent.dependant_apps[appName]) {
			for (let depApp of logContent.dependant_apps[appName]) {
				if (depApp == appName) continue;
				let parentSrcPath = srcFilePath.replace(`${flavor}_${version}`, depApp);
				let parentClosedModulePath = closedModulePath.replace(
					`${flavor}_${version}`,
					depApp
				);
				if (fs.existsSync(parentSrcPath) || fs.existsSync(parentClosedModulePath)) {
					isParentFilePresent = true;
				}
			}
		}
		let topImportLine: string = `import {KloController} from 'kloTouch/jspublic/KloController'`;
		let classExportLine: string = `export default class ${className} extends KloController{`;
		if (templateFor == "controller") {
			topImportLine = isParentFilePresent
				? `import ${className}_base from '${flavor}_base/controller/${className}.controller'`
				: topImportLine;
			classExportLine = isParentFilePresent
				? `export default class ${className} extends ${className}_base{`
				: classExportLine;
			// return [
			// 	`${topImportLine}`,
			// 	`declare let KloUI5:any;`,
			// 	`@KloUI5("${flavor}.controller.${className}")`,
			// 	`${classExportLine}`,
			// 	`	public onInit() {`,
			// 	`	}`,
			// 	`	public onBeforeRendering() {`,
			// 	`	}`,
			// 	`	public onAfterRendering() {`,
			// 	`	}`,
			// 	`	public onExit() {`,
			// 	`	}`,
			// 	`}`
			// ].join("\n")
			return [
				`${topImportLine}`,
				`declare let KloUI5:any;`,
				`@KloUI5("${flavor}.controller.${className}")`,
				`${classExportLine}`,
				`	`,
				`	/*public async onPageEnter() {`,
				`	    //This event will be called whenever the screen enters the visible area by means of navigation (Both front and back navigation).`,
				`	}*/`,
				`	`,
				`	/*public async onPageModelReady() {`,
				`	    //This event will be called when the model is created and the transnodes are initialized, but the Data is not set to the model yet.`,
				`	}*/`,
				`	`,
				`	/*public async onPageExit() {`,
				`   	//This event will be called in the source screen whenever the developer navigates to a different screen.`,
				`	}*/`,
				`	`,
				`}`,
			].join("\n"); // PR0050 @Nayan 19Feb2024 F60 PROC-3865
		} else if (templateFor == "rules") {
			topImportLine = isParentFilePresent
				? `import {${className} as ${className}_base} from "${flavor}_base/rules/${className}"`
				: `import { EventContext } from "kloBo/EventContext"`;
			classExportLine = isParentFilePresent
				? `export class ${className} extends ${className}_base{`
				: `export class ${className}{`;
			return [
				`${topImportLine}`,
				`${classExportLine}`,
				`	public async handleEvent(event: EventContext){`,
				`	}`,
				`}`,
			].join("\n");
		} else if (templateFor == "entity" || templateFor == "query") {
			topImportLine = isParentFilePresent
				? `import {${className} as ${className}_base} from "${flavor}_base/${templateFor}/${className}"`
				: `import {${className} as ${className}_gen} from "${flavor}/${templateFor}_gen/${className}"`;
			let genOrbase = isParentFilePresent ? "base" : "gen";
			classExportLine = `export class ${className} extends ${className}_${genOrbase}{}`;
			return [`${topImportLine}`, `${classExportLine}`].join("\n");
		} else if (templateFor == "workflow") {
			//PR0050 @Nayan 10MAY2024 PROC-7837
			let topImportLine = `import {WorkflowBase} from 'kloBolServer/kloWF/WorkflowBase'`;
			classExportLine = `export class ${className} extends WorkflowBase{}`;
			return [`${topImportLine}`, `${classExportLine}`].join("\n");
		}
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.showInhertianceTree", async (event) => {
			try {
				if (fs.existsSync(`${workspacePath}/.vscode/log.json`)) {
					_FileExplorer = new FileExplorer(context);
				}
			} catch (error: any) {}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.update", async (event) => {
			await singleFileOperation("update");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.singleSave", async (event) => {
			await singleFileOperation("commit");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.revert", async (event) => {
			await singleFileOperation("revert");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.saveAll", async (event) => {
			try {
				//PR0076 @Pooja 24Mar2025 PROC-7452-added next three lines
				let workspacePath: string = (
					vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
				)[0].uri.path.slice(1);
				if (!workspacePath) {
					vscode.window.showErrorMessage("No workspace folder is open.");
				}
				window
					.showQuickPick(["Yes", "No"], {
						placeHolder: "Do you wish to save All unsaved changes to repository?",
						canPickMany: false,
					})
					.then(async (response) => {
						if (response !== "Yes") return;
						if (!(await isServerRunning())) {
							await startRepoServer();
						}
						await waitForServerToRun();
						await sendRequestToNodeServer("updateFileStatus", {});
						let logContent: FileLogFormat = await getlogFileData();
						let isModified: boolean = false;
						for (let appDir in logContent.from_query) {
							if (logContent.internalNonEditableApps.includes(appDir)) continue; //PR0050 @Nayan 13AUG2025 F7.2.XX_25_27-29 PROC-19721 - added to store internalApps
							for (let r_file_path in logContent.from_query[appDir]) {
								if (
									[
										FileStatus.localModified,
										FileStatus.localCreated,
										FileStatus.localDeleted,
										FileStatus.conflict,
									].includes(
										logContent.from_query[appDir][r_file_path].status ||
											<FileStatus>""
									)
								) {
									isModified = true;
									break;
								}
							}
						}
						if (isModified) {
							if (savePanel) savePanel.dispose();
							savePanel = vscode.window.createWebviewPanel(
								"catCodingx",
								"Save files",
								vscode.ViewColumn.One,
								{ enableScripts: true, retainContextWhenHidden: true } //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290 - for retaining the view
							);
						} else {
							vscode.window.showInformationMessage("No pening files to be saved");
						}
						let AllModifiedFiles: {
							modified: stateType;
							newly_created: stateType;
							deleted: stateType;
							conflict: stateType;
							renamed: stateType;
						} = {
							modified: {},
							newly_created: {},
							deleted: {},
							conflict: {},
							renamed: {},
						};
						for (let appDir in logContent.from_query) {
							if (logContent.internalNonEditableApps.includes(appDir)) continue; //PR0050 @Nayan 13AUG2025 F7.2.XX_25_27-29 PROC-19721 - added to store internalApps
							let appDirPath = appDir;
							for (let r_file_path in logContent.from_query[appDir]) {
								/*if(logContent?.renamed?.[appDir]?.r_file_path_new == r_file_path || logContent?.renamed?.[appDir]?.r_file_path == r_file_path)
									continue;*/
								/*PR0037 @Prashant 27Nov2023 FBranch6-0 I6396 */
								if (
									r_file_path.includes("metadata/") ||
									r_file_path.includes("query_gen/") ||
									r_file_path.includes("entity_gen/") ||
									r_file_path.includes("tsconfig.json")
								)
									continue;
								if (
									logContent.from_query[appDir][r_file_path].status ==
									FileStatus.localModified
								)
									AllModifiedFiles.modified[appDirPath + "@@" + r_file_path] = {
										dirtystate: 3,
										appFolder: appDir,
									};
								else if (
									logContent.from_query[appDir][r_file_path].status ==
									FileStatus.localCreated
								)
									AllModifiedFiles.newly_created[
										appDirPath + "@@" + r_file_path
									] = { dirtystate: 4, appFolder: appDir };
								else if (
									logContent.from_query[appDir][r_file_path].status ==
									FileStatus.localDeleted
								)
									AllModifiedFiles.deleted[appDirPath + "@@" + r_file_path] = {
										dirtystate: -1,
										appFolder: appDir,
									};
								else if (
									logContent.from_query[appDir][r_file_path].status ==
									FileStatus.conflict
								)
									AllModifiedFiles.conflict[appDirPath + "@@" + r_file_path] = {
										dirtystate: 5,
										appFolder: appDir,
									};
							}
						}

						/*if(logContent.renamed){
					for(let appDir in logContent.renamed){
						let appDirPath = appDir.split("-")[0] + "_" + appDir.split("-")[1];
						AllModifiedFiles.renamed[appDirPath + "@@" + logContent.renamed[appDir].r_file_path_new] = {dirtystate:2,appFolder:appDir}
					}
				}*/
						let reqid = Date.now();
						savePanel.webview.html = getSaveWebView(AllModifiedFiles);
						savePanel.webview.onDidReceiveMessage(async (message) => {
							switch (message.command) {
								case "saveModifiedFiles":
									//PR0076 @Pooja 24Mar2025 PROC-7452-added
									let outputChannel = await getOutputChannel();
									outputChannel.clear();
									//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290 - selctedFiles will be an Object
									if (!Object.keys(message.data.selectedFiles).length) {
										vscode.window.showInformationMessage("No Files selected");
										savePanel.dispose();
									} else {
										const filesSelected = message.data.selectedFiles;
										let filesToCheck = [];
										let flavorToFindConfig = [];
										Object.keys(filesSelected).forEach((flavor) => {
											flavorToFindConfig.push(
												path.resolve(workspacePath, "src", flavor)
											);
											let flavorSelected = filesSelected[flavor];
											flavorSelected.forEach((filePath) => {
												filesToCheck.push(
													path.resolve(
														workspacePath,
														"src",
														flavor,
														filePath
													)
												);
											});
										});
										//#region //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559 - catching error
										let diagnostics = {};
										try {
											diagnostics = await checkForErrorsInModifiedFile(
												filesToCheck,
												flavorToFindConfig
											);
										} catch (error) {
											vscode.window.showErrorMessage(
												"Error : " + error.message
											);
											return;
										}
										//#endregion
										//let errorDetails = errorData.result;
										if (Object.keys(diagnostics)?.length > 0) {
											//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
											savePanel.webview.postMessage({
												command: "hideLoader",
											});
											await displayErrors(
												diagnostics,
												message.data.selectedFiles,
												"commit",
												savePanel
											);
										} //endregion PR0076
										else {
											//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
											savePanel.webview.postMessage({
												command: "showLoader",
											});
											let res: any = await sendRequestToNodeServer("commit", {
												selectedFiles: message.data.selectedFiles,
											});
											// vscode.window.showInformationMessage(res);//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
											let edited_res: any = await responseCheck(res);
											vscode.window.showInformationMessage(edited_res);
											savePanel.dispose();
										}
									}
									break;
								case "revertConflictedFiles":
									if (message.data.selectedFiles.length == 0) {
										vscode.window.showInformationMessage("No Files selected");
										savePanel.dispose();
									} else {
										let res: any = await sendRequestToNodeServer(
											"resolveConflict",
											{
												selectedFiles: message.data.selectedFiles,
												operation: "revert",
											}
										);
										// vscode.window.showInformationMessage(res);//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
										let edited_res: any = await responseCheck(res);
										vscode.window.showInformationMessage(edited_res);
										savePanel.dispose();
									}
									break;
								case "commitConflictedFiles":
									if (message.data.selectedFiles.length == 0) {
										vscode.window.showInformationMessage("No Files selected");
										savePanel.dispose();
									} else {
										let res: any = await sendRequestToNodeServer(
											"resolveConflict",
											{
												selectedFiles: message.data.selectedFiles,
												operation: "commit",
											}
										);
										// vscode.window.showInformationMessage(res);//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
										let edited_res: any = await responseCheck(res);
										vscode.window.showInformationMessage(edited_res);
										savePanel.dispose();
									}
							}
						});
					});
			} catch (error: any) {
				vscode.window.showErrorMessage("Save Error " + error.message);
			}
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("extension.updateApp", async (event) => {
			await repoActionForApps("update");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.checkout", async (event) => {
			await repoActionForApps("checkout");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.revertApps", async (event) => {
			await repoActionForApps("revert");
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.repair", async (event) => {
			try {
				if (!(await isServerRunning())) {
					await startRepoServer();
				}
				await waitForServerToRun();
				if (updateAppPanel) updateAppPanel.dispose();

				let downloadedApp: string = <string>(
					((await sendRequestToNodeServer("getDownlodedApp", {})) || "[]")
				);
				if (downloadedApp && !JSON.parse(downloadedApp).length) {
					vscode.window.showInformationMessage("No app found to repair");
					return;
				}
				updateAppPanel = vscode.window.createWebviewPanel(
					"catCodingx",
					"Repostiory",
					vscode.ViewColumn.One,
					{ enableScripts: true }
				);
				let temp = JSON.parse(downloadedApp).map(
					(app: any) => app.split("@@")[0] + "-" + app.split("@@")[1]
				);
				temp = temp.filter((item: any, index: any) => temp.indexOf(item) === index);
				let logContent: FileLogFormat = await getlogFileData();
				updateAppPanel.webview.html = getAppListWebView(logContent, "repair", false, temp);
				let downloadeAppMap: any = {};
				for (let app of JSON.parse(downloadedApp)) {
					downloadeAppMap[app.split("@@")[0] + "-" + app.split("@@")[1]] =
						app.split("@@")[2];
				}
				updateAppPanel.webview.onDidReceiveMessage(async (message) => {
					switch (message.command) {
						case "operationOnSelectedApps":
							if (message.data.selectedApps.length == 0) {
								vscode.window.showInformationMessage("No Files selected");
								updateAppPanel.dispose();
							} else {
								let appsToDownload = message.data.selectedApps.map((a) => {
									let numIndex =
										a.indexOf("-") > -1 ? a.indexOf("-") : a.lastIndexOf("_");
									let flavor = a.slice(0, numIndex);
									let ver = a.slice(numIndex + 1);
									return flavor + "@@" + ver + "@@" + downloadeAppMap[a];
								});
								let res: any = await sendRequestToNodeServer("repair", {
									appZipToDownloaded: appsToDownload,
								});
								// vscode.window.showInformationMessage(res);//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
								let edited_res: any = await responseCheck(res);
								vscode.window.showInformationMessage(edited_res);
								updateAppPanel.dispose();
								await restartServer(); //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
							}
					}
				});
			} catch (error: any) {
				vscode.window.showErrorMessage("Error during repair" + error.message);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.deletePending", async (event) => {
			// delete files command ctrl+shift+alt+d
			try {
				//let token: string = (isAuth) ? Token : await auth();
				if (!(await isServerRunning())) {
					await startRepoServer();
				}
				await waitForServerToRun();
				await sendRequestToNodeServer("updateFileStatus", {});
				let logContent: FileLogFormat = await getlogFileData();
				let deletedFiles: { [key: string]: { path: string; appFolder: string } } = {};
				for (let appDir in logContent.from_query) {
					if (logContent.internalNonEditableApps.includes(appDir)) continue; //PR0050 @Nayan 13AUG2025 F7.2.XX_25_27-29 PROC-19721 - added to store internalApps
					for (let r_file_path in logContent.from_query[appDir]) {
						if (
							logContent.from_query[appDir][r_file_path].status ==
							FileStatus.localDeleted
						)
							deletedFiles[appDir + "/" + r_file_path] = {
								path: r_file_path,
								appFolder: appDir,
							};
					}
				}
				let filesToBeDeleted = Object.keys(deletedFiles);
				if (filesToBeDeleted.length > 0) {
					window
						.showQuickPick(filesToBeDeleted, {
							canPickMany: true,
							placeHolder: "Do you wish to delete the below files from repository?",
						})
						.then(async (selected: any) => {
							if (selected) {
								let data: any = {};
								selected.forEach((s: string) => {
									let r = deletedFiles[s];
									data[r.appFolder] = data[r.appFolder] || [];
									data[r.appFolder].push(r.path);
								});
								let res: any = await sendRequestToNodeServer("delete", {
									filesToBeDeleted: data,
								});
								// window.showInformationMessage(res);//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
								let edited_res: any = await responseCheck(res);
								window.showInformationMessage(edited_res);
							}
						});
				} else {
					window.showInformationMessage("No pending files to be deleted");
				}
			} catch (error: any) {
				window.showErrorMessage("Login Error " + error.message);
			}
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("extension.setupIDE", async (event) => {
			await createWebview(context, uri);
		})
	);

	//PR0050 @Nayan 04DEC2024 IPROC-12624 - to check previous portnumber and current
	context.subscriptions.push(
		vscode.commands.registerCommand("extension.checkUsedPortNumber", async () => {
			let oPortNumbers = await getPortToBeUsed();
			vscode.window.showInformationMessage(
				`previous port: ${oPortNumbers.currentPortNumber} , Current Port to be used: ${oPortNumbers.defaultPortNumber}`
			);
		})
	);
}

//PR0076 @Pooja 24Mar2025 PROC-7452-added the below function to check compilation errors in multiple file
async function checkForErrorsInModifiedFile(filePaths: string[], flavorToFindConfig: string[]) {
	let ts = await loadTypeScript(); //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559- loading typescript from local/globally installed
	if (!ts)
		throw new Error(
			"Typescript not found please install typescript v4.9.5 or higher to continue"
		);
	const configPaths = getUniqueTsConfigsForFiles(flavorToFindConfig);
	if (configPaths.length === 0) {
		vscode.window.showErrorMessage("No tsconfig.json files found for the provided files");
		return;
	}

	const parsedCommandLineMap = await getParsedCommandLines(configPaths);

	let result = {};
	let allDiagnostic /* : ts.Diagnostic[] */ = [];
	// Based on configPath, creating program using compiler options for finding compilation errors
	for (const configPath in parsedCommandLineMap) {
		const parsedCommandLine = parsedCommandLineMap[configPath];
		const program = await buildProgram(parsedCommandLine);
		for (const file of filePaths) {
			let sourceFile = program.getSourceFile(file);
			if (!sourceFile) {
				continue;
			}
			const diagnostics = ts
				.getPreEmitDiagnostics(program, sourceFile)
				.filter((d) => d.file && d.category === ts.DiagnosticCategory.Error);

			allDiagnostic = allDiagnostic.concat(diagnostics);
			for (const d of diagnostics) {
				const fileName = d.file!.fileName.split(path.sep).join("\\");
				if (!result[fileName]) {
					result[fileName] = [];
				}
				result[fileName].push(d);
			}
		}
	}
	return result;
}

// Pr0076 For each file, finding the tsconfig.json
function getUniqueTsConfigsForFiles(filePaths: string[]): string[] {
	let configSet = new Set<string>();

	for (const filePath of filePaths) {
		const configPath = path.join(filePath, "tsconfig.json");
		if (fs.existsSync(configPath)) {
			configSet.add(configPath);
		}
	}
	return Array.from(configSet);
}

//PR0076 For reading the config file and converting compiler options into JSON format
async function getParsedCommandLines(tsConfigPaths: string[]) {
	const ts = await loadTypeScript(); //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559- loading typescript from local/globally installed
	if (!ts)
		throw new Error(
			"Typescript not found please install typescript v4.9.5 or higher to continue"
		);
	let parsedConfigs = {};

	for (const tsConfigPath of tsConfigPaths) {
		const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
		if (configFile.error) {
			console.warn(`Failed to read config at ${tsConfigPath}`);
			continue;
		}
		const parsedCommandLine = ts.parseJsonConfigFileContent(
			configFile.config,
			ts.sys,
			path.dirname(tsConfigPath)
		);
		parsedConfigs[tsConfigPath] = parsedCommandLine;
	}

	return parsedConfigs;
}

/**
 * Function to build the TypeScript program based on the parsed command line configuration
 * A Program is the central compilation context for a set of TypeScript files and compiler options.
 * It represents your entire application, tracking all root files, their ASTs, and the full type‑checking environment
 * @param parsedCommandLine,  compiler options
 * @returns
 */
//PR0076 Function to build the TypeScript program based on the parsed command line configuration
async function buildProgram(parsedCommandLine) {
	const ts = await loadTypeScript(); //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559- loading typescript from local/globally installed
	if (!ts)
		throw new Error(
			"Typescript not found please install typescript v4.9.5 or higher to continue"
		);
	if (!parsedCommandLine) {
		vscode.window.showErrorMessage("Unable to get config options");
		return;
	}
	let builderProgram = ts.createIncrementalProgram({
		rootNames: parsedCommandLine.fileNames,
		options: parsedCommandLine.options,
	});
	let program = builderProgram.getProgram();
	return program;
}

/**
 * Displays a warning message if there are compilation errors, user can select either Commit or show errors
 * @param diagnostics  collection for errors
 * @param selectedFiles files that needs to be commited
 * @param operation	"commit"
 * @param savePanel	if save all closing the save panel.
 */
//Pr0076 Displays a warning message if there are compilation errors, user can select either Commit or show errors
async function displayErrors(diagnostics, selectedFiles, operation, savePanel?) {
	const ts = await loadTypeScript(); //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559- loading typescript from local/globally installed
	if (!ts)
		throw new Error(
			"Typescript not found please install typescript v4.9.5 or higher to continue"
		);
	vscode.window
		.showWarningMessage(
			`Errors found during compilation. Do you still wish to Commit?`,
			{
				modal: true, //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559- Adding Sub details
				detail: `Please note: Starting December, saving files with errors will be restricted.`,
			},
			"Commit",
			"Show Errors"
		)
		.then(async (selection) => {
			if (selection === "Commit") {
				if (savePanel) savePanel.webview?.postMessage({ command: "showLoader" }); //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
				let res: any = savePanel
					? await sendRequestToNodeServer(operation, { selectedFiles: selectedFiles })
					: await sendRequestToNodeServer(operation, {
							selectedFiles: selectedFiles,
							isSingleOperation: true,
					  });
				let edited_res: any = await responseCheck(res);
				window.showInformationMessage(edited_res);
				if (savePanel) savePanel.dispose();
			} else if (selection === "Show Errors") {
				let outputChannel = await getOutputChannel();
				outputChannel.clear();
				Object.keys(diagnostics).forEach((fileKey) => {
					let errors = diagnostics[fileKey];
					outputChannel.appendLine(`Compilation errors in: ${fileKey}`);
					errors.forEach((error) => {
						const { line, character } = error.file.getLineAndCharacterOfPosition(
							error.start
						);
						const message = ts.flattenDiagnosticMessageText(error.messageText, "\n");
						outputChannel.appendLine(
							` ❌ Line ${line + 1}, Col ${character + 1}: ${message}`
						);
					});
					outputChannel.appendLine("");
				});
				outputChannel.show();
			} else if (savePanel) {
				//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
				savePanel.webview?.postMessage({ command: "hideLoader" });
			}
		});
}
let outputChannel;
async function getOutputChannel() {
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel("Error Log");
	}
	return outputChannel;
}
//end region PR0076

// async function createWebview(context: vscode.ExtensionContext,uri: string){//PR0050 @Nayan 04DEC2024 IPROC-12624 - passing portNumber to be used
async function createWebview(
	context: vscode.ExtensionContext,
	uri: string,
	nportToBeUsed?: number
) {
	//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Changing klarion to Procify
	const panel = vscode.window.createWebviewPanel(
		"catCodingx",
		`Welcome to ${sIdeName} Setup`,
		vscode.ViewColumn.One,
		{
			enableScripts: true,
		}
	);
	// panel.webview.html = getWebviewContent(uri);//PR0050 @Nayan 04DEC2024 IPROC-12624 - commented and passing port number to be used.
	panel.webview.html = getWebviewContent(uri, nportToBeUsed);
	panel.webview.onDidReceiveMessage(
		async (message) => {
			let workspacePath: string = (
				vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
			)[0].uri.path.slice(1);
			switch (message.command) {
				case "check_klarion_file":
					let isKlarionFile = fs.existsSync(`${workspacePath}/kloconfig/klarion.json`);
					let isIdeFile = fs.existsSync(`${workspacePath}/vscodeide.json`);
					if (isKlarionFile) {
						let klarionFileContent = JSON.parse(
							fs.readFileSync(`${workspacePath}/kloconfig/klarion.json`, {
								encoding: "utf-8",
							})
						);
						let password = "";
						if (isIdeFile) {
							let ideFileContent = JSON.parse(
								fs.readFileSync(`${workspacePath}/vscodeide.json`, {
									encoding: "utf-8",
								})
							);
							password = ideFileContent.password;
						}
						panel.webview.postMessage({
							command: "updateWebView",
							data: {
								isKlarionFile: isKlarionFile,
								url: klarionFileContent.url,
								mmid: klarionFileContent.mmid,
								wildflyport: klarionFileContent.port,
								landscape: klarionFileContent.landscape,
								setup_type: klarionFileContent.isPublicNode,
								isAuthenticated: klarionFileContent.isAuthenticated,
								vsclientPort: klarionFileContent.vsclientPort,
							},
						});
					} else if (isIdeFile) {
						// let ideFileContent = JSON.parse(fs.readFileSync(`${workspacePath}/vscodeide.json`, { encoding: 'utf-8' }));
						// let setup_type=ideFileContent.setupType.toUpperCase()=="PRIVATE"?"false":"true";
						// panel.webview.postMessage({
						// 	command: 'updateWebView', data: {
						// 		isIdeFile:isIdeFile,
						// 		isKlarionFile: isKlarionFile,
						// 		url: ideFileContent.url,
						// 		mmid: ideFileContent.mmid,
						// 		password: ideFileContent.password,
						// 		setup_type: setup_type,
						// 		vsclientPort: ideFileContent.vsclientPort,
						// 		isSetupStarted: isSetupFirstTime
						// 	}
						// });
						// if(!isForceSubmitDone){
						// 	setTimeout(()=>{panel.webview.postMessage({
						// 		command: 'forceSubmit'
						// 	})},5000);
						// }
					} else {
						panel.webview.postMessage({
							command: "updateWebView",
							data: {
								isKlarionFile: isKlarionFile,
							},
						});
					}
				case "submit":
					console.log(message.data);
					return;
				case "isWildFlyAlive":
					try {
						let tempUrl: Array<string> = message.data.url.split("/fs/");
						if (tempUrl.length <= 1) {
							//throw new Error("Enter url with fs");
						}
						tempUrl = tempUrl.slice(0, 1);
						let urlObj: url.UrlObject = url.parse(message.data.url);
						let context: string | undefined = urlObj.path?.split("/")[1];
						let landscape: string | undefined = urlObj.path?.split("/")[5];
						const defaultPort: string = "443";
						let wildflyport: string | number = urlObj.port ? urlObj.port : defaultPort;
						panel.webview.postMessage({
							command: "isWildFlyAlive",
							data: {
								//contextFile: res.toString(),
								landscape: landscape,
								wildflyport: wildflyport,
							},
						});
					} catch (err: any) {
						panel.webview.postMessage({
							command: "error_message",
							data: "invalid url : " + err.message ? err.message : err,
						});
					}
					break;
				case "register":
					try {
						const public_node = true;
						//zipDownloadPromise = new DelayedPromise();
						//=======================Changes ===================================

						//PR0050 @Nayan 04DEC2024 IPROC-12624 - Added the below 4 lines for updating the portnumber
						const config = vscode.workspace.getConfiguration();
						let nPortToBeSaved =
							message.data.vsclientPort == nportToBeUsed
								? message.data.vsclientPort
								: nportToBeUsed;
						nPortToBeSaved = parseInt(nPortToBeSaved);
						await config.update(
							"procifynowExtension.checkUsedPortNumber",
							nPortToBeSaved,
							vscode.ConfigurationTarget.Global
						);
						await createKlarionConfig(
							message.data.url,
							message.data.userid,
							message.data.password,
							JSON.parse(message.data.setup_type),
							message.data.vsclientPort
						);
						let klarionData = JSON.parse(
							fs.readFileSync(`${workspacePath}/kloconfig/klarion.json`, {
								encoding: "utf-8",
							})
						);
						await createResourceFiles(context);
						//#region //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559- checking for modules installation
						if (!(await canProceed())) {
							if (process.platform == "win32") {
								throw Error(
									`Enable “localPackageInstallation” in settings by running "Set local package installation" in command palette. or run "Run Environment Setup" in command palette > select "Environment Variables" and "Global Package Installation".`
								);
							}
							if (["linux", "darwin"].includes(process.platform))
								throw Error(
									`Enable “localPackageInstallation” in settings by running "Set local package installation" in command palette.`
								);
							return;
						}
						if (getlocalPackageInstallation()) {
							await installNodeModules();
						}
						//#endregion
						/*MM0555 @Prashant 11Nov2023 FBranch6-0 I3497 */
						let configData = await getDefaultBVData(klarionData); //PR0018 @Amit 05Sep2024 PROC-7336
						let token = await getBearerToken(
							message.data.userid,
							message.data.password,
							klarionData.ipAddress,
							klarionData.port,
							configData
						); //PR0018 @Amit 05Sep2024 PROC-7336
						await createConfigFile(
							message.data.url,
							klarionData,
							token,
							configData.bol_version
						);
						await addDefaultFlavor(klarionData, configData); //PR0018 @Amit 05Sep2024 PROC-7336
						debugger;
						//await zipDownloadPromise.promise;
						if (!(await isServerRunning())) {
							await startRepoServer();
						}
						await waitForServerToRun();
						let res = await sendUserInfo(message);
						if (res && res.includes("Successfull")) {
							panel.webview.postMessage({
								command: "success_message",
								data: "registration sucessfull",
							});
							isSetupFirstTime = false;
							let isIdeFile = fs.existsSync(`${workspacePath}/vscodeide.json`);
							if (isIdeFile) fs.unlinkSync(`${workspacePath}/vscodeide.json`);
							await repoActionForApps("checkout");
						} else {
							panel.webview.postMessage({
								command: "error_message",
								data: "Registration Falied : " + res,
							});
						}
					} catch (err: any) {
						err = err.message ? err.message : err;
						panel.webview.postMessage({
							command: "error_message",
							data: "Registration Falied : " + err,
						});
					}
					break;
				case "KloServerStart":
					try {
						await startRepoServer();
					} catch (err: any) {
						panel.webview.postMessage({
							command: "error_message",
							data: "Error starting server : " + err.message ? err.message : err,
						});
					}
					break;
				case "Kill":
					// get all the terminals
					//#region //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290- using killPort
					/* let terminals = vscode.window.terminals;
					// kill all the terminals
					terminals.length != 0
					? terminals.forEach((terminal) => {
						terminal.processId.then((pid) => {
									// kill the process
									pid ? process.kill(pid) : "";
									terminal.dispose();
									});
									})
									: ""; */
					//#endregion
					await killPort();
			}
		},
		undefined,
		context.subscriptions
	);
	return panel;
}

async function repoActionForApps(action: RepoActions) {
	try {
		if (!(await isServerRunning())) {
			await startRepoServer();
		}
		await waitForServerToRun();
		if (updateAppPanel) updateAppPanel.dispose();
		//PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14802- added retainContextWhenHidden: true in order to retain the state of the webview when navigated to another tab.
		updateAppPanel = vscode.window.createWebviewPanel(
			"catCodingx",
			"Repostiory",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);
		let logContent: FileLogFormat = await getlogFileData();
		if ((action == "revert" || action == "update") && !logContent.from_query) {
			vscode.window.showInformationMessage(
				`Please do the checkout first to use ${action} all`
			);
		}
		//PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14802- checking if releasedVersionsCheckout function is present or not.
		let bReleasedVersionsCheckoutPossible = false;
		if (action == "checkout") {
			let res = await sendRequestToNodeServer("checkReleasedVersionsCheckout", {});
			debugger;
			bReleasedVersionsCheckoutPossible = res == "true" ? true : false;
		}
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Passing bReleasedVersionsCheckoutPossible to getAppListWebView
		updateAppPanel.webview.html =
			action == "checkout"
				? getAppListWebView(logContent, action, bReleasedVersionsCheckoutPossible)
				: getAppListWebView(logContent, action, false);
		updateAppPanel.webview.onDidReceiveMessage(async (message) => {
			let sAction = message?.data?.actionType; //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
			switch (message.command) {
				case "operationOnSelectedApps":
					//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Moved the method of sending request and getting the response to handleReleasedVersionCheckout and handleRequest
					try {
						if (message.data.selectedApps.length == 0) {
							vscode.window.showInformationMessage("No Apps selected");
							updateAppPanel.dispose();
							break;
						}
						if (action === "checkout" && sAction === "releasedVersionsCheckout") {
							//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
							await handleReleasedVersionCheckout(message, logContent);
						} else await handleRequest(action, message.data.selectedApps);
					} catch (error) {
						vscode.window.showWarningMessage(error);
					}
					updateAppPanel.dispose();
					if (action === "revert") {
						setTimeout(() => {
							vscode.commands.executeCommand("workbench.action.reloadWindow");
						}, 300);
					} else if (action == "checkout" && sAction != "releasedVersionsCheckout") {
						//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
						await restartServer();
					}
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

//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - to handle releasedVersionCheckout
async function handleReleasedVersionCheckout(message, logContent) {
	const selectedApp = message.data.selectedApps[0];
	const checkoutFVsKeys = logContent?.checkoutFVs ? Object.keys(logContent.checkoutFVs) : [];
	if (
		checkoutFVsKeys.length >= maxNumOfFlvToCheckout &&
		logContent.writeAbleFVs.includes(selectedApp)
	) {
		vscode.window.showWarningMessage(
			`Only ${maxNumOfFlvToCheckout} Apps of current versions can be checked out.`
		);
	} else if (checkoutFVsKeys.includes(selectedApp))
		vscode.window.showWarningMessage(`${selectedApp} already checked out.`);
	else await handleRequest(message.data.actionType, message.data.selectedApps);
}
//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - to handle Request
async function handleRequest(action: RepoActions, selectedApps) {
	const res = await sendRequestToNodeServer(action, { selectedApps: selectedApps });
	let resData = typeof res == "string" ? safeParseJSON(res) : res;
	let msgType: "error" | "info" | "success" | "warning" = resData?.msgType || "info";
	let message = resData?.msgBody || res;
	if (action == "releasedVersionsCheckout" && !message) {
		message = "The Feature is only available on KloBase version 7-2-66 and above";
	}
	const editedMessage = await responseCheck(message);
	if (msgType == "error") vscode.window.showErrorMessage(editedMessage);
	else if (msgType == "warning") vscode.window.showWarningMessage(editedMessage);
	else vscode.window.showInformationMessage(editedMessage);
}
//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - to Parse the response
function safeParseJSON(json: string) {
	try {
		return JSON.parse(json);
	} catch {
		return json;
	}
}
// save // update // revert single file
async function singleFileOperation(operation: RepoActions) {
	try {
		// let currentWorkingFileUri = vscode.window.activeTextEditor?.document.uri;//PR0050 @Nayan 05AUG2024 PROC-7452-commented and added below
		//#region
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage("No active text editor found.");
			return;
		}
		let workspacePath: string = (
			vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
		)[0].uri.path.slice(1);
		if (!workspacePath) {
			vscode.window.showErrorMessage("Active file is not within a workspace.");
			return;
		}
		let document = editor.document;
		let currentWorkingFileUri = document.uri;
		//#endregion
		let cdn_app_path = currentWorkingFileUri?.path.split("/src/")[1];
		if (cdn_app_path) {
			let flavor_path = cdn_app_path.split("/");
			if (cdn_app_path && flavor_path.length >= 2) {
				if (
					cdn_app_path.includes("metadata/") ||
					cdn_app_path.includes("query_gen/") ||
					cdn_app_path.includes("entity_gen/") ||
					cdn_app_path.endsWith("tsconfig.json")
				) {
					//PR0050 @Nayan 01Aug2024 PROC-10718
					window.showInformationMessage(
						"User is not allow to " + operation + " " + cdn_app_path
					);
					return;
				}
				if (!(await isServerRunning())) {
					await startRepoServer();
				}
				await waitForServerToRun();
				let index = cdn_app_path.indexOf("/");
				let r_file_path = cdn_app_path.slice(index + 1);
				let flv: string = cdn_app_path.split("/")[0].split("_").slice(0, -1).join("_");
				let ver: string = cdn_app_path.split("/")[0].split("_")[
					cdn_app_path.split("/")[0].split("_").length - 1
				];
				/*PR0037 @Prashant 29Dec2023 FBranch6-0 PROC2745 */
				let appVer: string = flv + "_" + ver;
				let reqData: { [key: string]: string[] } = {};
				reqData[appVer] = [r_file_path];
				await sendRequestToNodeServer("updateFileStatus", {}); //PR0050 @Nayan 05AUG2024 -added as it should go for action based on current status
				let logFileContent: FileLogFormat = await getlogFileData();
				if (logFileContent.internalNonEditableApps.includes(appVer)) {
					return window.showInformationMessage(
						appVer + " is not assigned as a writable app."
					);
				} //PR0050 @Nayan 13AUG2025 F7.2.XX_25_27-29 PROC-19721 - added to store internalApps
				let status = logFileContent.from_query?.[appVer][r_file_path].status;
				if (status == FileStatus.conflict && operation != "revert") {
					window.showInformationMessage(
						"Conflict Exists.Please resolve conflict to move forward"
					);
					return;
				}
				//let token: string = (isAuth) ? Token : await auth(); // TODO AUTH
				window
					.showQuickPick(["Yes", "No"], {
						placeHolder: "Do you wish to " + operation + " " + cdn_app_path + "?",
					})
					.then(async (response) => {
						if (response === "Yes") {
							//PR0076 @Pooja 24Mar2025 PROC-7452-added For checking compilation errors in file.
							let outputChannel = await getOutputChannel();
							outputChannel.clear();
							if (
								operation == "commit" &&
								(cdn_app_path.endsWith(".ts") || cdn_app_path.endsWith(".tsx")) &&
								!cdn_app_path.endsWith(".d.ts")
							) {
								let flavorToFindConfig: string[] = [
									path.resolve(workspacePath, "src", appVer),
								];
								let diagnostics;
								//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290 - using withLoader
								try {
									await withLoader(`Checking for errors..`, async () => {
										diagnostics = await checkForErrorsInModifiedFile(
											[document.uri.fsPath],
											flavorToFindConfig
										);
									});
								} catch (error) {
									vscode.window.showErrorMessage("Error : " + error.message);
									return;
								}
								if (diagnostics && Object.keys(diagnostics)?.length > 0) {
									await displayErrors(diagnostics, reqData, operation);
								}
								//endregion
								else {
									let res: any = await sendRequestToNodeServer(operation, {
										selectedFiles: reqData,
										isSingleOperation: true,
									});
									let edited_res: any = await responseCheck(res);
									window.showInformationMessage(edited_res);
								}
							} else {
								let res: any = await sendRequestToNodeServer(operation, {
									selectedFiles: reqData,
									isSingleOperation: true,
								});
								// window.showInformationMessage(res);//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
								let edited_res: any = await responseCheck(res);
								window.showInformationMessage(edited_res);
							}
						}
					});
			}
		} else window.showInformationMessage("Files only in workspace can be " + operation + "ed");
	} catch (error: any) {
		vscode.window.showErrorMessage(operation + " error : " + error.message);
	}
}

function getRepoMethodsData(repoActions: RepoActions): { url: string; actionName: string } {
	return actions[repoActions];
}

async function isServerRunning() {
	let response = await sendRequestToNodeServer("ping", {});
	return response ? true : false;
}

async function waitForServerToRun() {
	while (true) {
		let response = null;
		try {
			response = await sendRequestToNodeServer("ping", {});
			if (response && response.toString() == "OK") break;
			let waitingPromise = new Promise(async (res, rej) => {
				setTimeout(() => {
					res(null);
				}, 1000);
			});
			await waitingPromise;
		} catch (err) {
			continue;
		}
	}
	return;
}

async function sendRequestToNodeServer(repoMethods: RepoActions, data: any) {
	vsclientPort = vsclientPort
		? vsclientPort
		: JSON.parse(
				fs.readFileSync(
					`${(
						vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
					)[0].uri.path.slice(1)}/kloconfig/klarion.json`,
					{ encoding: "utf-8" }
				)
		  ).vsclientPort;
	let url = getRepoMethodsData(repoMethods).url;
	data["action"] = getRepoMethodsData(repoMethods).actionName;
	data["reqid"] = Date.now();
	try {
		let responseBuffer = await sendRequestHttp(
			vsClientIP + vsclientPort + "/" + url,
			"POST",
			{ "Content-Type": "application/json" },
			data
		);
		return responseBuffer.toString();
	} catch (err) {}
}

async function sendUserInfo(message?: any) {
	let userInfo = {
		userId: message.data.userid,
		password: message.data.password,
	};
	try {
		let responseBuffer = await sendRequestToNodeServer("registerUser", { userInfo: userInfo });
		return responseBuffer && responseBuffer.toString();
	} catch (err) {}
}

async function createKlarionConfig(
	urlString: string,
	userid: string,
	password: string,
	setup_type: Boolean,
	vsclientPort: string
) {
	let klarionFileContent: any = {};
	let isPublicNode: Boolean = setup_type;
	let urlObj: url.UrlObject = url.parse(urlString);
	// let context = urlObj.path?.split('/')[1];
	let landscape = urlObj.path?.split("/")[2];
	let wildflyport = urlObj.port ? ":" + urlObj.port : "";
	let workspacePath: string = (
		vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
	)[0].uri.path.slice(1);
	if (!fs.existsSync(`${workspacePath}/kloconfig/klarion.json`)) {
		fs.mkdirSync(`${workspacePath}/kloconfig`, { recursive: true });
		klarionFileContent.ipAddress = urlObj.hostname;
		klarionFileContent.port = !wildflyport ? "443" : wildflyport;
		klarionFileContent.port = wildflyport.replace(":", "");
		klarionFileContent.landscape = landscape;
		klarionFileContent.mmid = userid;
		// klarionFileContent.webContext = context;
		klarionFileContent.isPublicNode = isPublicNode;
		klarionFileContent.url = urlString;
		klarionFileContent.vsclientPort = parseInt(vsclientPort);
		fs.writeFileSync(
			`${workspacePath}/kloconfig/klarion.json`,
			JSON.stringify(klarionFileContent, null, 4)
		);
	}
	return klarionFileContent;
}

async function getlogFileData(flavorPath?: string): Promise<FileLogFormat> {
	let logContent = JSON.parse(
		fs.readFileSync(
			`${(vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[])[0].uri.path.slice(
				1
			)}/.vscode/log.json`,
			{ encoding: "utf-8" }
		)
	);
	if (flavorPath) {
		return logContent.from_query[flavorPath];
	}
	return logContent;
}

function createStatusBarItem(text: string, tooltip: string, command: string) {
	let saveCurrent = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	saveCurrent.text = text; //💾🖫💾🖪🖬Å
	saveCurrent.tooltip = tooltip;
	saveCurrent.command = command;
	saveCurrent.show();
}
export function deactivate() {
	vscode.workspace.getConfiguration().update("workbench.colorTheme", "Default Dark+");
}
async function startRepoServer() {
	let AllExistingTerminals = vscode.window.terminals;
	let shellPath = getDefaultShellForPlatform(); ////PR0014 Karthick 29 APR 2025 PROC - 17739
	let repositoryServer = AllExistingTerminals.filter(
		(Terminal) => Terminal.name === "PrivateNodeServer"
	)[0];
	if (!repositoryServer) {
		repositoryServer = vscode.window.createTerminal({
			////PR0014 Karthick 29 APR 2025 PROC - 17739
			name: "PrivateNodeServer",
			shellPath: shellPath,
		});
		repositoryServer.show();
	}
	repositoryServer.sendText(`npm run kloServerStart`);
	return;
}
//PR0014 Karthick 29 APR 2025 PROC - 17739
function getDefaultShellForPlatform() {
	const platform = os.platform();
	if (platform === "win32") {
		return "cmd.exe"; // or 'powershell.exe' if preferred
	}
	//TODO
	// else if (platform === "darwin" || platform === "linux") {
	// 	return "/bin/bash"; // or check user preferences if needed
	// }
	return undefined; // fallback to VS Code default
}

async function createResourceFiles(context: vscode.ExtensionContext) {
	var copyRecursiveSync = async function (src: string, dest: string) {
		var exists = await fs.existsSync(src);
		var destexists = fs.existsSync(dest);
		var stats: any = exists && fs.statSync(src);
		var isDirectory = exists && stats.isDirectory();
		if (isDirectory) {
			if (!destexists) {
				fs.mkdirSync(dest);
			}
			fs.readdirSync(src).forEach(function (childItemName) {
				copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
			});
		} else {
			if (!destexists) {
				if (dest.includes("txconfig.json")) {
					dest = dest.replace("txconfig.json", "tsconfig.json");
				}
				await fs.promises.copyFile(src, dest);
			}
		}
	};
	let resourcePath = fs.existsSync(`${context.extensionPath}/lib/klobaseIDE-6.0/resources`)
		? `${context.extensionPath}/lib/klobaseIDE-6.0/resources`
		: `${context.extensionPath}/resources`;
	copyRecursiveSync(
		resourcePath,
		`${(vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[])[0].uri.path.slice(1)}`
	);
}

// async function registerPullFilesMethod(){
// 	let res:any = await sendRequestToNodeServer("registerCallBackMethod",{})
// 	vscode.window.showErrorMessage("Login Error " + res);
// }

async function createConfigFile(url: string, klarionData: any, token: string, bolVersion: string) {
	let workspacePath: string = (
		vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
	)[0].uri.path.slice(1);
	let domain: string = klarionData.port
		? `${klarionData.ipAddress}:${klarionData.port}`
		: `${klarionData.ipAddress}`;
	let url1 = `https://${domain}/node/${klarionData.landscape}/core_fw_${bolVersion}/getConfig`;
	// let configFileUrl: string = url.split('/index.html')[0] + "/kloConfig/config.json"
	// configFileUrl = configFileUrl.replace('/p6/','/fs/')
	let headers = { Authorization: token };
	//let headers = {};
	try {
		let res: Buffer = await sendRequestHttp(url1, "GET", headers, {});
		let configXml: any = JSON.parse(res.toString());
		configXml["mm_landscape_db"].forEach((item: any) => {
			Object.keys(item).forEach((key) => {
				if (key != "database_name" && key != "type") {
					delete item[key];
				}
			});
		});
		await writeFile(`${workspacePath}/kloconfig/config.json`, JSON.stringify(configXml));
	} catch (error: any) {
		throw Error(
			error.message + " Unable to reach server, please check your internet connections"
		);
	}
}

async function getBearerToken(
	userId: string,
	password: string,
	domain: string,
	port: string,
	configData
) {
	//PR0018 @Amit 05Sep2024 PROC-7336
	let origin = port ? `https://${domain}:${port}` : `https://${domain}`;
	let params = {
		client_id: "multi-tenant",
		grant_type: "password",
		password: password,
		scope: "offline_access",
		username: userId,
	};
	let headers = { "content-type": "application/x-www-form-urlencoded" };
	let url: string =
		`${origin}/auth/realms/` +
		(configData.realmId || "cloud_app") +
		`/protocol/openid-connect/token`; //PR0018 @Amit 05Sep2024 PROC-7336
	try {
		let tokendata: Buffer = await sendRequestHttp(url, "POST", headers, params);
		let refreshData = JSON.parse(tokendata.toString());
		if (refreshData.error || refreshData.error_description) {
			throw Error(refreshData.error_description);
		}
		let refresh_token = refreshData.refresh_token;
		let refParams = {
			client_id: "multi-tenant",
			grant_type: "refresh_token",
			refresh_token: refresh_token,
		};
		let bearerTokenData = await sendRequestHttp(url, "POST", headers, refParams);
		return "Bearer " + JSON.parse(bearerTokenData.toString()).access_token;
	} catch (err) {
		throw Error(err.error_description || "Invalid user credentials"); // PR0018 @Amit 22Nov2024 F6.0 IPROC-13462
	}
}
// function getWebviewContent(uri:string) {//PR0050 @Nayan 04DEC2024 IPROC-12624 - passing portNumber
function getWebviewContent(uri: string, nportToBeUsed?: number) {
	return `<!DOCTYPE html>
	<html lang="en">

	<head>
		<style>
			/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
			:root {
				--vscode-input-foreground: var(--vscode-editor-foreground);
				--vscode-input-background: var(--vscode-editor-background);
			}
			.floating-form {
				width: 420px;
				margin:15px;
			}

			/****  floating-Lable style start ****/
			.floating-label {
				position: relative;
				margin-bottom: 20px;
			}

			.floating-input,
			.floating-select {
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				color: var(--vscode-input-foreground,white);
				font-size: 14px;
				padding: 4px 4px;
				display: block;
				width: 100%;
				height: 30px;
				background-color: transparent;
				border: none;
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				border-bottom: 1px solid var(--vscode-input-border,var(--vscode-foreground, #757575));
			}

			.floating-input:focus,
			.floating-select:focus {
				outline: none;
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				border-bottom: 2px solid var(--vscode-focusBorder,#5264AE);
			}

			label {
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				color: var(--vscode-input-placeholderForeground,#999);
				font-size: 14px;
				font-weight: normal;
				position: absolute;
				pointer-events: none;
				left: 5px;
				top: 5px;
				transition: 0.2s ease all;
				-moz-transition: 0.2s ease all;
				-webkit-transition: 0.2s ease all;
			}

			#showAdvnc{
				pointer-events: all !important;
				cursor:pointer;
				text-decoration:underline;
			}

			.floating-input:focus~label,
			.floating-input:not(:placeholder-shown)~label {
				top: -18px;
				font-size: 14px;
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				color: var(--vscode-focusBorder,#5264AE);
			}

			.floating-select:focus~label,
			.floating-select:not([value=""]):valid~label {
				top: -18px;
				font-size: 14px;
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				color: var(--vscode-input-foreground, white);
			}
			
			/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
			option {
				background: var(--vscode-input-background);
				color: var(--vscode-input-foreground, white);
			}

			/* active state */
			.floating-input:focus~.bar:before,
			.floating-input:focus~.bar:after,
			.floating-select:focus~.bar:before,
			.floating-select:focus~.bar:after {
				width: 50%;
			}

			*,
			*:before,
			*:after {
				-webkit-box-sizing: border-box;
				-moz-box-sizing: border-box;
				box-sizing: border-box;
			}

			.floating-textarea {
				min-height: 30px;
				max-height: 260px;
				overflow: hidden;
				overflow-x: hidden;
			}

			/* highlighter */
			.highlight {
				position: absolute;
				height: 50%;
				width: 100%;
				top: 15%;
				left: 0;
				pointer-events: none;
				opacity: 0.5;
			}

			/* active state */
			.floating-input:focus~.highlight,
			.floating-select:focus~.highlight {
				-webkit-animation: inputHighlighter 0.3s ease;
				-moz-animation: inputHighlighter 0.3s ease;
				animation: inputHighlighter 0.3s ease;
			}

			/* animation */
			@-webkit-keyframes inputHighlighter {
				from {
					/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
					background: var(--vscode-focusBorder, #5264AE);
				}

				to {
					width: 0;
					background: transparent;
				}
			}

			@-moz-keyframes inputHighlighter {
				from {
					/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
					background: var(--vscode-focusBorder, #5264AE);
				}

				to {
					width: 0;
					background: transparent;
				}
			}

			option {
				background: #5264AE
			}

			@keyframes inputHighlighter {
				from {
					/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
					background: var(--vscode-focusBorder, #5264AE);
				}

				to {
					width: 0;
					background: transparent;
				}
			}

			/****  floating-Lable style end ****/
			#error_message {
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				color: var(--vscode-errorForeground, red);
			}

			#notification_message {
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				color: var(--vscode-notificationsWarningIcon-foreground, orange);
			}

			#success_message {
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				color: var(--vscode-notificationsInfoIcon-foreground, green);
			}

			.select_path {
				/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors*/
				color: var(--vscode-textLink-foreground, #007fd4);
			}

			/*PR0050 @Nayan 21JAN2025 PROC-14691- Using VSCODE theme colors.Add styles for the button */
			.m-btn {
				background-color: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border: none;
				padding: 8px 16px;
				cursor: pointer;
				border-radius: 2px;
			}

			.m-btn:hover {
				background-color: var(--vscode-button-hoverBackground);
			}

			/* Style links */
			a {
				color: var(--vscode-textLink-foreground, #007fd4);
				text-decoration: none;
			}

			a:hover {
				color: var(--vscode-textLink-activeForeground);
				text-decoration: underline;
			}

			* {
				margin: 0;
				padding: 0;
			}

			#container {
				height: 100%;
				width: 100%;
				font-size: 0;
			}

			#left,
			#middle,
			#right {
				display: inline-block;
				*display: inline;
				zoom: 1;
				vertical-align: top;
				font-size: 12px;
			}

			#left {
				width: 50%;
			}

			#middle {
				width: 50%;
			}
            .advance{
				display:none
			}
			.mt-10{
				margin-top: 10px;
			}
		</style>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>${sIdeName} SETUP</title>
	</head>

	<body>
		<script>
			const vscode = acquireVsCodeApi();
			var isAppAlive = false;
			function KloServerStart(){
				vscode.postMessage({
					command: 'KloServerStart'
				})
			}
			function killKlo(){
				vscode.postMessage({
					command: 'Kill'
				});
			}
			function isNull(formElements) {
				let isNull = false;
				formElements.forEach(formElement => {
					if (!formElement || formElement == null || formElement == "")
						isNull = true;
				})
				return isNull
			}

			vscode.postMessage({
				command: 'check_klarion_file'
			})
			async function initializeWorkspace() {
				let workspace = document.getElementById('workspace').value;
				let setup_type = JSON.parse(document.getElementById('setup_type').value);
				const pubilcNode = true;
				debugger;
				if (!isNull([workspace]) || setup_type == pubilcNode) {
					vscode.postMessage({
						command: 'initializeWorkspace',
						data: {
							workspace: workspace
						}
					})
				}

			}
			function disableElements(Elements){
				for(let i=0;i<Elements.length;i++){
					Elements[i].disabled=true;
					Elements[i].style.color="grey"
				}
			}
			async function pingApp() {
				let appUrl = document.getElementById('appUrl').value;
				if (!isNull([appUrl])) {
					vscode.postMessage({
						command: 'isWildFlyAlive',
						data: {
							url: appUrl
						}
					})
				} else {
					document.getElementById('error_message').innerText = 'Not a valid url';
				}
			}
            function toggleAdvance(event){
				let showAdvOpt = (event.currentTarget.innerText == 'Advance Settings') ? true : false;
				let displayText=showAdvOpt?'Show Less':'Advance Settings';
				let display=showAdvOpt?'block':'none';
					let advElements=document.getElementsByClassName("advance");
					for(i=0;i<advElements.length;i++)
    					{
							advElements[i].style.display=display;
    					}
						document.getElementById('showAdvnc').innerHTML=displayText;
			}
			async function submit() {
				debugger;
				document.getElementById('error_message').innerText = '';
				let appUrl = document.getElementById('appUrl').value;
				let userid = document.getElementById('userid').value;
				let password = document.getElementById('password').value;
				let setup_type = document.getElementById('setup_type').value;
				let vsclientPort = document.getElementById('vsclientPort').value;
				if (!isNull([appUrl, userid, password, setup_type, vsclientPort])) {
					debugger;
					let Applink=document.getElementById('AppLink');
					Applink.href=(setup_type==true)?appUrl.url:"https://procifynowide.com:"+vsclientPort+ "/p6" + appUrl.split("p6")[1];
					if (isAppAlive) {
						vscode.postMessage({
							command: 'register',
							data: {
								url: appUrl,
								userid: userid,
								password: password,
								setup_type: setup_type,
								vsclientPort: vsclientPort

							}
						})
						Applink.hidden = false;
						KillSwitch.hidden = false;
						document.getElementById('error_message').innerText = "";
						document.getElementById('success_message').innerText = "";
						document.getElementById('notification_message').innerText =
							'Waiting for pre-initialization process to complete...';
					} else {
						document.getElementById('error_message').innerText = 'Please fill all the fields';
					}
				} else {
					document.getElementById('error_message').innerText = 'Please fill all the fields';
				}
			}
			window.addEventListener('message', event => {
				console.log("inside listener");
				const message = event.data; // The JSON data our extension sent
				switch (message.command) {
					case 'updateWebView':
						debugger;
						console.log("reached");
						if (message.data.isKlarionFile || message.data.isIdeFile) {
							if (message.data.isAuthenticated) {
								var fields = document.getElementById("form_div").getElementsByTagName('*');
								for (var i = 0; i < fields.length; i++) {
									fields[i].disabled = true;
								}
								document.getElementById("sub").disabled = true;
							}
							let appUrl=document.getElementById('appUrl');
							let userid=document.getElementById('userid');
							let landscape=document.getElementById('landscape');
							let wildFly_port=document.getElementById('wildFly_port');
							let setupType=document.getElementById('setup_type');
							let vsclientPort=document.getElementById('vsclientPort');
							appUrl.value = message.data.url;
							userid.value = message.data.mmid;
							landscape.value = message.data.landscape;
							wildFly_port.value = message.data.wildflyport;
							setupType.value = message.data.setup_type;

							vsclientPort.value = message.data.vsclientPort;
							if(message.data.isIdeFile)
								document.getElementById('password').value =message.data.password;
							else
								document.getElementById('password').value = "";

							let ElementsToDisable=[appUrl,userid,landscape,wildFly_port,setupType];
							(message.data.workspace)?ElementsToDisable.push(workspace):""
							disableElements(ElementsToDisable);

							/*if(!message.data.isIdeFile && !message.data.isSetupStarted){
								document.getElementById('notification_message').innerText =
								'Waiting for pre-initialization process to complete...';
							}*/

							let Applink=document.getElementById('AppLink');
							let KillSwitch=document.getElementById('KillSwitch');
							debugger;
	
							Applink.href=(message.data.setup_type==true)?message.data.url:"https://procifynowide.com:"+ message.data.vsclientPort+ "/p6" +message.data.url.split("p6")[1];
							Applink.hidden=false;
							KillSwitch.hidden=false;
							if (message.data.setup_type == false) {
								//document.getElementById('form_div2').hidden = false;
							}
							vscode.postMessage({
								command: 'isWildFlyAlive',
								data: {
									url: message.data.url
								}
							})
						}

						break;
					case 'isWildFlyAlive':
						debugger;
						document.getElementById('error_message').innerText = "";
						document.getElementById('success_message').innerText = "";
						if (message.data) {
							document.getElementById('success_message').innerText = "valid url";
							document.getElementById('wildFly_port').value = message.data.wildflyport;
							document.getElementById('landscape').value = message.data.landscape;
							isAppAlive = true;
						} else {
							document.getElementById('error_message').innerText =
								"wildfly server not alive or invalid url";
						}
						break;
					case 'error_message':
						document.getElementById('success_message').innerText = "";
						document.getElementById('error_message').innerText = message.data;
						document.getElementById('notification_message').innerText = '';
						break;
					case 'success_message':
						document.getElementById('success_message').innerText = message.data;
						document.getElementById('error_message').innerText = "";
						document.getElementById('notification_message').innerText = '';
						if (message.data == "registration sucessfull") {
							// if (JSON.parse(document.getElementById('setup_type').value) == false) {
							// 	document.getElementById('form_div2').hidden = false;
							// } else {
							// 	document.getElementById('form_div2').hidden = true;
							// }
						}
						break;
					case 'forceSubmit':
						submit();
						break;

				}
			});
		</script>

		<center>
		<a style="position:absolute;right:5%;top:86%;cursor: pointer;" onClick='KloServerStart()'><u>Start local server</u></a>
		<a id="AppLink" style="position:absolute;right:5%;top:82%;" title="Make chrome your default browser to open with chrome!" hidden>Open Application in Browser</a>
			<div id="form_div">
				<form class="my-form" onsubmit="event.preventDefault();">
					<div class="container">
						<!-- PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Changed Klarion IDE SETUP to Procify IDE SETUP -->
						<h1 style="padding: 20px;">${sIdeName} Setup</h1>
						<p id='error_message'></p>
						<p id='notification_message'></p>
						<p id='success_message'></p>
						<div class="floating-form">
							<div class="floating-label">
							<input type="text" class="floating-input" id='appUrl' placeholder="" onChange='pingApp()' value=${
								uri ? uri : ""
							} disabled=${uri ? true : false} required>
								<span class="highlight"></span>
								<label>Application index url</label>
								<p>Example:https://domain_name.com/p6/landscape_name/index.html</p>
							</div>
							<div class="floating-label" style="display:none">
								<input type="text" class="floating-input" id='wildFly_port' placeholder="" required>
								<span class="highlight"></span>
								<label>Wildfly port</label>
							</div>
							<div class="floating-label" style="display:none">
								<input type="text" class="floating-input" id='landscape' placeholder="" required>
								<label>Landscape</label>
							</div>
							<div class="floating-label">
								<input type="text" class="floating-input" id='userid' onChange='pingApp()' placeholder="" required>
								<label>UserId</label>
							</div>
							<div class="floating-label">
								<input type="password" class="floating-input" id='password' placeholder="" required>
								<label>Password</label>
							</div>
							<div class="floating-label">
								<label id='showAdvnc' onClick="toggleAdvance(event)">Advance Settings</label>
								<br><br>
							</div>
							<div class="floating-label advance">
								<!-- <input type="text" class="floating-input" id='vsclientPort' placeholder="" value="3001" required>  PR0050 @Nayan 04DEC2024 IPROC-12624 - Commented and added below-->
								<input type="text" class="floating-input" id='vsclientPort' placeholder="" value="${
									nportToBeUsed ? nportToBeUsed : 3001
								}" required>
								<label>Port</label>
							</div>
							<div class="floating-label advance">
								<select class="floating-input" id="setup_type" disabled="true">
									<option value="false">Private</option>
									<option value="true">Public</option>
								</select>
								<label>Setup Type</label>
							</div>
						</div>
					</div>
				</form>
				<button id='sub' class="m-btn select_path" onClick='submit()'>Start Setup</button>
			</div>
		</center>
		<a id="KillSwitch" onClick=killKlo() style="position:absolute;right:5%;top:90%;text-decoration: underline;cursor: pointer;" hidden>Stop local Server</a>
	</body>
	</html>`;
}

/**
 * options={
 * hostname: 'agelqa.massetic.com',
 * rejectUnauthorized: false,
 * path: '/Klarion/u/MAS_DEV/fs/moast4_ui_1/package.json',
 * method: 'GET'
 * }
 */
function sendRequestHttp(
	urlString: string,
	method: string,
	headers: any,
	data: any = undefined
): Promise<Buffer> {
	let options: https.RequestOptions = {};
	let opt: url.UrlObject = url.parse(urlString);
	options.hostname = opt.hostname;
	options.port = opt.port;
	options.path = opt.path;
	options.method = method;
	options.rejectUnauthorized = false;
	options.headers = headers;
	return new Promise(async (resolve, reject) => {
		let req: ClientRequest = https
			.request(options, (res) => {
				let chunks: Array<Buffer> = [];
				console.log("statusCode:", res.statusCode);
				if (res.statusCode === 404) {
					reject(res.statusCode);
				} else {
					console.log("headers:", res.headers);
					var output;
					if (res.headers["content-encoding"] === "gzip") {
						var gzip = zlib.createGunzip();
						res.pipe(gzip);
						output = gzip;
					} else {
						output = res;
					}
					output.on("data", (d: Buffer) => {
						chunks.push(d);
						// resolve(d);
						// console.log(d.toString());
					});
					output.on("end", (d: Buffer) => {
						let body = Buffer.concat(chunks);
						if (res.statusCode == 500) {
							reject(JSON.parse(body.toString()));
						} else {
							resolve(body);
						}
					});
				}
			})
			.on("error", (e) => {
				reject(e);
				console.error(e);
			});
		if (data) {
			var postData: any;
			if (headers["content-type"] === "application/x-www-form-urlencoded") {
				postData = querystring.stringify(data);
			} else {
				postData = JSON.stringify(data);
			}
			req.write(postData);
		}
		req.end();
	});
}

async function addDefaultFlavor(klarionData, configData) {
	//PR0018 @Amit 05Sep2024 PROC-7336
	let workspacePath: string = (
		vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
	)[0].uri.path.slice(1);
	// //let klarionData = JSON.parse(fs.readFileSync(`${workspacePath}/kloconfig/klarion.json`, { encoding: 'utf-8' }));		//PR0018 @Amit 05Sep2024 PROC-7336

	// let configData = await getDefaultBVData(klarionData);
	// let domain: string = klarionData.port? `${klarionData.ipAddress}:${klarionData.port}` : `${klarionData.ipAddress}`;
	// let url = `https://${domain}/p6/adm/${klarionData.landscape}/core_fw_1/getDefaultBV`  // `${baseUrl.split('/p6/')[0]}/p6/p6/${landscape}/core_fw_1/getDefaultBV`
	// try{
	// 	configData = await sendRequestHttp(url,"GET",{})
	// 	configData  =JSON.parse(configData.toString())
	// }catch(err){
	// 	throw Error("Public server not responding");
	// }
	let package_json_path: string = path.join(workspacePath, "package.json");
	let packageData = JSON.parse(fs.readFileSync(package_json_path, { encoding: "utf-8" }));
	packageData.scripts.kloServerStart = packageData.scripts.kloServerStart.includes(
		`kloBolServer_${configData.bol_version}`
	)
		? packageData.scripts.kloServerStart
		: packageData.scripts.kloServerStart.replace(
				"kloBolServer",
				`kloBolServer_${configData.bol_version}`
		  );
	const script_splitup: string[] = (packageData.scripts.kloServerStart as string).split(" ");
	const darwin_script: string = `${script_splitup[0]} --unhandled-rejections=warn ${script_splitup[2]}`;
	packageData.scripts.kloServerStart = darwin_script;
	fs.writeFileSync(package_json_path, JSON.stringify(packageData, null, 4));
	let promiseCollector = [];
	let KloBaseversion = configData.bol_version;
	let baseUrl = `https://${klarionData.ipAddress}:${klarionData.port}/fs/${klarionData.landscape}/cdn_app/`;
	promiseCollector.push(
		downloadAndExtract(`${baseUrl}kloBo_${KloBaseversion}.zip`, `kloBo_${KloBaseversion}`),
		downloadAndExtract(`${baseUrl}kloExternal_0.zip`, "kloExternal_0"),
		downloadAndExtract(`${baseUrl}deca_${KloBaseversion}.zip`, `deca_${KloBaseversion}`),
		downloadAndExtract(
			`${baseUrl}kloBolServer_${KloBaseversion}.zip`,
			`kloBolServer_${KloBaseversion}`
		)
		/*downloadAndExtract(`${baseUrl}node_modules.zip`, "node_modules", true)*/
	);
	try {
		await Promise.all(promiseCollector);
		//@ts-ignore
		//zipDownloadPromise.resolve();
		console.log("extracted default flavors and klobase");
	} catch (err) {
		console.log(err);
	}
	return true;
}
function downloadAndExtract(zipUrl: string, flavor: string, isNodeModules = false): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			let workspacePath: string = (
				vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
			)[0].uri.path.slice(1);
			const cdn_app_path = path.join(workspacePath, "cdn_app");
			const flavor_path = path.join(workspacePath, flavor);
			if (isNodeModules && fs.existsSync(flavor_path)) {
				resolve();
				return;
			}
			let zipFileBuffer = await sendRequestHttp(zipUrl, "GET", {}, {});
			if (!fs.existsSync(cdn_app_path)) {
				fs.mkdirSync(cdn_app_path);
			}
			const zip_file_name: string = flavor + ".zip";
			let zip_path = path.join(cdn_app_path, zip_file_name);
			if (process.platform === "darwin") {
				zip_path = "/" + zip_path;
				workspacePath = "/" + workspacePath;
			}
			await writeFile(zip_path, zipFileBuffer);
			if (isNodeModules) await extract(zip_path, { dir: workspacePath });
			else {
				let extract_dir = path.join(workspacePath, "closedmodules");
				await extract(zip_path, { dir: extract_dir });
			}
			resolve();
		} catch (err) {
			console.error(err);
			reject(err);
		}
	});
}

async function readFile(dest: string): Promise<string> {
	return new Promise((resolve, reject) => {
		fs.readFile(dest, { encoding: "utf-8" }, (err, response) => {
			if (err) {
				reject(err);
			}
			resolve(response);
		});
	});
}
async function writeFile(dest: string, data: Buffer | string): Promise<void> {
	return new Promise((resolve, reject) => {
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.writeFile(dest, data, { flag: "w", encoding: "utf-8" }, (err: any) => {
			if (err) {
				reject(err);
			}
			resolve();
		});
	});
}
function _isKlarionWorksapce(): boolean {
	if (!isKlarionWorksapce) {
		let path: string = `${(
			vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
		)[0].uri.path.slice(1)}/kloconfig/klarion.json`;
		isKlarionWorksapce = fs.existsSync(path);
	}
	return isKlarionWorksapce;
}

// 3 modified // 4 newly created // -1 local Deleted // 5 coflict // 2 renamed
let Svncolors_description1: any = {
	"4": { color: "#075b77", messages: "newly created file" },
	"3": { color: "yellow", messages: "modified file name" },
	"-1": { color: "#F5F5DC", messages: "deleted file name" },
	"2": { color: "#808080", messages: "file has been renamed" },
	"5": { color: "red", messages: "Conflict exits" },
};

//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - changed the Svncolors_description to Svncolors_description1 and using style class below inplace of hardcoded colors
let Svncolors_description: any = {
	"4": { color: "newly_created_pvt_files", messages: "newly created file" },
	"3": { color: "modified_pvt_files", messages: "modified file name" },
	"-1": { color: "deleted_pvt_files", messages: "deleted file name" },
	"2": { color: "renamed_pvt_files", messages: "file has been renamed" },
	"5": { color: "conflict_pvt_files", messages: "Conflict exits" },
};
/* function getSaveWebView(changedFiles: log) {
	let modified = [];
	let deleted = [];
	let created = [];
	let renamed = [];
	let conflict = [];
	let finalHtml = [];
	let All: any[] = [];
	let AllMerged: any = {
		...changedFiles.modified,
		...changedFiles.deleted,
		...changedFiles.newly_created,
		...changedFiles.renamed,
		...changedFiles.conflict,
	};
	//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:${color}" and using class="${color}"
	Object.keys(AllMerged)
		.sort()
		.forEach((fpath) => {
			//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - using conflict_pvt_files class in place of red color"
			let color =
				AllMerged[fpath].dirtystate == 5
					? "conflict_pvt_files"
					: Svncolors_description[AllMerged[fpath].dirtystate].color;
			let title =
				AllMerged[fpath].dirtystate == 5
					? "merge conflict"
					: Svncolors_description[AllMerged[fpath].dirtystate].messages;
			let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
			let inp = ``;
			if (AllMerged[fpath].dirtystate == 5) {
				//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:${color}" and using class="${color}" in label element
				inp = `<input id="${fpath}" type="checkbox" value="${
					fpath.split("@@")[1]
				}" appFolder="${AllMerged[fpath].appFolder}" dirtystate="${
					AllMerged[fpath].dirtystate
				}" onChange="onCheckEvent(event)" disabled/><label class="${color}" title="${title}" for="${aPath}">${aPath}</label><br />`;
			} else {
				//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:${color}" and using class="${color}"
				inp = `<input id="${fpath}" type="checkbox" value="${
					fpath.split("@@")[1]
				}" appFolder="${AllMerged[fpath].appFolder}" dirtystate="${
					AllMerged[fpath].dirtystate
				}" onChange="onCheckEvent(event)" /><label class="${color}" title="${title}" for="${aPath}">${aPath}</label><br />`;
			}
			All.push(inp);
		});
	for (let fpath of Object.keys(changedFiles.modified)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:yellow" and using class="modified_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.modified[fpath].appFolder}" dirtystate="${
			changedFiles.modified[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class="modified_pvt_files" for="${aPath}" title="modified file name">${aPath}</label><br />`;
		modified.push(inp);
	}
	for (let fpath of Object.keys(changedFiles.deleted)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:#F5F5DC" and using class="deleted_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.deleted[fpath].appFolder}" dirtystate="${
			changedFiles.deleted[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class= "deleted_pvt_files" for="${aPath}" title="file has been deleted">${aPath}</label><br />`;
		deleted.push(inp);
	}
	for (let fpath of Object.keys(changedFiles.newly_created)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:#075b77" and using class="newly_created_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.newly_created[fpath].appFolder}" dirtystate="${
			changedFiles.newly_created[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class= "newly_created_pvt_files" for="${aPath}" title="file has been created">${aPath}</label><br />`;
		created.push(inp);
	}
	for (let fpath of Object.keys(changedFiles.renamed)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:#808080" and using class="renamed_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.renamed[fpath].appFolder}" dirtystate="${
			changedFiles.renamed[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class= "renamed_pvt_files" for="${aPath}" title="file has been renamed">${aPath}</label><br />`;
		renamed.push(inp);
	}
	for (let fpath of Object.keys(changedFiles.conflict)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:red" and using class="conflict_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.conflict[fpath].appFolder}" dirtystate="${
			changedFiles.conflict[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class= "conflict_pvt_files" for="${aPath}" title="Conflict exists">${aPath}</label><br />`;
		conflict.push(inp);
	}
	let tabs: any = {
		All: {
			description:
				"Select the files which you want to Commit. Files with conflict cannot be selected/committed",
			selectedFiles: All,
		},
		modified: { description: "select all files to be saved", selectedFiles: modified },
		deleted: { description: "select all files to be deleted", selectedFiles: deleted },
		newly_created: {
			description: "select files to be added to the repository",
			selectedFiles: created,
		},
		conflict: {
			description:
				"Conflict exits. Either Revert or save your local files. Note : If you save your local file then all remote change will be removed",
			selectedFiles: conflict,
		},
	};
	for (let tab in tabs) {
		let conflictDisplay = "none";
		let colorDisplay = "none";
		let cDisplay = "block";
		if (tab == "conflict") {
			conflictDisplay = "block";
			cDisplay = "none";
		}
		if (tab == "All") colorDisplay = "block";
		let modTemp = `<div id="${tab}" class="tabcontent">
            <!--<h3>${tab}</h3> PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 -Commenting as Header can already be seen in the tabs -->
			<br />
			<!-- PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - To make the checkbox and label side by side -->
            <div class="selectALL-checkbox-container">
                <input id="SelectAll1" type="checkbox" onchange='selectAll(event)' />
                <label for="SelectAll1">Select All</label>
            </div>
            <p>${tabs[tab].description}</p>
            <br />
            ${tabs[tab].selectedFiles.join("")}
            <br />
            <button class='button-7' value="Commit" style="display:${cDisplay}" onClick=submit(event)>Commit</button>
			<button class='button-7' value="ConflictSave" style="display:${conflictDisplay}" onClick=resolvedConflict(event)>Commit</button>
			<br />
			<button class='button-7 mt-5' value="ConflictRevert" style="display:${conflictDisplay}" onClick=resolvedConflict(event)>Revert</button>
			<!-- //PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Moved the indicator below the button and using class to show colors instead of style="color:"-->
			<div class="file-status-implier">
				<p class="${Svncolors_description["4"].color}" style="display:${colorDisplay};">Newly created</p>
				<p class="${Svncolors_description["3"].color}" style="display:${colorDisplay};">Modified</p>
				<p  class="${Svncolors_description["-1"].color}" style="display:${colorDisplay};">Deleted</p> 
				<!-- <p class="${Svncolors_description["2"].color}" style="display:${colorDisplay};">Renamed</p> -->
				<p class="${Svncolors_description["5"].color}" style="display:${colorDisplay};">Conflict</p>    
            </div>
            <br />
            </div>`.replace(/(\r\n|\n|\r)/gm, "");
		finalHtml.push(modTemp);
	}
	let headSection = returnHtmlHead();
	// console.log(finalHtml.join(""))
	//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - onload="openCity(event, 'modified', true)" to make the modified tab active as event.currentTarget is not present when triggered onLoad
	return `<!DOCTYPE html>
	${headSection}\n
    <style>
		.tab-container {
			display: flex;
			margin-bottom: 10px;
			border-bottom: 1px solid var(--vscode-panel-border);
		}
		.tab {
			padding: 8px 14px;
			cursor: pointer;
			border: 1px solid transparent;
			border-radius: 6px 6px 0 0;
			margin-right: 4px;
			font-size: 13px;
			font-weight: 500;
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
			transition: all 0.2s;
		}
		.tab:hover {
			background: var(--vscode-list-hoverBackground);
		}
		.tab.active {
			background: var(--vscode-tab-activeBackground);
			color: var(--vscode-tab-activeForeground);
			border-color: var(--vscode-panel-border);
			border-bottom: 1px solid var(--vscode-tab-activeBackground);
		}
		.tab-content {
			display: none;
			padding: 10px;
		}
		.tab-content.active {
			display: block;
		}
		.fv-list {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}
		.fv-card {
			display: flex;
			align-items: center;
			padding: 6px 10px;
			border-radius: 6px;
			cursor: pointer;
			background: var(--vscode-editorWidget-background);
			border: 1px solid var(--vscode-panel-border);
			transition: all 0.15s ease-in-out;
			font-size: 12px;
		}
		.fv-card:hover {
			background: var(--vscode-list-hoverBackground);
		}
		.fv-card input[type="checkbox"] {
			margin-right: 6px;
		}
		.fv-card.selected {
			background: var(--vscode-list-activeSelectionBackground);
			color: var(--vscode-list-activeSelectionForeground);
			border-color: var(--vscode-list-activeSelectionBackground);
		}
		.fv-card.js { border-left: 4px solid #f7df1e; }
		.fv-card.ts { border-left: 4px solid #3178c6; }
		.fv-card.xml { border-left: 4px solid #ff6600; }
		.fv-card.json { border-left: 4px solid #6e6e6e; }
	</style>

	<body onload="openCity(event, 'modified', true)">
			<h2>Repository Save</h2>
			<!-- <p>Select the files to be committed to the Repository</p> PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Info already being shown inside the tab -->

		<div class="tab">
			<!-- PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 -added id="modified_tabLinks" to make it active and changed the lowercase words to CamelCase  -->
			<button id="modified_tabLinks" class="tablinks" onclick="openCity(event, 'modified')">Modified</button>
			<button class="tablinks" onclick="openCity(event, 'deleted')">Deleted</button>
			<button class="tablinks" onclick="openCity(event, 'newly_created')">Newly Created</button>
			<!--<button class="tablinks" onclick="openCity(event, 'renamed')">Renamed</button>-->
			<button class="tablinks" onclick="openCity(event, 'conflict')">Conflict</button>
			<button class="tablinks" onclick="openCity(event, 'All')">All</button>
		</div>
		${finalHtml.join("")}
		<div id="loader2"></div><!-- PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290 - Added loader -->
		<script>
			const vscode = acquireVsCodeApi();
			var selected=[];
			function submitSave() {
				let ele = []
				let x = document.getElementById("saveForm");
				for (let y of x) {
					if (y.type == 'checkbox' && y.checked == true) {
						ele.push(y.value)
					}
				}
				return ele;
			}

			function submit(event) {
				debugger;
				let allCheckBox = event.currentTarget.parentElement.querySelectorAll('input[type="checkbox"]');
				let filesToSave = {};
				for (let i = 1; i < allCheckBox.length; i++) {
					if (allCheckBox[i].checked == true && allCheckBox[i].getAttribute("dirtystate") !='5') {
						filesToSave[allCheckBox[i].getAttribute("appFolder")] = filesToSave[allCheckBox[i].getAttribute("appFolder")] || [];
						filesToSave[allCheckBox[i].getAttribute("appFolder")].push(allCheckBox[i].value);
						// filesToSave.push({
						// 	path: allCheckBox[i].value,
						// 	dirtystate: allCheckBox[i].getAttribute("dirtystate"),
						// 	appFolder : allCheckBox[i].getAttribute("appFolder")
						// });
					}
				}
				console.log(filesToSave);
				showLoader();//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
				vscode.postMessage({
					command: 'saveModifiedFiles',
					data: {
						selectedFiles: filesToSave
					}
				})
			}
			function resolvedConflict(event) {
				debugger;
				let allCheckBox = event.currentTarget.parentElement.querySelectorAll('input[type="checkbox"]');
				let selectedFiles = {};
				for (let i = 1; i < allCheckBox.length; i++) {
					if (allCheckBox[i].checked == true) {
						selectedFiles[allCheckBox[i].getAttribute("appFolder")] = selectedFiles[allCheckBox[i].getAttribute("appFolder")] || [];
						selectedFiles[allCheckBox[i].getAttribute("appFolder")].push(allCheckBox[i].value);
					}
				}
				if(event.currentTarget.value == 'ConflictRevert'){
					vscode.postMessage({
						command: 'revertConflictedFiles',
						data: {
							selectedFiles: selectedFiles
						}
					})
				}else{
					vscode.postMessage({
						command: 'commitConflictedFiles',
						data: {
							selectedFiles: selectedFiles
						}
					})
				}
				
			}
			function selectAll(event) {
				debugger
				//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - adding an extra parent element as select all moved inside a div
                let allCheckBox = event.currentTarget.parentElement.parentElement.querySelectorAll('input[type="checkbox"]');
				for (let i = 1; i < allCheckBox.length; i++) {
					//if( allCheckBox[i].getAttribute("dirtystate") == 5){
						allCheckBox[i].checked = event.currentTarget.checked;
						(event.currentTarget.checked) ? selected.push(allCheckBox[i].id): selected.splice(selected.indexOf(event
							.currentTarget.id), 1)
						selected = selected.filter(onlyUnique);
					//}
				}
			}
			function onlyUnique(value, index, self) {
				return self.indexOf(value) === index;
			}
			function onCheckEvent(event) {
				(event.currentTarget.checked) ? selected.push(event.currentTarget.id): selected.splice(selected.indexOf(
					event.currentTarget.id), 1)
			}
			//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - added isFirstTime
            function openCity(evt, cityName, isFirstTime = false) {
				var i, tabcontent, tablinks;
				tabcontent = document.getElementsByClassName("tabcontent");
				for (i = 0; i < tabcontent.length; i++) {
					tabcontent[i].style.display = "none";
				}
				tablinks = document.getElementsByClassName("tablinks");
				for (i = 0; i < tablinks.length; i++) {
					tablinks[i].className = tablinks[i].className.replace(" active", "");
				}
				let city = document.getElementById(cityName)
				if (cityName == "All") {
					let allCheckBox = city.querySelectorAll('input[type="checkbox"]');
					for (let i = 1; i < allCheckBox.length; i++) {
						allCheckBox[i].checked = false;
						if (selected.includes(allCheckBox[i].id)) {
							allCheckBox[i].checked = true
						}
					}
				}
            	city.style.display = "block";
				//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Adding the "active" class to modified_tabLinks if firstTime
                if(isFirstTime){
                    let target = document.getElementById("modified_tabLinks");
                    target.className += " active";
                }
				evt.currentTarget.className += " active";
			}
			function showLoader(){//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
				document.getElementById('loader2').classList.add('loader')	
				let otherBtns = Array.from(document.getElementsByClassName('button-7'));
				for (let otherbtn of otherBtns) {
					otherbtn.disabled = true
				}
			}
			function hideLoader(){//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
				document.getElementById('loader2').classList.remove('loader')
				let otherBtns = Array.from(document.getElementsByClassName('button-7'));
				for (let otherbtn of otherBtns) {
					otherbtn.disabled = false
				}
			}
			window.addEventListener("message", (event) => {//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
				console.log("inside listener");
				const message = event.data; // The JSON data our extension sent
				switch (message.command) {
					case "showLoader":
						showLoader()
						break;
					case "hideLoader":
						hideLoader();
						break;
				}
			});
		</script>
	</body>

	</html>`;
} */

function getSaveWebView(changedFiles: log) {
	let modified = [];
	let deleted = [];
	let created = [];
	let renamed = [];
	let conflict = [];
	let finalHtml = [];
	let All: any[] = [];
	let AllMerged: any = {
		...changedFiles.modified,
		...changedFiles.deleted,
		...changedFiles.newly_created,
		...changedFiles.renamed,
		...changedFiles.conflict,
	};
	//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:${color}" and using class="${color}"
	Object.keys(AllMerged)
		.sort()
		.forEach((fpath) => {
			//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - using conflict_pvt_files class in place of red color"
			let color =
				AllMerged[fpath].dirtystate == 5
					? "conflict_pvt_files"
					: Svncolors_description[AllMerged[fpath].dirtystate].color;
			let title =
				AllMerged[fpath].dirtystate == 5
					? "merge conflict"
					: Svncolors_description[AllMerged[fpath].dirtystate].messages;
			let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
			let inp = ``;
			if (AllMerged[fpath].dirtystate == 5) {
				//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:${color}" and using class="${color}" in label element
				inp = `<input id="${fpath}" type="checkbox" value="${
					fpath.split("@@")[1]
				}" appFolder="${AllMerged[fpath].appFolder}" dirtystate="${
					AllMerged[fpath].dirtystate
				}" onChange="onCheckEvent(event)" disabled/><label class="${color}" title="${title}" for="${aPath}">${aPath}</label><br />`;
			} else {
				//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:${color}" and using class="${color}"
				inp = `<input id="${fpath}" type="checkbox" value="${
					fpath.split("@@")[1]
				}" appFolder="${AllMerged[fpath].appFolder}" dirtystate="${
					AllMerged[fpath].dirtystate
				}" onChange="onCheckEvent(event)" /><label class="${color}" title="${title}" for="${aPath}">${aPath}</label><br />`;
			}
			All.push(inp);
		});
	for (let fpath of Object.keys(changedFiles.modified)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:yellow" and using class="modified_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.modified[fpath].appFolder}" dirtystate="${
			changedFiles.modified[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class="modified_pvt_files" for="${aPath}" title="modified file name">${aPath}</label><br />`;
		modified.push(inp);
	}
	for (let fpath of Object.keys(changedFiles.deleted)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:#F5F5DC" and using class="deleted_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.deleted[fpath].appFolder}" dirtystate="${
			changedFiles.deleted[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class= "deleted_pvt_files" for="${aPath}" title="file has been deleted">${aPath}</label><br />`;
		deleted.push(inp);
	}
	for (let fpath of Object.keys(changedFiles.newly_created)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:#075b77" and using class="newly_created_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.newly_created[fpath].appFolder}" dirtystate="${
			changedFiles.newly_created[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class= "newly_created_pvt_files" for="${aPath}" title="file has been created">${aPath}</label><br />`;
		created.push(inp);
	}
	for (let fpath of Object.keys(changedFiles.renamed)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:#808080" and using class="renamed_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.renamed[fpath].appFolder}" dirtystate="${
			changedFiles.renamed[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class= "renamed_pvt_files" for="${aPath}" title="file has been renamed">${aPath}</label><br />`;
		renamed.push(inp);
	}
	for (let fpath of Object.keys(changedFiles.conflict)) {
		let aPath = fpath.split("@@")[0] + "/" + fpath.split("@@")[1]; //actual r_file_path;
		//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - removing style="color:red" and using class="conflict_pvt_files"
		let inp = `<input id="${fpath}" type="checkbox" value="${
			fpath.split("@@")[1]
		}" appFolder="${changedFiles.conflict[fpath].appFolder}" dirtystate="${
			changedFiles.conflict[fpath].dirtystate
		}" onChange="onCheckEvent(event)" /><label class= "conflict_pvt_files" for="${aPath}" title="Conflict exists">${aPath}</label><br />`;
		conflict.push(inp);
	}
	let tabs: any = {
		All: {
			description:
				"Select the files which you want to Commit. Files with conflict cannot be selected/committed",
			selectedFiles: All,
		},
		modified: { description: "select all files to be saved", selectedFiles: modified },
		deleted: { description: "select all files to be deleted", selectedFiles: deleted },
		newly_created: {
			description: "select files to be added to the repository",
			selectedFiles: created,
		},
		conflict: {
			description:
				"Conflict exits. Either Revert or save your local files. Note : If you save your local file then all remote change will be removed",
			selectedFiles: conflict,
		},
	};
	for (let tab in tabs) {
		let conflictDisplay = "none";
		let colorDisplay = "none";
		let cDisplay = "block";
		if (tab == "conflict") {
			conflictDisplay = "block";
			cDisplay = "none";
		}
		if (tab == "All") colorDisplay = "block";
		let modTemp = `<div id="${tab}" class="tabcontent">
            <!--<h3>${tab}</h3> PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 -Commenting as Header can already be seen in the tabs -->
			<br />
			<!-- PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - To make the checkbox and label side by side -->
            <div class="selectALL-checkbox-container">
                <input id="SelectAll1" type="checkbox" onchange='selectAll(event)' />
                <label for="SelectAll1">Select All</label>
            </div>
            <p>${tabs[tab].description}</p>
            <br />
            ${tabs[tab].selectedFiles.join("")}
            <br />
            <button class='button-7' value="Commit" style="display:${cDisplay}" onClick=submit(event)>Commit</button>
			<button class='button-7' value="ConflictSave" style="display:${conflictDisplay}" onClick=resolvedConflict(event)>Commit</button>
			<br />
			<button class='button-7 mt-5' value="ConflictRevert" style="display:${conflictDisplay}" onClick=resolvedConflict(event)>Revert</button>
			<!-- //PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Moved the indicator below the button and using class to show colors instead of style="color:"-->
			<div class="file-status-implier">
				<p class="${Svncolors_description["4"].color}" style="display:${colorDisplay};">Newly created</p>
				<p class="${Svncolors_description["3"].color}" style="display:${colorDisplay};">Modified</p>
				<p  class="${Svncolors_description["-1"].color}" style="display:${colorDisplay};">Deleted</p> 
				<!-- <p class="${Svncolors_description["2"].color}" style="display:${colorDisplay};">Renamed</p> -->
				<p class="${Svncolors_description["5"].color}" style="display:${colorDisplay};">Conflict</p>    
            </div>
            <br />
            </div>`.replace(/(\r\n|\n|\r)/gm, "");
		finalHtml.push(modTemp);
	}
	let headSection = returnHtmlHead();
	// keep the onload call but pass null for event to avoid undefined event errors; openCity has protection below
	return `<!DOCTYPE html>
	${headSection}\n
    <style>
		/* Tab styles (kept minimal) */
		.tab-container {
			display: flex;
			margin-bottom: 10px;
		}
		.tablinks { opacity: 0.5; display: inline-flex; align-items: center; padding: 10px 14px; border-radius: 8px 8px 0 0; background: transparent; color: var(--muted); font-weight: 600; cursor: pointer; user-select: none; outline: none; border: 1px solid transparent; }
		.tablinks:hover {
			background: var(--vscode-list-hoverBackground);
		}
		.tablinks.active { opacity: 1; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02)); color: var(--text); border-top-color: var(--vscode-focusBorder, #0078d4); border-right-color: rgba(0,0,0,0.06); border-left-color: rgba(0,0,0,0.06);}
		.tabcontent {
			display: none;
			padding: 10px;
		}
		.tabcontent.active {
			display: block;
		}
		/* list cards to more closely resemble getAppListWebView style */
		.fv-list {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}
		.fv-card {
			display: flex;
			align-items: center;
			padding: 10px;
			border-radius: 6px;
			cursor: pointer;
			background: var(--vscode-editorWidget-background);
			border: 1px solid var(--vscode-panel-border);
			transition: all 0.12s ease-in-out;
			font-size: 13px;
		}
		.fv-card:hover {
			background: var(--vscode-list-hoverBackground);
		}
		.fv-card input[type="checkbox"] {
			margin-right: 10px;
		}
		.fv-card.selected {
			background: var(--vscode-list-activeSelectionBackground);
			color: var(--vscode-list-activeSelectionForeground);
			border-color: var(--vscode-list-activeSelectionBackground);
		}
		.file-status-implier p { margin:4px 0; font-size:12px; }
		.selectALL-checkbox-container { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
		/* small loader */
		#loader2.loader { height:4px; background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.18)); border-radius:4px; animation: shimmer 1.4s infinite linear; }
		@keyframes shimmer { 0% { background-position: -200px 0 } 100% { background-position: 200px 0 } }
	</style>

	<body onload="openCity(null, 'modified', true)">
			<h2 style="padding: 15px;">Repository Save</h2>

		<div class="tab-container">
			<button id="modified_tabLinks" class="tablinks" onclick="openCity(event, 'modified')">Modified</button>
			<button class="tablinks" onclick="openCity(event, 'deleted')">Deleted</button>
			<button class="tablinks" onclick="openCity(event, 'newly_created')">Newly Created</button>
			<!--<button class="tablinks" onclick="openCity(event, 'renamed')">Renamed</button>-->
			<button class="tablinks" onclick="openCity(event, 'conflict')">Conflict</button>
			<button class="tablinks" onclick="openCity(event, 'All')">All</button>
		</div>

		<!-- preserve original tab contents (generated above) -->
		${finalHtml.join("")}
		<div id="loader2"></div><!-- PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290 - Added loader -->
		<script>
			const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
			var selected=[];
			function submitSave() {
				let ele = []
				let x = document.getElementById("saveForm");
				for (let y of x) {
					if (y.type == 'checkbox' && y.checked == true) {
						ele.push(y.value)
					}
				}
				return ele;
			}

			function submit(event) {
				let allCheckBox = event.currentTarget.parentElement.querySelectorAll('input[type="checkbox"]');
				let filesToSave = {};
				for (let i = 1; i < allCheckBox.length; i++) {
					if (allCheckBox[i].checked == true && allCheckBox[i].getAttribute("dirtystate") !='5') {
						filesToSave[allCheckBox[i].getAttribute("appFolder")] = filesToSave[allCheckBox[i].getAttribute("appFolder")] || [];
						filesToSave[allCheckBox[i].getAttribute("appFolder")].push(allCheckBox[i].value);
					}
				}
				showLoader();//PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
				if (vscode) vscode.postMessage({
					command: 'saveModifiedFiles',
					data: {
						selectedFiles: filesToSave
					}
				});
			}
			function resolvedConflict(event) {
				let allCheckBox = event.currentTarget.parentElement.querySelectorAll('input[type="checkbox"]');
				let selectedFiles = {};
				for (let i = 1; i < allCheckBox.length; i++) {
					if (allCheckBox[i].checked == true) {
						selectedFiles[allCheckBox[i].getAttribute("appFolder")] = selectedFiles[allCheckBox[i].getAttribute("appFolder")] || [];
						selectedFiles[allCheckBox[i].getAttribute("appFolder")].push(allCheckBox[i].value);
					}
				}
				if(event.currentTarget.value == 'ConflictRevert'){
					if (vscode) vscode.postMessage({
						command: 'revertConflictedFiles',
						data: {
							selectedFiles: selectedFiles
						}
					});
				}else{
					if (vscode) vscode.postMessage({
						command: 'commitConflictedFiles',
						data: {
							selectedFiles: selectedFiles
						}
					});
				}
				
			}
			function selectAll(event) {
				//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - adding an extra parent element as select all moved inside a div
                let allCheckBox = event.currentTarget.parentElement.parentElement.querySelectorAll('input[type="checkbox"]');
				for (let i = 1; i < allCheckBox.length; i++) {
						allCheckBox[i].checked = event.currentTarget.checked;
						(event.currentTarget.checked) ? selected.push(allCheckBox[i].id): selected.splice(selected.indexOf(event
							.currentTarget.id), 1)
						selected = selected.filter(onlyUnique);
				}
			}
			function onlyUnique(value, index, self) {
				return self.indexOf(value) === index;
			}
			function onCheckEvent(event) {
				(event.currentTarget.checked) ? selected.push(event.currentTarget.id): selected.splice(selected.indexOf(
					event.currentTarget.id), 1)
			}
			//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - added isFirstTime
            function openCity(evt, cityName, isFirstTime = false) {
				var i, tabcontent, tablinks;
				tabcontent = document.getElementsByClassName("tabcontent");
				for (i = 0; i < tabcontent.length; i++) {
					tabcontent[i].style.display = "none";
				}
				tablinks = document.getElementsByClassName("tablinks");
				for (i = 0; i < tablinks.length; i++) {
					tablinks[i].className = tablinks[i].className.replace(" active", "");
				}
				let city = document.getElementById(cityName)
				if (cityName == "All") {
					let allCheckBox = city.querySelectorAll('input[type="checkbox"]');
					for (let i = 1; i < allCheckBox.length; i++) {
						allCheckBox[i].checked = false;
						if (selected.includes(allCheckBox[i].id)) {
							allCheckBox[i].checked = true
						}
					}
				}
            	city.style.display = "block";
				//PR0050 @Nayan 28JAN2025 F7.2.XX_2503-05 PROC-14802 - Adding the "active" class to modified_tabLinks if firstTime
                if(isFirstTime){
                    let target = document.getElementById("modified_tabLinks");
                    if(target) target.className += " active";
                }
				// add guard before using evt.currentTarget (evt can be null when called from onload)
				if (evt && evt.currentTarget) {
					evt.currentTarget.className += " active";
				}
			}
			function showLoader(){
				document.getElementById('loader2').classList.add('loader')	
				let otherBtns = Array.from(document.getElementsByClassName('button-7'));
				for (let otherbtn of otherBtns) {
					otherbtn.disabled = true
				}
			}
			function hideLoader(){
				document.getElementById('loader2').classList.remove('loader')
				let otherBtns = Array.from(document.getElementsByClassName('button-7'));
				for (let otherbtn of otherBtns) {
					otherbtn.disabled = false
				}
			}
			window.addEventListener("message", (event) => {
				const message = event.data; // The JSON data our extension sent
				switch (message.command) {
					case "showLoader":
						showLoader()
						break;
					case "hideLoader":
						hideLoader();
						break;
				}
			});
		</script>
	</body>

	</html>`;
}

function returnHtmlHead() {
	return `<head>
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<style>
		:root {
			--bg: var(--vscode-editor-background, #0b0c0d);
			--panel: var(--vscode-editorWidget-background, #0f1112);
			--card: var(--vscode-list-hoverBackground, #2a2b2d);
			--text: var(--vscode-editor-foreground, #e6e6e6);
			--muted: var(--vscode-descriptionForeground, #9aa0a6);
			--accent: var(--vscode-list-activeSelectionBackground, #1877f2);
			--accent-foreground: var(--vscode-list-activeSelectionForeground, #ffffff);
			--button-bg: var(--vscode-button-background, #1877f2);
			--button-fg: var(--vscode-button-foreground, #ffffff);
			--button-secondary-fg: var(--vscode-button-secondaryForeground, #888888);
			--secondary-bg: var(--vscode-button-secondaryBackground, #2ecc71);
			--input-bg: var(--vscode-input-background, #111);
			--border: var(--vscode-editorWidget-border, rgba(255, 255, 255, 0.04));
			--success: var(--vscode-terminal-ansiGreen, #00cc9d);
		}

		/* base layout */
		html,
		body {
			font-family: Arial;
			margin: 0;
			padding: 0;
			height: 100%;
		}

		body.vscode-root {
			background: var(--bg);
			color: var(--text);
			font-family: "Segoe UI", Roboto, Arial;
		}

		/* existing tab/button styles (kept) */
		.tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; }
		.tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 14px 16px; transition: 0.3s; font-size: 17px; }

		.button-7, .button-8 { background-color: var(--vscode-button-background,#0095ff); border: 1px solid transparent; border-radius: 3px; box-shadow: rgba(255, 255, 255, .4) 0 1px 0 0 inset; box-sizing: border-box; color: #fff; cursor: pointer; display: inline-block; font-family: -apple-system, system-ui, "Segoe UI", "Liberation Sans", sans-serif; font-size: 13px; font-weight: 400; line-height: 1.15385; margin: 0; outline: none; padding: 8px .8em; position: relative; text-align: center; text-decoration: none; user-select: none; -webkit-user-select: none; touch-action: manipulation; vertical-align: baseline; white-space: nowrap; }
		.button-7:hover, .button-7:focus { background-color:var(--vscode-button-hoverBackground,#07c); }
		.button-7:focus,.button-8:focus { box-shadow: 0 0 0 4px rgba(0, 149, 255, .15); }
		.button-7:active { background-color: #0064bd; box-shadow: none; }
		.button-7:disabled, .button-8:disabled { background-color: grey; cursor: not-allowed; color: #ccc; }
		.HideOption{ display: none !important; }

		.tab button:hover { background-color: #ddd; }
		.tab button.active { background-color: #ccc; }

		.tabcontent { display: none; padding: 6px 12px; height: 70%; border-top: none; transition: all 2s; -webkit-animation: fadeIn 1s; animation: fadeIn 1s; }
		.test { overflow: auto; width: 100%; height: 50%; }
		.tabcontent_1 { width: 50%; height: 50%; overflow: scroll; }
		.mt-5{ margin-top:5px; }

		@-webkit-keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
		@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

		.loader { width: 16px; height: 16px; border-radius: 50%; display: block; margin:15px auto; position: relative; background: #FFF; box-shadow: -24px 0 #FFF, 24px 0 #FFF; box-sizing: border-box; animation: shadowPulse 2s linear infinite; }
		@keyframes shadowPulse { 33% { background: #FFF; box-shadow: -24px 0 green, 24px 0 #FFF; } 66% { background: green; box-shadow: -24px 0 #FFF, 24px 0 #FFF; } 100% { background: #FFF; box-shadow: -24px 0 #FFF, 24px 0 green; } }

		#waitText{ color:var(--success, green); font-size:1rem; text-align:center; margin-top:1%; }

		.conflict_button_container{ display: flex; gap: 10px; justify-content: start; }
		.newly_created_pvt_files{ color:  var(--vscode-gitDecoration-addedResourceForeground); }
		.modified_pvt_files{ color:  var(--vscode-gitDecoration-modifiedResourceForeground); }
		.deleted_pvt_files{ color:  var(--vscode-gitDecoration-deletedResourceForeground); }
		.conflict_pvt_files{ color:  var(--vscode-gitDecoration-conflictingResourceForeground); }
		.renamed_pvt_files{ color:  var(--vscode-gitDecoration-renamedResourceForeground); }
		/* .warning_message_color{ color: var(--vscode-notificationsWarningIcon-foreground, orange); } */
		.warning_message_color{ color: orange; }

		.relesed_popup_style { display: none; position: fixed; background:var(--vscode-tab-activeBackground,var(--vscode-tab-unfocusedActiveBackground, white)); top: 50%; left: 50%; transform: translate(-50%, -50%); width: auto; padding: 20px; border: 2px solid #00cc9d; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); z-index: 1000; }
		.assigned_app_select { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
		.version_input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
		.relesed_popup_style_background { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(104, 104, 104, 0.404); z-index: 999; }
		.file-status-implier { display: flex; gap: 15px; justify-content: start; flex-wrap: wrap; }

		.container { padding: 16px; display: flex; flex-direction: column; gap: 10px; height: 100vh; box-sizing: border-box; }
		h2 { margin: 0; font-size: 14px; color: var(--text); }
		.muted { color: var(--muted); }

		#fvSearch { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--input-bg); color: var(--text); }
		.controls { display: flex; gap: 12px; align-items: center; padding: 0 16px; }

		/* tabs - rounded header with badges */
		.tabs { display: flex; align-items: center; padding: 8px; border-radius: 10px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02)); margin-bottom: 12px; }
		.tab { opacity: 0.5; display: inline-flex; align-items: center; padding: 10px 14px; border-radius: 8px 8px 0 0; background: transparent; color: var(--muted); font-weight: 600; cursor: pointer; user-select: none; outline: none; border: 1px solid transparent; }
		.tab.active { opacity: 1; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02)); color: var(--text); border-top-color: var(--vscode-focusBorder, #0078d4); border-right-color: rgba(0,0,0,0.06); border-left-color: rgba(0,0,0,0.06); }
		.tab .badge { display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; padding: 1px 6px; border-radius: 999px; background: var(--vscode-button-background, #0c6cff); color: var(--vscode-button-foreground, #fff); font-size: 12px; font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,0.25); }

		.panel { background: var(--panel); border-radius: 8px; padding: 12px; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
		.listWrap { overflow: auto; padding: 8px 4px; display: flex; flex-direction: column; gap: 12px; }

		.fv-card { background: var(--card); padding: 10px; border-radius: 8px; display: flex; align-items: center; cursor: pointer; transition: transform .08s, box-shadow .08s; outline: none; color: var(--text); border: 1px solid transparent; }
		.fv-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4); }
		.fv-card.selected { border-left: 6px solid var(--accent); padding-left: 14px; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12); }
		.fv-card.not-selectable { opacity: 0.6; cursor: default; }
		.fv-label { font-size: 16px; color: var(--text); }
		.ro-badge { font-size: 12px; color: var(--muted); margin-left: 8px; }

		.footer { background: rgba(0, 0, 0, 0.04); border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; bottom: 12px; }
		.btn { padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 700; color: var(--button-fg); }
		.btn.primary { background: var(--button-bg); color: var(--button-fg); }
		.btn.secondary,#popupCancel { background: var(--secondary-bg); color: var(--button-secondary-fg); border-color: var(--vscode-button-border); }

		.waiting-area { display: none; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 8px; }
		.spinner { width: 18px; height: 18px; border-radius: 50%; border: 3px solid transparent; border-top-color: var(--success); animation: spin 1s linear infinite; }
		.wait-message { color: var(--success); font-size: 13px; line-height: 1.3; word-break: break-word; }
		@keyframes spin { to { transform: rotate(360deg); } }

		.waiting-mode .fv-card, .waiting-mode .tab, .waiting-mode button, .waiting-mode #fvSearch, .waiting-mode .assigned_app_select, .waiting-mode .version_input { pointer-events: none; opacity: 0.6; }
		.waiting-mode .tab.active { opacity: 0.6; }
		.waiting-mode #popup, .waiting-mode #overlay { pointer-events: none; }

		.meta { color: var(--muted); font-size: 13px; }

		.listWrap::-webkit-scrollbar { width: 12px; }
		.listWrap::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); border-radius: 8px; }

		.selectAllWrap { display: flex; align-items: center; gap: 8px; color: var(--muted); }
		.fv-desc { opacity: 0.85; font-weight: 300; font-weight: 300; opacity: 0.85; font-size: medium; flex:1; text-align:right; padding-left:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .fv-version { min-width:90px; font-size: medium; text-align:center; color:var(--success); font-weight:600; margin:0 16px; }
	</style>
	<script src="./testlog.js"> </script>
</head>`.replace(/(\r\n|\n|\r)/gm, "");
}

function getAppListWebView(logContent, action, checkReleasedVersions, repairApps?) {
	let appList;
	if (action === "repair") appList = repairApps || [];
	else if (action === "checkout")
		appList =
			(logContent === null || logContent === void 0 ? void 0 : logContent.writeAbleFVs) || [];
	else
		appList =
			Object.keys(
				(logContent === null || logContent === void 0 ? void 0 : logContent.checkoutFVs) ||
					{}
			) || [];
	let checkOutFVs =
		Object.keys(
			(logContent === null || logContent === void 0 ? void 0 : logContent.checkoutFVs) || {}
		) || [];
	let internalNonEditableFVs = logContent.internalNonEditableApps || [];
	try {
		appList.sort();
		internalNonEditableFVs.sort();
		checkOutFVs.sort();
	} catch (e) {}
	const iCheckOutFVslength = checkOutFVs.length || 0;
	const MAX_TOTAL = typeof maxNumOfFlvToCheckout !== "undefined" ? maxNumOfFlvToCheckout : 4;
	const isCheckoutAction = action === "checkout";
	const isRepairAction = action === "repair";
	const isPreCheckMode = isCheckoutAction || isRepairAction; // used to decide pre-check/disable
	const showReleasedBtn = isCheckoutAction && !!checkReleasedVersions;
	const safeId = (s) => (s || "").replace(/[^a-zA-Z0-9_\-]/g, "_");

	// server-side item map for r_flavor, r_version, r_description
	const itemArray = logContent && Array.isArray(logContent.app_items) ? logContent.app_items : [];
	const serverItemMap = {};
	for (const it of itemArray) {
		if (it && it.r_fv_id) serverItemMap[it.r_fv_id] = it;
	}

	function escapeHtml(s) {
		if (s === null || s === undefined) return "";
		return String(s)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}
	// card generator (small padding, checkbox gap)
	const cardHtml = (app, from, checkedOut) => {
		const id = from === "internal" ? `int-${app}` : app;
		const safe = safeId(id);
		// show checked-out visual marker always if item present in CHECKOUTS,
		// but treat 'not-selectable' only when we're in checkout/repair mode
		const checkedClass = checkedOut ? "checked-out" : "";
		const selectableClass = checkedOut && isPreCheckMode ? "not-selectable" : "selectable";
		const badge = checkedOut ? '<span class="ro-badge"> (checked-out)</span>' : "";

		// only pre-check & disable when in checkout or repair action
		const isCheckedAttr = checkedOut && isPreCheckMode ? "checked" : "";
		const isDisabledAttr = checkedOut && isPreCheckMode ? "disabled" : "";

		const chkId = `chk-${safe}`;
		const it = serverItemMap[app] || null;
		const flavor = it ? it.r_flavor || app : app;
		const version = it ? it.r_version || "" : "";
		const desc = it ? it.r_description || "" : "";

		// include both dashed and dotted version (so searching "1.0.1" or "1-0-1" works),
		// and include description in the searchable string
		const versionDots = version ? version.replace(/-/g, ".") : "";
		const searchName = `${flavor || app} ${version || ""} ${versionDots} ${
			desc || ""
		}`.toLowerCase();

		return `<div class="fv-card ${checkedClass} ${selectableClass}" id="${safe}" data-value="${app}" data-name="${escapeHtml(
			searchName
		)}"
			tabindex="${checkedOut && isPreCheckMode ? -1 : 0}">
			<input type="checkbox" class="fv-checkbox" id="${chkId}" ${isCheckedAttr} ${isDisabledAttr}
				aria-label="Select ${escapeHtml(flavor)}" style="margin-right:14px; width:18px; height:18px;" />
			<label for="${chkId}" class="fv-label" style="flex: .5; display:flex; align-items:center; gap:10px; margin:0;">
				<span style="font-size: medium;font-weight: 500;">${escapeHtml(flavor)}</span>${badge}
			</label>
			<div class="fv-version">
				${escapeHtml(version)}
			</div>
			<div class="fv-desc">
				${escapeHtml(desc || "")}
			</div>
		</div>`;
	};

	const writableHtml = appList
		.map((a) => cardHtml(a, "writable", checkOutFVs.includes(a)))
		.join("");
	const internalHtml = internalNonEditableFVs
		.map((a) => cardHtml(a, "internal", checkOutFVs.includes(a)))
		.join("");

	const writableCount = appList && appList.length ? appList.length : 0;
	const internalCount =
		internalNonEditableFVs && internalNonEditableFVs.length ? internalNonEditableFVs.length : 0;

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
		comment =
			"Select the apps to revert it back. Note : Local Deleted , Local Modified and Conflict files will be reverted back";
		warning =
			"Warning: All the changes which are not committed or saved will be lost and App will be restored to latest version from the Repository.";
		warnDisplay = "block";
	} else if (action == "repair") {
		heading = " Repair Apps";
		comment = "Select the apps to repair. It will update external apps";
		warning = `Note: Server restart will be done after repair`;
		warnDisplay = "block";
	}
	const headSection =
		typeof returnHtmlHead === "function" ? returnHtmlHead() : `<!doctype html><head></head>`;
	const serializedAppList = JSON.stringify(appList);
	const serializedInternal = JSON.stringify(internalNonEditableFVs);
	const serializedCheckouts = JSON.stringify(checkOutFVs);
	const serializedItems = JSON.stringify(itemArray);

	return `<!DOCTYPE html>
  ${headSection}
  <body id="body_main" class="vscode-root">
    <!-- Inline tweaks for tab/list alignment & connected tab look -->

    <div class="container">
      <div style="display:flex; padding: 0 16px; flex-direction:column; gap:6px; font-size: medium;">
        <h2>${heading}</h2>
        <div class="muted">${comment}</div>
        <p class="warning_message_color" style="display:${warnDisplay}; margin:6px 0;">${warning}</p>
      </div>

      <div class="controls" style="font-size: medium;">
        <input id="fvSearch" placeholder="Search..." aria-label="Search items" />
        ${
			!isCheckoutAction
				? `<div class="selectAllWrap"><input id="SelectAll12" type="checkbox" /><label for="SelectAll12" style="width: 80px;cursor:pointer;">Select All</label></div>`
				: ""
		}
      </div>

      <div class="panel" role="region">
        ${
			isCheckoutAction
				? `
          <div class="tabs" role="tablist" aria-label="Flavor tabs">
            <div id="tabWritable" class="tab active" role="tab" aria-selected="true" tabindex="0">Writable <span class="badge">${writableCount}</span></div>
            <div id="tabInternal" class="tab" role="tab" aria-selected="false" tabindex="0">Read-Only <span class="badge">${internalCount}</span></div>
            <div style="flex:1"></div>
          </div>
        `
				: ""
		}

        <div id="writablePanel" class="listWrap" style="${isCheckoutAction ? "" : "display:flex;"}">
          ${writableHtml || '<div class="meta">No writable items</div>'}
        </div>

        ${
			isCheckoutAction
				? `<div id="internalPanel" class="listWrap" style="display:none;">${
						internalHtml || '<div class="meta">No read-only items</div>'
				  }</div>`
				: ""
		}
      </div>

      <div class="footer" id="footerBar">
        <div style="display:flex; gap:10px; align-items:center;">
          <button id="mainActionBtn" class="btn primary" ${
				iCheckOutFVslength >= MAX_TOTAL ? "disabled" : ""
			}>${String(action).toUpperCase()}</button>
          ${
				showReleasedBtn
					? `<button id="releasedBtn" class="btn secondary">Checkout Released Version</button>`
					: ""
			}
        </div>

        <div style="display:flex; align-items:center; gap:12px;">
          <div id="waitingArea" class="waiting-area" role="status" aria-live="polite">
            <div class="spinner" id="spinnerEl" aria-hidden="true"></div>
            <div id="waitText" class="wait-message"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- popup preserved -->
    <div id="popup" class="relesed_popup_style" style="display:none; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:var(--panel); padding:16px; border-radius:8px; border:1px solid var(--border);">
      <h3 style="margin-top:0;color: var(--success);">Checkout Released Version</h3>
      <div style="display:flex; gap:10px; margin-top:8px;">
        <select id="AppSelection" class="assigned_app_select" style="background:var(--input-bg); color:var(--text); border:1px solid var(--border); padding:8px; border-radius:6px;"></select>
        <input type="text" id="versionSelectionInput" class="version_input" placeholder="Version" style="padding:8px; border-radius:6px; background:var(--input-bg); color:var(--text); border:1px solid var(--border);" />
      </div>
      <div style="margin-top:16px; text-align:right;">
        <button id="popupCancel" class="button-8" onClick=popupCancel() >Cancel</button>
        <button id="popupSubmit" class="button-8" onClick=popupSubmit() style="padding:8px 12px; border-radius:6px; background:var(--button-bg); color:var(--button-fg);">Submit</button>
      </div>
    </div>
    <div id="overlay" class="relesed_popup_style_background" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9998;"></div>

    <script>
      const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;

      const APP_LIST = ${serializedAppList};
      const INTERNAL_LIST = ${serializedInternal};
      const CHECKOUTS = ${serializedCheckouts};
      const ITEM_LIST = ${serializedItems};
      const MAX_TOTAL_JS = ${MAX_TOTAL};
      const PRE_COUNT = ${iCheckOutFVslength};
      const IS_CHECKOUT = ${isCheckoutAction ? "true" : "false"};
      const IS_REPAIR = ${isRepairAction ? "true" : "false"};

      const ITEM_MAP = {};
      (ITEM_LIST || []).forEach(it => { if (it && it.r_fv_id) ITEM_MAP[it.r_fv_id] = it; });

      const selectedSet = new Set();

      function q(sel, ctx=document) { return ctx.querySelector(sel); }
      function qa(sel, ctx=document) { return Array.from((ctx||document).querySelectorAll(sel)); }

      function safeId(s) { return (s || '').replace(/[^a-zA-Z0-9_\\-]/g, '_'); }

      // ---------- selectItemByValue ----------
      function selectItemByValue(val, doSelect) {
        if (!val) return;
        // find all card elements that correspond to this data-value (covers writable and internal)
        const cards = qa('.fv-card[data-value="' + val + '"]');
        // all checkboxes inside those cards
        const checkboxes = cards.map(c => c.querySelector('.fv-checkbox')).filter(Boolean);

        // If trying to select, enforce disabled state and max-count
        if (doSelect) {
          // If any checkbox is disabled, don't allow selection for those items
          const disabledExists = checkboxes.some(cb => cb.disabled);
          if (disabledExists) {
            // revert any UI checkbox that may have been toggled by the user
            checkboxes.forEach(cb => { if (cb && !cb.disabled) cb.checked = false; });
            if (vscode) vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: 'This flavor is already checked out and cannot be selected.' }});
            return false;
          }
          // enforce global checkout limit only when in checkout mode
          if (IS_CHECKOUT && (selectedSet.size + PRE_COUNT + 1) > MAX_TOTAL_JS) {
            // revert any UI changes
            checkboxes.forEach(cb => { if (cb) cb.checked = false; });
            if (vscode) {
              vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: 'You can only select up to ' + MAX_TOTAL_JS + ' apps, including those already checked out.' }});
            } else {
              alert('You can only select up to ' + MAX_TOTAL_JS + ' apps, including those already checked out.');
            }
            // small visual nudge: flash the first card
            if (cards.length) { const c0 = cards[0]; c0.style.boxShadow = '0 0 0 4px rgba(255,80,80,0.12)'; setTimeout(()=>c0.style.boxShadow='',300); }
            return false;
          }
        }

        // Apply selection/deselection to every matching card & checkbox
        for (const card of cards) {
          const checkbox = card.querySelector('.fv-checkbox');
          if (doSelect) {
            // if checkbox exists & not disabled, mark checked
            if (checkbox && checkbox.disabled) {
              // If disabled, skip and notify
              if (vscode) vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: 'This flavor is already checked out and cannot be selected.' }});
              continue;
            }
            selectedSet.add(val);
            card.classList.add('selected');
            if (checkbox) checkbox.checked = true;
          } else {
            // deselect
            selectedSet.delete(val);
            card.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
          }
        }

        // keep Select All synced
        updateSelectAllState();
        return true;
      }
      // ---------- END selectItemByValue ----------

      // ---------- toggleCardSelection ----------
      function toggleCardSelection(cardEl) {
        if (!cardEl) return;
        const chk = cardEl.querySelector('.fv-checkbox');
        if (!chk) return;
        // if we're in checkout/repair mode and item is checked-out, don't allow toggling
        if (cardEl.classList.contains('checked-out') && (IS_CHECKOUT || IS_REPAIR)) {
          cardEl.style.boxShadow = '0 0 0 4px rgba(255,80,80,0.12)'; setTimeout(()=>cardEl.style.boxShadow='',300);
          if (vscode) {
            vscode.postMessage({ command: 'showWarningMessage', data: { warningMessage: 'This flavor is already checked out and cannot be selected.' }});
          }
          return;
        }
        if (!chk.disabled) {
          chk.checked = !chk.checked;
          const evt = new Event('change', { bubbles: true });
          chk.dispatchEvent(evt);
        }
      }
      // ---------- END toggleCardSelection ----------

      // ---------- getVisibleSelectableCheckboxes ----------
      function getVisibleSelectableCheckboxes() {
        return qa('.fv-card')
          .filter(card => {
            const style = window.getComputedStyle(card);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            // handle hidden panels in checkout mode
            if (q('#internalPanel') && q('#internalPanel').style.display === 'none' && q('#internalPanel').contains(card)) return false;
            if (q('#writablePanel') && q('#writablePanel').style.display === 'none' && q('#writablePanel').contains(card)) return false;
            return true;
          })
          .map(card => card.querySelector('.fv-checkbox'))
          .filter(cb => cb && !cb.disabled);
      }
      // ---------- END getVisibleSelectableCheckboxes ----------

      // ---------- updateSelectAllState & initSelectAll ----------
      function updateSelectAllState() {
        const selectAllEl = q('#SelectAll12');
        if (!selectAllEl) return;
        const boxes = getVisibleSelectableCheckboxes();
        if (boxes.length === 0) {
          if (selectAllEl.tagName === 'INPUT' && selectAllEl.type === 'checkbox') selectAllEl.checked = false;
          selectAllEl.classList.remove('active');
          return;
        }
        const allSelected = boxes.every(cb => cb.checked === true);
        if (selectAllEl.tagName === 'INPUT' && selectAllEl.type === 'checkbox') {
          selectAllEl.checked = allSelected;
        } else {
          selectAllEl.classList.toggle('active', allSelected);
        }
      }

      function initSelectAll() {
        const selectAllEl = q('#SelectAll12');
        if (!selectAllEl) return;

        selectAllEl.addEventListener('change', (ev) => {
          const checked = !!ev.currentTarget.checked;
          const boxes = getVisibleSelectableCheckboxes();
          boxes.forEach(cb => {
            if (!cb.disabled) {
              cb.checked = checked;
              cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          updateSelectAllState();
        });
        // initial sync
        updateSelectAllState();
      }
      // ---------- END SelectAll helpers ----------

      // ---------- attachCardHandlers ----------
      function attachCardHandlers() {
        qa('.fv-card').forEach(card => {
          const chk = card.querySelector('.fv-checkbox');
          if (chk) {
            chk.addEventListener('change', (ev) => {
              ev.stopPropagation();
              const val = card.getAttribute('data-value');
              if (chk.checked) selectItemByValue(val, true);
              else selectItemByValue(val, false);
              // keep select-all in sync whenever a single checkbox changes
              updateSelectAllState();
            });
          }
          card.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('fv-checkbox')) return;
            toggleCardSelection(card);
          });
          card.addEventListener('keydown', (ev) => {
            if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); toggleCardSelection(card); }
          });
        });
      }
      // ---------- END attachCardHandlers ----------

      function applySearchFilter() {
        const qv = (q('#fvSearch').value || '').toLowerCase().trim();
        const activePanel = (IS_CHECKOUT && q('#tabInternal') && q('#tabInternal').classList.contains('active')) ? q('#internalPanel') : q('#writablePanel');
        if (!activePanel) return;
        qa('.fv-card', activePanel).forEach(card => {
          const nm = (card.getAttribute('data-name') || '').toLowerCase();
          card.style.display = (!qv || nm.indexOf(qv) !== -1) ? 'flex' : 'none';
        });
        // After filtering, update select-all (it should only reflect visible selectable items)
        updateSelectAllState();
      }

      function initTabs() {
        if (!IS_CHECKOUT) return;
        const tabW = q('#tabWritable');
        const tabI = q('#tabInternal');

        function activateTab(tabToActivate) {
          tabW.classList.remove('active'); tabI.classList.remove('active');
          tabW.setAttribute('aria-selected','false'); tabI.setAttribute('aria-selected','false');
          tabToActivate.classList.add('active');
          tabToActivate.setAttribute('aria-selected','true');

          if (tabToActivate.id === 'tabWritable') {
            tabW.style.background = 'var(--panel)'; tabW.style.color = 'var(--text)';
            tabI.style.background = 'rgba(255,255,255,0.02)'; tabI.style.color = 'var(--muted)';
            q('#writablePanel').style.display = ''; q('#internalPanel').style.display = 'none';
          } else {
            tabI.style.background = 'var(--panel)'; tabI.style.color = 'var(--text)';
            tabW.style.background = 'rgba(255,255,255,0.02)'; tabW.style.color = 'var(--muted)';
            q('#writablePanel').style.display = 'none'; q('#internalPanel').style.display = '';
          }
          applySearchFilter();
          updateSelectAllState();
        }

        tabW.addEventListener('click', () => activateTab(tabW));
        tabI.addEventListener('click', () => activateTab(tabI));

        [tabW, tabI].forEach((t) => {
          t.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
              ev.preventDefault();
              if (t.id === 'tabWritable') activateTab(tabI); else activateTab(tabW);
            } else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activateTab(t); }
          });
        });

        try {
          tabW.style.background = 'var(--panel)';
          tabW.style.color = 'var(--text)';
          tabI.style.background = 'rgba(255,255,255,0.02)';
          tabI.style.color = 'var(--muted)';
        } catch (e) {}
      }

      // SelectAll initialization will be called in load handler

      function showWaitingText(selectedApps) {
        const waitingArea = q('#waitingArea');
        const waitText = q('#waitText');
        const mainBtn = q('#mainActionBtn');
        if (waitingArea) waitingArea.style.display = 'flex';
        if (waitText) {
          const btnText = mainBtn ? (mainBtn.innerText || '').toUpperCase() : '${String(
				action
			).toUpperCase()}';
          let message = '';
          if (btnText === 'CHECKOUT') message = 'Workspace checkout of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
          else if (btnText === 'REVERT') message = 'Revert of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
          else if (btnText === 'UPDATE') message = 'Update of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
          else if (btnText === 'REPAIR') message = 'Repair of ' + (selectedApps.join(' , ') || '') + ' started. Relax we are working for you.\\nPlease wait for some time';
          else message = (selectedApps.join(' , ') || '') + ' started.\\nPlease wait...';
          waitText.innerText = message;
        }
        document.body.classList.add('waiting-mode');
        qa('button').forEach(b => b.disabled = true);
        qa('input').forEach(i => i.disabled = true);
        qa('select').forEach(s => s.disabled = true);
        qa('.tab').forEach(t => t.setAttribute('tabindex','-1'));
      }

      function hideWaitingText() {
        const waitingArea = q('#waitingArea');
        const waitText = q('#waitText');
        if (waitingArea) waitingArea.style.display = 'none';
        if (waitText) waitText.textContent = '';
        document.body.classList.remove('waiting-mode');
        qa('button').forEach(b => b.disabled = false);
        qa('input').forEach(i => i.disabled = false);
        qa('select').forEach(s => s.disabled = false);
        qa('.tab').forEach(t => t.setAttribute('tabindex','0'));
        const mainBtn = q('#mainActionBtn'); if (mainBtn) {
          if (PRE_COUNT >= MAX_TOTAL_JS && IS_CHECKOUT) mainBtn.disabled = true; else mainBtn.disabled = false;
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

      function getFlavorVersionFromFv(fvid) {
        if (!fvid?.length) return null;
        let lst = fvid.lastIndexOf("_");
        let flavor = fvid.slice(0, lst);
        return flavor;
      }

      window.showPopup = function() {
        q('#popup').style.display = 'block'; q('#overlay').style.display = 'block';
        const AppSelectionDropdown = q('#AppSelection');
        AppSelectionDropdown.innerHTML = '';
        (APP_LIST || []).forEach(app => {
          const opt = document.createElement('option');
          opt.value = getFlavorVersionFromFv(app) || app;
          opt.textContent = getFlavorVersionFromFv(app) || app;
          AppSelectionDropdown.appendChild(opt);
        });
      };

      window.popupCancel = function() { q('#popup').style.display = 'none'; q('#overlay').style.display = 'none'; };

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

        // initialize select-all behaviour (only non-checkout actions render SelectAll control)
        initSelectAll();

        // mark checkouts visually; pre-check & disable them only when in checkout/repair mode
        (APP_LIST.concat(INTERNAL_LIST || [])).forEach(app => {
          const id1 = safeId(app);
          const id2 = safeId('int-' + app);
          const e1 = document.getElementById(id1);
          const e2 = document.getElementById(id2);
          const chk1 = document.getElementById('chk-' + id1);
          const chk2 = document.getElementById('chk-' + id2);
          if (CHECKOUTS && CHECKOUTS[app]) {
            if (e1) {
              e1.classList.add('checked-out');
              if (IS_CHECKOUT || IS_REPAIR) { e1.classList.add('not-selectable'); e1.setAttribute('aria-disabled','true'); }
              else { e1.classList.remove('not-selectable'); e1.removeAttribute('aria-disabled'); }
            }
            if (e2) {
              e2.classList.add('checked-out');
              if (IS_CHECKOUT || IS_REPAIR) { e2.classList.add('not-selectable'); e2.setAttribute('aria-disabled','true'); }
              else { e2.classList.remove('not-selectable'); e2.removeAttribute('aria-disabled'); }
            }
            if (chk1) {
              // only pre-check when in checkout/repair mode; otherwise leave unchecked so it's selectable
              chk1.checked = (IS_CHECKOUT || IS_REPAIR) ? true : false;
              chk1.disabled = (IS_CHECKOUT || IS_REPAIR) ? true : false;
            }
            if (chk2) {
              chk2.checked = (IS_CHECKOUT || IS_REPAIR) ? true : false;
              chk2.disabled = (IS_CHECKOUT || IS_REPAIR) ? true : false;
            }
          }
        });

        // keep select-all initial state correct
        updateSelectAllState();
      });

      window.hideWaitingText = hideWaitingText;
      window.__getSelectedApps = () => Array.from(selectedSet);
    </script>
  </body>
  </html>`;
}

async function appFolderCheck(path: string) {
	//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
	let str = path;
	let appPath = str.substring(str.indexOf("src/") + 4, str.lastIndexOf("/") + 1);
	let result = appPath.substring(appPath.indexOf("/") + 1, appPath.lastIndexOf("/"));
	return result;
}
async function responseCheck(res: any) {
	//PR0050 @Nayan 15MAY2024 PROC-7923- Commented and added next 2 lines
	let str = res;
	if (typeof res === "string" && res.endsWith("ed Successfull")) {
		if (res === "Files checkouted Successfull") {
			str = "Files checked out successfully";
		} else if (res.endsWith("eed Successfull")) {
			str = res.replace("eed Successfull", "ed successfully");
		} else {
			str = res.replace("Successfull", "successfully");
		}
	}
	return str;
}

async function getDefaultBVData(klarionData) {
	//PR0018 @Amit 05Sep2024 PROC-7336
	let configData;
	let domain: string = klarionData.port
		? `${klarionData.ipAddress}:${klarionData.port}`
		: `${klarionData.ipAddress}`;
	let url = `https://${domain}/p6/adm/${klarionData.landscape}/core_fw_1/getDefaultBV`; // `${baseUrl.split('/p6/')[0]}/p6/p6/${landscape}/core_fw_1/getDefaultBV`
	try {
		configData = await sendRequestHttp(url, "GET", {});
		configData = JSON.parse(configData.toString());
		return configData;
	} catch (err) {
		throw Error("Public server not responding");
	}
}

async function getPortToBeUsed() {
	//PR0050 @Nayan 04DEC2024 IPROC-12624 - to get the port number to be used
	const config = vscode.workspace.getConfiguration();
	let currentPortNumber = config.get("procifynowExtension.checkUsedPortNumber", 3001);
	if (typeof currentPortNumber == "string") currentPortNumber = parseInt(currentPortNumber);
	let defaultPortNumber: number;
	if (currentPortNumber && currentPortNumber >= 3001 && currentPortNumber < 4000) {
		defaultPortNumber = currentPortNumber + 1;
	} else if (!currentPortNumber || currentPortNumber >= 4000) {
		defaultPortNumber = 3001;
	}
	return { currentPortNumber: currentPortNumber, defaultPortNumber: defaultPortNumber };
}
//#region //PR0050 @Nayan 22MAY2025 F7.2.XX_25_21-23 PROC-18290
async function restartServer() {
	try {
		await withLoader(`Restarting server...`, async () => {
			await killPort();
			await startRepoServer();
		});
	} catch (err) {
		vscode.window.showErrorMessage("Failed to restart the server.");
	}
}
async function killPort(): Promise<string[]> {
	const portStr = vsclientPort
		? vsclientPort
		: JSON.parse(
				fs.readFileSync(
					`${(
						vscode.workspace.workspaceFolders as vscode.WorkspaceFolder[]
					)[0].uri.path.slice(1)}/kloconfig/klarion.json`,
					{ encoding: "utf-8" }
				)
		  ).vsclientPort;
	if (!portStr) return;
	const port = Number(portStr);
	if (isNaN(port)) {
		vscode.window.showErrorMessage("Invalid port number.");
		return;
	}
	const pids = await getPids(port);
	const [cmd, baseArgs] =
		process.platform === "win32"
			? ["Taskkill", ["/F", "/PID"] as string[]]
			: ["kill", ["-9"] as string[]];
	return pids.filter((pid) => spawnSync(cmd, [...baseArgs, pid]).status === 0);
}

function getPids(port: number | string): Promise<string[]> {
	const isWin = process.platform === "win32";
	const [cmd, args] = isWin
		? ["netstat", ["-ano"] as string[]]
		: ["lsof", ["-t", `-i:${port}`] as string[]];
	const proc = spawn(cmd, args);
	let out = "";
	return new Promise((resolve) => {
		proc.stdout.on("data", (d) => (out += d));
		proc.on("close", () => {
			const lines = out
				.split(/\r?\n/)
				.map((l) => l.trim())
				.filter(Boolean);
			const pids = lines
				.filter((line) => !isWin || line.includes(`:${port}`))
				.map((line) => (isWin ? line.split(/\s+/).pop()! : line))
				.filter((pid) => pid !== "0");
			resolve(Array.from(new Set(pids)));
		});
	});
}

export async function withLoader<T>(title: string, fn: () => Promise<T>): Promise<T> {
	return vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title,
			cancellable: false,
		},
		async () => {
			return fn();
		}
	);
}
//#endregion

//#region //PR0050 @Nayan 10JUL2025 F7.2.XX_25_27-29 PROC-18559
function getlocalPackageInstallation() {
	const config = vscode.workspace.getConfiguration();
	return config.get("procifynowExtension.localPackageInstallation", false);
}

let tsModule: typeof import("typescript") | null = null;
async function loadTypeScript(): Promise<typeof import("typescript") | null> {
	if (tsModule) return tsModule;
	const wsTs = resolveTSModule(vscode.workspace.workspaceFolders?.[0].uri.fsPath || "");
	const globalTs = wsTs ? null : resolveGlobalTS();
	const tsPath = wsTs || globalTs;
	if (!tsPath) {
		const install = "Install TS locally";
		const choice = await vscode.window.showErrorMessage(
			"TypeScript module not found in workspace or globally",
			install
		);
		if (choice === install && vscode.workspace.workspaceFolders?.[0]) {
			vscode.commands.executeCommand(
				"vscode.openFolder",
				vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "package.json")
			);
		}
		return null;
	}
	tsModule = require(tsPath);
	return tsModule;
}
function resolveTSModule(workspaceFolder: string): string | null {
	try {
		return require.resolve("typescript", { paths: [workspaceFolder] });
	} catch {
		return null;
	}
}

function resolveGlobalTS(): string | null {
	try {
		const prefix = execSync("npm prefix -g").toString().trim();
		return require.resolve("typescript", { paths: [prefix] });
	} catch {
		return null;
	}
}

export async function getNpmPrefix() {
	const prefix = execSync("npm prefix -g").toString().trim();
	return prefix;
}
export async function isGlobalSetupValid(): Promise<boolean> {
	const expected = "C:\\Procify_Global_nodemodules";
	let prefix: string;
	try {
		prefix = await getNpmPrefix();
	} catch {
		return false;
	}
	if (prefix !== expected) return false;
	const modulesDir = path.join(prefix, "node_modules");
	const pkgJson = path.join(prefix, "package.json");
	try {
		const entries = fs.readdirSync(modulesDir);
		return fs.existsSync(pkgJson) && entries.length > 0;
	} catch {
		return false;
	}
}

export async function canProceed(): Promise<boolean> {
	const platform = process.platform;
	if (platform == "win32") {
		const globalOk = await isGlobalSetupValid();
		const local = getlocalPackageInstallation();
		if (!globalOk && !local) {
			vscode.window.showInformationMessage(
				`Enable “localPackageInstallation” in settings by running "Set local package installation" in command palette. or run "Run Environment Setup" in command palette > select "Environment Variables" and "Global Package Installation".`
			);
			return false;
		}
		return true;
	}
	if (platform == "darwin" || platform == "linux") {
		if (!getlocalPackageInstallation()) {
			vscode.window.showInformationMessage(
				`Enable “localPackageInstallation” in settings by running "Set local package installation" in command palette.`
			);
			return false;
		}
		return true;
	}
	return false;
}

async function installNodeModules(): Promise<string> {
	return new Promise((resolve, reject) => {
		const folders = vscode.workspace.workspaceFolders;
		if (!folders || !folders.length) {
			vscode.window.showErrorMessage("No workspace folder is open.");
			return reject("No workspace");
		}
		const cwd = folders[0].uri.fsPath;
		//PR0050 @Nayan 15JUL2025 F7.2.XX_25_27-29 PROC-20273
		const options: vscode.ShellExecutionOptions = {
			cwd,
			executable: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
			shellArgs:
				process.platform === "win32"
					? ["/d", "/c"] // for cmd.exe
					: ["-lc"],
		};

		const exec = new vscode.ShellExecution("npm", ["install"], options);

		const task = new vscode.Task(
			{ type: "shell", task: "Install node modules" },
			vscode.TaskScope.Workspace,
			"Install node modules",
			"npm",
			exec
		);
		task.problemMatchers = ["$npm-install"];
		const listener = vscode.tasks.onDidEndTaskProcess((e) => {
			if (e.execution.task.name === task.name) {
				// listener.dispose();
				if (e.exitCode === 0) resolve("Done");
				else reject(new Error(`npm install failed (exit ${e.exitCode})`));
			}
		});
		vscode.tasks.executeTask(task).then(
			() => {},
			(err) => {
				// listener.dispose();
				reject(err);
			}
		);
	});
}
//#endregion
