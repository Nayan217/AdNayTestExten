(function () {
	const vscode = acquireVsCodeApi();
	let currentTab = "writable";

	// Tab switching
	document.querySelectorAll(".tab").forEach((tab) => {
		tab.addEventListener("click", () => {
			document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
			tab.classList.add("active");
			currentTab = tab.dataset.tab;
			vscode.postMessage({ command: "switchTab", tab: currentTab });
		});
	});

	// Search functionality
	const searchInput = document.getElementById("searchInput");
	const searchButton = document.getElementById("searchButton");

	const handleSearch = () => {
		vscode.postMessage({
			command: "filterChanged",
			filter: searchInput.value,
		});
	};

	searchButton.addEventListener("click", handleSearch);
	searchInput.addEventListener("keyup", (e) => {
		if (e.key === "Enter") handleSearch();
	});

	// Action button
	document.getElementById("actionButton").addEventListener("click", () => {
		const selectedIds = [];
		document.querySelectorAll(".item-card.selected").forEach((card) => {
			selectedIds.push(card.dataset.id);
		});

		vscode.postMessage({
			command: "performAction",
			items: selectedIds,
		});
	});
	window.addEventListener("load", () => {
		vscode.postMessage({ command: "initialized" });
	});

	// Handle messages from extension
	window.addEventListener("message", (event) => {
		const message = event.data;
		switch (message.command) {
			case "updateTree":
				renderItems(message.items);
				break;
			case "updateSelection":
				updateSelection(message.selectedItems);
				break;
			case "updateButton":
				updateButtonText(message.text);
				break;
		}
	});
	function updateButtonText(text) {
		const button = document.getElementById("actionButton");
		if (button) {
			button.textContent = text;
		}
	}
	updateButtonText("Checkout Writable App");
	// Render items
	function renderItems(items) {
		console.log("Rendering items:", items);
		const container = document.getElementById("itemsContainer");
		container.innerHTML = "";

		if (!items || items.length === 0) {
			container.innerHTML = '<div class="no-items">No items found</div>';
			return;
		}

		items.forEach((item) => {
			const itemEl = document.createElement("div");
			itemEl.className = `item-card ${item.isSelected ? "selected" : ""}`;
			itemEl.dataset.id = item.id;

			let content = "";
			if (currentTab === "files") {
				content = `
                <div class="item-header">
                    <div class="item-title">${item.id}</div>
                    <div class="item-time">Status: ${item.status || "N/A"}</div>
                </div>
                <div class="item-version">Version: ${item.version || "N/A"}</div>
            `;
			} else {
				content = `
                <div class="item-header">
                    <div class="item-title">${item.id}</div>
                </div>
            `;
			}

			itemEl.innerHTML = content;

			itemEl.addEventListener("click", (e) => {
				if (e.target.classList.contains("item-tag")) return;

				const wasSelected = itemEl.classList.contains("selected");
				itemEl.classList.toggle("selected", !wasSelected);

				vscode.postMessage({
					command: "toggleItem",
					tab: currentTab,
					itemId: item.id,
					select: !wasSelected,
				});
			});

			container.appendChild(itemEl);
		});
	}

	// Update selection
	function updateSelection(selectedIds) {
		document.querySelectorAll(".item-card").forEach((card) => {
			const isSelected = selectedIds.includes(card.dataset.id);
			card.classList.toggle("selected", isSelected);
		});
	}
})();
