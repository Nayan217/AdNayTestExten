// import { UserInfo } from "kloBo/Adm/UserInfo";
// import { ROTManagerNew } from "kloBo/Adm/ROTManagerNew";
// import { TsConfigGenerator } from "kloBo/Utils/TsConfigGenerator";
// import type { IClientGlobal, IFW_FS } from "kloBo/Adm/ADMClientInterFaces";
// import { Environment } from "kloBo/Utils/Environment";
// import { MetadataSave } from "kloBo/meta/MetadataSave1";
// import { KloLocalStorage, STORAGE_SCOPE } from "kloBo/kloCommon/KloLocalStorage";
// import { LocalStorageFields, USER_PROCESS_STAGE, NetworkModes, convertableContent } from "kloBo/KloEnums"; //PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884 -Added NetworkModes //PR0050 @Nayan 07APR2025 F7.2.XX_25/15-17 PROC-16952- corruptibleExtSet
// import type { ReqData } from "kloBo/ServerBolRest";
// import { KloTransaction } from "kloBo/KloTransaction";
// import type { KloEntitySet } from "kloBo/KloEntitySet";
// import type { m_file } from "core_fw/entity_gen/m_file";
// import { LocalStorage } from "node-localstorage";
// //import * as prompt from "prompt"
// import * as path from "path";
// import * as fs from "fs";
// import type { App } from "kloBo/Adm/RotStructure";
// import { FlvBuild } from "kloBo/meta/FlvBuild2";
// import { KloAjax } from "kloBo/kloCommon/KloAjaxHandler";
// import { KloObject } from "kloBo/KloObject";
// import { KloAppCache } from "kloBo/meta/KloAppCache";
// import { AdmEngine } from "kloBolServer/Adm/AdmEngine";
// declare let requirejs;
// // import {KloAjax} from "kloBo/Adm/Ajax/KloAjaxHandler"

// declare let clientGlobalObj: IClientGlobal;
// interface KlarionFile {
// 	ipAddress: string;
// 	port: string;
// 	landscape: string;
// 	mmid: string;
// 	webContext: string;
// 	isPublicNode: string;
// 	url: string;
// 	vsclientPort: number;
// 	token: string;
// 	token_expiry: number;
// 	endpointid: string;
// }
// /*
//  * workspace initialization and setup !
//  * new_m_file repositiry handling !
//  * authenticaion for above with wildfly.
//  */
// type RepoActions = "commit" | "update" | "checkout" | "delete" | "revert" | "registerUser" | "updateFileStatus" | "renamed" | "resolveConflict" | "getDownlodedApp" | "repair" | "releasedVersionsCheckout" | "checkReleasedVersionsCheckout"; //PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884 - Added releasedVersionsCheckout and checkReleasedVersionsCheckout
// enum FileStatus {
// 	localModified = "LM",
// 	localCreated = "LC",
// 	localDeleted = "LD",
// 	conflictResolved = "CR",
// 	conflict = "C",
// 	revert = "R",
// 	remoteModified = "RM",
// 	remoteCreated = "RC",
// 	remoteDeleted = "RD",
// 	uptodate = "UTD",
// }
// interface FileLogFormat {
// 	writeAbleFVs: string[];
// 	checkoutFVs: { [fvid: string]: { lct: number | bigint } }; //last checkout time // moast4_ui_1
// 	renamed?: { [appDir: string]: { r_file_path: string; r_file_path_new: string } };
// 	dependant_apps: { [appDir: string]: string[] };
// 	from_query?: {
// 		[appDir: string]: {
// 			[r_file_path: string]: {
// 				/** RepositoryFirstTime came to local from repository -> s_modified_on */
// 				trf?: number | bigint;
// 				/** RepositoryLatestTime read s_modified_on from repository as last update */
// 				trl?: number | bigint;
// 				/** DiskFirstTime after writing to disk this was the time as per fs modified time*/
// 				tdf?: number | bigint;
// 				/** DiskLatestTime read from disk as last update */
// 				tdl?: number | bigint;
// 				status?: FileStatus;
// 				i?: number; //inherited or not
// 				//does not capture rename.
// 			};
// 		};
// 	};
// 	//Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 	checkout_fvs?: { [appName: string]: { status: string } };
// 	settup_status?: string;
// 	releasedApps?: { [fvid: string]: { lct: number | bigint; status?: string } }; //PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884 - added to store releasedApps statuses
// 	internalNonEditableApps?: string[]; //PR0050 @Nayan 13AUG2025 F7.2.XX_25_27-29 PROC-19721 - added to store internalApps
// 	app_items?: any[];
// }

// //  modify file need to change tdl
// //  deleted locally // need change tdl to null,
// //  created locally // need to change only tdl // rest will be null
// //  renamed locally //  maintain renamed of fileLog

// export class KloRepo extends KloObject {
// 	// file wise opration
// 	// SVN update, SVN checkout, SVN commit, check for modification,
// 	// resolve. SVN revert,

// 	private mm_landscape: { account_id: number; landscape_id: string; kloBolVersion: string };
// 	private _txn: KloTransaction;
// 	private logFilePath: string = `${process.cwd()}/.vscode/log.json`;
// 	private chekcoutlogPath: string = `${process.cwd()}/.vscode/checkout_log.json`; //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 	//private klarionFilePath: string = `${process.cwd()}/kloconfig/klarion.json`
// 	private klarionFileData: KlarionFile;
// 	private fileLog = <FileLogFormat>{};
// 	private checkLog = <FileLogFormat>{}; //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 	private static _instance: KloRepo;
// 	private readonly MAX_PAYLOAD_SiZE = 18000; //18 mb.(2mb buffer for other entityset data)
// 	private readonly MAX_FILE_SIZE = 10000; //10mb
// 	private fileSizeCount: number;
// 	public tokenPromise: { promise: Promise<any>; resolve: Function; reject: Function };

// 	constructor() {
// 		super();
// 		global["node"] = true;
// 		global["publicNode"] = false;
// 		require("kloBo/Adm/ClientGlobal");
// 		global["localStorage"] = new LocalStorage("./.vscode/KloLocalStorage");
// 		let defaultConfig = JSON.parse(fs.readFileSync(`${process.cwd()}/kloconfig/config.json`, { encoding: "utf-8" }));
// 		//PR0038 @Souvik 28May2024 F6.0 BETA PROC-8664
// 		clientGlobalObj.setResourcesVersion({ core_fw_version: defaultConfig.mm_landscape.kloCoreFWVersion, bol_version: defaultConfig.mm_landscape.kloBolVersion, shared_version: defaultConfig.mm_landscape.kloSharedVersion, ui5_version: defaultConfig.mm_landscape.kloUI5Version, bundleExt: defaultConfig.mm_landscape.bundleExt });
// 		clientGlobalObj.intializeRequireConfig();
// 		// Used for delaying websocket connection in private server.
// 		let resolve, reject;
// 		let tokenP = new Promise((res, rej) => {
// 			resolve = res;
// 			reject = rej;
// 		});
// 		this.tokenPromise = { promise: tokenP, reject: reject, resolve: resolve };
// 		this.fileServiceInit();
// 		let userInfo = UserInfo.getActiveUser();
// 		if (userInfo.isValidUser()) resolve();
// 	}

// 	public static getInstace(): KloRepo {
// 		this._instance = this._instance || new KloRepo();
// 		return this._instance;
// 	}

