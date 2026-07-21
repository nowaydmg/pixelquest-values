// Domyślne dane przedmiotów
const defaultItems = [
    { icon: '📜', name: 'Ancient Scroll Fragment', price: 150, corruptedPages: 42, tier: 'A', rarity: 'Rare', type: 'Crafting Material' },
    { icon: '🪻', name: 'Cursed Amulet', price: 450, corruptedPages: 88, tier: 'S', rarity: 'Epic', type: 'Accessory' },
    { icon: '💎', name: 'Corrupted Core', price: 280, corruptedPages: 56, tier: 'B', rarity: 'Rare', type: 'Crafting Material' },
    { icon: '🔮', name: 'Dark Crystal', price: 320, corruptedPages: 64, tier: 'A', rarity: 'Epic', type: 'Crafting Material' },
    { icon: '🗡️', name: 'Enchanted Dagger', price: 380, corruptedPages: 70, tier: 'A', rarity: 'Rare', type: 'Weapon' },
    { icon: '📖', name: 'Forbidden Grimoire', price: 520, corruptedPages: 95, tier: 'S', rarity: 'Epic', type: 'Quest Item' },
    { icon: '✨', name: 'Glowing Essence', price: 95, corruptedPages: 18, tier: 'C', rarity: 'Common', type: 'Crafting Material' },
    { icon: '🛡️', name: 'Obsidian Helm', price: 410, corruptedPages: 76, tier: 'A', rarity: 'Epic', type: 'Armor' },
    { icon: '🌙', name: "Phantom's Whisper", price: 620, corruptedPages: 110, tier: 'S', rarity: 'Legendary', type: 'Weapon' },
    { icon: '🪙', name: 'Rusted Coin', price: 45, corruptedPages: 10, tier: 'C', rarity: 'Common', type: 'Currency' },
    { icon: '🧥', name: 'Shadow Cloak', price: 390, corruptedPages: 72, tier: 'A', rarity: 'Epic', type: 'Armor' },
    { icon: '🕯️', name: 'Soul Fragment', price: 550, corruptedPages: 100, tier: 'S', rarity: 'Legendary', type: 'Crafting Material' },
    { icon: '🧪', name: 'Tainted Potion', price: 120, corruptedPages: 24, tier: 'B', rarity: 'Common', type: 'Consumable' },
    { icon: '💠', name: 'Void Shard', price: 670, corruptedPages: 120, tier: 'S', rarity: 'Legendary', type: 'Crafting Material' }
];

let currentSort = { key: 'corruptedPages', direction: 'desc' };

function loadTableData(userRole) {
    let items = JSON.parse(localStorage.getItem('items')) || defaultItems;
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

function renderTable(items, userRole) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    items.forEach((item, index) => {
        const row = document.createElement('tr');
        const rarityClass = `rarity-${item.rarity.toLowerCase()}`;
        
        let actionsCell = '';
        if (userRole === 'admin') {
            actionsCell = `<td><button onclick="deleteItem(${index})" class="btn-delete">Usuń</button></td>`;
        }

        const iconCell = item.icon
            ? `<img class="item-image" src="${item.icon}" alt="${item.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='—';">`
            : '<span class="item-icon">—</span>';
        const corruptedPages = item.corruptedPages !== undefined ? item.corruptedPages : '—';
        const tier = item.tier ? item.tier : '—';

        row.innerHTML = `
            <td>${iconCell}</td>
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

// Dodaj przedmiot (tylko admin)
function addItem() {
    const icon = document.getElementById('itemIcon').value.trim();
    const name = document.getElementById('itemName').value.trim();
    const price = parseInt(document.getElementById('itemPrice').value);
    const corruptedPages = document.getElementById('itemCorruptedPages').value.trim();
    const tier = document.getElementById('itemTier').value.trim();
    const rarity = document.getElementById('itemRarity').value;
    const type = document.getElementById('itemType').value.trim();

    if (!name || !type) {
        alert('> ERROR: Fill name and type fields!');
        return;
    }

    let items = JSON.parse(localStorage.getItem('items')) || defaultItems;
    items.push({ icon, name, price, corruptedPages: corruptedPages ? parseInt(corruptedPages) : undefined, tier, rarity, type });
    localStorage.setItem('items', JSON.stringify(items));

    document.getElementById('itemIcon').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemCorruptedPages').value = '';
    document.getElementById('itemTier').value = '';
    document.getElementById('itemType').value = '';
    document.getElementById('itemRarity').value = 'Common';

    loadTableData('admin');
}

// Usuń przedmiot (tylko admin)
function deleteItem(index) {
    if (confirm('>>> REMOVE ITEM? <<<')) {
        let items = JSON.parse(localStorage.getItem('items')) || defaultItems;
        items.splice(index, 1);
        localStorage.setItem('items', JSON.stringify(items));
        loadTableData('admin');
    }
}

// Filtruj tabelę
function filterTable() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.getElementById('pricesTable').getElementsByTagName('tbody')[0].getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const text = rows[i].textContent.toLowerCase();
        rows[i].style.display = text.includes(input) ? '' : 'none';
    }
}

// Aktualizuj czas ostatniej zmiany
function updateLastUpdate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pl-PL') + ' ' + now.toLocaleTimeString('pl-PL');
    document.getElementById('lastUpdate').textContent = dateStr;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sort-btn').forEach((button) => {
        button.addEventListener('click', () => toggleSort(button.dataset.sort));
    });
});
