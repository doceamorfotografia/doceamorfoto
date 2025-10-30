class DataManager {
    constructor() {
        this.storageKeys = {
            medications: 'pregnancy_medications',
            supplements: 'pregnancy_supplements',
            glucose: 'pregnancy_glucose',
            'blood-pressure': 'pregnancy_blood_pressure'
        };
    }

    getAll(type) {
        const key = this.storageKeys[type];
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    save(type, record) {
        const key = this.storageKeys[type];
        const records = this.getAll(type);
        record.id = Date.now();
        record.date = new Date().toISOString();
        records.unshift(record);
        localStorage.setItem(key, JSON.stringify(records));
        return record;
    }

    delete(type, id) {
        const key = this.storageKeys[type];
        const records = this.getAll(type);
        const filtered = records.filter(r => r.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));
    }
}

const dataManager = new DataManager();

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            loadRecords(tabId);
        });
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function loadRecords(type) {
    const records = dataManager.getAll(type);
    const listContainer = document.getElementById(getListId(type));
    const emptyState = document.getElementById('empty-state');

    listContainer.innerHTML = '';

    if (records.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    records.forEach(record => {
        const card = createRecordCard(type, record);
        listContainer.appendChild(card);
    });
}

function getListId(type) {
    const mapping = {
        'medications': 'medications-list',
        'supplements': 'supplements-list',
        'glucose': 'glucose-list',
        'blood-pressure': 'blood-pressure-list'
    };
    return mapping[type] || '';
}

function createRecordCard(type, record) {
    const card = document.createElement('div');
    card.className = 'record-card';

    const info = document.createElement('div');
    info.className = 'record-info';

    const title = document.createElement('div');
    title.className = 'record-title';

    const subtitle = document.createElement('div');
    subtitle.className = 'record-subtitle';

    const date = document.createElement('div');
    date.className = 'record-date';
    date.textContent = formatDate(record.date);

    switch (type) {
        case 'medication':
        case 'supplement':
            title.textContent = record.name;
            subtitle.textContent = `Dose: ${record.dose} | Horário: ${record.time}`;
            break;
        case 'glucose':
            title.textContent = `${record.value} mg/dL`;
            subtitle.textContent = 'Valor registrado';
            break;
        case 'blood-pressure':
            title.textContent = `${record.systolic}/${record.diastolic}`;
            subtitle.textContent = 'mmHg';
            break;
    }

    info.appendChild(title);
    info.appendChild(subtitle);
    info.appendChild(date);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-button';
    deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
    deleteBtn.title = 'Excluir registro';
    deleteBtn.onclick = () => deleteRecord(type, record.id);

    card.appendChild(info);
    card.appendChild(deleteBtn);

    return card;
}

function openAddDialog(type) {
    const modal = document.getElementById(`modal-${type}`);
    if (modal) {
        modal.classList.add('active');
        
        if (type === 'medication' || type === 'supplement') {
            const timeInput = document.getElementById(`${type}-time`);
            if (timeInput) {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                timeInput.value = `${hours}:${minutes}`;
            }
        }
    }
}

function closeModal(type) {
    const modal = document.getElementById(`modal-${type}`);
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById(`form-${type}`);
        if (form) {
            form.reset();
        }
    }
}

function saveRecord(event, type) {
    event.preventDefault();

    let record = {};

    try {
        switch (type) {
            case 'medication':
                record = {
                    name: document.getElementById('medication-name').value.trim(),
                    dose: document.getElementById('medication-dose').value.trim(),
                    time: document.getElementById('medication-time').value
                };
                break;
            case 'supplement':
                record = {
                    name: document.getElementById('supplement-name').value.trim(),
                    dose: document.getElementById('supplement-dose').value.trim(),
                    time: document.getElementById('supplement-time').value
                };
                break;
            case 'glucose':
                record = {
                    value: parseInt(document.getElementById('glucose-value').value)
                };
                break;
            case 'blood-pressure':
                record = {
                    systolic: parseInt(document.getElementById('bp-systolic').value),
                    diastolic: parseInt(document.getElementById('bp-diastolic').value)
                };
                break;
        }

        dataManager.save(type, record);
        closeModal(type);
        loadRecords(type);
        alert('Registro salvo com sucesso! ✅');
    } catch (error) {
        alert('Erro ao salvar: ' + error.message);
    }
}

function deleteRecord(type, id) {
    if (confirm('Deseja excluir este registro?')) {
        dataManager.delete(type, id);
        loadRecords(type);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        loadRecords(tabId);
    }
});

