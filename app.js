// ===== State Management =====
class BoardState {
    constructor() {
        this.pins = new Map();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.tags = new Set(['all']);
        this.activeTag = 'all';
        this.nextPinId = 1;

        // Canvas state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        this.loadFromStorage();
    }

    addPin(pin) {
        this.pins.set(pin.id, pin);
        this.saveState();
        this.saveToStorage();
        this.updateTagList();
    }

    updatePin(id, updates) {
        const pin = this.pins.get(id);
        if (pin) {
            Object.assign(pin, updates);
            this.saveState();
            this.saveToStorage();
        }
    }

    deletePin(id) {
        this.pins.delete(id);
        this.saveState();
        this.saveToStorage();
        this.updateTagList();
    }

    getPin(id) {
        return this.pins.get(id);
    }

    getAllPins() {
        return Array.from(this.pins.values());
    }

    getFilteredPins() {
        if (this.activeTag === 'all') {
            return this.getAllPins();
        }
        return this.getAllPins().filter(pin =>
            pin.tags && pin.tags.includes(this.activeTag)
        );
    }

    saveState() {
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Save current state
        const state = {
            pins: Array.from(this.pins.entries()),
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };

        this.history.push(JSON.parse(JSON.stringify(state)));

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            this.updateUndoRedoButtons();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            this.updateUndoRedoButtons();
        }
    }

    restoreState(state) {
        this.pins = new Map(state.pins);
        this.zoom = state.zoom;
        this.panX = state.panX;
        this.panY = state.panY;

        boardRenderer.renderAllPins();
        canvasController.updateTransform();
        this.saveToStorage();
        this.updateTagList();
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        undoBtn.disabled = this.historyIndex <= 0;
        redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    saveToStorage() {
        const data = {
            pins: Array.from(this.pins.entries()),
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY,
            nextPinId: this.nextPinId
        };
        localStorage.setItem('freeboard_state', JSON.stringify(data));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('freeboard_state');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.pins = new Map(data.pins);
                this.zoom = data.zoom || 1;
                this.panX = data.panX || 0;
                this.panY = data.panY || 0;
                this.nextPinId = data.nextPinId || 1;

                // Initialize history with loaded state
                this.saveState();
                this.updateTagList();
            } catch (e) {
                console.error('Failed to load state:', e);
            }
        } else {
            // Initialize with empty state
            this.saveState();
        }
    }

    updateTagList() {
        this.tags = new Set(['all']);
        this.getAllPins().forEach(pin => {
            if (pin.tags) {
                pin.tags.forEach(tag => this.tags.add(tag));
            }
        });
        // Only render if boardRenderer is initialized
        if (typeof boardRenderer !== 'undefined' && boardRenderer) {
            boardRenderer.renderTagList();
        }
    }

    saveSnapshot(name) {
        const snapshots = this.getSnapshots();
        const snapshot = {
            name,
            date: new Date().toISOString(),
            data: {
                pins: Array.from(this.pins.entries()),
                zoom: this.zoom,
                panX: this.panX,
                panY: this.panY
            }
        };
        snapshots.push(snapshot);
        localStorage.setItem('freeboard_snapshots', JSON.stringify(snapshots));
    }

    loadSnapshot(index) {
        const snapshots = this.getSnapshots();
        if (snapshots[index]) {
            const snapshot = snapshots[index];
            this.pins = new Map(snapshot.data.pins);
            this.zoom = snapshot.data.zoom;
            this.panX = snapshot.data.panX;
            this.panY = snapshot.data.panY;

            boardRenderer.renderAllPins();
            canvasController.updateTransform();
            this.saveState();
            this.saveToStorage();
            this.updateTagList();
        }
    }

    deleteSnapshot(index) {
        const snapshots = this.getSnapshots();
        snapshots.splice(index, 1);
        localStorage.setItem('freeboard_snapshots', JSON.stringify(snapshots));
    }

    getSnapshots() {
        const saved = localStorage.getItem('freeboard_snapshots');
        return saved ? JSON.parse(saved) : [];
    }
}

// ===== Pin Factory =====
class PinFactory {
    static createTextPin(x, y) {
        return {
            id: `pin-${state.nextPinId++}`,
            type: 'text',
            x,
            y,
            width: 300,
            height: 200,
            content: '',
            tags: [],
            created: Date.now()
        };
    }