// 	//Single File Operation complete flow :
// 	// update  pending
// 	// save  pending
// 	// revert pending
// 	//shared - closedmodules
// 	public async init(reqObject: { action: RepoActions; [key: string]: any }) {
// 		let repoAction: RepoActions = reqObject.action;
// 		if (repoAction == "checkReleasedVersionsCheckout") return "true"; //PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884 - to check whether releasedVersionsCheckout functionality is present or not to
// 		let txn: KloTransaction = !["registerUser", "getDownlodedApp", "repair"].includes(repoAction) ? await this.getTransaction() : null;
// 		this.readFileLog();
// 		if (reqObject.isSingleOperation) {
// 			return await this.singleFileOperation(txn, reqObject.action, reqObject.selectedFiles);
// 		}
// 		if (repoAction == "checkout") return await this.repoCheckout(txn, reqObject.selectedApps);
// 		else if (repoAction == "releasedVersionsCheckout") return await this.repoCheckoutReleasedApps(txn, reqObject.selectedApps[0]); //PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884 - if it is releasedVersion Checkout
// 		else if (repoAction == "commit") return await this.repoCommit(txn, reqObject.selectedFiles);
// 		else if (repoAction == "registerUser") return await this.registration(reqObject.userInfo);
// 		else if (repoAction == "update") return await this.repoUpdate(txn, reqObject.selectedApps);
// 		else if (repoAction == "revert") return await this.repoRevert(txn, reqObject.selectedApps);
// 		else if (repoAction == "delete") return await this.repoDelete(txn, reqObject.filesToBeDeleted);
// 		else if (repoAction == "renamed") return this.onRenamed(reqObject.filesToBeRenamed);
// 		else if (repoAction == "resolveConflict") {
// 			if (reqObject.operation == "commit") return await this.repoCommit(txn, reqObject.selectedFiles, false, true);
// 			else if (reqObject.operation == "revert") {
// 				return await this.repoRevert(txn, Object.keys(reqObject.selectedFiles), reqObject.selectedFiles);
// 			}
// 		} else if (repoAction == "updateFileStatus") {
// 			await this.repoCheckForModification(txn);
// 			this._updateFileLogStatus();
// 			this.saveLogFile();
// 			return "Status Updated";
// 		} else if (repoAction == "getDownlodedApp") {
// 			let downloadApp = KloLocalStorage.getItemParsed(LocalStorageFields.FILES_DOWNLOADED, STORAGE_SCOPE.landscape);
// 			return downloadApp ? downloadApp.map((d) => d.r_flavor + "@@" + d.r_version + "@@" + d.r_buildno) : [];
// 		} else if (repoAction == "repair") {
// 			return await this.repair(reqObject.appZipToDownloaded);
// 		}
// 	}

// 	private getKlarionFileData(): KlarionFile {
// 		if (!this.klarionFileData) this.klarionFileData = JSON.parse(fs.readFileSync(`${process.cwd()}/kloconfig/klarion.json`, { encoding: "utf-8" }));
// 		return this.klarionFileData;
// 	}

// 	/*PR0037 @Prashant 26Oct2023 FBranch I5966 */
// 	public async downloadZipIfNotFound(zipUrl: string) {
// 		if (fs.existsSync(`${process.cwd()}${path.sep}${zipUrl.split(`${clientGlobalObj.landscape}/`)[1]}`)) return;
// 		let klarionFileContent: KlarionFile = this.getKlarionFileData();
// 		await this.fileServiceInit(klarionFileContent);
// 		let fwFs: IFW_FS = clientGlobalObj.fw_fs.getInstance();
// 		let appName = zipUrl.split("cdn_app/")[1].split(".zip")[0];
// 		let { flavor, version } = this.getFlavorVersionFromFv(appName);
// 		//pr0022 Sams 10-01-24 I3856 issue of missing zip
// 		try {
// 			await fwFs.addTask(flavor, version, 0, true);
// 		} catch (err) {
// 			throw Error(err);
// 		}
// 	}

// 	public async addUser(regResponse: string) {
// 		let response: UserInfo = JSON.parse(regResponse);
// 		let user: string = response.r_login_id;
// 		let klarionFileContent: KlarionFile = this.getKlarionFileData();
// 		this.readFileLog();
// 		if (!klarionFileContent) {
// 			throw new Error("Do Private Node Setup First for registration");
// 		}
// 		await this.fileServiceInit(klarionFileContent);
// 		let promises: Array<Promise<any>> = [];
// 		let appItems: Array<App> = response.app_items;
// 		let devAppItems: { [appver: string]: string } = response.developer_apps || {};
// 		let alreadyCheckoutFV: string[] = Object.keys(this.fileLog.checkoutFVs || {});
// 		let appToCheckOut: string[] = [];
// 		let fwFs: IFW_FS = clientGlobalObj.fw_fs.getInstance();
// 		for (let app of appItems) {
// 			promises.push(fwFs.addTask(app.r_flavor, app.r_version, app.r_buildno, true));
// 		}
// 		if (klarionFileContent.mmid.toUpperCase() == user.toUpperCase()) {
// 			//pr0022 Sams 10-01-24 I3856 issue of missing zip
// 			try {
// 				await Promise.all(promises);
// 			} catch (err) {
// 				console.log("Registration Failed!!!");
// 				return this.returnMsg("registerUser", false, err.message || err.getMessage());
// 			}
// 			return;
// 		}
// 		for (let devApp of Object.keys(devAppItems)) {
// 			if (!alreadyCheckoutFV.includes(devApp)) appToCheckOut.push(devApp);
// 		}
// 		if (appToCheckOut[0]) {
// 			let txn: KloTransaction = await this.getTransaction();
// 			promises.push(this.repoCheckout(txn, appToCheckOut));
// 		}
// 		await Promise.all(promises);
// 	}

// 	public async modifyRegisterResponse(regResponse: string) {
// 		let response: UserInfo = JSON.parse(regResponse);
// 		let userInfo: UserInfo = UserInfo.getActiveUser();
// 		this.readFileLog();
// 		let checkoutFVs: string[] = Object.keys(this.fileLog.checkoutFVs || {});
// 		userInfo.addSharedCore(response.app_items);
// 		if (!checkoutFVs[0]) {
// 			response.app_items.forEach((app) => {
// 				app.r_is_external = 1;
// 			});
// 		} else {
// 			for (let app of response.app_items) {
// 				app.r_is_external = checkoutFVs.includes(this.getParsedFv(app.r_flavor, app.r_version)) ? 0 : 1;
// 				/*PR0037 @Prashant 16Nov2023 FTRUNK S3618 */
// 				app.r_checkedout_flavor = app.r_is_external === 1 ? 0 : 1;
// 			}
// 		}
// 		await this.getTransaction();
// 		/*PR0037 @Prashant 20Dec2023 FBranch I3471 */
// 		await new AdmEngine(this._txn).markDepFlvWrtiable(response.app_items);
// 		await userInfo.setRequireConfig(response.app_items);
// 		return JSON.stringify(response);
// 	}

// 	public async createTranForRepo() {
// 		// Initializing other bol versions
// 		let userInfo = UserInfo.getActiveUser();
// 		//PR0024 @Harikrishna 28Mar2024 F6.0_BETA PROC-6826 - triggering init all klobase versions
// 		try {
// 			await userInfo.initializeAllClassMap();
// 		} catch (err) {
// 			console.error("Failed to initialize all class maps.", err);
// 		}
// 		this.readFileLog();
// 		if (!this.fileLog.checkoutFVs) return;
// 		await this.getTransaction();
// 	}

// 	public async syncMetadata(txn?: KloTransaction, incomingApps?: { appDir: { r_file_path: string[] } }, waitForFileWrite: boolean = false) {
// 		this.readFileLog();
// 		if (!this.fileLog.checkoutFVs) return;
// 		let txn1: KloTransaction = txn || (await this.getTransaction());
// 		let metadataSave: MetadataSave = new MetadataSave();
// 		let appToUpdate: { appDir: { r_file_path: string[] } } = incomingApps || <{ appDir: { r_file_path: string[] } }>{};
// 		let filePathsForDacheAndRqCg: string[] = [];
// 		try {
// 			if (!incomingApps) {
// 				for (let appVer in this.fileLog.checkoutFVs) {
// 					let { flavor, version } = this.getFlavorVersionFromFv(appVer);
// 					await metadataSave.initVars(txn1, flavor, version);
// 					let rs: KloEntitySet<m_file> = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, { partialSelect: ["r_file_path", "file_type"], s_modified_on_GT: this.fileLog.checkoutFVs[appVer].lct }, false, this.getParsedFvid(txn1.$SYSTEM.account, flavor, version));
// 					let fileList: string[] = [];
// 					let usersFiles: string[] = Object.keys(this.fileLog.from_query[appVer]);
// 					rs.forEach((r) => {
// 						if (["entity_gen", "query_gen", "INDEX", "metadata"].includes(r.file_type) || !usersFiles.includes(r.r_file_path)) {
// 							fileList.push(r.r_file_path);
// 							// filePathsForDacheAndRqCg.push(`${path.sep}cdn_app${path.sep}${txn1.$SYSTEM.landscape}${path.sep}${appVer}${path.sep}${r.r_file_path}`)
// 							filePathsForDacheAndRqCg.push(`${path.sep}${txn1.$SYSTEM.landscape}${path.sep}cdn_app${path.sep}${appVer}${path.sep}${r.r_file_path}`.replace(".ts", ".js")); // PR0023 @Prem 28Feb2024 FBranch I5061
// 						}
// 					});
// 					appToUpdate[appVer] = fileList;
// 				}
// 			}
// 			for (let appVer in appToUpdate) {
// 				if (!appToUpdate[appVer].length) continue;
// 				let { flavor, version } = this.getFlavorVersionFromFv(appVer);
// 				await metadataSave.initVars(txn1, flavor, version);
// 				this.fileLog.checkoutFVs[appVer].lct = new Date().getTime();
// 				let rs: KloEntitySet<m_file> = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, { r_file_path: appToUpdate[appVer] }, false, this.getParsedFvid(txn1.$SYSTEM.account, flavor, version));
// 				if (waitForFileWrite) {
// 					await this._saveToDisk(metadataSave, rs, true);
// 					await metadataSave.fileProm;
// 				} else {
// 					await this._saveToDisk(metadataSave, rs);
// 				}
// 				this.saveLogFile();
// 			}
// 			filePathsForDacheAndRqCg[0] ? await FlvBuild.decacheFiles(txn1, filePathsForDacheAndRqCg, null, true) : "";
// 		} catch (err) {
// 			debugger;
// 		}
// 	}

