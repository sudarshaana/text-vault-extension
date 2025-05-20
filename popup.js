// Data structure
let categories = [];
let items = [];
let expandedCategories = new Set();
let editingItemId = null;
let editingCategoryId = null;

// DOM Elements
const categoriesContainer = document.getElementById('categoriesContainer');
const searchInput = document.getElementById('searchInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');

// Modal Elements
const categoryModal = document.getElementById('categoryModal');
const itemModal = document.getElementById('itemModal');
const categoryTitle = document.getElementById('categoryTitle');
const itemTitle = document.getElementById('itemTitle');
const itemBody = document.getElementById('itemBody');
const itemCategorySelect = document.getElementById('itemCategorySelect');
const saveCategoryBtn = document.getElementById('saveCategoryBtn');
const saveItemBtn = document.getElementById('saveItemBtn');
const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
const cancelItemBtn = document.getElementById('cancelItemBtn');
const categoryModalTitle = document.getElementById('categoryModalTitle');
const itemModalTitle = document.getElementById('itemModalTitle');

// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    renderCategories();
    setupEventListeners();
});

// Load data from chrome.storage
async function loadData() {
    const data = await chrome.storage.local.get(['categories', 'items']);
    categories = data.categories || [];
    items = data.items || [];
}

// Save data to chrome.storage
async function saveData() {
    await chrome.storage.local.set({ categories, items });
}

// Setup event listeners
function setupEventListeners() {
    // Category modal
    addCategoryBtn.addEventListener('click', () => {
        editingCategoryId = null;
        categoryModalTitle.textContent = 'Add Category';
        showModal(categoryModal);
    });
    saveCategoryBtn.addEventListener('click', saveCategory);
    cancelCategoryBtn.addEventListener('click', () => hideModal(categoryModal));

    // Add item button in each category
    document.addEventListener('click', (e) => {
        if (e.target.closest('.add-item-btn')) {
            const categoryId = e.target.closest('.category').dataset.id;
            showAddItemModal(categoryId);
        }
    });

    // Category expand/collapse
    document.addEventListener('click', (e) => {
        if (e.target.closest('.category-header')) {
            const categoryElement = e.target.closest('.category');
            if (!e.target.closest('.category-actions')) {
                toggleCategory(categoryElement);
            }
        }
    });

    saveItemBtn.addEventListener('click', saveItem);
    cancelItemBtn.addEventListener('click', () => hideModal(itemModal));

    // Search
    searchInput.addEventListener('input', handleSearch);
}

// Modal functions
function showModal(modal) {
    modal.style.display = 'block';
}

function hideModal(modal) {
    modal.style.display = 'none';
    editingItemId = null;
    editingCategoryId = null;
    if (modal === categoryModal) {
        categoryTitle.value = '';
    } else if (modal === itemModal) {
        itemTitle.value = '';
        itemBody.value = '';
    }
}

function showAddItemModal(categoryId, itemId = null) {
    editingItemId = itemId;
    itemModalTitle.textContent = itemId ? 'Edit Item' : 'Add Item';
    populateCategorySelect(categoryId);

    if (itemId) {
        const item = items.find(i => i.id === itemId);
        if (item) {
            itemTitle.value = item.title;
            itemBody.value = item.body;
            itemCategorySelect.value = item.categoryId;
        }
    }

    showModal(itemModal);
}

function showEditCategoryModal(categoryId) {
    editingCategoryId = categoryId;
    categoryModalTitle.textContent = 'Edit Category';
    const category = categories.find(c => c.id === categoryId);
    if (category) {
        categoryTitle.value = category.title;
    }
    showModal(categoryModal);
}

// Category functions
function toggleCategory(categoryElement) {
    const categoryId = categoryElement.dataset.id;
    if (expandedCategories.has(categoryId)) {
        expandedCategories.delete(categoryId);
    } else {
        expandedCategories.add(categoryId);
    }
    categoryElement.classList.toggle('expanded');
}

function populateCategorySelect(selectedCategoryId = null) {
    itemCategorySelect.innerHTML = categories.map(cat =>
        `<option value="${cat.id}" ${cat.id === selectedCategoryId ? 'selected' : ''}>${cat.title}</option>`
    ).join('');
}

async function saveCategory() {
    const title = categoryTitle.value.trim();
    if (!title) {
        alert('Please enter a category title');
        return;
    }

    if (editingCategoryId) {
        const categoryIndex = categories.findIndex(c => c.id === editingCategoryId);
        if (categoryIndex !== -1) {
            categories[categoryIndex].title = title;
        }
    } else {
        const newCategory = {
            id: Date.now().toString(),
            title
        };
        categories.push(newCategory);
    }

    await saveData();
    renderCategories(searchInput.value.trim());
    hideModal(categoryModal);
}

