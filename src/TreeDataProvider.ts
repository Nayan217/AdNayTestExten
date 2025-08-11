import * as vscode from 'vscode';
import { samDat } from './sampleDate/sampleData';

export class TreeDataProvider {
  private _items: any[];
  private _selectedItems: Set<string> = new Set();
  private _filter: string = '';

  constructor(items: any[]) {
    this._items = items;
  }

  public setFilter(filter: string) {
    this._filter = filter.toLowerCase();
  }

  public getTreeItems(): any[] {
    console.log(`Original items count: ${this._items.length}`);
    console.log(`Filter: ${this._filter}`);

    const filtered = this._items.filter(item => {
      const title = item.r_flavor || item.r_app_name || item.r_fv_id || '';
      const description = item.r_description || '';
      const version = item.r_version || '';

      const matches = (
        title.toLowerCase().includes(this._filter) ||
        description.toLowerCase().includes(this._filter) ||
        version.toLowerCase().includes(this._filter)
      );

      console.log(`Item: ${title}, matches: ${matches}`);
      return matches;
    });

    console.log(`Filtered items count: ${filtered.length}`);
    return filtered.map(item => ({
        id: item.r_fv_id || item.r_flavor,
        title: item.r_app_name || item.r_flavor,
        description: item.r_description || '',
        version: item.r_version || '',
        status: item.r_status || item.status || '',
        buildno: item.r_buildno || '',
        method: item.r_landscape || 'DOWNLOAD',
        time: item.ST ? new Date(item.ST).toLocaleDateString() : '',
        isSelected: this._selectedItems.has(item.r_fv_id || item.r_flavor)
      }));
   /*  return this._items
      .filter(item => {
        // Handle different data structures for each tab
        const title = item.r_flavor || item.r_app_name || item.r_fv_id || '';
        const description = item.r_description || '';
        const version = item.r_version || '';

        return (
          title.toLowerCase().includes(this._filter) ||
          description.toLowerCase().includes(this._filter) ||
          version.toLowerCase().includes(this._filter)
        );
      })
      .map(item => ({
        id: item.r_fv_id || item.r_flavor,
        title: item.r_app_name || item.r_flavor,
        description: item.r_description || '',
        version: item.r_version || '',
        status: item.r_status || item.status || '',
        buildno: item.r_buildno || '',
        method: item.r_landscape || 'DOWNLOAD',
        time: item.ST ? new Date(item.ST).toLocaleDateString() : '',
        isSelected: this._selectedItems.has(item.r_fv_id || item.r_flavor)
      })); */
  }

  public toggleItem(itemId: string) {
    if (this._selectedItems.has(itemId)) {
      this._selectedItems.delete(itemId);
    } else {
      this._selectedItems.add(itemId);
    }
  }

  public getSelectedItems(): any[] {
    return this._items.filter(item =>
      this._selectedItems.has(item.r_fv_id || item.r_flavor)
    );
  }
  public setSelectedItems(selectedItems: string[]) {
    this._selectedItems = new Set(selectedItems);
}
}