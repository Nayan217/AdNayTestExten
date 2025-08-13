import * as vscode from "vscode";
import { samDat } from "./sampleDate/sampleData";

export class TreeDataProvider {
	private _items: any[];
	private _selectedItems: Set<string> = new Set();
	private _filter: string = "";
	private _tabId: string; // Add tab identifier

	constructor(items: any[], tabId: string) {
		// Add tabId parameter
		this._items = items;
		this._tabId = tabId;
	}

	public setFilter(filter: string) {
		this._filter = filter.toLowerCase();
	}

	public getTreeItems(): any[] {
		return this._items
			.filter((item) => {
				// For filesDownloaded tab, filter by flavor
				if (this._tabId === "files") {
					return (item.r_flavor || "").toLowerCase().includes(this._filter);
				}
				// For writable/readonly tabs, filter by fv_id
				return (item.r_fv_id || "").toLowerCase().includes(this._filter);
			})
			.map((item) => {
				if (this._tabId === "files") {
					return {
						id: item.r_flavor,
						status: item.status,
						version: item.r_version,
					};
				}
				// For writable/readonly tabs
				return {
					id: item.r_fv_id,
				};
			});
	}

	public toggleItem(itemId: string) {
		if (this._selectedItems.has(itemId)) {
			this._selectedItems.delete(itemId);
		} else {
			this._selectedItems.add(itemId);
		}
	}

	public getSelectedItems(): any[] {
		// return this._items.filter((item) => this._selectedItems.has(item.r_fv_id || item.r_flavor));
		return this._items.filter((item) => {
			if (this._tabId === "files") {
				return this._selectedItems.has(item.r_flavor);
			}
			return this._selectedItems.has(item.r_fv_id);
		});
	}
	public setSelectedItems(selectedItems: string[]) {
		this._selectedItems = new Set(selectedItems);
	}
	public getSelectedItemIds(): string[] {
		return Array.from(this._selectedItems);
	}
}
