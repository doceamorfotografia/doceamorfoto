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

class ReminderManager {
    constructor() {
        this.storageKey = 'pregnancy_reminders';
        this.checkInterval = null;
        this.checkIntervalMs = 10000; // Verifica a cada 10 segundos para melhor precisão
        this.triggeredReminders = new Set(); // Rastreia lembretes já disparados hoje
        this.audioContext = null;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('AudioContext não suportado:', e);
        }
    }

    getAll() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    save(reminder) {
        const reminders = this.getAll();
        const existingIndex = reminders.findIndex(r => r.id === reminder.id);
        
        if (existingIndex >= 0) {
            reminders[existingIndex] = reminder;
        } else {
            reminders.push(reminder);
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(reminders));
        this.startChecking();
    }

    delete(id) {
        const reminders = this.getAll();
        const filtered = reminders.filter(r => r.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
        
        if (filtered.length === 0 && this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    startChecking() {
        if (this.checkInterval) {
            return; // Já está verificando
        }

        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, this.checkIntervalMs);

        // Verificar imediatamente
        this.checkReminders();
    }

    checkReminders() {
        const reminders = this.getAll();
        const now = new Date();
        const currentDay = now.getDay().toString(); // Converter para string para comparação
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

        reminders.forEach(reminder => {
            if (!reminder.enabled) return;

            // Verificar se é o dia correto (comparar strings)
            if (!reminder.days || !reminder.days.includes(currentDay)) return;

            // Verificar se é o horário correto
            if (!reminder.times || !reminder.times.includes(currentTime)) return;

            // Verificar se já disparou hoje neste horário
            const reminderKey = `${reminder.id}-${currentTime}-${todayKey}`;
            if (this.triggeredReminders.has(reminderKey)) return;

            // Disparar alarme
            this.triggerAlarm(reminder);
            this.triggeredReminders.add(reminderKey);
        });

        // Limpar lembretes antigos do cache (meia-noite)
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            this.triggeredReminders.clear();
        }
    }

    triggerAlarm(reminder) {
        // Pedir permissão para notificações se ainda não foi dada
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Tocar voz do lembrete
        const textToSpeak = reminder.reminderText || reminder.description || `Lembrete: ${reminder.name}`;
        this.playAlarmSound(textToSpeak);

        // Mostrar notificação do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Lembrete: ${reminder.name}`, {
                body: textToSpeak,
                icon: '/favicon.ico',
                tag: reminder.id,
                requireInteraction: true
            });
        } else {
            // Fallback: alert simples
            alert(`Lembrete: ${reminder.name}\n${textToSpeak}`);
        }
    }

    playAlarmSound(reminderText) {
        // Usar Web Speech API para texto-para-voz
        if ('speechSynthesis' in window) {
            try {
                // Cancelar qualquer fala anterior
                window.speechSynthesis.cancel();
                
                // Obter vozes disponíveis (pode precisar aguardar o carregamento)
                let voices = window.speechSynthesis.getVoices();
                
                // Se não houver vozes, aguardar o evento de carregamento
                if (voices.length === 0) {
                    const loadVoices = () => {
                        voices = window.speechSynthesis.getVoices();
                        this.speakWithVoice(reminderText, voices);
                    };
                    
                    window.speechSynthesis.onvoiceschanged = loadVoices;
                    // Tentar novamente após um pequeno delay
                    setTimeout(() => {
                        loadVoices();
                    }, 100);
                    return;
                }
                
                this.speakWithVoice(reminderText, voices);
                
            } catch (e) {
                console.error('Erro ao usar síntese de voz:', e);
                // Fallback para som de alarme se TTS falhar
                this.playFallbackSound();
            }
        } else {
            console.warn('SpeechSynthesis não suportado, usando som de alarme');
            this.playFallbackSound();
        }
    }
    
    speakWithVoice(reminderText, voices) {
        try {
                
            // Procurar por voz feminina (preferência para português brasileiro)
            let selectedVoice = null;
            
            // Primeira tentativa: voz feminina em português brasileiro
            selectedVoice = voices.find(voice => 
                (voice.lang.includes('pt') || voice.lang.includes('BR')) && 
                (voice.name.toLowerCase().includes('female') || 
                 voice.name.toLowerCase().includes('feminina') ||
                 voice.name.toLowerCase().includes('fêmea') ||
                 voice.gender === 'female')
            );
            
            // Segunda tentativa: qualquer voz feminina
            if (!selectedVoice) {
                selectedVoice = voices.find(voice => 
                    voice.gender === 'female' || 
                    voice.name.toLowerCase().includes('female') ||
                    voice.name.toLowerCase().includes('feminina')
                );
            }
            
            // Terceira tentativa: qualquer voz em português
            if (!selectedVoice && voices.length > 0) {
                selectedVoice = voices.find(voice => 
                    voice.lang.includes('pt') || voice.lang.includes('BR')
                );
            }
            
            // Se não encontrou, usar a primeira voz disponível
            if (!selectedVoice && voices.length > 0) {
                selectedVoice = voices[0];
            }
            
            // Criar utterance
            const utterance = new SpeechSynthesisUtterance(reminderText || 'Lembrete: Hora do seu medicamento');
            
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            
            // Configurar parâmetros da voz
            utterance.lang = 'pt-BR';
            utterance.pitch = 1.2; // Tom um pouco mais alto (mais feminino)
            utterance.rate = 0.9; // Velocidade um pouco mais lenta para clareza
            utterance.volume = 1.0; // Volume máximo
            
            // Falar o texto
            window.speechSynthesis.speak(utterance);
            
            // Repetir após 3 segundos (uma vez)
            setTimeout(() => {
                const repeatUtterance = new SpeechSynthesisUtterance(reminderText || 'Lembrete: Hora do seu medicamento');
                if (selectedVoice) {
                    repeatUtterance.voice = selectedVoice;
                }
                repeatUtterance.lang = 'pt-BR';
                repeatUtterance.pitch = 1.2;
                repeatUtterance.rate = 0.9;
                repeatUtterance.volume = 1.0;
                window.speechSynthesis.speak(repeatUtterance);
            }, 3000);
            
        } catch (e) {
            console.error('Erro ao usar síntese de voz:', e);
            // Fallback para som de alarme se TTS falhar
            this.playFallbackSound();
        }
    }

    playFallbackSound() {
        // Som de fallback caso TTS não esteja disponível
        if (!this.audioContext) {
            this.initAudioContext();
            if (!this.audioContext) return;
        }

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (e) {
            console.error('Erro ao tocar som de fallback:', e);
        }
    }
}

