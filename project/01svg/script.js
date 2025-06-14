/**
 * SVG元素选择器类
 * 
 * 关键特性：统一的元素测量方式
 * - 所有SVG元素的测量都统一使用getBBox()方法
 * - getBBox()返回元素在SVG坐标系中的精确位置和尺寸
 * - 避免了不同测量方法（如getBoundingClientRect）之间的坐标系差异
 * - 确保了选择、距离计算、位置显示等功能的一致性
 */
class SVGElementSelector {
    constructor() {
        this.selectedElements = new Set();
        this.svgContainer = null;
        this.currentSvg = null;
        this.isShiftPressed = false;
        this.isSpacePressed = false; // 添加space键状态跟踪
        
        // 框选相关属性
        this.isSelecting = false;
        this.selectionStart = { x: 0, y: 0 };
        this.selectionEnd = { x: 0, y: 0 };
        this.selectionBox = null;
        this.selectionAreas = [];
        this.selectionTraces = []; // 保留的框选痕迹
        
        // 长按相关属性
        this.longPressTimer = null;
        this.longPressDelay = 200; // 长按延迟时间(毫秒)
        this.isLongPress = false;
        this.longPressHint = null;
        
        // 拖拽相关属性
        this.selectedTrace = null;
        this.isDraggingTrace = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // 空格键移动相关
        this.isMovingSelection = false;
        this.lastMousePos = { x: 0, y: 0 };
        
        // 元素标记管理
        this.elementLabels = new Map(); // 存储元素和标记的对应关系
        this.labelCounter = 0; // 标记计数器
        
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.svgViewer = document.getElementById('svgViewer');
        this.selectedElementsPanel = document.getElementById('selectedElements');
        this.distanceInfo = document.getElementById('distanceInfo');
        this.selectionCount = document.getElementById('selectionCount');
        this.selectionInfo = document.getElementById('selectionInfo');
        
        // 画布信息元素
        this.canvasSize = document.getElementById('canvasSize');
        this.viewBox = document.getElementById('viewBox');
        this.mousePosition = document.getElementById('mousePosition');
    }

