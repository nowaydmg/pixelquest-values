// Domyślne dane przedmiotów
const defaultItems = [
    { name: 'Ancient Scroll Fragment', price: 150, rarity: 'Rare', type: 'Crafting Material' },
    { name: 'Cursed Amulet', price: 450, rarity: 'Epic', type: 'Accessory' },
    { name: 'Corrupted Core', price: 280, rarity: 'Rare', type: 'Crafting Material' },
    { name: 'Dark Crystal', price: 320, rarity: 'Epic', type: 'Crafting Material' },
    { name: 'Enchanted Dagger', price: 380, rarity: 'Rare', type: 'Weapon' },
    { name: 'Forbidden Grimoire', price: 520, rarity: 'Epic', type: 'Quest Item' },
    { name: 'Glowing Essence', price: 95, rarity: 'Common', type: 'Crafting Material' },
    { name: 'Obsidian Helm', price: 410, rarity: 'Epic', type: 'Armor' },
    { name: "Phantom's Whisper", price: 620, rarity: 'Legendary', type: 'Weapon' },
    { name: 'Rusted Coin', price: 45, rarity: 'Common', type: 'Currency' },
    { name: 'Shadow Cloak', price: 390, rarity: 'Epic', type: 'Armor' },
    { name: 'Soul Fragment', price: 550, rarity: 'Legendary', type: 'Crafting Material' },
    { name: 'Tainted Potion', price: 120, rarity: 'Common', type: 'Consumable' },
    { name: 'Void Shard', price: 670, rarity: 'Legendary', type: 'Crafting Material' }
];

// Załaduj dane z localStorage lub użyj domyślnych
function loadTableData(userRole) {
    let items = JSON.parse(localStorage.getItem('items')) || defaultItems;
    renderTable(items, userRole);
    updateLastUpdate();
}

// Renderuj tabelę
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

        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.price}</td>
            <td class="${rarityClass}">${item.rarity}</td>
            <td>${item.type}</td>
            ${actionsCell}
        `;
        tbody.appendChild(row);
    });
}

// Dodaj przedmiot (tylko admin)
function addItem() {
    const name = document.getElementById('itemName').value.trim();
    const price = parseInt(document.getElementById('itemPrice').value);
    const rarity = document.getElementById('itemRarity').value;
    const type = document.getElementById('itemType').value.trim();

    if (!name || !price || !type) {
        alert('> ERROR: Fill all fields!');
        return;
    }

    let items = JSON.parse(localStorage.getItem('items')) || defaultItems;
    items.push({ name, price, rarity, type });
    localStorage.setItem('items', JSON.stringify(items));

    // Wyczyść formularz
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemType').value = '';
    document.getElementById('itemRarity').value = 'Common';

    // Odśwież tabelę
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