// 	public async pullOnRemoteUpdate(txn: KloTransaction, filesToPullFromServer: string[]) {
// 		this.readFileLog();
// 		let appVerList: string[] = Object.keys(this.fileLog.checkoutFVs || {});
// 		if (!appVerList[0]) return;
// 		let fileToBePulled: { appDir: { r_file_path: string[] } } = <{ appDir: { r_file_path: string[] } }>{};
// 		for (let file of filesToPullFromServer) {
// 			for (let app of appVerList) {
// 				if (file.includes(app)) {
// 					let tempFilePath: string = file.split(app)[1].split("\\").join("/");
// 					if (!(file.includes("metadata") || file.includes("_gen") || file.includes("_base") || file.includes("query_gen") || file.includes("entity_gen")))
// 						// 31-07-2024 pr0022 @Sams F60 I7964 query and entity removed from if condition //5Aug 2024 pr0045 @Raman F60 I11597 app_services is removed from if condition
// 						continue;
// 					fileToBePulled[app] = fileToBePulled[app] || [];
// 					tempFilePath = tempFilePath.replace("/", "");
// 					tempFilePath = tempFilePath.replace(".js", ".ts");
// 					fileToBePulled[app].push(tempFilePath);
// 				}
// 			}
// 		}
// 		if (!Object.keys(fileToBePulled).length) return;

// 		await this.syncMetadata(txn, fileToBePulled, true);
// 	}

// 	private async fileServiceInit(pKlarionFileContent?: KlarionFile) {
// 		if (typeof clientGlobalObj.fw_fs == "function") return;
// 		let fwFsPath: string = "kloBo/Adm/Fw_Fs";
// 		let klarionFileContent: KlarionFile = pKlarionFileContent || this.getKlarionFileData();
// 		/*PR0037 @Prashant 1Dec2023 FBranch I7135 */
// 		global["hostAddress"] = klarionFileContent.ipAddress + (klarionFileContent.port != "443" ? ":" + klarionFileContent.port : ""); //ClientGlobal cdn_path for dowloading zip from server
// 		await import(fwFsPath);
// 	}

// 	private async repair(appZipToBeDownloaded: string[]) {
// 		await this.fileServiceInit();
// 		let rotManger: ROTManagerNew = ROTManagerNew.getInstance();
// 		let fwFs: IFW_FS = clientGlobalObj.fw_fs.getInstance();
// 		for (let app of appZipToBeDownloaded) {
// 			rotManger.removeDownloadedFWFiles(app.split("@@")[0], parseInt(app.split("@@")[2] || "0"), app.split("@@")[1]);
// 			await fwFs.addTask(app.split("@@")[0], app.split("@@")[1], parseInt(app.split("@@")[2] || "0"), true, true);
// 		}
// 		return "Zip downloaded Successfully";
// 	}

// 	//PR0024 @Harikrishna 10thMay2024 F6.0 BETA PROC-6875
// 	private async registration(userInfo) {
// 		this.checkLog.settup_status = "Registartion : InProcess"; //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 		this.saveLogFile(true);
// 		let klarionFileContent: KlarionFile = this.getKlarionFileData();
// 		await this.fileServiceInit(klarionFileContent);
// 		global["originUrl"] = `https://${klarionFileContent.ipAddress}:${klarionFileContent.port}`; // getting url for login method
// 		window["databaseAliasMap"] = {}; // for db // cretae attachment table
// 		let tokenFromServer: string = null;
// 		let userInfoIns: UserInfo = UserInfo.getActiveUser();

// 		await userInfoIns.initNode(); // Called to download deca, openUI5, shared, core_fw.
// 		try {
// 			if (userInfoIns.getNextState() == USER_PROCESS_STAGE.LOGIN) {
// 				await userInfoIns.login(userInfo.userId, userInfo.password);
// 				tokenFromServer = KloLocalStorage.getItemParsed(LocalStorageFields.KEYCLOAK_OFFLINE_AUTH_TOKEN, STORAGE_SCOPE.endpoint);
// 				klarionFileContent.token = tokenFromServer;
// 				klarionFileContent["token_expiry"] = Date.now() + 1000 * 60 * 15;
// 				klarionFileContent.endpointid = sessionStorage.getItem("endPointId");
// 				global["klarionData"] = klarionFileContent; // Added by hari.
// 				global["thisnodeid"] = klarionFileContent.endpointid; // Added by hari.
// 				fs.writeFileSync(`${process.cwd()}/kloconfig/klarion.json`, JSON.stringify(klarionFileContent, null, 4));
// 				KloAjax.removeInstance();
// 			}

// 			if (userInfoIns.getNextState() == USER_PROCESS_STAGE.FETCH_APPLIST) {
// 				let valueBag = {
// 					r_action: "resolve_user",
// 					is_sign_up: false,
// 					properties: [
// 						{ t_name: "page_register_inp_mob", t_value: userInfo.userId },
// 						{ t_name: "is_sign_up", t_value: "false" },
// 						{ t_name: "APP_ID", t_value: "browser" },
// 					],
// 				};
// 				await userInfoIns.performDeviceRegisterCall(valueBag);
// 			}
// 		} catch (err) {
// 			console.log(err);
// 			return this.returnMsg("registerUser", false, err && err.toString());
// 		}
// 		// tokenFromServer = KloLocalStorage.getItemParsed(LocalStorageFields.KEYCLOAK_OFFLINE_AUTH_TOKEN,STORAGE_SCOPE.endpoint)
// 		// klarionFileContent.token = tokenFromServer;
// 		// klarionFileContent["token_expiry"] = Date.now() + (1000 * 60 * 15);
// 		// klarionFileContent.endpointid = sessionStorage.getItem('endPointId');
// 		// global["klarionData"] = klarionFileContent; // Added by hari.
// 		// global["thisnodeid"] = klarionFileContent.endpointid; // Added by hari.
// 		// fs.writeFileSync(`${process.cwd()}/kloconfig/klarion.json`, JSON.stringify(klarionFileContent, null, 4));

// 		let userInfo1: UserInfo = UserInfo.getActiveUser();
// 		let app_items = userInfo1.app_items.map((app) => {
// 			return { r_fv_id: app.r_fv_id, r_flavor: app.r_flavor, r_version: app.r_version, r_buildno: app.r_buildno, r_description: app.r_description };
// 		}); //PR0037 @Prashant 16Nov2023 FTRUNK S3618
// 		let internalApps = userInfo1.app_items.filter((item) => item.r_is_external == 0) || [];
// 		userInfo1.app_items.map((app) => (app.r_is_external = 1)); // PR0023 @Prem 26Feb2024 FBranch I4863 For making every app as readonly initially before reg proc in private setup
// 		/*PR0037 @Prashant 1Dec2023 FBranch I7160 */