const reminderManager = new ReminderManager();

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
        
        // Resetar campos de lembrete
        if (type === 'medication' || type === 'supplement') {
            const reminderCheckbox = document.getElementById(`${type}-reminder-enabled`);
            const reminderConfig = document.getElementById(`${type}-reminder-config`);
            const reminderTimes = document.getElementById(`${type}-reminder-times`);
            
            if (reminderCheckbox) {
                reminderCheckbox.checked = false;
            }
            if (reminderConfig) {
                reminderConfig.style.display = 'none';
            }
            
            // Resetar dias
            const dayCheckboxes = reminderConfig?.querySelectorAll('.reminder-day');
            if (dayCheckboxes) {
                dayCheckboxes.forEach(cb => {
                    cb.checked = false;
                    cb.required = false;
                });
            }
            
            // Resetar campo de texto
            const reminderTextInput = document.getElementById(`${type}-reminder-text`);
            if (reminderTextInput) {
                reminderTextInput.value = '';
                reminderTextInput.required = false;
            }
            
            // Resetar horários (manter apenas um)
            if (reminderTimes) {
                const timeRows = reminderTimes.querySelectorAll('.reminder-time-row');
                if (timeRows.length > 1) {
                    timeRows.forEach((row, index) => {
                        if (index > 0) row.remove();
                    });
                }
                const firstTimeInput = reminderTimes.querySelector('.reminder-time-input');
                if (firstTimeInput) {
                    firstTimeInput.value = '';
                    firstTimeInput.required = false;
                }
            }
            
            // Resetar campo de texto do lembrete
            const reminderTextInput = document.getElementById(`${type}-reminder-text`);
            if (reminderTextInput) {
                reminderTextInput.value = '';
                reminderTextInput.required = false;
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
        const savedRecord = dataManager.save(dataType, record);
        
        // Salvar lembrete se habilitado (após salvar o record para ter o ID)
        try {
            if (type === 'medication' || type === 'supplement') {
                saveReminderForRecord(type, savedRecord);
            }
        } catch (error) {
            // Se houver erro no lembrete, não impede de salvar o registro
            console.warn('Erro ao salvar lembrete:', error);
        }
        
        closeModal(type);
        loadRecords(type);
        alert('Registro salvo com sucesso! ✅');
    } catch (error) {
        alert('Erro ao salvar: ' + error.message);
        return; // Não fecha o modal em caso de erro
    }
}

