/**
 * 🧪 Lucaverse Test Studio JavaScript Controller
 * Professional test runner with advanced monitoring, queue management, and analytics
 */

class TestStudio {
    constructor() {
        this.socket = null;
        this.startTime = null;
        this.timerInterval = null;
        this.tests = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            current: null
        };
        this.testResults = [];
        this.testQueue = [];
        this.testProfiles = new Map();
        this.performanceMetrics = {
            speed: [],
            memory: [],
            errorRate: [],
            timestamps: []
        };
        this.isRunning = false;
        this.currentTab = 'execution';
        this.filteredResults = [];
        
        // Chromium integration properties
        this.chromiumStatus = {
            isRunning: false,
            guiTabId: null,
            testTabsCount: 0,
            debugPort: 9223
        };
        this.chromiumMetrics = {
            tabsCreated: 0,
            tabsClosed: 0,
            connectionAttempts: 0
        };
        
        this.initializeElements();
        this.bindEventListeners();
        this.initializeWebSocket();
        this.loadTestProfiles();
        this.initializeKeyboardShortcuts();
        this.initializeCollapsibleSections(); // Add collapsible sections
        this.initializeChromiumIntegration(); // Add Chromium integration
        this.logMessage('Test studio initialized with enhanced sidebar', 'info');
    }

    initializeElements() {
        // Status elements
        this.statusBadge = document.getElementById('status-badge');
        this.timeIndicator = document.getElementById('time-indicator');
        
        // Chrome status elements
        this.chromeStatusIndicator = document.getElementById('chrome-status-indicator');
        this.chromeStatusText = document.getElementById('chrome-status-text');
        this.chromeTabsCount = document.getElementById('chrome-tabs-count');
        
        // Control elements
        this.startBtn = document.getElementById('start-tests');
        this.stopBtn = document.getElementById('stop-tests');
        this.clearBtn = document.getElementById('clear-results');
        this.exportBtn = document.getElementById('export-report');
        this.addToQueueBtn = document.getElementById('add-to-queue');
        
        // Progress elements
        this.totalTests = document.getElementById('total-tests');
        this.passedTests = document.getElementById('passed-tests');
        this.failedTests = document.getElementById('failed-tests');
        this.skippedTests = document.getElementById('skipped-tests');
        this.progressRing = document.getElementById('progress-ring');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.progressText = document.getElementById('progress-text');
        this.progressEta = document.getElementById('progress-eta');
        
        // Test execution elements
        this.currentTest = document.getElementById('current-test');
        this.currentTestName = document.getElementById('current-test-name');
        this.currentEta = document.getElementById('current-eta');
        this.testResults = document.getElementById('test-results');
        
        // Logs elements
        this.logsContent = document.getElementById('logs-content');
        this.clearLogsBtn = document.getElementById('clear-logs');
        this.downloadLogsBtn = document.getElementById('download-logs');
        this.logLevelFilter = document.getElementById('log-level-filter');
        
        // Profile elements
        this.testProfiles = document.getElementById('test-profiles');
        this.saveProfileBtn = document.getElementById('save-profile');
        this.manageProfilesBtn = document.getElementById('manage-profiles');
        
        // Filter elements
        this.testSearch = document.getElementById('test-search');
        this.priorityFilter = document.getElementById('priority-filter');
        this.statusFilter = document.getElementById('status-filter');
        
        // Queue elements
        this.queueList = document.getElementById('queue-list');
        
        // Performance metrics
        this.avgSpeed = document.getElementById('avg-speed');
        this.memoryUsage = document.getElementById('memory-usage');
        this.errorRate = document.getElementById('error-rate');
        
        // Final report elements
        this.finalReport = document.getElementById('final-report');
        this.reportTimestamp = document.getElementById('report-timestamp');
        this.reportContent = document.getElementById('report-content');
        
        // Test suite checkboxes
        this.testSuites = {
            unit: document.getElementById('unit-tests'),
            gui: document.getElementById('gui-tests'),
            integration: document.getElementById('integration-tests'),
            oauth: document.getElementById('oauth-tests')
        };
        
        // Tab elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Shortcuts help
        this.shortcutsHelp = document.getElementById('shortcuts-help');
    }

    bindEventListeners() {
        // Control buttons
        this.startBtn.addEventListener('click', () => this.startTests());
        this.stopBtn.addEventListener('click', () => this.stopTests());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        this.exportBtn.addEventListener('click', () => this.exportReport());
        this.addToQueueBtn.addEventListener('click', () => this.addToQueue());
        
        // Profile management
        this.saveProfileBtn.addEventListener('click', () => this.saveCurrentProfile());
        this.testProfiles.addEventListener('change', (e) => this.loadProfile(e.target.value));
        
        // Logs controls
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        this.downloadLogsBtn.addEventListener('click', () => this.downloadLogs());
        this.logLevelFilter.addEventListener('change', (e) => this.filterLogs(e.target.value));
        
        // Search and filters
        this.testSearch.addEventListener('input', (e) => this.filterTestResults(e.target.value));
        this.priorityFilter.addEventListener('change', (e) => this.filterByPriority(e.target.value));
        
        // Add status filter if it exists
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', (e) => this.filterByStatus(e.target.value));
        }
        
        // Tab navigation
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Result filters
        const filterButtons = document.querySelectorAll('.results-controls .btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.id.replace('filter-', '');
                this.filterResultsByStatus(filter);
            });
        });
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check for modifier keys
            const isCtrl = e.ctrlKey || e.metaKey;
            
            if (isCtrl) {
                switch(e.key.toLowerCase()) {
                    case 'r':
                        e.preventDefault();
                        this.startTests();
                        break;
                    case 's':
                        e.preventDefault();
                        this.stopTests();
                        break;
                    case 'l':
                        e.preventDefault();
                        this.switchTab('logs');
                        break;
                    case 'f':
                        e.preventDefault();
                        this.testSearch.focus();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportReport();
                        break;
                    case 'q':
                        e.preventDefault();
                        this.addToQueue();
                        break;
                    case '1':
                        e.preventDefault();
                        this.switchTab('execution');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('logs');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('analytics');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchTab('history');
                        break;
                    case '[':
                        e.preventDefault();
                        this.collapseAllSections();
                        break;
                    case ']':
                        e.preventDefault();
                        this.expandAllSections();
                        break;
                }
            } else {
                switch(e.key) {
                    case 'F1':
                        e.preventDefault();
                        this.toggleShortcutsHelp();
                        break;
                    case 'Escape':
                        this.closeModals();
                        break;
                }
            }
        });
    }

    /**
     * Initialize collapsible sidebar sections
     */
    initializeCollapsibleSections() {
        // Get all collapsible sections
        const collapsibleSections = document.querySelectorAll('.sidebar-section.collapsible');
        
        // Load collapsed state from localStorage
        const collapsedSections = JSON.parse(localStorage.getItem('collapsedSections') || '[]');
        
        collapsibleSections.forEach(section => {
            const header = section.querySelector('.section-header');
            const collapseBtn = section.querySelector('.collapse-btn');
            const sectionId = header.dataset.section;
            
            // Apply saved collapsed state
            if (collapsedSections.includes(sectionId)) {
                this.toggleSectionCollapse(section, true);
            }
            
            // Add click event listeners
            if (header && collapseBtn) {
                const toggleCollapse = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleSectionCollapse(section);
                    this.saveSectionStates();
                };
                
                header.addEventListener('click', toggleCollapse);
                collapseBtn.addEventListener('click', toggleCollapse);
            }
        });
        
        this.logMessage('Collapsible sections initialized', 'info');
    }

    /**
     * Toggle collapse state of a sidebar section
     */
    toggleSectionCollapse(section, forceCollapse = null) {
        const isCurrentlyCollapsed = section.classList.contains('collapsed');
        const shouldCollapse = forceCollapse !== null ? forceCollapse : !isCurrentlyCollapsed;
        
        if (shouldCollapse) {
            section.classList.add('collapsed');
        } else {
            section.classList.remove('collapsed');
        }
        
        // Log the action
        const sectionName = section.querySelector('h3').textContent;
        const action = shouldCollapse ? 'collapsed' : 'expanded';
        this.logMessage(`Section '${sectionName}' ${action}`, 'info');
    }

    /**
     * Save the current collapsed state of all sections
     */
    saveSectionStates() {
        const collapsedSections = [];
        const collapsibleSections = document.querySelectorAll('.sidebar-section.collapsible');
        
        collapsibleSections.forEach(section => {
            const header = section.querySelector('.section-header');
            const sectionId = header.dataset.section;
            
            if (section.classList.contains('collapsed')) {
                collapsedSections.push(sectionId);
            }
        });
        
        localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
    }

    /**
     * Expand all collapsed sections
     */
    expandAllSections() {
        const collapsibleSections = document.querySelectorAll('.sidebar-section.collapsible.collapsed');
        collapsibleSections.forEach(section => {
            this.toggleSectionCollapse(section, false);
        });
        this.saveSectionStates();
        this.logMessage('All sections expanded', 'info');
    }

    /**
     * Collapse all sections
     */
    collapseAllSections() {
        const collapsibleSections = document.querySelectorAll('.sidebar-section.collapsible:not(.collapsed)');
        collapsibleSections.forEach(section => {
            this.toggleSectionCollapse(section, true);
        });
        this.saveSectionStates();
        this.logMessage('All sections collapsed', 'info');
    }

    initializeWebSocket() {
        try {
            this.socket = new WebSocket('ws://localhost:8090');
            
            this.socket.onopen = () => {
                this.logMessage('Connected to test studio server', 'success');
            };
            
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleSocketMessage(data);
            };
            
            this.socket.onclose = () => {
                this.logMessage('Disconnected from test studio server', 'warning');
                setTimeout(() => this.initializeWebSocket(), 3000);
            };
            
            this.socket.onerror = (error) => {
                this.logMessage('WebSocket error: ' + error.message, 'error');
            };
        } catch (error) {
            this.logMessage('Failed to connect to test server. Running in standalone mode.', 'warning');
        }
    }

    handleSocketMessage(data) {
        switch (data.type) {
            case 'test-start':
                this.handleTestStart(data);
                break;
            case 'test-complete':
                this.handleTestComplete(data);
                break;
            case 'test-suite-start':
                this.handleTestSuiteStart(data);
                break;
            case 'test-suite-complete':
                this.handleTestSuiteComplete(data);
                break;
            case 'log':
                this.logMessage(data.message, data.level);
                break;
            case 'progress':
                this.updateProgress(data);
                break;
            case 'final-report':
                this.showFinalReport(data);
                break;
            case 'chromium':
                this.handleChromiumMessage(data);
                break;
        }
    }

    // Tab Management
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab contents
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // Special handling for specific tabs
        if (tabName === 'analytics') {
            this.updateAnalytics();
        }
        
        this.logMessage(`Switched to ${tabName} view`, 'info');
    }

    // Profile Management
    saveCurrentProfile() {
        const profileName = prompt('Enter profile name:');
        if (profileName) {
            const profile = {
                suites: this.getSelectedTestSuites(),
                priority: this.priorityFilter.value,
                search: this.testSearch.value,
                timestamp: new Date().toISOString()
            };
            
            this.testProfiles.set(profileName, profile);
            this.saveProfilesToStorage();
            this.updateProfileSelector();
            this.logMessage(`Profile '${profileName}' saved`, 'success');
        }
    }

    loadProfile(profileName) {
        if (!profileName) return;
        
        const profile = this.testProfiles.get(profileName);
        if (profile) {
            // Apply suite selections
            Object.keys(this.testSuites).forEach(suite => {
                this.testSuites[suite].checked = profile.suites.includes(suite);
            });
            
            // Apply filters
            this.priorityFilter.value = profile.priority || 'all';
            this.testSearch.value = profile.search || '';
            
            this.logMessage(`Profile '${profileName}' loaded`, 'success');
        }
    }

    loadTestProfiles() {
        const stored = localStorage.getItem('testStudioProfiles');
        if (stored) {
            this.testProfiles = new Map(JSON.parse(stored));
            this.updateProfileSelector();
        }
    }

    saveProfilesToStorage() {
        localStorage.setItem('testStudioProfiles', JSON.stringify([...this.testProfiles]));
    }

    updateProfileSelector() {
        // Clear existing options except default
        const defaultOptions = this.testProfiles.querySelectorAll('option[value=""], option[value="smoke"], option[value="regression"], option[value="critical"]');
        this.testProfiles.innerHTML = '';
        defaultOptions.forEach(option => this.testProfiles.appendChild(option));
        
        // Add custom profiles
        this.testProfiles.forEach((profile, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.testProfiles.appendChild(option);
        });
    }

    // Queue Management
    addToQueue() {
        const selectedSuites = this.getSelectedTestSuites();
        if (selectedSuites.length === 0) {
            this.logMessage('No test suites selected for queue', 'warning');
            return;
        }
        
        const queueItem = {
            id: Date.now(),
            name: `${selectedSuites.join(' + ')} Tests`,
            suites: selectedSuites,
            estimatedDuration: this.estimateTestDuration(selectedSuites),
            priority: this.priorityFilter.value,
            timestamp: new Date()
        };
        
        this.testQueue.push(queueItem);
        this.updateQueueDisplay();
        this.logMessage(`Added test configuration to queue`, 'info');
    }

    updateQueueDisplay() {
        if (this.testQueue.length === 0) {
            this.queueList.innerHTML = `
                <div class="queue-empty">
                    <span class="empty-icon">📝</span>
                    <span class="empty-text">No queued tests</span>
                </div>
            `;
            return;
        }
        
        this.queueList.innerHTML = this.testQueue.map((item, index) => `
            <div class="queue-item" data-index="${index}">
                <div class="queue-info">
                    <div class="queue-name">${item.name}</div>
                    <div class="queue-details">Est. ${this.formatDuration(item.estimatedDuration)}</div>
                </div>
                <div class="queue-actions">
                    <button class="btn btn-icon" onclick="testStudio.removeFromQueue(${index})" title="Remove">✕</button>
                </div>
            </div>
        `).join('');
    }

    removeFromQueue(index) {
        this.testQueue.splice(index, 1);
        this.updateQueueDisplay();
        this.logMessage('Removed item from queue', 'info');
    }

    estimateTestDuration(suites) {
        const durations = { unit: 5000, gui: 30000, integration: 15000, oauth: 20000 };
        return suites.reduce((total, suite) => total + (durations[suite] || 5000), 0);
    }

    // Performance Monitoring
    updatePerformanceMetrics(testData) {
        const now = Date.now();
        const speed = testData.duration;
        const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
        const errorRate = this.tests.total > 0 ? Math.round((this.tests.failed / this.tests.total) * 100) : 0;

        this.performanceMetrics.speed.push(speed);
        this.performanceMetrics.memory.push(memory);
        this.performanceMetrics.errorRate.push(errorRate);
        this.performanceMetrics.timestamps.push(now);

        // Keep only last 50 data points
        if (this.performanceMetrics.speed.length > 50) {
            Object.keys(this.performanceMetrics).forEach(key => {
                this.performanceMetrics[key].shift();
            });
        }

        this.updatePerformanceDisplay();
    }

    updatePerformanceDisplay() {
        const avgSpeed = this.calculateAverage(this.performanceMetrics.speed);
        const currentMemory = this.performanceMetrics.memory[this.performanceMetrics.memory.length - 1] || 0;
        const currentErrorRate = this.performanceMetrics.errorRate[this.performanceMetrics.errorRate.length - 1] || 0;
        
        this.avgSpeed.textContent = avgSpeed ? `${Math.round(avgSpeed)}ms` : '0ms';
        this.memoryUsage.textContent = `${currentMemory}MB`;
        this.errorRate.textContent = `${currentErrorRate}%`;
        
        // Mini charts removed since performance metrics moved to header
        // Performance data is now displayed in the main header area
    }

    updateMiniChart(chartId, data) {
        // Mini charts removed - performance metrics now in header
        // This function is kept for compatibility but does nothing
        return;
    }

    calculateAverage(arr) {
        return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }

    // Test Execution
    startTests() {
        if (this.isRunning) return;
        
        const selectedSuites = this.getSelectedTestSuites();
        if (selectedSuites.length === 0) {
            this.logMessage('No test suites selected!', 'error');
            return;
        }
        
        this.isRunning = true;
        this.startTime = new Date();
        this.clearResults();
        
        // Update UI state
        this.updateStatus('running', '🏃‍♂️ Running');
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        
        // Start timer
        this.startTimer();
        
        // Switch to execution tab
        this.switchTab('execution');
        
        // Log start
        this.logMessage(`Starting test execution for suites: ${selectedSuites.join(', ')}`, 'info');
        
        // Send command to server or simulate locally
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'start-tests',
                suites: selectedSuites
            }));
        } else {
            this.simulateTestRun(selectedSuites);
        }
    }

    stopTests() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.updateStatus('stopped', '⏹️ Stopped');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.stopTimer();
        
        this.logMessage('Test execution stopped by user', 'warning');
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'stop-tests' }));
        }
    }

    clearResults() {
        this.tests = { total: 0, passed: 0, failed: 0, skipped: 0, current: null };
        this.testResults = [];
        this.filteredResults = [];
        
        // Reset UI
        this.updateTestCounts();
        this.updateProgress({ completed: 0, total: 0 });
        this.currentTest.style.display = 'none';
        this.finalReport.style.display = 'none';
        
        // Clear test results display
        this.testResults.innerHTML = `
            <div class="no-tests">
                <span class="no-tests-icon">🏁</span>
                <span class="no-tests-text">No tests executed yet</span>
            </div>
        `;
        
        this.logMessage('Test results cleared', 'info');
    }

    // Filtering and Search
    filterTestResults(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredResults = [...this.testResults];
        } else {
            this.filteredResults = this.testResults.filter(result =>
                result.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (result.error && result.error.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        this.updateTestResultsDisplay();
    }

    filterResultsByStatus(status) {
        if (status === 'all') {
            this.filteredResults = [...this.testResults];
        } else {
            this.filteredResults = this.testResults.filter(result => result.status === status);
        }
        this.updateTestResultsDisplay();
        
        // Update button states
        document.querySelectorAll('.results-controls .btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `filter-${status}`);
        });
    }

    filterByPriority(priority) {
        this.logMessage(`Filtering by priority: ${priority}`, 'info');
        // This would integrate with test metadata if available
    }

    filterByStatus(status) {
        this.logMessage(`Filtering by status: ${status}`, 'info');
        // This would integrate with test metadata if available
    }

    updateTestResultsDisplay() {
        const results = this.filteredResults.length > 0 ? this.filteredResults : this.testResults;
        
        if (results.length === 0) {
            this.testResults.innerHTML = `
                <div class="no-tests">
                    <span class="no-tests-icon">🏁</span>
                    <span class="no-tests-text">No matching tests found</span>
                </div>
            `;
            return;
        }
        
        this.testResults.innerHTML = results.map(result => this.createTestResultHTML(result)).join('');
    }

    createTestResultHTML(result) {
        const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
        const statusClass = result.status;
        
        return `
            <div class="test-result-item ${statusClass}">
                <div class="test-result-icon">${icon}</div>
                <div class="test-result-content">
                    <div class="test-result-name">${result.name}</div>
                    <div class="test-result-details">${result.error || 'Test completed successfully'}</div>
                </div>
                <div class="test-result-time">${result.duration}ms</div>
            </div>
        `;
    }

    // Logging
    logMessage(message, level = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${level}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-level">${level.toUpperCase()}</span>
            <span class="log-message">${message}</span>
        `;
        
        this.logsContent.appendChild(logEntry);
        this.logsContent.scrollTop = this.logsContent.scrollHeight;
        
        // Apply log level filter
        const currentFilter = this.logLevelFilter.value;
        if (currentFilter !== 'all' && level !== currentFilter) {
            logEntry.style.display = 'none';
        }
    }

    clearLogs() {
        this.logsContent.innerHTML = '';
        this.logMessage('Logs cleared', 'info');
    }

    downloadLogs() {
        const logs = Array.from(this.logsContent.children).map(entry => entry.textContent).join('\n');
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.logMessage('Logs downloaded', 'success');
    }

    filterLogs(level) {
        const entries = this.logsContent.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            const entryLevel = entry.classList[1]; // Second class is the level
            entry.style.display = (level === 'all' || entryLevel === level) ? 'block' : 'none';
        });
    }

    // Utility methods
    getSelectedTestSuites() {
        const selected = [];
        for (const [key, checkbox] of Object.entries(this.testSuites)) {
            if (checkbox.checked) {
                selected.push(key);
            }
        }
        return selected;
    }

    updateStatus(status, text) {
        const statusIcon = this.statusBadge.querySelector('.status-icon');
        const statusText = this.statusBadge.querySelector('.status-text');
        
        statusIcon.textContent = text.split(' ')[0];
        statusText.textContent = text.split(' ').slice(1).join(' ');
        
        this.statusBadge.className = `status-badge ${status}`;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = new Date() - this.startTime;
            const timeText = this.formatTime(elapsed);
            this.timeIndicator.querySelector('.time-text').textContent = timeText;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        return [hours, minutes % 60, seconds % 60]
            .map(val => val.toString().padStart(2, '0'))
            .join(':');
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    }

    updateProgress(data) {
        const percentage = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        
        // Update circular progress ring
        const degrees = (percentage / 100) * 360;
        this.progressRing.style.background = `conic-gradient(var(--success) ${degrees}deg, var(--border-light) ${degrees}deg)`;
        this.progressPercentage.textContent = `${percentage}%`;
        
        // Update progress text and ETA
        this.progressText.textContent = `${percentage}% Complete (${data.completed}/${data.total})`;
        
        if (data.completed > 0 && this.startTime) {
            const elapsed = new Date() - this.startTime;
            const avgTimePerTest = elapsed / data.completed;
            const remainingTests = data.total - data.completed;
            const etaMs = avgTimePerTest * remainingTests;
            this.progressEta.textContent = `ETA: ${this.formatDuration(etaMs)}`;
        }
    }

    updateTestCounts() {
        this.totalTests.textContent = this.tests.total;
        this.passedTests.textContent = this.tests.passed;
        this.failedTests.textContent = this.tests.failed;
        this.skippedTests.textContent = this.tests.skipped;
    }

    // Test event handlers
    handleTestStart(data) {
        this.tests.current = data.testName;
        this.currentTestName.textContent = data.testName;
        this.currentTest.style.display = 'block';
        
        // Estimate current test duration
        const avgDuration = this.calculateAverage(this.performanceMetrics.speed) || 2000;
        this.currentEta.textContent = `Estimated: ${this.formatDuration(avgDuration)}`;
        
        this.logMessage(`Starting: ${data.testName}`, 'info');
    }

    handleTestComplete(data) {
        const { testName, status, duration, error } = data;
        
        // Update counts
        this.tests.total++;
        this.tests[status]++;
        
        // Add to results
        const result = {
            name: testName,
            status,
            duration,
            error,
            timestamp: new Date()
        };
        
        this.testResults.push(result);
        this.filteredResults.push(result);
        
        // Update performance metrics
        this.updatePerformanceMetrics({ duration });
        
        // Update UI
        this.updateTestCounts();
        this.addTestResultToUI(data);
        
        // Log completion
        const statusEmoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
        this.logMessage(`${statusEmoji} ${testName} (${duration}ms)`, status === 'passed' ? 'success' : status === 'failed' ? 'error' : 'warning');
        
        if (error) {
            this.logMessage(`   Error: ${error}`, 'error');
        }
    }

    handleTestSuiteStart(data) {
        this.logMessage(`📦 Starting test suite: ${data.suiteName}`, 'info');
    }

    handleTestSuiteComplete(data) {
        this.logMessage(`📦 Completed test suite: ${data.suiteName} (${data.duration}ms)`, 'success');
    }

    addTestResultToUI(data) {
        // Clear "no tests" message if it exists
        if (this.testResults.querySelector('.no-tests')) {
            this.testResults.innerHTML = '';
        }
        
        const resultItem = document.createElement('div');
        resultItem.className = `test-result-item ${data.status}`;
        
        const icon = data.status === 'passed' ? '✅' : data.status === 'failed' ? '❌' : '⏭️';
        
        resultItem.innerHTML = `
            <div class="test-result-icon">${icon}</div>
            <div class="test-result-content">
                <div class="test-result-name">${data.testName}</div>
                <div class="test-result-details">${data.error || 'Test completed successfully'}</div>
            </div>
            <div class="test-result-time">${data.duration}ms</div>
        `;
        
        this.testResults.appendChild(resultItem);
        this.testResults.scrollTop = this.testResults.scrollHeight;
    }

    showFinalReport(data) {
        this.isRunning = false;
        this.updateStatus('completed', '✅ Completed');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.stopTimer();
        this.currentTest.style.display = 'none';
        
        // Show final report
        this.reportTimestamp.textContent = `Generated on ${new Date().toLocaleString()}`;
        this.reportContent.innerHTML = this.generateReportHTML(data);
        this.finalReport.style.display = 'block';
        
        this.logMessage('Test execution completed', 'success');
    }

    generateReportHTML(data) {
        const duration = this.formatTime(new Date() - this.startTime);
        const successRate = this.tests.total > 0 ? Math.round((this.tests.passed / this.tests.total) * 100) : 0;
        
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${this.tests.passed}</div>
                    <div>Tests Passed</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--error);">${this.tests.failed}</div>
                    <div>Tests Failed</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--warning);">${this.tests.skipped}</div>
                    <div>Tests Skipped</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--info);">${duration}</div>
                    <div>Total Duration</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: var(--accent-blue);">${successRate}%</div>
                    <div>Success Rate</div>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <h4>Test Summary</h4>
                <p>Executed ${this.tests.total} tests in ${duration} with a ${successRate}% success rate.</p>
                ${this.tests.failed > 0 ? `<p style="color: var(--error);">⚠️ ${this.tests.failed} test(s) failed - review the logs for details.</p>` : ''}
                ${this.tests.skipped > 0 ? `<p style="color: var(--warning);">ℹ️ ${this.tests.skipped} test(s) were skipped.</p>` : ''}
            </div>
        `;
    }

    exportReport() {
        const report = this.generateDetailedReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.logMessage('Test report exported', 'success');
    }

    generateDetailedReport() {
        return {
            timestamp: new Date().toISOString(),
            duration: new Date() - this.startTime,
            summary: {
                total: this.tests.total,
                passed: this.tests.passed,
                failed: this.tests.failed,
                skipped: this.tests.skipped,
                successRate: this.tests.total > 0 ? (this.tests.passed / this.tests.total) * 100 : 0
            },
            results: this.testResults,
            performance: {
                avgSpeed: this.calculateAverage(this.performanceMetrics.speed),
                peakMemory: Math.max(...this.performanceMetrics.memory, 0),
                errorRate: this.tests.total > 0 ? (this.tests.failed / this.tests.total) * 100 : 0
            },
            environment: {
                userAgent: navigator.userAgent,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                timestamp: new Date().toISOString()
            }
        };
    }

    updateAnalytics() {
        // Placeholder for analytics charts
        // In a real implementation, this would use Chart.js or similar
        const charts = document.querySelectorAll('.chart-container canvas');
        charts.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'var(--text-muted)';
            ctx.font = '14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Chart placeholder', canvas.width / 2, canvas.height / 2);
        });
    }

    toggleShortcutsHelp() {
        const isVisible = this.shortcutsHelp.style.display !== 'none';
        this.shortcutsHelp.style.display = isVisible ? 'none' : 'flex';
    }

    closeModals() {
        this.shortcutsHelp.style.display = 'none';
    }

    // Simulate test run for standalone mode
    simulateTestRun(selectedSuites) {
        const mockTests = {
            unit: ['Header.test.jsx', 'Contact.test.jsx', 'Button.test.jsx', 'Modal.test.jsx', 'Form.test.jsx'],
            gui: ['navigation.spec.js', 'contact-form.spec.js', 'oauth-auth.spec.js', 'responsive.spec.js'],
            integration: ['form-submission.spec.js', 'auth-journey.spec.js', 'user-flow.spec.js'],
            oauth: ['google-oauth.spec.js', 'auth-security.spec.js', 'popup-handling.spec.js']
        };
        
        let allTests = [];
        selectedSuites.forEach(suite => {
            if (mockTests[suite]) {
                allTests = allTests.concat(mockTests[suite].map(test => ({ suite, test })));
            }
        });
        
        let currentIndex = 0;
        
        const runNextTest = () => {
            if (currentIndex >= allTests.length || !this.isRunning) {
                this.showFinalReport({});
                return;
            }
            
            const { suite, test } = allTests[currentIndex];
            const testName = `${suite}/${test}`;
            
            this.handleTestStart({ testName });
            this.updateProgress({ completed: currentIndex, total: allTests.length });
            
            // Simulate test execution
            setTimeout(() => {
                const status = Math.random() > 0.15 ? 'passed' : 'failed'; // 85% pass rate
                const duration = Math.floor(Math.random() * 3000) + 500; // 500-3500ms
                const error = status === 'failed' ? `Simulated test failure in ${testName}` : null;
                
                this.handleTestComplete({ testName, status, duration, error });
                
                currentIndex++;
                setTimeout(runNextTest, 200); // Small delay between tests
            }, Math.floor(Math.random() * 1500) + 500);
        };
        
        runNextTest();
    }

    /**
     * Initialize Chromium integration features
     */
    initializeChromiumIntegration() {
        // Initialize Chrome status display
        this.initializeChromeStatusDisplay();
        
        // Check Chromium status on startup
        this.checkChromiumStatus();
        
        // Periodically check Chromium status
        setInterval(() => {
            this.checkChromiumStatus();
        }, 10000); // Check every 10 seconds
        
        this.logMessage('🟦 Chrome integration initialized', 'info');
    }

    /**
     * Check if Chromium is running with remote debugging
     */
    async checkChromiumStatus() {
        try {
            const response = await fetch(`http://localhost:${this.chromiumStatus.debugPort}/json/version`);
            if (response.ok) {
                const chromiumInfo = await response.json();
                this.chromiumStatus.isRunning = true;
                this.updateChromiumStatusUI(true, chromiumInfo);
                
                // Get tab information
                const tabsResponse = await fetch(`http://localhost:${this.chromiumStatus.debugPort}/json`);
                if (tabsResponse.ok) {
                    const tabs = await tabsResponse.json();
                    this.chromiumStatus.testTabsCount = tabs.length;
                    
                    // Find GUI tab
                    const guiTab = tabs.find(tab => tab.url && tab.url.includes('localhost:8090'));
                    if (guiTab) {
                        this.chromiumStatus.guiTabId = guiTab.id;
                    }
                }
            } else {
                this.chromiumStatus.isRunning = false;
                this.updateChromiumStatusUI(false);
            }
        } catch (error) {
            this.chromiumStatus.isRunning = false;
            this.updateChromiumStatusUI(false);
            this.chromiumMetrics.connectionAttempts++;
        }
    }

    /**
     * Update Chromium status in the UI
     */
    updateChromiumStatusUI(isRunning, chromiumInfo = null) {
        if (!this.chromeStatusIndicator) return;

        if (isRunning) {
            this.chromeStatusIndicator.className = 'chrome-status-indicator';
            this.chromeStatusText.textContent = 'Connected';
            this.chromeTabsCount.textContent = `${this.chromiumStatus.testTabsCount} tabs`;
            this.chromeStatusIndicator.title = `Chrome running on port ${this.chromiumStatus.debugPort}`;
        } else {
            this.chromeStatusIndicator.className = 'chrome-status-indicator disconnected';
            this.chromeStatusText.textContent = 'Disconnected';
            this.chromeTabsCount.textContent = '0 tabs';
            this.chromeStatusIndicator.title = 'Chrome not detected or remote debugging disabled';
        }
    }

    /**
     * Initialize Chrome status display
     */
    initializeChromeStatusDisplay() {
        // Set initial disconnected state
        this.updateChromiumStatusUI(false);
    }

    /**
     * Request Chromium launch from server
     */
    requestChromiumLaunch() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'launch-chromium'
            }));
            this.logMessage('🟦 Requesting Chromium launch...', 'info');
        } else {
            this.logMessage('❌ Cannot request Chromium launch: No server connection', 'error');
        }
    }

    /**
     * Show Chromium diagnostics modal
     */
    showChromiumDiagnostics() {
        const diagnosticsHTML = `
            <div class="modal-backdrop" onclick="this.remove()">
                <div class="modal chromium-diagnostics-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>🟦 Chromium Integration Diagnostics</h3>
                        <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">✕</button>
                    </div>
                    <div class="modal-content">
                        <div class="diagnostics-grid">
                            <div class="diagnostic-item">
                                <label>Connection Status:</label>
                                <span class="${this.chromiumStatus.isRunning ? 'status-connected' : 'status-disconnected'}">
                                    ${this.chromiumStatus.isRunning ? '✅ Connected' : '❌ Disconnected'}
                                </span>
                            </div>
                            <div class="diagnostic-item">
                                <label>Debug Port:</label>
                                <span>${this.chromiumStatus.debugPort}</span>
                            </div>
                            <div class="diagnostic-item">
                                <label>Profile:</label>
                                <span>Profile 7 (Windsurf)</span>
                            </div>
                            <div class="diagnostic-item">
                                <label>GUI Tab ID:</label>
                                <span>${this.chromiumStatus.guiTabId || 'Not found'}</span>
                            </div>
                            <div class="diagnostic-item">
                                <label>Test Tabs:</label>
                                <span>${this.chromiumStatus.testTabsCount}</span>
                            </div>
                            <div class="diagnostic-item">
                                <label>Tabs Created:</label>
                                <span>${this.chromiumMetrics.tabsCreated}</span>
                            </div>
                            <div class="diagnostic-item">
                                <label>Tabs Closed:</label>
                                <span>${this.chromiumMetrics.tabsClosed}</span>
                            </div>
                            <div class="diagnostic-item">
                                <label>Connection Attempts:</label>
                                <span>${this.chromiumMetrics.connectionAttempts}</span>
                            </div>
                        </div>
                        <div class="diagnostics-actions">
                            <button class="btn btn-primary" onclick="testStudio.checkChromiumStatus()">
                                Refresh Status
                            </button>
                            <button class="btn btn-secondary" onclick="testStudio.requestChromiumLaunch()">
                                Launch Chromium
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', diagnosticsHTML);
        this.logMessage('🟦 Chromium diagnostics opened', 'info');
    }

    /**
     * Handle Chromium-related server messages
     */
    handleChromiumMessage(data) {
        switch (data.subtype) {
            case 'tab-created':
                this.chromiumMetrics.tabsCreated++;
                this.logMessage(`🟦 Chromium tab created for ${data.testId}`, 'info');
                break;
            case 'tab-closed':
                this.chromiumMetrics.tabsClosed++;
                this.logMessage(`🟦 Chromium tab closed for ${data.testId}`, 'info');
                break;
            case 'launch-success':
                this.logMessage('🟦 Chromium launched successfully', 'success');
                this.checkChromiumStatus(); // Refresh status
                break;
            case 'launch-failed':
                this.logMessage(`❌ Chromium launch failed: ${data.error}`, 'error');
                break;
            case 'status-update':
                this.chromiumStatus = { ...this.chromiumStatus, ...data.status };
                this.updateChromiumStatusUI(this.chromiumStatus.isRunning);
                break;
        }
    }
}

// Initialize the Test Studio when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.testStudio = new TestStudio();
});