// 		if (userInfoIns.getNextState() == USER_PROCESS_STAGE.APP_INSTALL) await userInfo1.handleUserProcess(); // Called to trigger downloading rot, preparing requireConfig.
// 		await userInfo1.initializeAllClassMap(); // In client called in postHtml. //PR0023 @Prem F6.0 Beta 3June2024 I6257 --Multiversion commit
// 		this.tokenPromise.resolve(); // Added by hari
// 		this.checkLog.writeAbleFVs = Object.keys(userInfo1.developer_apps || {}); //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 		this.fileLog.writeAbleFVs = Object.keys(userInfo1.developer_apps || {});
// 		this.fileLog.app_items = app_items;
// 		this.fileLog.internalNonEditableApps = internalApps.filter((item) => !(item.r_fv_id in userInfo1.developer_apps)).map((e) => e.r_fv_id);
// 		this.checkLog.settup_status = "Registartion : completed"; //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 		await this.mainTsConfigFiles(
// 			false,
// 			userInfo1.app_items.map((e) => this.getParsedFv(e.r_flavor, e.r_version)),
// 			[]
// 		);
// 		this.saveLogFile();
// 		this.saveLogFile(true); //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 		console.info("Private server registration completed.");
// 		return this.returnMsg("registerUser", true);
// 	}

// 	private async mainTsConfigFiles(isDeveloperApps: boolean, userRot: string[], developerRot?: string[], devDependantFlv?: { [appName: string]: Array<{ flv: string; version: string; readonly: boolean }> }) {
// 		let FlavorTsConfig: any = this.getTsConfigTemplate();
// 		let mainTsConfig = JSON.parse(await this.readFile("./tsconfig.json"));
// 		let TsConfig4Closedmodules = JSON.parse(await this.readFile("./closedmodules/tsconfig.json"));
// 		let tsconfigMap = {};
// 		let tsconfigForClosedModules = {};
// 		let tsConfigPerApp = {};
// 		//let fwResources: string[] = [`kloBo-${clientGlobalObj.bolVersion}`, `kloBolServer-${clientGlobalObj.bolVersion}`];
// 		let fwResources: string[] = [`kloBo-${clientGlobalObj.bolVersion}`, `kloBolServer-${clientGlobalObj.bolVersion}`, `kloTouch-${clientGlobalObj.bolVersion}`]; //PR0072 @Abhijith Kumar 02MAY2025 PROC-17061
// 		userRot = userRot.concat(fwResources);
// 		let allFlavors: string[] = userRot.concat(developerRot);
// 		for (let fvid of allFlavors) {
// 			let { flavor, version } = this.getFlavorVersionFromFv(fvid);
// 			if (fwResources.includes(fvid)) {
// 				flavor = fvid.split("-")[0];
// 				version = clientGlobalObj.bolVersion;
// 				tsconfigForClosedModules[flavor + "/*"] = [`./${flavor}_${version}/*`];
// 				mainTsConfig.compilerOptions.paths[flavor + "/*"] = [`./closedmodules/${flavor}_${version}/*`];
// 				continue;
// 			}
// 			if (developerRot.includes(fvid) && isDeveloperApps) {
// 				tsConfigPerApp[fvid] = FlavorTsConfig;
// 				//await this.writeFile(`${process.cwd()}/src/${flavor}_${version}/tsconfig.json`, JSON.stringify(FlavorTsConfig, null, 2));
// 				tsconfigMap[flavor + "/*"] = [`./src/${flavor}_${version}/*`];
// 				tsconfigForClosedModules[flavor + "/*"] = [`../src/${flavor}_${version}/*`];
// 			} else if (!isDeveloperApps) {
// 				mainTsConfig.compilerOptions.paths[flavor + "/*"] = [`./closedmodules/${flavor}_${version}/*`];
// 			}
// 			/*PR0037 @Prashant 20Oct2023 FBranch S5923 */
// 			if (developerRot && devDependantFlv) {
// 				let alreadyCheckedOutApps: string[] = Object.keys(this.fileLog.checkoutFVs || {});
// 				if (!devDependantFlv[fvid]) continue;
// 				for (let i = 0; i < devDependantFlv[fvid].length; i++) {
// 					if (i == 0) continue;
// 					tsconfigMap[`${flavor}_base/*`] = tsconfigMap[`${flavor}_base/*`] || [];
// 					let j: number = i - 1; // i == child app // j == intermediate parent app
// 					while (j >= 0) {
// 						let intermediateParent: string = this.getParsedFv(devDependantFlv[fvid][j].flv, devDependantFlv[fvid][j].version);
// 						delete tsConfigPerApp[fvid].compilerOptions.rootDir;
// 						tsConfigPerApp[fvid].compilerOptions["rootDirs"] = tsConfigPerApp[fvid].compilerOptions["rootDirs"] || [];
// 						tsConfigPerApp[fvid].compilerOptions["rootDirs"].push(`src/${intermediateParent}/*`);
// 						tsConfigPerApp[fvid].include.push(`../../src/${intermediateParent}/**/*.ts`);
// 						let appPath: string = alreadyCheckedOutApps.includes(intermediateParent) ? "src" : "closedmodules";
// 						tsconfigMap[devDependantFlv[fvid][j].flv + "/*"] = tsconfigMap[devDependantFlv[fvid][j].flv + "/*"] || [`./${appPath}/${intermediateParent}/*`];
// 						tsconfigForClosedModules[devDependantFlv[fvid][j].flv + "/*"] = tsconfigForClosedModules[devDependantFlv[fvid][j].flv + "/*"] || [`../${appPath}/${intermediateParent}/*`];
// 						if (!tsconfigMap[`${flavor}_base/*`].includes(`./${appPath}/${intermediateParent}/*`))
// 							/*PR0037 @Prashant 27Nov2023 FBranch I6938 */
// 							tsconfigMap[`${flavor}_base/*`].unshift(`./${appPath}/${intermediateParent}/*`); // add in the beginning // so if not found
// 						j = j - 1;
// 					}
// 				}
// 			}
// 			if (tsConfigPerApp[fvid]) {
// 				await this.writeFile(`${process.cwd()}/src/${fvid}/tsconfig.json`, JSON.stringify(tsConfigPerApp[fvid], null, 2));
// 			}
// 			mainTsConfig.compilerOptions.paths = Object.assign({}, mainTsConfig.compilerOptions.paths, tsconfigMap);
// 			TsConfig4Closedmodules.compilerOptions.paths = Object.assign({}, TsConfig4Closedmodules.compilerOptions.paths, tsconfigForClosedModules);
// 		}
// 		mainTsConfig = JSON.stringify(mainTsConfig, null, 2);
// 		TsConfig4Closedmodules = JSON.stringify(TsConfig4Closedmodules, null, 2);
// 		await this.writeFile("./tsconfig.json", mainTsConfig);
// 		await this.writeFile("./closedmodules/tsconfig.json", TsConfig4Closedmodules);
// 	}