    attachEventListeners() {
        // 文件上传相关事件
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 拖拽上传
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 键盘事件监听
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                this.isShiftPressed = true;
            }
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                this.isSpacePressed = true;
                if (this.isSelecting && this.selectionBox) {
                    this.isMovingSelection = true;
                    document.body.style.cursor = 'move';
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.isShiftPressed = false;
            }
            if (e.key === ' ' || e.code === 'Space') {
                this.isSpacePressed = false;
                this.isMovingSelection = false;
                document.body.style.cursor = '';
            }
        });
        
        // Backspace键删除选中的框选痕迹
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && this.selectedTrace) {
                e.preventDefault();
                this.deleteSelectedTrace();
            }
        });
        
        // 清除选择（点击空白区域）
        document.addEventListener('click', (e) => {
            if (!this.isShiftPressed && !e.target.closest('.svg-viewer svg') && !e.target.closest('.info-panel') && !e.target.closest('.selection-trace')) {
                this.clearSelection();
                this.clearTraceSelection();
            }
        });
        
        // 框选相关事件监听
        this.svgViewer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // SVG画布鼠标位置跟踪
        this.svgViewer.addEventListener('mousemove', (e) => this.updateMousePosition(e));
        this.svgViewer.addEventListener('mouseleave', () => this.clearMousePosition());
        
        // 监听滚动事件以更新标记位置
        this.svgViewer.addEventListener('scroll', () => this.updateAllLabelPositions());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadSVGFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadSVGFile(file);
        }
    }

    async loadSVGFile(file) {
        if (!file.type.includes('svg')) {
            alert('请选择SVG文件');
            return;
        }

        try {
            this.svgViewer.classList.add('loading');
            
            const text = await this.readFileAsText(file);
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(text, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');
            
            if (!svgElement) {
                throw new Error('无效的SVG文件');
            }

            this.displaySVG(svgElement);
            this.clearSelection();
            
        } catch (error) {
            console.error('加载SVG文件时出错:', error);
            alert('加载SVG文件失败，请检查文件格式');
        } finally {
            this.svgViewer.classList.remove('loading');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    displaySVG(svgElement) {
        // 清空查看器
        this.svgViewer.innerHTML = '';
        
        // 重置框选相关数据
        this.selectionAreas = [];
        this.selectionTraces = [];
        
        // 克隆SVG元素
        this.currentSvg = svgElement.cloneNode(true);
        
        // 确保SVG有适当的样式
        this.currentSvg.style.maxWidth = '100%';
        this.currentSvg.style.height = 'auto';
        this.currentSvg.style.display = 'block';
        
        // 添加到容器
        this.svgViewer.appendChild(this.currentSvg);
        
        // 显示画布信息
        this.updateCanvasInfo();
        
        // 为所有可选择的元素添加事件监听器
        this.attachSVGElementListeners();
    }

    attachSVGElementListeners() {
        if (!this.currentSvg) return;
        
        // 获取所有可选择的SVG元素
        const selectableElements = this.currentSvg.querySelectorAll('text, rect, circle, ellipse, line, polyline, polygon, path, g[id], g[class]');
        
        selectableElements.forEach(element => {
            element.style.cursor = 'pointer';
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleElementClick(element);
            });
            
            // 添加悬停效果
            element.addEventListener('mouseenter', () => {
                if (!this.selectedElements.has(element)) {
                    element.style.opacity = '0.8';
                }
            });
            
            element.addEventListener('mouseleave', () => {
                if (!this.selectedElements.has(element)) {
                    element.style.opacity = '';
                }
            });
        });
    }

    handleElementClick(element) {
        if (this.isShiftPressed) {
            // 多选模式
            if (this.selectedElements.has(element)) {
                this.deselectElement(element);
            } else {
                this.selectElement(element);
            }
        } else {
            // 单选模式
            this.clearSelection();
            this.selectElement(element);
        }
        
        this.updateSelectionDisplay();
    }

    selectElement(element) {
        this.selectedElements.add(element);
        element.classList.add('selected');
        element.style.opacity = '';
        
        // 创建字母标记
        this.createElementLabel(element);
    }

    deselectElement(element) {
        this.selectedElements.delete(element);
        element.classList.remove('selected');
        element.style.opacity = '';
        
        // 移除字母标记
        this.removeElementLabel(element);
    }

    clearSelection() {
        this.selectedElements.forEach(element => {
            element.classList.remove('selected');
            element.style.opacity = '';
            this.removeElementLabel(element);
        });
        this.selectedElements.clear();
        this.labelCounter = 0; // 重置标记计数器
        this.updateSelectionDisplay();
    }

    clearTraceSelection() {
        if (this.selectedTrace) {
            this.selectedTrace.classList.remove('selected');
            this.selectedTrace = null;
        }
    }

    // 框选相关方法
    handleMouseDown(e) {
        if (!this.currentSvg || e.button !== 0) return; // 只处理左键
        // 仅在按住Command键时允许在元素上穿透框选
        if (!e.metaKey && e.target.closest('text, rect, circle, ellipse, line, polyline, polygon, path, g[id], g[class], image')) {
            return;
        }
        e.preventDefault();
        this.isSelecting = true;
        // 转换为SVG内部坐标
        const svgCoords = this.convertToSVGCoordinates(e.clientX, e.clientY);
        this.selectionStart = {
            x: svgCoords.x,
            y: svgCoords.y
        };
        // 初始化鼠标位置
        this.lastMousePos = {
            x: svgCoords.x,
            y: svgCoords.y
        };
        // 立即初始化结束点
        this.selectionEnd = { ...this.selectionStart };
        // 创建选择框
        if (!this.selectionBox) {
            this.createSelectionBox();
        }
        this.updateSelectionBox();
    }

    handleMouseMove(e) {
        // 移除长按等待和相关判断
        if (!this.isSelecting) return;
        e.preventDefault();
        
        // 转换为SVG内部坐标
        const svgCoords = this.convertToSVGCoordinates(e.clientX, e.clientY);
        
        // 如果按住空格键，则移动整个框选区域
        if (this.isMovingSelection && this.isSpacePressed) {
            if (this.lastMousePos.x !== 0 || this.lastMousePos.y !== 0) {
                const deltaX = svgCoords.x - this.lastMousePos.x;
                const deltaY = svgCoords.y - this.lastMousePos.y;
                
                // 移动框选的起始和结束点
                this.selectionStart.x += deltaX;
                this.selectionStart.y += deltaY;
                this.selectionEnd.x += deltaX;
                this.selectionEnd.y += deltaY;
            }
            this.lastMousePos = svgCoords;
        } else {
            // 正常的框选拖拽
            this.selectionEnd = svgCoords;
            this.lastMousePos = svgCoords;
        }
        
        // 如果还没有选择框，创建一个
        if (!this.selectionBox) {
            this.createSelectionBox();
        }
        
        // 更新选择框显示
        this.updateSelectionBox();
    }

    handleMouseUp(e) {
        // 移除长按计时器和提示
        if (!this.isSelecting) return;
        this.isSelecting = false;
        this.isLongPress = false;
        this.isMovingSelection = false;
        this.lastMousePos = { x: 0, y: 0 };
        if (!this.isSpacePressed) {
            document.body.style.cursor = '';
        }
        if (this.selectionBox) {
            this.selectElementsInBox();
            this.recordSelectionArea();
            this.createSelectionTrace();
            this.selectionBox.remove();
            this.selectionBox = null;
            this.updateSelectionDisplay();
        }
    }

    createSelectionBox() {
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.svgViewer.appendChild(this.selectionBox);
    }

    updateSelectionBox() {
        if (!this.selectionBox || !this.selectionEnd) return;
        
        // SVG坐标系中的框选区域
        const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        // 将SVG坐标转换为屏幕坐标来显示框选框
        try {
            const svgRect = this.currentSvg.getBoundingClientRect();
            const viewerRect = this.svgViewer.getBoundingClientRect();
            const ctm = this.currentSvg.getScreenCTM();
            
            // 转换起始点
            const startPoint = this.currentSvg.createSVGPoint();
            startPoint.x = left;
            startPoint.y = top;
            const screenStart = startPoint.matrixTransform(ctm);
            
            // 转换结束点
            const endPoint = this.currentSvg.createSVGPoint();
            endPoint.x = left + width;
            endPoint.y = top + height;
            const screenEnd = endPoint.matrixTransform(ctm);
            
            // 计算相对于viewer的位置
            const relativeLeft = screenStart.x - svgRect.left;
            const relativeTop = screenStart.y - svgRect.top;
            const relativeWidth = screenEnd.x - screenStart.x;
            const relativeHeight = screenEnd.y - screenStart.y;
            
            this.selectionBox.style.left = `${relativeLeft}px`;
            this.selectionBox.style.top = `${relativeTop}px`;
            this.selectionBox.style.width = `${relativeWidth}px`;
            this.selectionBox.style.height = `${relativeHeight}px`;
        } catch (e) {
            console.warn('框选框位置更新失败:', e);
        }
    }

    selectElementsInBox() {
        if (!this.currentSvg) return;
        
        // SVG坐标系中的框选区域
        const selectionRect = {
            left: Math.min(this.selectionStart.x, this.selectionEnd.x),
            top: Math.min(this.selectionStart.y, this.selectionEnd.y),
            right: Math.max(this.selectionStart.x, this.selectionEnd.x),
            bottom: Math.max(this.selectionStart.y, this.selectionEnd.y)
        };
        
        const selectableElements = this.currentSvg.querySelectorAll('text, rect, circle, ellipse, line, polyline, polygon, path, g[id], g[class]');
        
        selectableElements.forEach(element => {
            // 使用统一的测量方法获取元素在SVG坐标系中的位置
            const coords = this.measureSVGElement(element);
            
            const elementRect = {
                left: coords.x,
                top: coords.y,
                right: coords.x + coords.width,
                bottom: coords.y + coords.height
            };
            
            // 检查元素是否与选择框相交（都在SVG坐标系中）
            if (this.isRectIntersecting(selectionRect, elementRect)) {
                this.selectElement(element);
            }
        });
    }

    isRectIntersecting(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }

    recordSelectionArea() {
        const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        // 只记录有意义的选择区域（大于10px）
        if (width > 10 && height > 10) {
            // 坐标已经是SVG内部坐标，直接使用
            const svgLeft = Math.round(left);
            const svgTop = Math.round(top);
            const svgRight = Math.round(left + width);
            const svgBottom = Math.round(top + height);
            
            this.selectionAreas.push({
                id: Date.now(),
                left: svgLeft,
                top: svgTop,
                width: Math.round(width),
                height: Math.round(height),
                right: svgRight,
                bottom: svgBottom,
                centerX: Math.round(svgLeft + width / 2),
                centerY: Math.round(svgTop + height / 2),
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }

    // 长按提示相关方法
    showLongPressHint(clientX, clientY) {
        this.longPressHint = document.createElement('div');
        this.longPressHint.className = 'long-press-hint';
        this.longPressHint.textContent = '继续按住进行框选...';
        this.longPressHint.style.left = `${clientX}px`;
        this.longPressHint.style.top = `${clientY - 30}px`;
        document.body.appendChild(this.longPressHint);
    }

    hideLongPressHint() {
        if (this.longPressHint) {
            this.longPressHint.remove();
            this.longPressHint = null;
        }
    }

    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.hideLongPressHint();
        this.isLongPress = false;
    }

    // 创建保留的框选痕迹
    createSelectionTrace() {
        const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        // 只为有意义的选择区域创建痕迹（大于10px）
        if (width > 10 && height > 10) {
            // 将SVG坐标转换为屏幕坐标
            try {
                const svgRect = this.currentSvg.getBoundingClientRect();
                const ctm = this.currentSvg.getScreenCTM();
                
                // 转换起始点
                const startPoint = this.currentSvg.createSVGPoint();
                startPoint.x = left;
                startPoint.y = top;
                const screenStart = startPoint.matrixTransform(ctm);
                
                // 转换结束点
                const endPoint = this.currentSvg.createSVGPoint();
                endPoint.x = left + width;
                endPoint.y = top + height;
                const screenEnd = endPoint.matrixTransform(ctm);
                
                // 计算相对于SVG元素的位置
                const relativeLeft = screenStart.x - svgRect.left;
                const relativeTop = screenStart.y - svgRect.top;
                const relativeWidth = screenEnd.x - screenStart.x;
                const relativeHeight = screenEnd.y - screenStart.y;
                
            const trace = document.createElement('div');
            trace.className = 'selection-trace';
                trace.style.left = `${relativeLeft}px`;
                trace.style.top = `${relativeTop}px`;
                trace.style.width = `${relativeWidth}px`;
                trace.style.height = `${relativeHeight}px`;
            
            // 创建编号标签
            const number = document.createElement('div');
            number.className = 'selection-number';
            number.textContent = this.selectionTraces.length + 1;
            trace.appendChild(number);
            
            // 添加拖拽和点击事件
            this.attachTraceEvents(trace);
            
            // 添加到SVG查看器
            this.svgViewer.appendChild(trace);
            
                // 记录痕迹信息（保存SVG坐标用于数据显示）
            this.selectionTraces.push({
                id: Date.now(),
                element: trace,
                number: this.selectionTraces.length + 1,
                left: Math.round(left),
                top: Math.round(top),
                width: Math.round(width),
                height: Math.round(height),
                timestamp: new Date().toLocaleTimeString()
            });
            } catch (e) {
                console.warn('创建框选痕迹失败:', e);
            }
        }
    }

    // 为框选痕迹添加事件监听
    attachTraceEvents(trace) {
        // 点击选中
        trace.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTrace(trace);
        });

        // 拖拽开始
        trace.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 左键
                e.stopPropagation();
                this.startDragTrace(trace, e);
            }
        });
    }

    // 选中框选痕迹
    selectTrace(trace) {
        // 清除之前的选择
        if (this.selectedTrace) {
            this.selectedTrace.classList.remove('selected');
        }
        
        // 选中当前痕迹
        this.selectedTrace = trace;
        trace.classList.add('selected');
    }

    // 开始拖拽框选痕迹
    startDragTrace(trace, e) {
        this.isDraggingTrace = true;
        this.selectTrace(trace);
        trace.classList.add('dragging');
        
        const rect = this.svgViewer.getBoundingClientRect();
        const traceRect = trace.getBoundingClientRect();
        
        // 计算鼠标相对于痕迹的偏移
        this.dragOffset = {
            x: e.clientX - traceRect.left,
            y: e.clientY - traceRect.top
        };
        
        // 添加临时事件监听
        const handleMouseMove = (e) => {
            if (this.isDraggingTrace) {
                const newX = e.clientX - rect.left - this.dragOffset.x + this.svgViewer.scrollLeft;
                const newY = e.clientY - rect.top - this.dragOffset.y + this.svgViewer.scrollTop;
                
                trace.style.left = `${newX}px`;
                trace.style.top = `${newY}px`;
                
                // 更新数据 - 需要将屏幕坐标转换回SVG坐标
                const traceData = this.selectionTraces.find(t => t.element === trace);
                if (traceData) {
                    try {
                        // 将屏幕坐标转换为SVG坐标
                        const svgRect = this.currentSvg.getBoundingClientRect();
                        const ctm = this.currentSvg.getScreenCTM();
                        
                        // 计算屏幕上的绝对位置
                        const screenX = newX + svgRect.left;
                        const screenY = newY + svgRect.top;
                        
                        // 转换为SVG坐标
                        const point = this.currentSvg.createSVGPoint();
                        point.x = screenX;
                        point.y = screenY;
                        const svgPoint = point.matrixTransform(ctm.inverse());
                        
                        // 更新SVG坐标数据
                        const svgLeft = Math.round(svgPoint.x);
                        const svgTop = Math.round(svgPoint.y);
                        const svgRight = svgLeft + traceData.width;
                        const svgBottom = svgTop + traceData.height;
                        
                        traceData.left = svgLeft;
                        traceData.top = svgTop;
                        
                        // 同步更新 selectionAreas 数组中的对应数据
                        const areaIndex = this.selectionTraces.indexOf(traceData);
                        if (areaIndex !== -1 && this.selectionAreas[areaIndex]) {
                            this.selectionAreas[areaIndex].left = svgLeft;
                            this.selectionAreas[areaIndex].top = svgTop;
                            this.selectionAreas[areaIndex].right = svgRight;
                            this.selectionAreas[areaIndex].bottom = svgBottom;
                            this.selectionAreas[areaIndex].centerX = Math.round(svgLeft + traceData.width / 2);
                            this.selectionAreas[areaIndex].centerY = Math.round(svgTop + traceData.height / 2);
                        }
                    } catch (e) {
                        console.warn('更新拖拽坐标失败:', e);
                    }
                }
                
                // 更新显示信息
                this.displaySelectionAreasInfo();
            }
        };
        
        const handleMouseUp = () => {
            this.isDraggingTrace = false;
            trace.classList.remove('dragging');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // 删除选中的框选痕迹
    deleteSelectedTrace() {
        if (!this.selectedTrace) return;
        
        // 找到对应的数据索引
        const traceIndex = this.selectionTraces.findIndex(t => t.element === this.selectedTrace);
        
        if (traceIndex !== -1) {
            // 移除DOM元素
            this.selectedTrace.remove();
            
            // 从数据中移除
            this.selectionTraces.splice(traceIndex, 1);
            this.selectionAreas.splice(traceIndex, 1);
            
            // 重新编号
            this.reorderTraces();
            
            // 清除选择
            this.selectedTrace = null;
            
            // 更新显示
            this.displaySelectionAreasInfo();
        }
    }

    // 重新排序和编号
    reorderTraces() {
        this.selectionTraces.forEach((trace, index) => {
            const newNumber = index + 1;
            trace.number = newNumber;
            
            // 更新编号显示
            const numberElement = trace.element.querySelector('.selection-number');
            if (numberElement) {
                numberElement.textContent = newNumber;
            }
            
            // 更新对应的区域数据编号
            if (this.selectionAreas[index]) {
                this.selectionAreas[index].number = newNumber;
            }
        });
    }

    updateSelectionDisplay() {
        // 清空.selection-count区域
        if (this.selectionCount && this.selectionCount.parentNode) {
            this.selectionCount.parentNode.innerHTML = '';
            // 插入清空按钮
            const clearButton = document.createElement('button');
            clearButton.className = 'clear-selections-btn';
            clearButton.textContent = '清空所有框选';
            clearButton.addEventListener('click', () => {
                this.clearAllSelectionTraces();
            });
            this.selectionCount.parentNode.appendChild(clearButton);
        }
        this.displaySelectedElementsInfo();
        this.displaySelectionAreasInfo();
        this.calculateDistances();
    }

    displaySelectionAreasInfo() {
        this.selectionInfo.innerHTML = '';
        
        if (this.selectionAreas.length === 0) {
            return;
        }
        
        const title = document.createElement('div');
        title.className = 'selection-info-title';
        title.innerHTML = `📋 框选区域信息 (${this.selectionAreas.length}个区域)`;
        this.selectionInfo.appendChild(title);
        
        this.selectionAreas.forEach((area, index) => {
            const areaItem = document.createElement('div');
            areaItem.className = 'selection-area-item';
            areaItem.innerHTML = `
                <div><strong>区域 ${index + 1}</strong> <small>(${area.timestamp})</small></div>
                <div class="area-coords">
                    <div class="area-coord-item">
                        <span class="area-coord-label">起点:</span> (${area.left}, ${area.top})
                    </div>
                    <div class="area-coord-item">
                        <span class="area-coord-label">终点:</span> (${area.right}, ${area.bottom})
                    </div>
                    <div class="area-coord-item">
                        <span class="area-coord-label">宽度:</span> ${area.width}px
                    </div>
                    <div class="area-coord-item">
                        <span class="area-coord-label">高度:</span> ${area.height}px
                    </div>
                </div>
            `;
            this.selectionInfo.appendChild(areaItem);
        });
        
        // 添加清除按钮
        const clearButton = document.createElement('button');
        clearButton.className = 'clear-selections-btn';
        clearButton.textContent = '清空所有框选';
        clearButton.addEventListener('click', () => {
            this.clearAllSelectionTraces();
        });
        this.selectionInfo.appendChild(clearButton);
    }

    displaySelectedElementsInfo() {
        this.selectedElementsPanel.innerHTML = '';
        
        if (this.selectedElements.size === 0) {
            this.selectedElementsPanel.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">未选择任何元素</p>';
            return;
        }
        
        this.selectedElements.forEach((element, index) => {
            const elementInfo = this.createElementInfoCard(element, index);
            this.selectedElementsPanel.appendChild(elementInfo);
        });
    }

    createElementInfoCard(element, index) {
        const card = document.createElement('div');
        card.className = 'element-info';
        
        const tagName = element.tagName.toLowerCase();
        
        // 使用新的坐标系统：以SVG容器左上角为(0,0)原点
        const coords = this.convertElementToScreenCoordinates(element);
        const startX = Math.round(coords.x);
        const startY = Math.round(coords.y);
        const endX = Math.round(coords.x + coords.width);
        const endY = Math.round(coords.y + coords.height);
        
        card.innerHTML = `
            <div class="element-tag">${tagName}</div>
            <div class="element-coords">
                <div class="coord-item">
                    <span class="coord-label">起点:</span> (${startX}, ${startY})
                </div>
                <div class="coord-item">
                    <span class="coord-label">终点:</span> (${endX}, ${endY})
                </div>
                <div class="coord-item">
                    <span class="coord-label">宽度:</span> ${Math.round(coords.width)}px
                </div>
                <div class="coord-item">
                    <span class="coord-label">高度:</span> ${Math.round(coords.height)}px
                </div>
            </div>
        `;
        
        // 点击卡片时高亮对应元素
        card.addEventListener('click', () => {
            this.highlightElement(element);
        });
        
        return card;
    }

    getElementAttributes(element) {
        const attributes = [];
        const importantAttrs = ['id', 'class', 'fill', 'stroke', 'font-size', 'font-family'];
        
        importantAttrs.forEach(attr => {
            if (element.hasAttribute(attr)) {
                const value = element.getAttribute(attr);
                if (value) {
                    attributes.push(`<div class="coord-item"><span class="coord-label">${attr}:</span> ${value}</div>`);
                }
            }
        });
        
        if (element.textContent && element.textContent.trim()) {
            attributes.push(`<div class="coord-item"><span class="coord-label">文本:</span> ${element.textContent.trim()}</div>`);
        }
        
        return attributes.length > 0 ? `<div class="element-coords" style="margin-top: 8px;">${attributes.join('')}</div>` : '';
    }

    highlightElement(element) {
        // 临时高亮效果
        const originalFilter = element.style.filter;
        element.style.filter = 'drop-shadow(0 0 12px rgba(255, 68, 68, 0.8))';
        
        setTimeout(() => {
            element.style.filter = originalFilter;
        }, 1000);
    }

    // 统一的SVG元素测量方法
    // 所有SVG元素的测量都统一使用getBBox()方法
    getElementBoundingBox(element) {
        return this.measureSVGElement(element);
    }

    // 核心的SVG元素测量方法，统一使用getBBox()
    measureSVGElement(element) {
        if (!element) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        try {
            // 统一使用getBBox()方法获取SVG元素的边界框
            // getBBox()返回元素在SVG坐标系中的精确位置和尺寸
            // 这是SVG规范推荐的标准测量方法
            const bbox = element.getBBox();
            
            // 确保返回值的一致性
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height
            };
        } catch (e) {
            // 某些元素（如空的g元素、display:none的元素）可能无法使用getBBox()
            // 这种情况下返回零尺寸的边界框，保持测量方法的统一性
            console.warn('元素无法使用getBBox()，返回默认边界框:', element.tagName, e.message);
            return {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
        }
    }

    getElementCenter(element) {
        // 使用统一的测量方法获取元素中心点
        const bbox = this.measureSVGElement(element);
        return {
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2
        };
    }

    calculateDistances() {
        this.distanceInfo.innerHTML = '';
        
        if (this.selectedElements.size < 2) {
            return;
        }
        
        const title = document.createElement('div');
        title.className = 'distance-title';
        title.textContent = '元素间距信息';
        this.distanceInfo.appendChild(title);
        
        const elements = Array.from(this.selectedElements);
        const distances = [];
        
        // 计算所有元素对之间的距离（基于起点）
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const element1 = elements[i];
                const element2 = elements[j];
                
                // 使用统一的测量方法获取元素的起点坐标（左上角）
                const coords1 = this.measureSVGElement(element1);
                const coords2 = this.measureSVGElement(element2);
                
                // 计算水平和垂直距离
                const horizontalDistance = Math.abs(coords2.x - coords1.x);
                const verticalDistance = Math.abs(coords2.y - coords1.y);
                
                // 获取元素对应的字母标记
                const label1 = this.getElementLabel(element1);
                const label2 = this.getElementLabel(element2);
                
                distances.push({
                    element1: element1.tagName.toLowerCase(),
                    element2: element2.tagName.toLowerCase(),
                    horizontal: horizontalDistance,
                    vertical: verticalDistance,
                    label1: label1,
                    label2: label2
                });
            }
        }
        
        // 显示距离信息
        distances.forEach(dist => {
            const distanceItem = document.createElement('div');
            distanceItem.className = 'distance-item';
            distanceItem.innerHTML = `
                <div><strong>元素 ${dist.label1} ↔ 元素 ${dist.label2}</strong></div>
                <div>水平距离: <span class="distance-value">${Math.round(dist.horizontal)}px</span></div>
                <div>垂直距离: <span class="distance-value">${Math.round(dist.vertical)}px</span></div>
            `;
            this.distanceInfo.appendChild(distanceItem);
        });
        
        // 添加整体布局信息
        if (elements.length > 1) {
            const layoutInfo = this.calculateLayoutInfo(elements);
            const layoutItem = document.createElement('div');
            layoutItem.className = 'distance-item';
            layoutItem.style.background = '#e8f5e8';
            layoutItem.style.borderColor = '#4caf50';
            layoutItem.innerHTML = `
                <div><strong>📐 整体布局信息</strong></div>
                <div>总宽度: <span class="distance-value">${Math.round(layoutInfo.totalWidth)}px</span></div>
                <div>总高度: <span class="distance-value">${Math.round(layoutInfo.totalHeight)}px</span></div>
                <div>中心点: <span class="distance-value">(${Math.round(layoutInfo.centerX)}, ${Math.round(layoutInfo.centerY)})</span></div>
            `;
            this.distanceInfo.appendChild(layoutInfo);
        }
    }

    calculateLayoutInfo(elements) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        elements.forEach(element => {
            // 使用统一的测量方法计算布局信息
            const bbox = this.measureSVGElement(element);
            minX = Math.min(minX, bbox.x);
            minY = Math.min(minY, bbox.y);
            maxX = Math.max(maxX, bbox.x + bbox.width);
            maxY = Math.max(maxY, bbox.y + bbox.height);
        });
        
        return {
            totalWidth: maxX - minX,
            totalHeight: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
            minX, minY, maxX, maxY
        };
    }

    // 清除所有框选痕迹
    clearAllSelectionTraces() {
        // 移除所有痕迹元素
        this.selectionTraces.forEach(trace => {
            if (trace.element && trace.element.parentNode) {
                trace.element.remove();
            }
        });
        
        // 清空数据
        this.selectionTraces = [];
        this.selectionAreas = [];
        this.selectedTrace = null;
        
        // 更新显示
        this.displaySelectionAreasInfo();
    }

    // 更新画布信息
    updateCanvasInfo() {
        if (!this.currentSvg) {
            this.canvasSize.textContent = '未加载';
            this.viewBox.textContent = '未设置';
            return;
        }

        // 获取SVG尺寸
        const width = this.currentSvg.getAttribute('width') || this.currentSvg.viewBox.baseVal.width || '未知';
        const height = this.currentSvg.getAttribute('height') || this.currentSvg.viewBox.baseVal.height || '未知';
        this.canvasSize.textContent = `${width} × ${height}`;

        // 获取viewBox信息
        const viewBox = this.currentSvg.getAttribute('viewBox');
        if (viewBox) {
            this.viewBox.textContent = viewBox;
        } else {
            this.viewBox.textContent = '未设置';
        }
    }

    // 更新鼠标位置信息
    updateMousePosition(e) {
        if (!this.currentSvg) return;

        // 转换为SVG内部坐标，与元素位置计算方式保持一致
        const svgCoords = this.convertToSVGCoordinates(e.clientX, e.clientY);
        this.mousePosition.textContent = `(${Math.round(svgCoords.x)}, ${Math.round(svgCoords.y)})`;
    }

    // 清除鼠标位置信息
    clearMousePosition() {
        this.mousePosition.textContent = '-';
        this.svgCoordinate.textContent = '-';
    }

    // 将屏幕坐标转换为SVG内部坐标系
    convertToSVGCoordinates(clientX, clientY) {
        if (!this.currentSvg) {
            return { x: clientX, y: clientY };
        }

        try {
            // 创建SVG点
            const point = this.currentSvg.createSVGPoint();
            point.x = clientX;
            point.y = clientY;
            
            // 通过逆变换矩阵转换为SVG坐标系
            const svgPoint = point.matrixTransform(this.currentSvg.getScreenCTM().inverse());
            
            return { x: svgPoint.x, y: svgPoint.y };
        } catch (e) {
            console.warn('坐标转换失败:', e);
            return { x: clientX, y: clientY };
        }
    }

    // 获取元素在SVG内部坐标系中的位置和尺寸
    // 统一使用getBBox()方法确保所有测量的一致性
    convertElementToScreenCoordinates(element) {
        if (!this.currentSvg || !element) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        // 使用统一的测量方法，确保所有元素测量的一致性
        return this.measureSVGElement(element);
    }

    // 创建元素标记
    createElementLabel(element) {
        // 如果元素已经有标记，先移除
        if (this.elementLabels.has(element)) {
            this.removeElementLabel(element);
        }

        // 生成字母标记（a, b, c, d...）
        const letter = String.fromCharCode(97 + this.labelCounter); // 97是'a'的ASCII码
        this.labelCounter++;

        // 创建标记元素
        const label = document.createElement('div');
        label.className = 'element-label';
        label.textContent = letter;

        // 计算标记位置（元素左上角）
        this.updateLabelPosition(label, element);

        // 添加到SVG查看器
        this.svgViewer.appendChild(label);

        // 存储标记映射关系
        this.elementLabels.set(element, label);
    }

    // 移除元素标记
    removeElementLabel(element) {
        const label = this.elementLabels.get(element);
        if (label) {
            label.remove();
            this.elementLabels.delete(element);
        }
    }

    // 更新标记位置
    updateLabelPosition(label, element) {
        // 使用统一的测量方法获取元素位置
        const coords = this.measureSVGElement(element);
        
        try {
            // 将SVG坐标转换为屏幕坐标
            const point = this.currentSvg.createSVGPoint();
            point.x = coords.x;
            point.y = coords.y;
            const screenPoint = point.matrixTransform(this.currentSvg.getScreenCTM());
            
            const svgRect = this.currentSvg.getBoundingClientRect();
            const viewerRect = this.svgViewer.getBoundingClientRect();
            
            // 设置标记位置为元素左上角
            const labelX = screenPoint.x - svgRect.left + viewerRect.left - this.svgViewer.scrollLeft;
            const labelY = screenPoint.y - svgRect.top + viewerRect.top - this.svgViewer.scrollTop;
            
            label.style.left = `${labelX}px`;
            label.style.top = `${labelY}px`;
        } catch (e) {
            console.warn('标记位置更新失败:', e);
        }
    }

    // 更新所有标记位置（在SVG缩放或滚动时调用）
    updateAllLabelPositions() {
        this.elementLabels.forEach((label, element) => {
            this.updateLabelPosition(label, element);
        });
    }

    // 获取元素对应的字母标记
    getElementLabel(element) {
        const label = this.elementLabels.get(element);
        return label ? label.textContent : '?';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new SVGElementSelector();
});

// 防止默认的拖拽行为
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault()); 