    static createImagePin(x, y) {
        return {
            id: `pin-${state.nextPinId++}`,
            type: 'image',
            x,
            y,
            width: 300,
            height: 300,
            imageUrl: null,
            imageWidth: 0,
            imageHeight: 0,
            tags: [],
            created: Date.now()
        };
    }

    static createListPin(x, y) {
        return {
            id: `pin-${state.nextPinId++}`,
            type: 'list',
            x,
            y,
            width: 300,
            height: 250,
            items: [],
            tags: [],
            created: Date.now()
        };
    }
}

// ===== Board Renderer =====
class BoardRenderer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.selectedPin = null;
    }

    renderAllPins() {
        this.canvas.innerHTML = '';
        const pins = state.getFilteredPins();
        pins.forEach(pin => this.renderPin(pin));
    }

    renderPin(pin) {
        const existingElement = document.getElementById(pin.id);
        if (existingElement) {
            existingElement.remove();
        }

        const pinElement = document.createElement('div');
        pinElement.className = 'pin';
        pinElement.id = pin.id;
        pinElement.style.left = `${pin.x}px`;
        pinElement.style.top = `${pin.y}px`;
        pinElement.style.width = `${pin.width}px`;
        pinElement.style.height = `${pin.height}px`;

        // Header
        const header = this.createPinHeader(pin);
        pinElement.appendChild(header);

        // Content
        const content = this.createPinContent(pin);
        pinElement.appendChild(content);

        // Resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        pinElement.appendChild(resizeHandle);

        this.canvas.appendChild(pinElement);

        // Attach event listeners
        this.attachPinEvents(pinElement, pin);
    }

    createPinHeader(pin) {
        const header = document.createElement('div');
        header.className = 'pin-header';

        // Tags
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'pin-tags';

        if (pin.tags && pin.tags.length > 0) {
            pin.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'pin-tag';
                tagElement.textContent = tag;
                tagElement.onclick = (e) => {
                    e.stopPropagation();
                    this.removeTag(pin.id, tag);
                };
                tagsContainer.appendChild(tagElement);
            });
        }

        // Add tag button
        const addTagBtn = document.createElement('button');
        addTagBtn.className = 'pin-btn';
        addTagBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
        `;
        addTagBtn.onclick = (e) => {
            e.stopPropagation();
            this.addTag(pin.id);
        };
        tagsContainer.appendChild(addTagBtn);

        header.appendChild(tagsContainer);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'pin-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'pin-btn delete';
        deleteBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
        `;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deletePin(pin.id);
        };

        actions.appendChild(deleteBtn);
        header.appendChild(actions);

        return header;
    }

    createPinContent(pin) {
        const content = document.createElement('div');
        content.className = 'pin-content';

        switch (pin.type) {
            case 'text':
                content.appendChild(this.createTextContent(pin));
                break;
            case 'image':
                content.appendChild(this.createImageContent(pin));
                break;
            case 'list':
                content.appendChild(this.createListContent(pin));
                break;
        }

        return content;
    }

    createTextContent(pin) {
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Start typing...';
        textarea.value = pin.content || '';
        textarea.oninput = (e) => {
            state.updatePin(pin.id, { content: e.target.value });
        };
        return textarea;
    }

    createImageContent(pin) {
        const container = document.createElement('div');

        if (pin.imageUrl) {
            const img = document.createElement('img');
            img.className = 'pin-image';
            img.src = pin.imageUrl;
            img.alt = 'Pin image';
            container.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'pin-image-placeholder';
            placeholder.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Click to add image</span>
            `;

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.className = 'pin-image-input';
            input.onchange = (e) => this.handleImageUpload(e, pin.id);

            placeholder.onclick = () => input.click();

            container.appendChild(placeholder);
            container.appendChild(input);
        }

        return container;
    }

    createListContent(pin) {
        const container = document.createElement('div');

        // Render existing items
        if (pin.items && pin.items.length > 0) {
            pin.items.forEach((item, index) => {
                container.appendChild(this.createListItem(pin.id, item, index));
            });
        }

        // Add item button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-list-item';
        addBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add item
        `;
        addBtn.onclick = () => this.addListItem(pin.id);

        container.appendChild(addBtn);

        return container;
    }

    createListItem(pinId, item, index) {
        const itemElement = document.createElement('div');
        itemElement.className = 'list-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'list-checkbox';
        checkbox.checked = item.completed || false;
        checkbox.onchange = (e) => {
            const pin = state.getPin(pinId);
            pin.items[index].completed = e.target.checked;
            state.updatePin(pinId, { items: pin.items });
            this.renderPin(pin);
        };

        const text = document.createElement('input');
        text.type = 'text';
        text.className = `list-text ${item.completed ? 'completed' : ''}`;
        text.value = item.text || '';
        text.placeholder = 'List item...';
        text.oninput = (e) => {
            const pin = state.getPin(pinId);
            pin.items[index].text = e.target.value;
            state.updatePin(pinId, { items: pin.items });
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'list-delete';
        deleteBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        `;
        deleteBtn.onclick = () => this.deleteListItem(pinId, index);

        itemElement.appendChild(checkbox);
        itemElement.appendChild(text);
        itemElement.appendChild(deleteBtn);

        return itemElement;
    }

    addListItem(pinId) {
        const pin = state.getPin(pinId);
        if (!pin.items) pin.items = [];
        pin.items.push({ text: '', completed: false });
        state.updatePin(pinId, { items: pin.items });
        this.renderPin(pin);
    }

    deleteListItem(pinId, index) {
        const pin = state.getPin(pinId);
        pin.items.splice(index, 1);
        state.updatePin(pinId, { items: pin.items });
        this.renderPin(pin);
    }

    handleImageUpload(event, pinId) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const pin = state.getPin(pinId);
                    state.updatePin(pinId, {
                        imageUrl: e.target.result,
                        imageWidth: img.width,
                        imageHeight: img.height,
                        width: Math.max(300, Math.min(600, img.width)),
                        height: Math.max(200, Math.min(600, img.height))
                    });
                    this.renderPin(state.getPin(pinId));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    addTag(pinId) {
        const tag = prompt('Enter tag name:');
        if (tag && tag.trim()) {
            const pin = state.getPin(pinId);
            if (!pin.tags) pin.tags = [];
            if (!pin.tags.includes(tag.trim())) {
                pin.tags.push(tag.trim());
                state.updatePin(pinId, { tags: pin.tags });
                this.renderPin(pin);
            }
        }
    }

    removeTag(pinId, tag) {
        const pin = state.getPin(pinId);
        pin.tags = pin.tags.filter(t => t !== tag);
        state.updatePin(pinId, { tags: pin.tags });
        this.renderPin(pin);
    }

    deletePin(pinId) {
        if (confirm('Delete this pin?')) {
            state.deletePin(pinId);
            const element = document.getElementById(pinId);
            if (element) element.remove();
        }
    }

    attachPinEvents(pinElement, pin) {
        const header = pinElement.querySelector('.pin-header');
        const resizeHandle = pinElement.querySelector('.resize-handle');

        // Dragging
        let isDragging = false;
        let dragStartX, dragStartY, pinStartX, pinStartY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pin-btn') || e.target.closest('.pin-tag')) return;

            isDragging = true;
            pinElement.classList.add('dragging');

            const rect = pinElement.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();

            dragStartX = e.clientX;
            dragStartY = e.clientY;
            pinStartX = (rect.left - canvasRect.left) / state.zoom;
            pinStartY = (rect.top - canvasRect.top) / state.zoom;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = (e.clientX - dragStartX) / state.zoom;
            const deltaY = (e.clientY - dragStartY) / state.zoom;

            const newX = pinStartX + deltaX;
            const newY = pinStartY + deltaY;

            pinElement.style.left = `${newX}px`;
            pinElement.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                pinElement.classList.remove('dragging');

                const x = parseFloat(pinElement.style.left);
                const y = parseFloat(pinElement.style.top);

                state.updatePin(pin.id, { x, y });
            }
        });

        // Resizing
        let isResizing = false;
        let resizeStartX, resizeStartY, startWidth, startHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            startWidth = pinElement.offsetWidth;
            startHeight = pinElement.offsetHeight;
            e.stopPropagation();
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaX = (e.clientX - resizeStartX) / state.zoom;
            const deltaY = (e.clientY - resizeStartY) / state.zoom;

            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;

            // Minimum constraints
            newWidth = Math.max(200, newWidth);
            newHeight = Math.max(100, newHeight);

            // Image constraints
            if (pin.type === 'image' && pin.imageWidth && pin.imageHeight) {
                newWidth = Math.max(pin.imageWidth, newWidth);
                newHeight = Math.max(pin.imageHeight, newHeight);
            }

            pinElement.style.width = `${newWidth}px`;
            pinElement.style.height = `${newHeight}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;

                const width = pinElement.offsetWidth;
                const height = pinElement.offsetHeight;

                state.updatePin(pin.id, { width, height });
            }
        });

        // Selection
        pinElement.addEventListener('click', (e) => {
            if (e.target.closest('textarea') || e.target.closest('input')) return;

            document.querySelectorAll('.pin.selected').forEach(p => {
                p.classList.remove('selected');
            });

            pinElement.classList.add('selected');
            this.selectedPin = pin.id;
        });
    }

    renderTagList() {
        const tagList = document.getElementById('tagList');
        tagList.innerHTML = '';

        Array.from(state.tags).forEach(tag => {
            const button = document.createElement('button');
            button.className = `tag-filter ${tag === state.activeTag ? 'active' : ''}`;
            button.textContent = tag;
            button.dataset.tag = tag;
            button.onclick = () => {
                state.activeTag = tag;
                this.renderTagList();
                this.renderAllPins();
            };
            tagList.appendChild(button);
        });
    }
}