// 	private async repoCommit(txn: KloTransaction, fileToBeSaved: { [key: string]: string[] }, isDelete: boolean = false, resolveConflictBySave: boolean = false): Promise<string> {
// 		let metadataSave: MetadataSave = new MetadataSave();
// 		let fvFiles: { [fvid: string]: Array<{ aid?: number; content?: Blob; filePath: string; mime_type?: string; file_type?: string; action: string }> } = {};
// 		try {
// 			let appList: string[] = Object.keys(fileToBeSaved);
// 			for (let appVer of appList) {
// 				if (this.fileLog.internalNonEditableApps.includes(appVer)) continue;
// 				for (let rFilePath of fileToBeSaved[appVer]) {
// 					let { flavor, version } = this.getFlavorVersionFromFv(appVer);
// 					let appVerId: string = this.getParsedFvid(this.mm_landscape.account_id, flavor, version);
// 					fvFiles[appVerId] = fvFiles[appVerId] || [];
// 					if (this.fileLog.from_query[appVer][rFilePath].status == FileStatus.localDeleted) {
// 						fvFiles[appVerId].push({ filePath: rFilePath, action: "delete" });
// 					} else if (this.fileLog.from_query[appVer][rFilePath].status == FileStatus.localModified || this.fileLog.from_query[appVer][rFilePath].status == FileStatus.localCreated || resolveConflictBySave) {
// 						let fileContent: Buffer = await fs.promises.readFile(`${process.cwd()}/src/${appVer}/${rFilePath}`);
// 						//pr0022@Sams 29-04-24 adding capital JPG and PNG for image extension as it is currupting file F6.0 PROC-6980
// 						//PR0050 @Nayan 07APR2025 F7.2.XX_25/15-17 PROC-16952 - checking for files with certain extensions that can be converted to string
// 						let fileContent1 = <any>(this.isConvertableToString(rFilePath) ? fileContent.toString() : fileContent);
// 						if (this.fileLog.from_query[appVer][rFilePath].status == FileStatus.localModified || resolveConflictBySave) fvFiles[appVerId].push({ filePath: rFilePath, action: "modify", content: fileContent1 });
// 						else if (this.fileLog.from_query[appVer][rFilePath].status == FileStatus.localCreated) fvFiles[appVerId].push({ filePath: rFilePath, action: "created", content: fileContent1, aid: this.mm_landscape.account_id, mime_type: this.getFileAndMimeType(rFilePath).mime_type, file_type: this.getFileAndMimeType(rFilePath).file_type });
// 					}
// 				}
// 			}
// 			await KloAjax.getInstance().perFormApiAction("privateFileSave", { fileToBeSaved: fvFiles });
// 			for (let appVerId of Object.keys(fvFiles)) {
// 				let fileList = fvFiles[appVerId];
// 				let { accountID, flavor, version } = this.getFlavorVersionFromFvid(appVerId);
// 				await metadataSave.initVars(txn, flavor, version);
// 				let rsAfterCommit: KloEntitySet<m_file> = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, { r_file_path: fileList.map((a) => a.filePath) }, true, appVerId);
// 				await this._saveToDisk(metadataSave, rsAfterCommit);
// 			}
// 			this.saveLogFile();
// 			return isDelete ? this.returnMsg("delete", true) : this.returnMsg("commit", true);
// 		} catch (err) {
// 			console.log(JSON.stringify(err || "Undefined"));
// 			debugger;
// 			err = typeof err == "object" ? JSON.stringify(err) : err?.message || err || "Undefined";
// 			return isDelete ? this.returnMsg("delete", false, err) : this.returnMsg("commit", false, err);
// 		}
// 	}
// 	//PR0050 @Nayan 07APR2025 F7.2.XX_25/15-17 PROC-16952 - checking for files with certain extensions that can be converted to string
// 	public isConvertableToString(filePath) {
// 		let i = filePath.lastIndexOf(".");
// 		if (i < 0) return false;
// 		let ext = filePath.slice(i + 1).toLowerCase();
// 		return convertableContent.has(ext);
// 	}

// 	private async handleExceededFileSize(txn: KloTransaction, appVersion: string, rFilePath: string) {
// 		let stats: fs.Stats = await fs.promises.stat(`${process.cwd()}/src/${appVersion}/${rFilePath}`);
// 		let fileSizeInBytes: number = stats.size / 1000;
// 		if (fileSizeInBytes >= this.MAX_FILE_SIZE) return this.returnMsg("commit", false, `${rFilePath} exceeds MAX_FILE_SIZE = ${this.MAX_FILE_SIZE}`);
// 		if ((this.fileSizeCount += fileSizeInBytes) > this.MAX_PAYLOAD_SiZE) {
// 			await txn.commitP();
// 			this.fileSizeCount = 0;
// 		}
// 	}

// 	private async repoRevert(txn: KloTransaction, appToRevert: string[], filesToBeReverted?: { appDir: string[] }) {
// 		!filesToBeReverted ? await this.repoCheckForModification(txn, appToRevert) : "";
// 		!filesToBeReverted ? this._updateFileLogStatus() : "";
// 		let metadataSave: MetadataSave = new MetadataSave();
// 		let filesToRevert: string[];
// 		try {
// 			for (let appVer of appToRevert) {
// 				filesToRevert = [];
// 				let { flavor, version } = this.getFlavorVersionFromFv(appVer);
// 				if (filesToBeReverted && Object.keys(filesToBeReverted).length) filesToRevert = filesToBeReverted[appVer];
// 				else {
// 					for (let r_file_path in this.fileLog.from_query[appVer]) {
// 						if ([FileStatus.localDeleted, FileStatus.localModified, FileStatus.conflict].includes(this.fileLog.from_query[appVer][r_file_path].status)) filesToRevert.push(r_file_path);
// 					}
// 				}
// 				if (!filesToRevert[0]) continue;
// 				await metadataSave.initVars(txn, flavor, version);
// 				let appVerId: string = this.getParsedFvid(this.mm_landscape.account_id, flavor, version);
// 				let rs: KloEntitySet<m_file> = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, { r_file_path: filesToRevert }, true, appVerId);
// 				await this._saveToDisk(metadataSave, rs);
// 			}
// 			this.saveLogFile();
// 			return this.returnMsg("revert", true);
// 		} catch (err) {
// 			return this.returnMsg("revert", false, err.message || err.getMessage());
// 		}
// 	}

// 	private async repoUpdate(txn: KloTransaction, appsToUpdate: string[]) {
// 		await this.repoCheckForModification(txn, appsToUpdate);
// 		this._updateFileLogStatus();
// 		let metadataSave: MetadataSave = new MetadataSave();
// 		let filesToUpdate: string[];
// 		let filesToBeDeleted: string[];
// 		let filePathsForDacheAndRqCg: string[] = [];
// 		try {
// 			for (let app of appsToUpdate) {
// 				filesToUpdate = [];
// 				filesToBeDeleted = [];
// 				let { flavor, version } = this.getFlavorVersionFromFv(app);
// 				for (let r_file_path in this.fileLog.from_query[app]) {
// 					if ([FileStatus.remoteCreated, FileStatus.remoteModified].includes(this.fileLog.from_query[app][r_file_path].status)) {
// 						filesToUpdate.push(r_file_path);
// 						filePathsForDacheAndRqCg.push(`${path.sep}${txn.$SYSTEM.landscape}${path.sep}cdn_app${path.sep}${app}${path.sep}${r_file_path}`.replace(".ts", ".js")); // PR0023 @Prem 28Feb2024 FBranch I5061
// 					} else if (this.fileLog.from_query[app][r_file_path].status == FileStatus.remoteDeleted) {
// 						filesToBeDeleted.push(r_file_path);
// 					}
// 				}
// 				if (!filesToUpdate[0] && !filesToBeDeleted[0]) continue;
// 				else if (filesToBeDeleted[0]) {
// 					for (let file of filesToBeDeleted) {
// 						delete this.fileLog.from_query[app][file];
// 						/*PR0037 @Prashant 29Dec2023 FBranch PROC2745 */
// 						if (fs.existsSync(`${process.cwd()}/src/${app}/${file}`)) {
// 							fs.unlinkSync(`${process.cwd()}/src/${app}/${file}`);
// 						}
// 						//fs.rmSync(`${process.cwd()}/src/${appDir}/${file}`)
// 					}
// 				} else if (filesToUpdate[0]) {
// 					await metadataSave.initVars(txn, flavor, version);
// 					let appVerId: string = this.getParsedFvid(this.mm_landscape.account_id, flavor, version);
// 					let es: KloEntitySet<m_file> = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, { r_file_path: filesToUpdate }, true, appVerId);
// 					await this._saveToDisk(metadataSave, es);
// 				}
// 			}
// 			this.saveLogFile();
// 			await FlvBuild.decacheFiles(txn, filePathsForDacheAndRqCg, null, true);
// 			return this.returnMsg("update", true);
// 		} catch (err) {
// 			return this.returnMsg("update", false, err.message || err.getMessage());
// 		}
// 	}