function renderCategories(searchTerm = '') {
    categoriesContainer.innerHTML = categories.map(category => {
        const categoryItems = items.filter(item => item.categoryId === category.id);
        const isExpanded = expandedCategories.has(category.id) || (searchTerm && categoryItems.some(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.body.toLowerCase().includes(searchTerm.toLowerCase())
        ));

        const filteredItems = searchTerm ? categoryItems.filter(item =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.body.toLowerCase().includes(searchTerm.toLowerCase())
        ) : categoryItems;

        return `
            <div class="category ${isExpanded ? 'expanded' : ''}" data-id="${category.id}">
                <div class="category-header">
                    <div class="category-title">
                        <span class="material-icons">chevron_right</span>
                        ${category.title} (${categoryItems.length})
                    </div>
                    <div class="category-actions">
                        <button class="btn add-item-btn" title="Add Item" data-action="add-item">
                            <span class="material-icons">add</span>
                        </button>
                        <button class="btn edit-category-btn" title="Edit Category" data-action="edit-category">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn btn-danger delete-category-btn" title="Delete Category" data-action="delete-category">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </div>
                <div class="items-container">
                    ${renderItems(filteredItems, searchTerm)}
                </div>
            </div>
        `;
    }).join('');
}

function renderItems(items, searchTerm = '') {
    if (items.length === 0) {
        return '<div class="no-items">No items found</div>';
    }

    return items.map(item => `
        <div class="item-card" data-id="${item.id}" data-category-id="${item.categoryId}">
            <div class="item-title">${highlightText(item.title, searchTerm)}</div>
            <div class="item-body">${item.body}</div>
            <div class="item-actions">
                <button class="btn btn-success copy-item-btn" title="Copy Content" data-action="copy-item">
                    <span class="material-icons">content_copy</span>
                </button>
                <button class="btn edit-item-btn" title="Edit Item" data-action="edit-item">
                    <span class="material-icons">edit</span>
                </button>
                <button class="btn btn-danger delete-item-btn" title="Delete Item" data-action="delete-item">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        </div>
    `).join('');
}

// Event delegation for dynamic buttons
categoriesContainer.addEventListener('click', (e) => {
    const categoryElem = e.target.closest('.category');
    const itemElem = e.target.closest('.item-card');
    const actionBtn = e.target.closest('button[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');

    // Category actions
    if (categoryElem && !itemElem) {
        const categoryId = categoryElem.dataset.id;
        if (action === 'add-item') {
            showAddItemModal(categoryId);
        } else if (action === 'edit-category') {
            showEditCategoryModal(categoryId);
        } else if (action === 'delete-category') {
            deleteCategory(categoryId);
        }
    }

    // Item actions
    if (itemElem) {
        const itemId = itemElem.dataset.id;
        const categoryId = itemElem.dataset['categoryId'];
        if (action === 'copy-item') {
            copyItemContent(itemId);
        } else if (action === 'edit-item') {
            showAddItemModal(categoryId, itemId);
        } else if (action === 'delete-item') {
            deleteItem(itemId);
        }
    }
});

async function copyItemContent(itemId) {
    const item = items.find(i => i.id === itemId);
    if (item) {
        try {
            await navigator.clipboard.writeText(item.body);
            showCopySuccess(itemId);
        } catch (err) {
            // Fallback method
            const popupContainer = document.querySelector('.container') || document.body;
            const textarea = document.createElement('textarea');
            textarea.value = item.body;
            popupContainer.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand('copy');
                showCopySuccess(itemId);
            } catch (err2) {
                console.error('Failed to copy text: ', err2);
            }
            popupContainer.removeChild(textarea);
        }
    }
}

function showCopySuccess(itemId) {
    const button = document.querySelector(`[data-id="${itemId}"] .btn-success`);
    if (button) {
        const icon = button.querySelector('.material-icons');
        const originalText = icon.textContent;
        icon.textContent = 'check';
        setTimeout(() => {
            icon.textContent = originalText;
        }, 1000);
    }
}

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

async function deleteCategory(categoryId) {
    if (confirm('Are you sure you want to delete this category? All items in this category will be deleted.')) {
        categories = categories.filter(cat => cat.id !== categoryId);
        items = items.filter(item => item.categoryId !== categoryId);
        expandedCategories.delete(categoryId);
        await saveData();
        renderCategories(searchInput.value.trim());
    }
}

// Item functions
async function saveItem() {
    const title = itemTitle.value.trim();
    const body = itemBody.value.trim();
    const categoryId = itemCategorySelect.value;

    if (!title) {
        alert('Please enter an item title');
        return;
    }

    if (editingItemId) {
        const itemIndex = items.findIndex(i => i.id === editingItemId);
        if (itemIndex !== -1) {
            items[itemIndex] = {
                ...items[itemIndex],
                title,
                body,
                categoryId
            };
        }
    } else {
        const newItem = {
            id: Date.now().toString(),
            categoryId,
            title,
            body
        };
        items.push(newItem);
    }

    await saveData();
    expandedCategories.add(categoryId);
    renderCategories(searchInput.value.trim());
    hideModal(itemModal);
}

async function deleteItem(itemId) {
    if (confirm('Are you sure you want to delete this item?')) {
        items = items.filter(item => item.id !== itemId);
        await saveData();
        renderCategories(searchInput.value.trim());
    }
}

// Search function
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    renderCategories(searchTerm);
}