// ===== Canvas Controller =====
class CanvasController {
    constructor() {
        this.container = document.getElementById('canvasContainer');
        this.canvas = document.getElementById('canvas');
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.attachEvents();
    }

    attachEvents() {
        // Pan
        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.container || e.target === this.canvas) {
                this.isPanning = true;
                this.startX = e.clientX - state.panX;
                this.startY = e.clientY - state.panY;
                this.container.classList.add('panning');
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                state.panX = e.clientX - this.startX;
                state.panY = e.clientY - this.startY;
                this.updateTransform();
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.container.classList.remove('panning');
                state.saveToStorage();
            }
        });

        // Zoom
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.1, Math.min(3, state.zoom * delta));

            // Zoom towards mouse position
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomRatio = newZoom / state.zoom;
            state.panX = mouseX - (mouseX - state.panX) * zoomRatio;
            state.panY = mouseY - (mouseY - state.panY) * zoomRatio;
            state.zoom = newZoom;

            this.updateTransform();
            this.updateZoomDisplay();
            state.saveToStorage();
        });

        // Zoom buttons
        document.getElementById('zoomIn').onclick = () => this.zoom(1.2);
        document.getElementById('zoomOut').onclick = () => this.zoom(0.8);
        document.getElementById('resetZoom').onclick = () => this.resetZoom();
    }

    zoom(factor) {
        state.zoom = Math.max(0.1, Math.min(3, state.zoom * factor));
        this.updateTransform();
        this.updateZoomDisplay();
        state.saveToStorage();
    }

    resetZoom() {
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
        this.updateTransform();
        this.updateZoomDisplay();
        state.saveToStorage();
    }

    updateTransform() {
        this.canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }

    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = `${Math.round(state.zoom * 100)}%`;
    }
}

