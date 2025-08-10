import * as vscode from 'vscode';

export class TreeDataProvider {
  private _items: string[];
  private _selectedItems: Set<string> = new Set();
  private _filter: string = '';

  constructor(items: string[]) {
    this._items = items;
  }

  public setFilter(filter: string) {
    this._filter = filter.toLowerCase();
  }

  public getTreeItems(): any[] {
    return this._items
      .filter(item => item.toLowerCase().includes(this._filter))
      .map(item => ({
        label: item,
        isSelected: this._selectedItems.has(item)
      }));
  }

  public toggleItem(item: string) {
    if (this._selectedItems.has(item)) {
      this._selectedItems.delete(item);
    } else {
      this._selectedItems.add(item);
    }
  }

  public getSelectedItems(): string[] {
    return Array.from(this._selectedItems);
  }
}