// 	private async repoCheckout(txn: KloTransaction, appToCheckOut: string[]) {
// 		let metadataSave: MetadataSave = new MetadataSave();
// 		let userInfo: UserInfo = UserInfo.getActiveUser();
// 		this.fileLog.checkoutFVs = this.fileLog.checkoutFVs || {};
// 		let devDependantFlv: { [appName: string]: Array<{ flv: string; version: string; readonly: boolean }> } = {};
// 		//Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 		this.checkLog.checkoutFVs = this.fileLog.checkoutFVs || {};
// 		this.checkLog.checkout_fvs = this.checkLog.checkout_fvs || {};
// 		this.saveLogFile(true);
// 		let appVerId: string = "";
// 		try {
// 			for (let dirName of appToCheckOut) {
// 				if (Object.keys(this.fileLog.checkoutFVs).includes(dirName)) continue;
// 				let { flavor, version } = this.getFlavorVersionFromFv(dirName);
// 				await metadataSave.initVars(txn, flavor, version);
// 				appVerId = this.getParsedFvid(this.mm_landscape.account_id, flavor, version);
// 				this.fileLog.checkoutFVs[dirName] = { lct: new Date().getTime() };
// 				this.checkLog.checkout_fvs[appVerId] = { status: "InProcess" }; //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 				this.saveLogFile(true);
// 				/*PR0037 @Prashant 20Oct2023 FBranch S5923 */
// 				let app: App[] = userInfo.app_items.filter((app: App) => app.r_flavor == flavor && app.r_version == version);
// 				if (app[0]) {
// 					devDependantFlv[dirName] = JSON.parse(app[0].r_dependant_flavors);
// 					/*PR0037 @Prashant 13Nov2023 FBranch I4631 */
// 					this.fileLog.dependant_apps = this.fileLog.dependant_apps || {};
// 					this.fileLog.dependant_apps[dirName] = JSON.parse(app[0].r_dependant_flavors).map((r) => this.getParsedFv(r.flv, r.version));
// 				}
// 				let es: KloEntitySet<m_file> = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, {}, true, appVerId);
// 				// This will save file to disk, compile and put it in cdnApp, will do the undef also.
// 				await this._saveToDisk(metadataSave, es);
// 				this.saveLogFile();
// 				this.checkLog.checkout_fvs[appVerId] = { status: "Completed" }; //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 				this.saveLogFile(true);
// 				(await KloAppCache.gI(txn.getLandscape())).removeApp(txn.getLandscape(), appVerId);
// 			}
// 			await this.mainTsConfigFiles(true, [], appToCheckOut, devDependantFlv);
// 			userInfo.checkoutApps = Object.keys(this.fileLog.checkoutFVs);
// 			// PR0023 @Prem 26Feb2024 FBranch I4863 start
// 			let checkoutFVs = userInfo.checkoutApps;
// 			if (!checkoutFVs[0]) {
// 				userInfo.app_items.forEach((app) => {
// 					app.r_is_external = 1;
// 				});
// 			} else {
// 				for (let app of userInfo.app_items) {
// 					app.r_is_external = checkoutFVs.includes(this.getParsedFv(app.r_flavor, app.r_version)) ? 0 : 1;
// 				}
// 			}
// 			let rotManger: ROTManagerNew = ROTManagerNew.getInstance(); //Pr0023 @Prem F6.0 Beta  2ndJuly2024 I9229
// 			await rotManger.downloadDeca(userInfo.app_items);
// 			await userInfo.setRequireConfig(userInfo.app_items);

// 			//PR0049 @Anirban 31July2024 F6.0 BETA PROC-9165
// 			let filesToUndef: string[] = ["/metadata/allNames", "/metadata/flavor", "/metadata/consolidated/m_file_metadata", "/metadata/consolidated/m_propertytype_metadata", "/metadata/consolidated/m_idseries_defination_metadata", "/metadata/consolidated/m_exits_metadata"];

// 			for (let flv_ver of checkoutFVs) {
// 				for (let path of filesToUndef) requirejs.undef(`${flv_ver}_${txn.getLandscape()}${path}`);

// 				let { flavor, version } = this.getFlavorVersionFromFv(flv_ver);
// 				let appVerId: string = this.getParsedFvid(this.mm_landscape.account_id, flavor, version);
// 				(await KloAppCache.gI(txn.getLandscape())).removeApp(txn.getLandscape(), appVerId);
// 			}

// 			userInfo.setResolveUserInfo();
// 			this.checkLog.settup_status = "Completed"; //Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 			this.saveLogFile(true);
// 			return this.returnMsg("checkout", true);
// 		} catch (err) {
// 			//Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 			this.checkLog.checkout_fvs[appVerId] = { status: "Failed : " + err.message || err.getMessage() };
// 			this.saveLogFile(true);
// 			return this.returnMsg("checkout", false, err.message || err.getMessage());
// 		}
// 	}
// 	//#region //PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884- checkout functionality for Released Apps
// 	private async repoCheckoutReleasedApps(txn: KloTransaction, appToCheckOut: string) {
// 		let appVerId: string = "";
// 		try {
// 			let { flavor, version } = this.getFlavorVersionFromFv(appToCheckOut);
// 			let [esMf_fv] = await txn.getExecutedQuery("mf_fv", { netWorkMode: NetworkModes.ONLINE, partialSelect: ["fid", "ver_id", "status"], fid: flavor, ver_id: version });
// 			if (!esMf_fv) return { msgType: "error", msgBody: `${appToCheckOut} does not exist` };
// 			this.readFileLog(true);
// 			if (this.fileLog.writeAbleFVs.includes(appToCheckOut)) {
// 				if (esMf_fv["status"] == "Open") return await this.repoCheckout(txn, [appToCheckOut]);
// 				else (this.fileLog.checkoutFVs ||= {})[appToCheckOut] = { lct: new Date().getTime() };
// 			}
// 			let metadataSave: MetadataSave = new MetadataSave();
// 			(this.checkLog ||= <FileLogFormat>{}).releasedApps ||= {};
// 			await metadataSave.initVars(txn, flavor, version, null, null, true);
// 			appVerId = this.getParsedFvid(this.mm_landscape.account_id, flavor, version);
// 			this.checkLog.releasedApps[appToCheckOut] = { lct: new Date().getTime(), status: "InProcess" };
// 			this.saveLogFile(true);
// 			let es: KloEntitySet<m_file> = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, {}, true, appVerId);
// 			await this._saveToDisk(metadataSave, es, false, true);
// 			this.checkLog.releasedApps[appToCheckOut].status = "Completed";
// 			this.saveLogFile();
// 			this.saveLogFile(true);
// 			(await KloAppCache.gI(txn.getLandscape())).removeApp(txn.getLandscape(), appVerId);
// 			return { msgType: "success", msgBody: `${appToCheckOut} checked out successfully` };
// 		} catch (error) {
// 			let errMsg = error.message || error.getMessage();
// 			this.checkLog.releasedApps[appVerId].status = `Checkout for ${appToCheckOut} failed. Reason: ${errMsg}`;
// 			this.saveLogFile(true);
// 			return { msgType: "error", msgBody: `Checkout for ${appToCheckOut} failed. Reason: ${errMsg}` };
// 		}
// 	}
// 	//#endregion
// 	private async repoDelete(txn: KloTransaction, filesToBeDeleted: { appDir: string[] }) {
// 		return await this.repoCommit(txn, filesToBeDeleted, true);
// 	}

// 	private onRenamed(filesToBeRenamed: { appDir: { r_file_path: string; r_file_path_new: string } }) {
// 		for (let appDir of Object.keys(filesToBeRenamed)) {
// 			if (this.fileLog.from_query[appDir]?.[filesToBeRenamed[appDir].r_file_path]?.status == FileStatus.localCreated) {
// 				delete this.fileLog.from_query[appDir][filesToBeRenamed[appDir].r_file_path];
// 			}
// 		}
// 		this.saveLogFile();
// 	}

// 	private returnMsg(repoAction: RepoActions, isSucessMsg: boolean, errMsg?: string): string {
// 		//pr0022 Sams 08-05-2024 code reverted F6.0
// 		if (repoAction == "registerUser") return isSucessMsg ? `User Registered Successfull` : `Unable to register user. Reason : ${errMsg}`;
// 		else return isSucessMsg ? `Files ${repoAction}ed Successfull` : `Unable of ${repoAction} files. Reason : ${errMsg}`;
// 	}

// 	private getFileAndMimeType(r_file_path: string): { file_type: string; mime_type: string } {
// 		if (r_file_path.split("/").length > 1) return { file_type: r_file_path.split("/")[0], mime_type: path.extname(r_file_path).slice(1) };
// 		else return { file_type: "INDEX", mime_type: path.extname(r_file_path).slice(1) };
// 	}