// ===== Toolbar Controller =====
class ToolbarController {
    constructor() {
        this.attachEvents();
    }

    attachEvents() {
        // Add pins
        document.getElementById('addTextPin').onclick = () => this.addPin('text');
        document.getElementById('addImagePin').onclick = () => this.addPin('image');
        document.getElementById('addList').onclick = () => this.addPin('list');

        // Undo/Redo
        document.getElementById('undoBtn').onclick = () => state.undo();
        document.getElementById('redoBtn').onclick = () => state.redo();

        // Snapshots
        document.getElementById('saveSnapshot').onclick = () => this.showSnapshotModal();
        document.getElementById('loadSnapshot').onclick = () => this.showLoadModal();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    state.undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    state.redo();
                }
            } else {
                switch (e.key.toLowerCase()) {
                    case 't':
                        this.addPin('text');
                        break;
                    case 'i':
                        this.addPin('image');
                        break;
                    case 'l':
                        this.addPin('list');
                        break;
                    case '+':
                    case '=':
                        canvasController.zoom(1.2);
                        break;
                    case '-':
                        canvasController.zoom(0.8);
                        break;
                    case '0':
                        canvasController.resetZoom();
                        break;
                }
            }
        });
    }

    addPin(type) {
        // Calculate center of visible area
        const container = document.getElementById('canvasContainer');
        const rect = container.getBoundingClientRect();
        const centerX = (rect.width / 2 - state.panX) / state.zoom;
        const centerY = (rect.height / 2 - state.panY) / state.zoom;

        // Add some randomness to avoid stacking
        const x = centerX + (Math.random() - 0.5) * 100;
        const y = centerY + (Math.random() - 0.5) * 100;

        let pin;
        switch (type) {
            case 'text':
                pin = PinFactory.createTextPin(x, y);
                break;
            case 'image':
                pin = PinFactory.createImagePin(x, y);
                break;
            case 'list':
                pin = PinFactory.createListPin(x, y);
                break;
        }

        state.addPin(pin);
        boardRenderer.renderPin(pin);
    }

    showSnapshotModal() {
        const modal = document.getElementById('snapshotModal');
        const input = document.getElementById('snapshotName');

        input.value = `Snapshot ${new Date().toLocaleString()}`;
        modal.classList.add('active');
        input.focus();
        input.select();
    }

    showLoadModal() {
        const modal = document.getElementById('loadSnapshotModal');
        const list = document.getElementById('snapshotList');

        const snapshots = state.getSnapshots();

        if (snapshots.length === 0) {
            list.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 2rem;">No snapshots saved yet</p>';
        } else {
            list.innerHTML = '';
            snapshots.forEach((snapshot, index) => {
                const item = document.createElement('div');
                item.className = 'snapshot-item';

                const info = document.createElement('div');
                info.className = 'snapshot-info';

                const name = document.createElement('div');
                name.className = 'snapshot-name';
                name.textContent = snapshot.name;

                const date = document.createElement('div');
                date.className = 'snapshot-date';
                date.textContent = new Date(snapshot.date).toLocaleString();

                info.appendChild(name);
                info.appendChild(date);

                const actions = document.createElement('div');
                actions.className = 'snapshot-actions';

                const loadBtn = document.createElement('button');
                loadBtn.className = 'btn btn-primary';
                loadBtn.textContent = 'Load';
                loadBtn.onclick = () => {
                    state.loadSnapshot(index);
                    modal.classList.remove('active');
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => {
                    if (confirm('Delete this snapshot?')) {
                        state.deleteSnapshot(index);
                        this.showLoadModal();
                    }
                };

                actions.appendChild(loadBtn);
                actions.appendChild(deleteBtn);

                item.appendChild(info);
                item.appendChild(actions);
                list.appendChild(item);
            });
        }

        modal.classList.add('active');
    }
}

