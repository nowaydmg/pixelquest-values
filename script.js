const defaultItems = [
    { icon: '📜', name: 'Ancient Scroll Fragment', corruptedPages: 42, tier: 'A', rarity: 'Rare', type: 'Crafting Material' },
    { icon: '🪻', name: 'Cursed Amulet', corruptedPages: 88, tier: 'S', rarity: 'Epic', type: 'Accessory' },
    { icon: '💎', name: 'Corrupted Core', corruptedPages: 56, tier: 'B', rarity: 'Rare', type: 'Crafting Material' },
    { icon: '🔮', name: 'Dark Crystal', corruptedPages: 64, tier: 'A', rarity: 'Epic', type: 'Crafting Material' },
    { icon: '🗡️', name: 'Enchanted Dagger', corruptedPages: 70, tier: 'A', rarity: 'Rare', type: 'Weapon' },
    { icon: '📖', name: 'Forbidden Grimoire', corruptedPages: 95, tier: 'S', rarity: 'Epic', type: 'Quest Item' },
    { icon: '✨', name: 'Glowing Essence', corruptedPages: 18, tier: 'C', rarity: 'Common', type: 'Crafting Material' },
    { icon: '🛡️', name: 'Obsidian Helm', corruptedPages: 76, tier: 'A', rarity: 'Epic', type: 'Armor' },
    { icon: '🌙', name: "Phantom's Whisper", corruptedPages: 110, tier: 'S', rarity: 'Legendary', type: 'Weapon' },
    { icon: '🪙', name: 'Rusted Coin', corruptedPages: 10, tier: 'C', rarity: 'Common', type: 'Currency' },
    { icon: '🧥', name: 'Shadow Cloak', corruptedPages: 72, tier: 'A', rarity: 'Epic', type: 'Armor' },
    { icon: '🕯️', name: 'Soul Fragment', corruptedPages: 100, tier: 'S', rarity: 'Legendary', type: 'Crafting Material' },
    { icon: '🧪', name: 'Tainted Potion', corruptedPages: 24, tier: 'B', rarity: 'Common', type: 'Consumable' },
    { icon: '💠', name: 'Void Shard', corruptedPages: 120, tier: 'S', rarity: 'Legendary', type: 'Crafting Material' }
];

let currentSort = { key: 'corruptedPages', direction: 'desc' };
let editingIndex = null;

function getItems() {
    try {
        const stored = JSON.parse(localStorage.getItem('items'));
        return Array.isArray(stored) ? stored : defaultItems;
    } catch (error) {
        return defaultItems;
    }
}

function saveItems(items) {
    localStorage.setItem('items', JSON.stringify(items));
}

function loadTableData(userRole) {
    const items = getItems();
    const sortedItems = sortItems(items, currentSort.key, currentSort.direction);
    renderTable(sortedItems, userRole);
    updateLastUpdate();
}

function sortItems(items, key, direction) {
    const sorted = [...items];

    sorted.sort((a, b) => {
        let valueA = a[key];
        let valueB = b[key];

        if (key === 'name' || key === 'type' || key === 'tier' || key === 'rarity') {
            valueA = String(valueA || '').toLowerCase();
            valueB = String(valueB || '').toLowerCase();
        } else if (key === 'corruptedPages') {
            valueA = Number(valueA || 0);
            valueB = Number(valueB || 0);
        }

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return sorted;
}

function toggleSort(key) {
    if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        currentSort.direction = 'asc';
    }

    const userRole = localStorage.getItem('userRole') || 'admin';
    loadTableData(userRole);
}

function getIconHtml(item) {
    if (!item.icon) {
        return '<span class="item-icon">✦</span>';
    }

    const isImageUrl = /^https?:\/\//i.test(item.icon) || /^data:image\//i.test(item.icon);
    if (isImageUrl) {
        return `<img class="item-image" src="${item.icon}" alt="${item.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='✦';">`;
    }

    return `<span class="item-icon">${item.icon}</span>`;
}

function renderTable(items, userRole) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No items available yet.</td></tr>';
        return;
    }

    items.forEach((item, index) => {
        const row = document.createElement('tr');
        const rarityClass = `rarity-${(item.rarity || 'common').toLowerCase()}`;
        const corruptedPages = item.corruptedPages !== undefined ? item.corruptedPages : '—';
        const tier = item.tier ? item.tier : '—';

        let actionsCell = '';
        if (userRole === 'admin') {
            actionsCell = `<td><div class="table-actions"><button onclick="startEditItem(${index})" class="btn-table btn-edit">Edit</button><button onclick="deleteItem(${index})" class="btn-table btn-delete">Delete</button></div></td>`;
        }

        row.dataset.searchText = `${item.name} ${item.icon || ''} ${item.type || ''} ${item.rarity || ''} ${item.tier || ''}`.toLowerCase();
        row.innerHTML = `
            <td>${getIconHtml(item)}</td>
            <td>${item.name}</td>
            <td>${corruptedPages}</td>
            <td>${tier}</td>
            <td class="${rarityClass}">${item.rarity}</td>
            <td>${item.type}</td>
            ${actionsCell}
        `;
        tbody.appendChild(row);
    });
}