// 	private async singleFileOperation(txn: KloTransaction, action: RepoActions, selectedFiles: { [key: string]: string[] }) {
// 		let appDir: string = Object.keys(selectedFiles)[0];
// 		let r_file_path: string = selectedFiles[appDir][0];
// 		await this.repoCheckForModification(txn, Object.keys(selectedFiles), selectedFiles);
// 		this._updateFileLogStatus(selectedFiles);
// 		if (this.fileLog.from_query[appDir][r_file_path].status == FileStatus.conflict && action != "revert") return this.returnMsg(action, false, "Conflict Exists. Resolve confilict to move forward");
// 		if (action == "commit") return await this.repoCommit(txn, selectedFiles);
// 		else {
// 			let metadataSave: MetadataSave = new MetadataSave();
// 			for (let appVer of Object.keys(selectedFiles)) {
// 				let { flavor, version } = this.getFlavorVersionFromFv(appVer);
// 				let appVerId: string = this.getParsedFvid(this.mm_landscape.account_id, flavor, version);
// 				try {
// 					await metadataSave.initVars(txn, flavor, version);
// 					let rs: KloEntitySet<m_file> = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, { r_file_path: selectedFiles[appVer] }, true, appVerId);
// 					if (action == "revert" || action == "update") {
// 						await this._saveToDisk(metadataSave, rs);
// 						this.saveLogFile();
// 						return this.returnMsg(action, true);
// 					}
// 				} catch (err) {
// 					return this.returnMsg(action, false, err.getMessage());
// 				}
// 			}
// 		}
// 	}
// 	//Pr0022 @Sams F6.0 Beta  3rdJuly2024 T8636
// 	private saveLogFile(checkout?: boolean) {
// 		let log_to_print = checkout ? this.checkLog || <FileLogFormat>{} : this.fileLog || <FileLogFormat>{};
// 		let log_filePath = checkout ? this.chekcoutlogPath : this.logFilePath;
// 		fs.writeFileSync(log_filePath, JSON.stringify(log_to_print));
// 	}
// 	//#region //PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884 - getting the log data for checkout of other apps.
// 	// private readFileLog(): FileLogFormat {
// 	// 	if (Object.keys(this.fileLog).length) return;
// 	// 	if (fs.existsSync(this.logFilePath)) this.fileLog = JSON.parse(fs.readFileSync(this.logFilePath, { encoding: "utf-8" }));
// 	// 	else this.fileLog = <FileLogFormat>{};
// 	// }
// 	private readFileLog(isReleasedVerCheckoutCheckout?: boolean): FileLogFormat {
// 		let logFilePath = isReleasedVerCheckoutCheckout ? this.chekcoutlogPath : this.logFilePath;
// 		let fileLogs = isReleasedVerCheckoutCheckout ? this.checkLog : this.fileLog;
// 		if (Object.keys(fileLogs).length) return;
// 		if (fs.existsSync(logFilePath)) {
// 			let logs = JSON.parse(fs.readFileSync(logFilePath, { encoding: "utf-8" }));
// 			isReleasedVerCheckoutCheckout ? (this.checkLog = logs) : (this.fileLog = logs);
// 		} else isReleasedVerCheckoutCheckout ? (this.checkLog = <FileLogFormat>{}) : (this.fileLog = <FileLogFormat>{});
// 	}
// 	//#endregion

// 	//PR0050 @Nayan 22JAN2025 F60_CW52-02 PROC-14884 - added isReleasedApp
// 	private async _saveToDisk(metadataSave: MetadataSave, es: KloEntitySet<m_file>, fromRemoteUpdate: boolean = false, isReleasedApp: boolean = false) {
// 		for (let file of es) {
// 			if (fromRemoteUpdate) {
// 				metadataSave.addFileForDiskSave(file.r_file_path, file.content, true, null, "default", isReleasedApp);
// 			} else {
// 				await metadataSave.addFileForDiskSave(file.r_file_path, file.content, true, null, "default", isReleasedApp);
// 			}
// 			if (!isReleasedApp) {
// 				this.fileLog.from_query = this.fileLog.from_query || {};
// 				let appDir: string = this.getParsedFv(file.getFlavor(), file.getFlavorVersion());
// 				this.fileLog.from_query[appDir] = this.fileLog.from_query[appDir] || {};
// 				//if(file.r_file_path.includes('metadata/')){continue};
// 				let x: { trf?: number | bigint; trl?: number | bigint; tdf?: number | bigint; tdl?: number | bigint; status?: FileStatus; i?: number } = (this.fileLog.from_query[appDir][file.r_file_path] = this.fileLog.from_query[appDir][file.r_file_path] || {});
// 				x.status = FileStatus.uptodate;
// 				x.i = file.fvid == file.s_app_variant ? 0 : 1;
// 				x.trf = x.trl = file.s_modified_on.getTime();
// 				x.tdf = x.tdl = new Date().getTime() + 1000 * 5;
// 			}
// 		}
// 		if (fromRemoteUpdate) metadataSave.isFileGenComplete = true;
// 	}

// 	private _updateFileLogStatus(filesToUpdateStatus: { [key: string]: string[] } = {}) {
// 		let appList: string[] = Object.keys(filesToUpdateStatus);
// 		for (let appDir of Object.keys(this.fileLog.checkoutFVs)) {
// 			if (appList.length && !appList.includes(appDir)) {
// 				continue;
// 			}
// 			for (let r_file_path in this.fileLog.from_query[appDir]) {
// 				let fl = this.fileLog.from_query[appDir][r_file_path];
// 				// status: "localModified" | "localCreated" | "localDeleted" |  "conflictResolved" | "conflict" | "remoteModified" | "remoteCreated" | "remoteDeleted" | "uptodate";
// 				if (fl.tdl && fl.tdf >= fl.tdl && fl.trf == fl.trl)
// 					// no changes anywhere // tdf == tdl
// 					fl.status = FileStatus.uptodate;
// 				else if (fl.tdf < fl.tdl && fl.trf == fl.trl)
// 					// changes in file system only , not repository
// 					fl.status = FileStatus.localModified;
// 				else if (!fl.tdf && !fl.trl && !fl.trf)
// 					// trf and trl should null in this case //
// 					fl.status = FileStatus.localCreated;
// 				else if (!fl.tdl && fl.tdf && fl.trf == fl.trl)
// 					// tdf exist but tdl does not exist and fl.trf == fl.trl
// 					fl.status = FileStatus.localDeleted;
// 				else if (fl.tdf >= fl.tdl && fl.trf < fl.trl)
// 					// no changes in local fl.trf < fl.trl
// 					fl.status = FileStatus.remoteModified;
// 				else if (fl.trl && !fl.trf && !fl.tdf && !fl.tdl)
// 					// local does not exists but in remote file created
// 					fl.status = FileStatus.remoteCreated;
// 				else if (fl.tdf >= fl.tdl && !fl.trl) fl.status = FileStatus.remoteDeleted;
// 				else if (fl.status != FileStatus.conflictResolved) fl.status = FileStatus.conflict;
// 			}
// 		}
// 	}

// 	private async repoCheckForModification(txn: KloTransaction, appName?: string[], filesToCheckForModification?: { [key: string]: string[] }) {
// 		let appDirList: string[] = appName || Object.keys(this.fileLog.checkoutFVs);
// 		for (let appDir of appDirList) {
// 			for (let r_file_path in this.fileLog.from_query[appDir]) {
// 				this.fileLog.from_query[appDir][r_file_path] = this.fileLog.from_query[appDir][r_file_path] || {};
// 				/*PR0037 @Prashant 29Dec2023 FBranch PROC2745 */
// 				if (!(r_file_path.includes("entity_gen/") || r_file_path.includes("query_gen/") || r_file_path.includes("metadata/"))) {
// 					this.fileLog.from_query[appDir][r_file_path].tdl = null;
// 				}
// 				this.fileLog.from_query[appDir][r_file_path].trl = null;
// 				if (this.fileLog.from_query[appDir]?.[r_file_path]?.status == FileStatus.localCreated && !fs.existsSync(process.cwd() + "/src/" + appDir + "/" + r_file_path)) {
// 					delete this.fileLog.from_query[appDir][r_file_path];
// 				}
// 			}
// 		}