// ===== Modal Controllers =====
function setupModals() {
    // Snapshot modal
    const snapshotModal = document.getElementById('snapshotModal');
    const snapshotInput = document.getElementById('snapshotName');

    document.getElementById('closeSnapshotModal').onclick = () => {
        snapshotModal.classList.remove('active');
    };

    document.getElementById('cancelSnapshot').onclick = () => {
        snapshotModal.classList.remove('active');
    };

    document.getElementById('confirmSnapshot').onclick = () => {
        const name = snapshotInput.value.trim();
        if (name) {
            state.saveSnapshot(name);
            snapshotModal.classList.remove('active');
        }
    };

    snapshotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirmSnapshot').click();
        }
    });

    // Load modal
    const loadModal = document.getElementById('loadSnapshotModal');

    document.getElementById('closeLoadModal').onclick = () => {
        loadModal.classList.remove('active');
    };

    document.getElementById('cancelLoad').onclick = () => {
        loadModal.classList.remove('active');
    };

    // Close on backdrop click
    [snapshotModal, loadModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ===== Welcome Screen =====
function setupWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const hasVisited = localStorage.getItem('freeboard_visited');

    if (hasVisited) {
        welcomeScreen.classList.add('hidden');
    }

    document.getElementById('getStarted').onclick = () => {
        welcomeScreen.classList.add('hidden');
        localStorage.setItem('freeboard_visited', 'true');
    };
}

// ===== Theme Toggle =====
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('freeboard_theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);

    // Toggle theme
    themeToggle.onclick = () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('freeboard_theme', newTheme);
    };
}

// ===== Initialize Application =====
let state, boardRenderer, canvasController, toolbarController;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize core objects in correct order
    state = new BoardState();
    boardRenderer = new BoardRenderer();
    canvasController = new CanvasController();
    toolbarController = new ToolbarController();

    // Setup UI components
    setupModals();
    setupWelcomeScreen();
    setupThemeToggle();

    // Render initial state
    boardRenderer.renderAllPins();
    boardRenderer.renderTagList();
    canvasController.updateTransform();
    canvasController.updateZoomDisplay();
    state.updateUndoRedoButtons();
});