function resetForm() {
    document.getElementById('itemIcon').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemCorruptedPages').value = '';
    document.getElementById('itemTier').value = '';
    document.getElementById('itemType').value = '';
    document.getElementById('itemRarity').value = 'Common';
    document.getElementById('editingItemIndex').value = '';
    editingIndex = null;
    document.getElementById('saveItemBtn').textContent = 'Add item';
}

function saveItem() {
    const icon = document.getElementById('itemIcon').value.trim();
    const name = document.getElementById('itemName').value.trim();
    const corruptedPages = document.getElementById('itemCorruptedPages').value.trim();
    const tier = document.getElementById('itemTier').value.trim();
    const rarity = document.getElementById('itemRarity').value;
    const type = document.getElementById('itemType').value.trim();

    if (!name || !type) {
        alert('> ERROR: Fill name and type fields!');
        return;
    }

    const items = getItems();
    const itemPayload = { icon, name, corruptedPages: corruptedPages ? parseInt(corruptedPages, 10) : undefined, tier, rarity, type };

    if (editingIndex !== null) {
        items[editingIndex] = { ...items[editingIndex], ...itemPayload };
    } else {
        items.push(itemPayload);
    }

    saveItems(items);
    resetForm();
    loadTableData('admin');
}

function startEditItem(index) {
    const items = getItems();
    const item = items[index];
    if (!item) return;

    editingIndex = index;
    document.getElementById('editingItemIndex').value = index;
    document.getElementById('itemIcon').value = item.icon || '';
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemCorruptedPages').value = item.corruptedPages || '';
    document.getElementById('itemTier').value = item.tier || '';
    document.getElementById('itemType').value = item.type || '';
    document.getElementById('itemRarity').value = item.rarity || 'Common';
    document.getElementById('saveItemBtn').textContent = 'Save changes';
}

function deleteItem(index) {
    if (confirm('>>> REMOVE ITEM? <<<')) {
        const items = getItems();
        items.splice(index, 1);
        saveItems(items);
        if (editingIndex === index) {
            resetForm();
        } else if (editingIndex !== null && editingIndex > index) {
            editingIndex -= 1;
        }
        loadTableData('admin');
    }
}

function filterTable() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const rows = document.querySelectorAll('#pricesTable tbody tr');

    rows.forEach((row) => {
        const text = row.dataset.searchText || '';
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function updateLastUpdate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL');
    document.getElementById('lastUpdate').textContent = dateStr;
}

function setTheme(theme) {
    const resolvedTheme = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', resolvedTheme === 'light');
    localStorage.setItem('theme', resolvedTheme);
    const button = document.getElementById('themeToggle');
    if (button) {
        button.textContent = resolvedTheme === 'light' ? '🌙 Dark' : '☀️ Light';
    }
}

function exportItemsAsJson() {
    const items = getItems();
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pixel-quest-items.json';
    link.click();
    URL.revokeObjectURL(link.href);
}

function exportItemsAsCsv() {
    const items = getItems();
    const rows = [
        ['name', 'icon', 'corruptedPages', 'tier', 'rarity', 'type'].join(','),
        ...items.map((item) => [
            `"${(item.name || '').replace(/"/g, '""')}"`,
            `"${(item.icon || '').replace(/"/g, '""')}"`,
            item.corruptedPages || '',
            item.tier || '',
            item.rarity || '',
            item.type || ''
        ].join(','))
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pixel-quest-items.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

function importItemsFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (Array.isArray(data)) {
                saveItems(data);
                loadTableData('admin');
            }
        } catch (error) {
            alert('> ERROR: Invalid JSON file');
        }
    };
    reader.readAsText(file);
}

function initDashboardControls() {
    document.querySelectorAll('.sort-btn').forEach((button) => {
        button.addEventListener('click', () => toggleSort(button.dataset.sort));
    });

    const themeButton = document.getElementById('themeToggle');
    if (themeButton) {
        themeButton.addEventListener('click', () => {
            const nextTheme = document.body.classList.contains('theme-light') ? 'dark' : 'light';
            setTheme(nextTheme);
        });
    }

    document.getElementById('saveItemBtn')?.addEventListener('click', saveItem);
    document.getElementById('cancelEditBtn')?.addEventListener('click', resetForm);
    document.getElementById('exportJsonBtn')?.addEventListener('click', exportItemsAsJson);
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportItemsAsCsv);
    document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importInput').click());
    document.getElementById('importInput')?.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) {
            importItemsFromFile(file);
            event.target.value = '';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboardControls();
    setTheme(localStorage.getItem('theme') || 'dark');
});
