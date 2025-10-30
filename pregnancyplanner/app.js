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
    const dataType = getDataType(type);
    const records = dataManager.getAll(dataType);
    const listContainer = document.getElementById(getListId(type));
    const emptyState = document.getElementById('empty-state');

    if (!listContainer) {
        console.error('List container not found for type:', type);
        return;
    }

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
        'medication': 'medications-list',
        'medications': 'medications-list',
        'supplement': 'supplements-list',
        'supplements': 'supplements-list',
        'glucose': 'glucose-list',
        'blood-pressure': 'blood-pressure-list'
    };
    return mapping[type] || '';
}

function getDataType(type) {
    // Se já está no plural correto, retorna como está
    if (type === 'medications' || type === 'supplements' || 
        type === 'glucose' || type === 'blood-pressure') {
        return type;
    }
    
    // Converte do singular para plural
    const mapping = {
        'medication': 'medications',
        'supplement': 'supplements',
        'glucose': 'glucose',
        'blood-pressure': 'blood-pressure'
    };
    return mapping[type] || type;
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

    // Normalizar tipo para comparar (pode vir singular ou plural)
    const normalizedType = type === 'medications' ? 'medication' : 
                           type === 'supplements' ? 'supplement' : 
                           type;
    
    switch (normalizedType) {
        case 'medication':
        case 'supplement':
            title.textContent = record.name;
            subtitle.textContent = `Dose: ${record.dose} | Horário: ${record.time}`;
            break;
        case 'glucose':
            title.textContent = `${record.value} mg/dL`;
            const glucoseTypeLabels = {
                'jejum': 'Jejum',
                'antes-almoco': 'Antes do Almoço',
                'depois-almoco': 'Depois do Almoço',
                'antes-jantar': 'Antes do Jantar',
                'depois-jantar': 'Depois do Jantar'
            };
            let glucoseSubtitle = '';
            
            // Compatibilidade com registros antigos
            if (record.type) {
                glucoseSubtitle = glucoseTypeLabels[record.type] || record.type;
            } else {
                glucoseSubtitle = 'Valor registrado';
            }
            
            if (record.time) {
                glucoseSubtitle += ` | ${record.time}`;
            }
            if (record.insulinTaken && record.insulinUnits !== null && record.insulinUnits !== undefined) {
                glucoseSubtitle += ` | Insulina: ${record.insulinUnits} unidades`;
            }
            subtitle.textContent = glucoseSubtitle;
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
    // Normalizar tipo para deleteRecord (pode vir singular ou plural)
    const deleteType = normalizedType;
    deleteBtn.onclick = () => deleteRecord(deleteType, record.id);

    card.appendChild(info);
    card.appendChild(deleteBtn);

    return card;
}

function openAddDialog(type) {
    const modal = document.getElementById(`modal-${type}`);
    if (modal) {
        modal.classList.add('active');
        
        if (type === 'medication' || type === 'supplement' || type === 'glucose') {
            const timeInput = document.getElementById(`${type}-time`);
            if (timeInput) {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                timeInput.value = `${hours}:${minutes}`;
            }
        }
        
        // Resetar campos específicos da glicose
        if (type === 'glucose') {
            const insulinCheckbox = document.getElementById('glucose-insulin-taken');
            const insulinUnitsGroup = document.getElementById('insulin-units-group');
            const insulinUnitsInput = document.getElementById('glucose-insulin-units');
            if (insulinCheckbox) {
                insulinCheckbox.checked = false;
            }
            if (insulinUnitsGroup) {
                insulinUnitsGroup.style.display = 'none';
            }
            if (insulinUnitsInput) {
                insulinUnitsInput.value = '';
                insulinUnitsInput.required = false;
            }
        }
    }
}

function toggleInsulinUnits() {
    const checkbox = document.getElementById('glucose-insulin-taken');
    const unitsGroup = document.getElementById('insulin-units-group');
    const unitsInput = document.getElementById('glucose-insulin-units');
    
    if (checkbox && unitsGroup && unitsInput) {
        if (checkbox.checked) {
            unitsGroup.style.display = 'block';
            unitsInput.required = true;
        } else {
            unitsGroup.style.display = 'none';
            unitsInput.required = false;
            unitsInput.value = '';
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
                const insulinTaken = document.getElementById('glucose-insulin-taken').checked;
                record = {
                    value: parseInt(document.getElementById('glucose-value').value),
                    time: document.getElementById('glucose-time').value,
                    type: document.getElementById('glucose-type').value,
                    insulinTaken: insulinTaken,
                    insulinUnits: insulinTaken ? parseFloat(document.getElementById('glucose-insulin-units').value) : null
                };
                if (insulinTaken && !document.getElementById('glucose-insulin-units').value) {
                    alert('Por favor, informe a quantidade de unidades de insulina.');
                    return;
                }
                break;
            case 'blood-pressure':
                record = {
                    systolic: parseInt(document.getElementById('bp-systolic').value),
                    diastolic: parseInt(document.getElementById('bp-diastolic').value)
                };
                break;
        }

        const dataType = getDataType(type);
        dataManager.save(dataType, record);
        closeModal(type);
        loadRecords(type);
        alert('Registro salvo com sucesso! ✅');
    } catch (error) {
        alert('Erro ao salvar: ' + error.message);
    }
}

function deleteRecord(type, id) {
    if (confirm('Deseja excluir este registro?')) {
        const dataType = getDataType(type);
        dataManager.delete(dataType, id);
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