// 		let metadataSave: MetadataSave = new MetadataSave();
// 		for (let appDir of appDirList) {
// 			let { flavor, version } = this.getFlavorVersionFromFv(appDir);
// 			let appVerId: string = this.getParsedFvid(this.mm_landscape.account_id, flavor, version);
// 			const appVerPath: string = appDir;
// 			const folderPath: string = process.cwd() + "/src/" + appVerPath;
// 			if (filesToCheckForModification && filesToCheckForModification[appDir]) {
// 				for (let filePath of filesToCheckForModification[appDir]) {
// 					if (!fs.existsSync(folderPath + "/" + filePath)) continue;
// 					let fileStat = fs.statSync(folderPath + "/" + filePath);
// 					this.fileLog.from_query[appDir][filePath] = this.fileLog.from_query[appDir][filePath] || {};
// 					this.fileLog.from_query[appDir][filePath].tdl = fileStat.mtime.getTime();
// 				}
// 			} else {
// 				await this._updatetdl(folderPath, appVerPath, appDir);
// 			}
// 			// updatetrl
// 			await metadataSave.initVars(txn, flavor, version);
// 			//is filtering for deleted ??
// 			let es = <KloEntitySet<m_file>>await metadataSave._getDataformMetadataDB("m_file", false, { partialSelect: ["r_file_path", "s_modified_on"] }, true, appVerId);
// 			es.forEach((file) => {
// 				this.fileLog.from_query[appDir] = this.fileLog.from_query[appDir] || {};
// 				this.fileLog.from_query[appDir][file.r_file_path] = this.fileLog.from_query[appDir][file.r_file_path] || {};
// 				this.fileLog.from_query[appDir][file.r_file_path].trl = file.s_modified_on.getTime();
// 			});
// 		}
// 	}
// 	//used by updateFileLog recurssive function.
// 	private async _updatetdl(folderPath: string, appVerPath: string, appVer: string) {
// 		if (!fs.existsSync(folderPath)) return;
// 		const items: string[] = await fs.promises.readdir(folderPath);
// 		for (const item of items) {
// 			if (item == "metadata" || item == "entity_gen" || item == "query_gen") continue;
// 			let fname: string = `${folderPath}/${item}`;
// 			let fileStat: fs.Stats = fs.statSync(fname);
// 			if (fileStat.isDirectory()) {
// 				await this._updatetdl(fname, appVerPath, appVer);
// 			} else {
// 				let pathArr: string[] = fname.split("/");
// 				let flvIndex: number = pathArr.indexOf(appVerPath);
// 				let r_file_path: string = "";
// 				for (let i = flvIndex + 1; i < pathArr.length; i++) {
// 					r_file_path = r_file_path + "/" + pathArr[i];
// 				}
// 				r_file_path = r_file_path.slice(1);
// 				this.fileLog.from_query[appVer] = this.fileLog.from_query[appVer] || {};
// 				this.fileLog.from_query[appVer][r_file_path] = this.fileLog.from_query[appVer][r_file_path] || {};
// 				this.fileLog.from_query[appVer][r_file_path].tdl = fileStat.mtime.getTime();
// 			}
// 		}
// 	}

// 	private readFile(dest): Promise<string> {
// 		return new Promise((resolve, reject) => {
// 			fs.readFile(dest, { encoding: "utf-8" }, (err, response) => {
// 				if (err) {
// 					reject(err);
// 				}
// 				resolve(response);
// 			});
// 		});
// 	}

// 	private writeFile(dest, data) {
// 		return new Promise((resolve, reject) => {
// 			fs.mkdirSync(path.dirname(dest), { recursive: true });
// 			fs.writeFile(dest, data, { flag: "w", encoding: "utf-8" }, (err) => {
// 				if (err) {
// 					reject(err);
// 				}
// 				resolve(null);
// 			});
// 		});
// 	}

// 	private async getTransaction() {
// 		if (!this._txn) {
// 			if (!this.mm_landscape) {
// 				await this.loadDataFromConfigFile();
// 			}
// 			let account_id: number = this.mm_landscape.account_id;
// 			let context: ReqData = <ReqData>{};
// 			context.flavor = "core_fw";
// 			context.version = KloRepo.coreFwVersion;
// 			context.landscape = this.mm_landscape.landscape_id;
// 			context.account = account_id;
// 			this._txn = await KloTransaction.createTransaction("core_fw", context);
// 		}
// 		return this._txn;
// 	}

// 	private async loadDataFromConfigFile() {
// 		let _Env: Environment = new Environment();
// 		let klarionFileData = this.getKlarionFileData();
// 		await _Env.init(klarionFileData.landscape);
// 		this.mm_landscape = await _Env.getLandscapeInfo();
// 		return this.mm_landscape;
// 	}

// 	private getTsConfigTemplate(): object {
// 		return TsConfigGenerator.getTsConfigTemplate();
// 	}
// }

// /*
// private Auth(): Promise<void> {
//         return new Promise(async (resolve, reject) => {
//             let fileExists:boolean = fs.existsSync(this.klarionFilePath);
//             (!fileExists) ? fs.writeFileSync(this.klarionFilePath, "{}") : ""
//             let AuthData = null;
//             try {
//                 AuthData = (fileExists) ? JSON.parse(fs.readFileSync(this.klarionFilePath, { encoding: "utf-8" })) : null;
//                 AuthData = (Object.keys(AuthData).length === 0) ? null : AuthData;
//             } catch (err) {
//                 console.log("error: " + err);
//                 fs.writeFileSync(this.klarionFilePath, "{}")
//             }
//             let token_expiry:string = (AuthData == null || !AuthData) ? 0 : AuthData.token_expiry;
//             let prompt_settings = [];
//             if (AuthData == null || !AuthData) {
//                 prompt_settings = [
//                     {name: "ipAddress",message: "Enter ipAddress"},
//                     {name: "port",message: "Enter port"},
//                     {name: "webContext",message: "Enter webContext"},
//                     {name: "userid",message: "Enter userID"},
//                     {name: "password",hidden: true},
//                     {name: "landscape"},
//                     {name: "workspace"},
//                     {name: "testUsers",message: "Enter test user IDs" },
//                     {name: "vsclientPort",message: "Enter vsclient port"}
//                 ]
//                 AuthData = {}
//             } else if (!AuthData.token || !this.isTokenValid(token_expiry)) {
//                 prompt_settings = [
//                     {
//                         name: "password",
//                         hidden: true,
//                         message: "Enter password for " + AuthData.mmid
//                     }
//                 ]
//             }

//             // if (!AuthData.token || !this.isTokenValid(token_expiry)) {
//             if (!AuthData.token) {
//                 prompt.start();
//                 prompt.get(prompt_settings, async (err, result) => {
//                     if (err) {
//                         console.log("Error occurred", err.message);
//                     } else {
//                         if (AuthData == null || AuthData == undefined || Object.keys(AuthData).length == 0) {
//                             AuthData = {}
//                             AuthData.mmid = result['userid']
//                             AuthData.landscape = result['landscape']
//                             AuthData.ipAddress = result['ipAddress']
//                             AuthData.port = result['port']
//                             AuthData.vsclientPort = result['vsclientPort']
//                             AuthData.webContext = result['webContext']
//                         } else {
//                             result['userid'] = AuthData.mmid;
//                             result['landscape'] = AuthData.landscape;
//                             result['ipAddress'] = AuthData.ipAddress
//                             result['port'] = AuthData.port
//                             result['vsclientPort'] = AuthData.vsclientPort
//                             result['webContext'] = AuthData.webContext

//                         }
//                         try {
//                             let refreshData = await UserInfo.getActiveUser().login(AuthData.mmid, <string>result.password, "cloud_app")
//                             let tokenFromServer:string = "Bearer " + refreshData.access_token;
//                             if (tokenFromServer === undefined || refreshData) {
//                                 reject(refreshData);
//                             }
//                             console.log("got token", tokenFromServer)
//                             AuthData["token"] = tokenFromServer;
//                             AuthData["token_expiry"] = Date.now() + (1000 * 60 * 15);
//                             let fileContent:KlarionFile = JSON.parse(fs.readFileSync(this.klarionFilePath, { encoding: "utf-8" }));
//                             fileContent = {
//                                 ...fileContent,
//                                 ...AuthData
//                             };
//                             fs.writeFileSync(this.klarionFilePath, JSON.stringify(fileContent, null, 2))
//                             resolve();
//                         } catch (err) {
//                             reject(err);
//                         }
//                     }
//                 })
//             } else {
//                 resolve();
//             }
//         })
//     }
   
//     private isTokenValid(tokenTime) {
//         if (Date.now() < tokenTime) {
//             return true;
//         }
//         return false;
//     }
// */
