(function () {
  const vscode = acquireVsCodeApi();
  let currentTab = 'writable';

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
    if (e.key === 'Enter') handleSearch();
  });

  // Action button
  document.getElementById('actionButton').addEventListener('click', () => {
    const selectedIds = [];
    document.querySelectorAll('.item-card.selected').forEach(card => {
      selectedIds.push(card.dataset.id);
    });

    vscode.postMessage({
      command: 'performAction',
      items: selectedIds
    });
  });
  window.addEventListener('load', () => {
    vscode.postMessage({ command: 'initialized' });
  });

  // Handle messages from extension
  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'updateTree':
        renderItems(message.items);
        break;
      case 'updateSelection':
        updateSelection(message.selectedItems);
        break;
      case 'updateButton':
        updateButtonText(message.text);
        break;
    }
  });
  function updateButtonText(text) {
    const button = document.getElementById('actionButton');
    if (button) {
      button.textContent = text;
    }
  }
  updateButtonText('Checkout Writable App');
  // Render items
  function renderItems(items) {
    console.log('Rendering items:', items); // Log to webview console

    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="no-items">No items found</div>';
      console.log('No items to render');
      return;
    }

    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = `item-card ${item.isSelected ? 'selected' : ''}`;
      itemEl.dataset.id = item.id;

      // Status indicator
      const statusIndicator = item.status === 'ACTIVE' || item.status === 'DONE' ?
        '<div class="status-indicator active"></div>' :
        '<div class="status-indicator"></div>';

      // Method badge
      const methodBadge = item.method ?
        `<div class="item-tag">${item.method}</div>` : '';

      // Build number
      const buildInfo = item.buildno ?
        `<div class="item-info">Build: ${item.buildno}</div>` : '';

      // Time info
      const timeInfo = item.time ?
        `<div class="item-time">${item.time}</div>` : '';

      itemEl.innerHTML = `
        <div class="item-header">
          ${statusIndicator}
          <div class="item-title">${item.title}</div>
          ${timeInfo}
        </div>
        <div class="item-description">${item.description}</div>
        <div class="item-version">Version: ${item.version}</div>
        ${buildInfo}
        <div class="item-tags">
          ${methodBadge}
        </div>
      `;

      itemEl.addEventListener('click', (e) => {
        // Don't toggle if clicking on a tag
        if (e.target.classList.contains('item-tag')) return;

        // itemEl.classList.toggle('selected');

        vscode.postMessage({
          command: 'toggleItem',
          tab: currentTab,
          itemId: item.id
        });
      });

      container.appendChild(itemEl);
      console.log('Webview script loaded');
    });
  }

  // Update selection
  function updateSelection(selectedIds) {
    document.querySelectorAll('.item-card').forEach(card => {
      const isSelected = selectedIds.includes(card.dataset.id);
      card.classList.toggle('selected', isSelected);
    });
  }
})();