function deleteRecord(type, id) {
    if (confirm('Deseja excluir este registro?')) {
        const dataType = getDataType(type);
        
        // Buscar o registro para ver se tem lembrete associado
        const records = dataManager.getAll(dataType);
        const record = records.find(r => r.id === id);
        
        // Deletar lembrete se existir
        if (record && record.reminderId) {
            reminderManager.delete(record.reminderId);
        }
        
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

function saveReminderForRecord(type, record) {
    const enabledCheckbox = document.getElementById(`${type}-reminder-enabled`);
    if (!enabledCheckbox || !enabledCheckbox.checked) {
        // Remover lembrete anterior se existir
        if (record.reminderId) {
            reminderManager.delete(record.reminderId);
        }
        return;
    }

    // Coletar dias selecionados
    const daysContainer = document.getElementById(`${type}-reminder-config`);
    const dayCheckboxes = daysContainer.querySelectorAll('.reminder-day:checked');
    const days = Array.from(dayCheckboxes).map(cb => cb.value);
    
    if (days.length === 0) {
        alert('Por favor, selecione pelo menos um dia da semana para o lembrete.');
        throw new Error('Dias não selecionados');
    }

    // Coletar horários
    const timesContainer = document.getElementById(`${type}-reminder-times`);
    const timeInputs = timesContainer.querySelectorAll('.reminder-time-input');
    const times = Array.from(timeInputs)
        .map(input => input.value)
        .filter(time => time !== '');

    if (times.length === 0) {
        alert('Por favor, informe pelo menos um horário para o lembrete.');
        throw new Error('Horários não informados');
    }

    // Coletar texto do lembrete
    const reminderTextInput = document.getElementById(`${type}-reminder-text`);
    const reminderText = reminderTextInput ? reminderTextInput.value.trim() : '';
    
    if (!reminderText) {
        alert('Por favor, informe o texto do lembrete que será falado.');
        throw new Error('Texto do lembrete não informado');
    }

    // Criar ou atualizar lembrete
    const reminderId = record.reminderId || `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const reminder = {
        id: reminderId,
        recordId: record.id,
        recordType: type,
        name: record.name,
        description: `${record.name} - ${record.dose}`,
        reminderText: reminderText, // Texto que será falado
        enabled: true,
        days: days,
        times: times
    };

    reminderManager.save(reminder);
    record.reminderId = reminderId;
}

function toggleReminderSection(type) {
    const checkbox = document.getElementById(`${type}-reminder-enabled`);
    const configDiv = document.getElementById(`${type}-reminder-config`);
    
    if (checkbox && configDiv) {
        configDiv.style.display = checkbox.checked ? 'block' : 'none';
        
        // Se desativado, não exigir campos
        if (!checkbox.checked) {
            const dayCheckboxes = configDiv.querySelectorAll('.reminder-day');
            const timeInputs = configDiv.querySelectorAll('.reminder-time-input');
            const reminderTextInput = document.getElementById(`${type}-reminder-text`);
            dayCheckboxes.forEach(cb => cb.required = false);
            timeInputs.forEach(input => input.required = false);
            if (reminderTextInput) reminderTextInput.required = false;
        } else {
            const dayCheckboxes = configDiv.querySelectorAll('.reminder-day');
            const timeInputs = configDiv.querySelectorAll('.reminder-time-input');
            const reminderTextInput = document.getElementById(`${type}-reminder-text`);
            dayCheckboxes.forEach(cb => cb.required = true);
            timeInputs.forEach(input => input.required = true);
            if (reminderTextInput) reminderTextInput.required = true;
        }
    }
}

function addReminderTime(type) {
    const timesContainer = document.getElementById(`${type}-reminder-times`);
    if (!timesContainer) return;

    const newTimeRow = document.createElement('div');
    newTimeRow.className = 'reminder-time-row';
    newTimeRow.innerHTML = `
        <input type="time" class="reminder-time-input" required>
        <button type="button" class="btn-remove-time" onclick="removeReminderTime(this)">
            <span class="material-icons">close</span>
        </button>
    `;
    timesContainer.appendChild(newTimeRow);
}

function removeReminderTime(button) {
    const row = button.closest('.reminder-time-row');
    const timesContainer = row?.parentElement;
    
    // Não permitir remover se for o único horário
    if (timesContainer && timesContainer.querySelectorAll('.reminder-time-row').length > 1) {
        row.remove();
    } else {
        alert('É necessário ter pelo menos um horário de lembrete.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        loadRecords(tabId);
    }
    
    // Solicitar permissão para notificações e iniciar sistema de lembretes
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Garantir que as vozes estejam carregadas
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices(); // Força o carregamento inicial
        window.speechSynthesis.onvoiceschanged = () => {
            // Vozes carregadas
        };
    }
    
    // Iniciar verificação de lembretes
    const reminders = reminderManager.getAll();
    if (reminders.length > 0) {
        reminderManager.startChecking();
    }
});

