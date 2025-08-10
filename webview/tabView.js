(function () {
  const vscode = acquireVsCodeApi();
  let currentTab = 'tab1';

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      vscode.postMessage({ command: 'switchTab', tab: currentTab });
    });
  });

  // Search functionality
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');

  const handleSearch = () => {
    vscode.postMessage({
      command: 'filterChanged',
      filter: searchInput.value
    });
  };

  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') { handleSearch(); }
  });

  // Action button
  document.getElementById('actionButton').addEventListener('click', () => {
    vscode.postMessage({ command: 'performAction' });
  });

  // Handle messages from extension
  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'updateTree':
        renderTree(message.items);
        break;
      case 'updateSelection':
        updateSelection(message.selectedItems);
        break;
    }
  });

  // Render tree items
  function renderTree(items) {
    const container = document.getElementById('treeContainer');
    container.innerHTML = '';

    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = `tree-item ${item.isSelected ? 'selected' : ''}`;
      itemEl.textContent = item.label;

      itemEl.addEventListener('click', () => {
        vscode.postMessage({
          command: 'toggleItem',
          tab: currentTab,
          item: item.label
        });
        // Toggle UI selection immediately
        itemEl.classList.toggle('selected');
      });

      container.appendChild(itemEl);
    });

    if (items.length === 0) {
      container.innerHTML = '<div class="no-items">No items found</div>';
    }
  }
  // Add new function to tabView.js:
  function updateSelection(selectedItems) {
    document.querySelectorAll('.tree-item').forEach(itemEl => {
      const isSelected = selectedItems.includes(itemEl.textContent);
      itemEl.classList.toggle('selected', isSelected);
    });
  }
})();