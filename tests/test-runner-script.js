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
        this.testResultsData = []; // Renamed to avoid DOM element conflict
        this.testQueue = [];
        this.profilesData = new Map(); // Renamed from testProfiles to avoid DOM element conflict
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
        this.testResultsDisplay = document.getElementById('test-results'); // Renamed to avoid conflict
        
        // Logs elements
        this.logsContent = document.getElementById('logs-content');
        this.clearLogsBtn = document.getElementById('clear-logs');
        this.downloadLogsBtn = document.getElementById('download-logs');
        this.logLevelFilter = document.getElementById('log-level-filter');
        
        // Profile elements
        this.testProfilesSelect = document.getElementById('test-profiles'); // Renamed to avoid conflict
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
        this.testProfilesSelect.addEventListener('change', (e) => this.loadProfile(e.target.value));
        
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

        // History controls
        const loadHistoryBtn = document.getElementById('load-history');
        const compareRunsBtn = document.getElementById('compare-runs');
        if (loadHistoryBtn) {
            loadHistoryBtn.addEventListener('click', () => this.loadTestHistory());
        }
        if (compareRunsBtn) {
            compareRunsBtn.addEventListener('click', () => this.compareTestRuns());
        }
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
        if (!this.connectionConfig) {
            this.connectionConfig = {
                maxRetries: 5,
                retryCount: 0,
                retryDelay: 3000,
                heartbeatInterval: 30000,
                reconnectOnClose: true,
                lastHeartbeat: null,
                heartbeatTimer: null
            };
        }

        try {
            // Clean up existing socket
            if (this.socket) {
                this.socket.onopen = null;
                this.socket.onmessage = null;
                this.socket.onclose = null;
                this.socket.onerror = null;
                if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
                    this.socket.close();
                }
            }

            this.socket = new WebSocket('ws://localhost:8090');
            
            this.socket.onopen = () => {
                this.connectionConfig.retryCount = 0;
                this.logMessage('✅ Connected to test studio server', 'success');
                this.updateConnectionStatus('connected');
                this.startHeartbeat();
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Handle heartbeat response
                    if (data.type === 'pong') {
                        this.connectionConfig.lastHeartbeat = Date.now();
                        return;
                    }
                    
                    // Validate message structure
                    if (!this.isValidMessage(data)) {
                        this.logMessage('⚠️ Invalid message format received', 'warning');
                        return;
                    }
                    
                    this.handleSocketMessage(data);
                } catch (error) {
                    this.logMessage(`❌ Message parsing error: ${error.message}`, 'error');
                }
            };
            
            this.socket.onclose = (event) => {
                this.updateConnectionStatus('disconnected');
                this.stopHeartbeat();
                
                if (event.wasClean) {
                    this.logMessage('🔌 Connection closed cleanly', 'info');
                } else {
                    this.logMessage('⚠️ Connection lost unexpectedly', 'warning');
                    
                    if (this.connectionConfig.reconnectOnClose && 
                        this.connectionConfig.retryCount < this.connectionConfig.maxRetries) {
                        this.connectionConfig.retryCount++;
                        const delay = this.connectionConfig.retryDelay * Math.pow(2, this.connectionConfig.retryCount - 1);
                        
                        this.logMessage(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.connectionConfig.retryCount}/${this.connectionConfig.maxRetries})`, 'info');
                        
                        setTimeout(() => {
                            if (this.connectionConfig.retryCount <= this.connectionConfig.maxRetries) {
                                this.initializeWebSocket();
                            }
                        }, delay);
                    } else if (this.connectionConfig.retryCount >= this.connectionConfig.maxRetries) {
                        this.logMessage('❌ Max reconnection attempts reached. Switching to standalone mode.', 'error');
                        this.enableStandaloneMode();
                    }
                }
            };
            
            this.socket.onerror = (error) => {
                this.logMessage(`❌ WebSocket error: ${error.type || 'Connection failed'}`, 'error');
                this.updateConnectionStatus('error');
            };

            // Set connection timeout
            setTimeout(() => {
                if (this.socket.readyState === WebSocket.CONNECTING) {
                    this.socket.close();
                    this.logMessage('⏱️ Connection timeout. Retrying...', 'warning');
                }
            }, 10000);

        } catch (error) {
            this.logMessage(`❌ Failed to initialize WebSocket: ${error.message}`, 'error');
            this.enableStandaloneMode();
        }
    }

    startHeartbeat() {
        if (this.connectionConfig.heartbeatTimer) {
            clearInterval(this.connectionConfig.heartbeatTimer);
        }

        this.connectionConfig.heartbeatTimer = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                
                // Check if last heartbeat was too long ago
                if (this.connectionConfig.lastHeartbeat && 
                    Date.now() - this.connectionConfig.lastHeartbeat > this.connectionConfig.heartbeatInterval * 2) {
                    this.logMessage('💓 Heartbeat timeout. Reconnecting...', 'warning');
                    this.socket.close();
                }
            }
        }, this.connectionConfig.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.connectionConfig.heartbeatTimer) {
            clearInterval(this.connectionConfig.heartbeatTimer);
            this.connectionConfig.heartbeatTimer = null;
        }
    }

    updateConnectionStatus(status) {
        const statusBadge = document.getElementById('status-badge');
        const statusIcon = statusBadge?.querySelector('.status-icon');
        const statusText = statusBadge?.querySelector('.status-text');
        
        if (statusIcon && statusText) {
            switch (status) {
                case 'connected':
                    statusIcon.textContent = '🟢';
                    statusText.textContent = 'Connected';
                    statusBadge.className = 'status-badge connected';
                    break;
                case 'disconnected':
                    statusIcon.textContent = '🟡';
                    statusText.textContent = 'Disconnected';
                    statusBadge.className = 'status-badge disconnected';
                    break;
                case 'error':
                    statusIcon.textContent = '🔴';
                    statusText.textContent = 'Error';
                    statusBadge.className = 'status-badge error';
                    break;
                case 'standalone':
                    statusIcon.textContent = '🔵';
                    statusText.textContent = 'Standalone';
                    statusBadge.className = 'status-badge standalone';
                    break;
                default:
                    statusIcon.textContent = '⏸️';
                    statusText.textContent = 'Ready';
                    statusBadge.className = 'status-badge';
            }
        }
    }

    isValidMessage(data) {
        const validTypes = [
            'test-suite-start', 'test-start', 'test-complete', 'progress', 
            'log', 'final-report', 'error', 'status-update', 'pong'
        ];
        return data && typeof data.type === 'string' && validTypes.includes(data.type);
    }

    enableStandaloneMode() {
        this.logMessage('🔵 Standalone mode enabled. Tests will be simulated locally.', 'info');
        this.updateConnectionStatus('standalone');
        this.connectionConfig.reconnectOnClose = false;
        
        // Update UI to show standalone mode
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            if (btn.id === 'start-tests' || btn.id === 'stop-tests') {
                btn.title = btn.title + ' (Standalone Mode)';
            }
        });
    }

    reconnectWebSocket() {
        this.logMessage('🔄 Manual reconnection initiated...', 'info');
        this.connectionConfig.retryCount = 0;
        this.connectionConfig.reconnectOnClose = true;
        this.initializeWebSocket();
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
            
            this.profilesData.set(profileName, profile);
            this.saveProfilesToStorage();
            this.updateProfileSelector();
            this.logMessage(`Profile '${profileName}' saved`, 'success');
        }
    }

    loadProfile(profileName) {
        if (!profileName) return;
        
        const profile = this.profilesData.get(profileName);
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
            this.profilesData = new Map(JSON.parse(stored));
            this.updateProfileSelector();
        }
    }

    saveProfilesToStorage() {
        localStorage.setItem('testStudioProfiles', JSON.stringify([...this.profilesData]));
    }

    updateProfileSelector() {
        // Clear existing options except default
        const defaultOptions = this.testProfilesSelect.querySelectorAll('option[value=""], option[value="smoke"], option[value="regression"], option[value="critical"]');
        this.testProfilesSelect.innerHTML = '';
        defaultOptions.forEach(option => this.testProfilesSelect.appendChild(option));
        
        // Add custom profiles
        this.profilesData.forEach((profile, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            this.testProfilesSelect.appendChild(option);
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
        this.testResultsData = []; // Updated reference
        this.filteredResults = [];
        
        // Reset UI
        this.updateTestCounts();
        this.updateProgress({ completed: 0, total: 0 });
        this.currentTest.style.display = 'none';
        this.finalReport.style.display = 'none';
        
        // Clear test results display
        this.testResultsDisplay.innerHTML = `
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
            this.filteredResults = [...this.testResultsData];
        } else {
            this.filteredResults = this.testResultsData.filter(result =>
                result.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (result.error && result.error.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        this.updateTestResultsDisplay();
    }

    filterResultsByStatus(status) {
        if (status === 'all') {
            this.filteredResults = [...this.testResultsData];
        } else {
            this.filteredResults = this.testResultsData.filter(result => result.status === status);
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
        const results = this.filteredResults.length > 0 ? this.filteredResults : this.testResultsData;
        
        if (results.length === 0) {
            this.testResultsDisplay.innerHTML = `
                <div class="no-tests">
                    <span class="no-tests-icon">🏁</span>
                    <span class="no-tests-text">No matching tests found</span>
                </div>
            `;
            return;
        }
        
        this.testResultsDisplay.innerHTML = results.map(result => this.createTestResultHTML(result)).join('');
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
        
        this.testResultsData.push(result);
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
        if (this.testResultsDisplay.querySelector('.no-tests')) {
            this.testResultsDisplay.innerHTML = '';
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
        
        this.testResultsDisplay.appendChild(resultItem);
        this.testResultsDisplay.scrollTop = this.testResultsDisplay.scrollHeight;
    }

    showFinalReport(data) {
        this.isRunning = false;
        this.updateStatus('completed', '✅ Completed');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.stopTimer();
        this.currentTest.style.display = 'none';
        
        // Generate detailed report for history
        const detailedReport = this.generateDetailedReport();
        
        // Save to history
        this.saveTestRunToHistory(detailedReport);
        
        // Update charts with final data
        this.updateChartsData();
        
        // Show final report
        this.reportTimestamp.textContent = `Generated on ${new Date().toLocaleString()}`;
        this.reportContent.innerHTML = this.generateReportHTML(data);
        this.finalReport.style.display = 'block';
        
        this.logMessage('Test execution completed and saved to history', 'success');
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
        // Show export options modal
        this.showExportModal();
    }

    showExportModal() {
        const modal = document.createElement('div');
        modal.className = 'export-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📊 Export Test Report</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <div class="export-format">
                            <h4>Select Format:</h4>
                            <div class="format-options">
                                <label class="format-option">
                                    <input type="radio" name="format" value="json" checked>
                                    <span>📄 JSON (Detailed)</span>
                                </label>
                                <label class="format-option">
                                    <input type="radio" name="format" value="csv">
                                    <span>📊 CSV (Spreadsheet)</span>
                                </label>
                                <label class="format-option">
                                    <input type="radio" name="format" value="html">
                                    <span>🌐 HTML (Web Report)</span>
                                </label>
                                <label class="format-option">
                                    <input type="radio" name="format" value="txt">
                                    <span>📝 TXT (Plain Text)</span>
                                </label>
                            </div>
                        </div>
                        <div class="export-options-section">
                            <h4>Include:</h4>
                            <label class="export-checkbox">
                                <input type="checkbox" id="include-performance" checked>
                                <span>Performance Metrics</span>
                            </label>
                            <label class="export-checkbox">
                                <input type="checkbox" id="include-logs" checked>
                                <span>Test Logs</span>
                            </label>
                            <label class="export-checkbox">
                                <input type="checkbox" id="include-environment">
                                <span>Environment Info</span>
                            </label>
                        </div>
                    </div>
                    <div class="export-actions">
                        <button class="btn btn-primary" onclick="testStudio.performExport()">📥 Export</button>
                        <button class="btn btn-tertiary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    performExport() {
        const modal = document.querySelector('.export-modal');
        const selectedFormat = modal.querySelector('input[name="format"]:checked').value;
        const includePerformance = modal.querySelector('#include-performance').checked;
        const includeLogs = modal.querySelector('#include-logs').checked;
        const includeEnvironment = modal.querySelector('#include-environment').checked;

        const options = {
            includePerformance,
            includeLogs,
            includeEnvironment
        };

        switch (selectedFormat) {
            case 'json':
                this.exportAsJSON(options);
                break;
            case 'csv':
                this.exportAsCSV(options);
                break;
            case 'html':
                this.exportAsHTML(options);
                break;
            case 'txt':
                this.exportAsText(options);
                break;
        }

        modal.remove();
    }

    exportAsJSON(options) {
        const report = this.generateDetailedReport(options);
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `test-report-${Date.now()}.json`);
        this.logMessage('JSON report exported', 'success');
    }

    exportAsCSV(options) {
        const report = this.generateDetailedReport(options);
        const csvContent = this.convertToCSV(report);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadFile(blob, `test-report-${Date.now()}.csv`);
        this.logMessage('CSV report exported', 'success');
    }

    exportAsHTML(options) {
        const report = this.generateDetailedReport(options);
        const htmlContent = this.convertToHTML(report);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        this.downloadFile(blob, `test-report-${Date.now()}.html`);
        this.logMessage('HTML report exported', 'success');
    }

    exportAsText(options) {
        const report = this.generateDetailedReport(options);
        const textContent = this.convertToText(report);
        const blob = new Blob([textContent], { type: 'text/plain' });
        this.downloadFile(blob, `test-report-${Date.now()}.txt`);
        this.logMessage('Text report exported', 'success');
    }

    convertToCSV(report) {
        const headers = ['Test Name', 'Suite', 'Status', 'Duration (ms)', 'Error'];
        const rows = [headers];

        if (report.results) {
            report.results.forEach(result => {
                rows.push([
                    result.name || 'Unknown',
                    result.suite || 'Unknown',
                    result.status || 'Unknown',
                    result.duration || 0,
                    result.error || ''
                ]);
            });
        }

        return rows.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
               .join(',')
        ).join('\n');
    }

    convertToHTML(report) {
        const successRate = report.summary?.successRate || 0;
        const statusClass = successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'error';

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${new Date(report.timestamp).toLocaleString()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #666; text-transform: uppercase; font-size: 0.9em; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .results-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .results-table th, .results-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .results-table th { background: #f8f9fa; font-weight: 600; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .duration { font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Execution Report</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
            <p>Duration: ${this.formatDuration(report.duration)}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${report.summary?.total || 0}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number success">${report.summary?.passed || 0}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number error">${report.summary?.failed || 0}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary?.skipped || 0}</div>
                <div class="stat-label">Skipped</div>
            </div>
            <div class="stat-card">
                <div class="stat-number ${statusClass}">${successRate.toFixed(1)}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
        </div>

        ${report.results && report.results.length > 0 ? `
        <h2>Test Results</h2>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
                ${report.results.map(result => `
                    <tr>
                        <td>${result.name || 'Unknown'}</td>
                        <td class="status-${result.status}">${result.status || 'Unknown'}</td>
                        <td class="duration">${this.formatDuration(result.duration || 0)}</td>
                        <td>${result.error || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        <footer style="margin-top: 40px; text-align: center; color: #666; font-size: 0.9em;">
            <p>Generated by Lucaverse Test Studio</p>
        </footer>
    </div>
</body>
</html>`;
    }

    convertToText(report) {
        let text = '';
        text += '🧪 LUCAVERSE TEST STUDIO REPORT\n';
        text += '================================\n\n';
        text += `Generated: ${new Date(report.timestamp).toLocaleString()}\n`;
        text += `Duration: ${this.formatDuration(report.duration)}\n\n`;
        
        text += 'SUMMARY\n';
        text += '-------\n';
        text += `Total Tests: ${report.summary?.total || 0}\n`;
        text += `Passed: ${report.summary?.passed || 0}\n`;
        text += `Failed: ${report.summary?.failed || 0}\n`;
        text += `Skipped: ${report.summary?.skipped || 0}\n`;
        text += `Success Rate: ${(report.summary?.successRate || 0).toFixed(1)}%\n\n`;

        if (report.results && report.results.length > 0) {
            text += 'DETAILED RESULTS\n';
            text += '----------------\n';
            report.results.forEach((result, index) => {
                text += `${(index + 1).toString().padStart(3)}: `;
                text += `${result.status?.toUpperCase().padEnd(8)} `;
                text += `${result.name || 'Unknown'} `;
                text += `(${this.formatDuration(result.duration || 0)})\n`;
                if (result.error) {
                    text += `     Error: ${result.error}\n`;
                }
            });
        }

        return text;
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
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
            results: this.testResultsData,
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
        // Initialize charts with Chart.js
        this.initializeCharts();
    }

    initializeCharts() {
        // Suite Distribution Chart (Pie Chart)
        const suiteDistributionCtx = document.getElementById('suite-distribution-chart');
        if (suiteDistributionCtx && !suiteDistributionCtx.chart) {
            suiteDistributionCtx.chart = new Chart(suiteDistributionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Unit Tests', 'GUI Tests', 'Integration', 'OAuth Tests'],
                    datasets: [{
                        data: [this.getSuiteTestCount('unit'), this.getSuiteTestCount('gui'), 
                               this.getSuiteTestCount('integration'), this.getSuiteTestCount('oauth')],
                        backgroundColor: ['#34d399', '#60a5fa', '#a78bfa', '#f87171'],
                        borderColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#e2e8f0', usePointStyle: true }
                        }
                    }
                }
            });
        }

        // Performance Trends Chart (Line Chart)
        const performanceTrendCtx = document.getElementById('performance-trend-chart');
        if (performanceTrendCtx && !performanceTrendCtx.chart) {
            performanceTrendCtx.chart = new Chart(performanceTrendCtx, {
                type: 'line',
                data: {
                    labels: this.performanceMetrics.timestamps.slice(-10),
                    datasets: [{
                        label: 'Avg Speed (ms)',
                        data: this.performanceMetrics.speed.slice(-10),
                        borderColor: '#60a5fa',
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#e2e8f0' } }
                    }
                }
            });
        }

        // Success Rate Chart (Bar Chart)
        const successRateCtx = document.getElementById('success-rate-chart');
        if (successRateCtx && !successRateCtx.chart) {
            const successRate = this.tests.total > 0 ? (this.tests.passed / this.tests.total) * 100 : 0;
            successRateCtx.chart = new Chart(successRateCtx, {
                type: 'bar',
                data: {
                    labels: ['Current Run'],
                    datasets: [{
                        label: 'Success Rate (%)',
                        data: [successRate],
                        backgroundColor: successRate > 80 ? '#10b981' : successRate > 60 ? '#f59e0b' : '#ef4444',
                        borderColor: successRate > 80 ? '#059669' : successRate > 60 ? '#d97706' : '#dc2626',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            max: 100,
                            ticks: { color: '#94a3b8' }, 
                            grid: { color: 'rgba(148, 163, 184, 0.2)' } 
                        },
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#e2e8f0' } }
                    }
                }
            });
        }

        // Speed Distribution Chart (Histogram)
        const speedDistributionCtx = document.getElementById('speed-distribution-chart');
        if (speedDistributionCtx && !speedDistributionCtx.chart) {
            const speedRanges = this.getSpeedDistribution();
            speedDistributionCtx.chart = new Chart(speedDistributionCtx, {
                type: 'bar',
                data: {
                    labels: ['0-1s', '1-3s', '3-5s', '5s+'],
                    datasets: [{
                        label: 'Test Count',
                        data: speedRanges,
                        backgroundColor: '#a78bfa',
                        borderColor: '#8b5cf6',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            beginAtZero: true,
                            ticks: { color: '#94a3b8' }, 
                            grid: { color: 'rgba(148, 163, 184, 0.2)' } 
                        },
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#e2e8f0' } }
                    }
                }
            });
        }
    }

    getSuiteTestCount(suite) {
        const suiteCheckbox = this.testSuites[suite];
        if (!suiteCheckbox) return 0;
        
        const testCounts = { unit: 15, gui: 40, integration: 12, oauth: 25 };
        return testCounts[suite] || 0;
    }

    getSpeedDistribution() {
        const ranges = [0, 0, 0, 0]; // 0-1s, 1-3s, 3-5s, 5s+
        this.testResultsData.forEach(result => {
            if (result.duration < 1000) ranges[0]++;
            else if (result.duration < 3000) ranges[1]++;
            else if (result.duration < 5000) ranges[2]++;
            else ranges[3]++;
        });
        return ranges;
    }

    updateChartsData() {
        // Update existing charts with new data
        const charts = [
            { id: 'suite-distribution-chart', updateFn: this.updateSuiteDistributionChart.bind(this) },
            { id: 'performance-trend-chart', updateFn: this.updatePerformanceTrendChart.bind(this) },
            { id: 'success-rate-chart', updateFn: this.updateSuccessRateChart.bind(this) },
            { id: 'speed-distribution-chart', updateFn: this.updateSpeedDistributionChart.bind(this) }
        ];

        charts.forEach(({ id, updateFn }) => {
            const canvas = document.getElementById(id);
            if (canvas && canvas.chart) {
                updateFn(canvas.chart);
            }
        });
    }

    updateSuiteDistributionChart(chart) {
        chart.data.datasets[0].data = [
            this.getSuiteTestCount('unit'), this.getSuiteTestCount('gui'),
            this.getSuiteTestCount('integration'), this.getSuiteTestCount('oauth')
        ];
        chart.update();
    }

    updatePerformanceTrendChart(chart) {
        chart.data.labels = this.performanceMetrics.timestamps.slice(-10);
        chart.data.datasets[0].data = this.performanceMetrics.speed.slice(-10);
        chart.update();
    }

    updateSuccessRateChart(chart) {
        const successRate = this.tests.total > 0 ? (this.tests.passed / this.tests.total) * 100 : 0;
        chart.data.datasets[0].data = [successRate];
        chart.data.datasets[0].backgroundColor = successRate > 80 ? '#10b981' : successRate > 60 ? '#f59e0b' : '#ef4444';
        chart.update();
    }

    updateSpeedDistributionChart(chart) {
        chart.data.datasets[0].data = this.getSpeedDistribution();
        chart.update();
    }

    toggleShortcutsHelp() {
        const isVisible = this.shortcutsHelp.style.display !== 'none';
        this.shortcutsHelp.style.display = isVisible ? 'none' : 'flex';
    }

    closeModals() {
        this.shortcutsHelp.style.display = 'none';
    }

    // History Management
    loadTestHistory() {
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        
        if (!dateFrom || !dateTo) {
            this.logMessage('Please select both start and end dates', 'warning');
            return;
        }

        this.logMessage(`Loading test history from ${dateFrom} to ${dateTo}...`, 'info');
        
        // Load history from localStorage and reports directory
        const history = this.getTestHistoryData(dateFrom, dateTo);
        this.displayTestHistory(history);
    }

    getTestHistoryData(dateFrom, dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include full end date
        
        // Get stored history from localStorage
        const storedHistory = JSON.parse(localStorage.getItem('testStudioHistory') || '[]');
        
        // Filter by date range
        const filteredHistory = storedHistory.filter(entry => {
            const entryDate = new Date(entry.timestamp);
            return entryDate >= fromDate && entryDate <= toDate;
        });

        // Sort by date (newest first)
        return filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    displayTestHistory(history) {
        const historyList = document.getElementById('history-list');
        
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="history-empty">
                    <span class="empty-icon">📅</span>
                    <span class="empty-text">No test history found for selected date range</span>
                </div>
            `;
            return;
        }

        const historyHTML = history.map(entry => `
            <div class="history-item" data-id="${entry.id}">
                <div class="history-header">
                    <div class="history-timestamp">${this.formatTimestamp(entry.timestamp)}</div>
                    <div class="history-duration">${this.formatDuration(entry.duration)}</div>
                </div>
                <div class="history-summary">
                    <div class="history-stats">
                        <span class="stat passed">${entry.summary.passed} passed</span>
                        <span class="stat failed">${entry.summary.failed} failed</span>
                        <span class="stat total">${entry.summary.total} total</span>
                    </div>
                    <div class="history-success-rate ${this.getSuccessRateClass(entry.summary.successRate)}">
                        ${entry.summary.successRate.toFixed(1)}%
                    </div>
                </div>
                <div class="history-suites">
                    ${entry.suites.map(suite => `<span class="suite-tag">${suite}</span>`).join('')}
                </div>
                <div class="history-actions">
                    <button class="btn btn-small" onclick="testStudio.viewHistoryDetails('${entry.id}')">📊 Details</button>
                    <button class="btn btn-small" onclick="testStudio.compareWithCurrent('${entry.id}')">🔄 Compare</button>
                </div>
            </div>
        `).join('');

        historyList.innerHTML = historyHTML;
        this.logMessage(`Loaded ${history.length} test history entries`, 'success');
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    getSuccessRateClass(successRate) {
        if (successRate >= 90) return 'excellent';
        if (successRate >= 75) return 'good';
        if (successRate >= 50) return 'average';
        return 'poor';
    }

    viewHistoryDetails(historyId) {
        const storedHistory = JSON.parse(localStorage.getItem('testStudioHistory') || '[]');
        const entry = storedHistory.find(h => h.id === historyId);
        
        if (!entry) {
            this.logMessage('History entry not found', 'error');
            return;
        }

        // Show detailed modal or populate existing report area
        this.showHistoryDetailModal(entry);
    }

    showHistoryDetailModal(entry) {
        // Create a modal to show detailed history
        const modal = document.createElement('div');
        modal.className = 'history-detail-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📊 Test Run Details</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="detail-section">
                        <h4>Summary</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Timestamp:</label>
                                <span>${this.formatTimestamp(entry.timestamp)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Duration:</label>
                                <span>${this.formatDuration(entry.duration)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Success Rate:</label>
                                <span class="${this.getSuccessRateClass(entry.summary.successRate)}">${entry.summary.successRate.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Test Results</h4>
                        <div class="results-summary">
                            <div class="result-stat passed">✅ ${entry.summary.passed} Passed</div>
                            <div class="result-stat failed">❌ ${entry.summary.failed} Failed</div>
                            <div class="result-stat skipped">⏭️ ${entry.summary.skipped || 0} Skipped</div>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Test Suites</h4>
                        <div class="suites-list">
                            ${entry.suites.map(suite => `<span class="suite-tag">${suite}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    compareTestRuns() {
        this.logMessage('Test run comparison feature - comparing current with previous runs', 'info');
        
        const storedHistory = JSON.parse(localStorage.getItem('testStudioHistory') || '[]');
        if (storedHistory.length === 0) {
            this.logMessage('No previous test runs found for comparison', 'warning');
            return;
        }

        // Get the most recent run for comparison
        const latestRun = storedHistory[0];
        const currentRun = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.tests.total,
                passed: this.tests.passed,
                failed: this.tests.failed,
                skipped: this.tests.skipped,
                successRate: this.tests.total > 0 ? (this.tests.passed / this.tests.total) * 100 : 0
            }
        };

        this.showComparisonResults(currentRun, latestRun);
    }

    showComparisonResults(current, previous) {
        const successRateDiff = current.summary.successRate - previous.summary.successRate;
        const totalDiff = current.summary.total - previous.summary.total;
        
        this.logMessage(`Comparison Results:
            Current: ${current.summary.passed}/${current.summary.total} (${current.summary.successRate.toFixed(1)}%)
            Previous: ${previous.summary.passed}/${previous.summary.total} (${previous.summary.successRate.toFixed(1)}%)
            Success Rate Change: ${successRateDiff >= 0 ? '+' : ''}${successRateDiff.toFixed(1)}%
            Test Count Change: ${totalDiff >= 0 ? '+' : ''}${totalDiff}`, 'info');
    }

    compareWithCurrent(historyId) {
        const storedHistory = JSON.parse(localStorage.getItem('testStudioHistory') || '[]');
        const previousRun = storedHistory.find(h => h.id === historyId);
        
        if (!previousRun) {
            this.logMessage('History entry not found', 'error');
            return;
        }

        const currentRun = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.tests.total,
                passed: this.tests.passed,
                failed: this.tests.failed,
                skipped: this.tests.skipped,
                successRate: this.tests.total > 0 ? (this.tests.passed / this.tests.total) * 100 : 0
            }
        };

        this.showComparisonResults(currentRun, previousRun);
    }

    saveTestRunToHistory(report) {
        const historyEntry = {
            id: Date.now().toString(),
            timestamp: report.timestamp,
            duration: report.duration,
            summary: report.summary,
            suites: Object.keys(this.testSuites).filter(suite => this.testSuites[suite].checked),
            results: report.results || []
        };

        // Get existing history
        const storedHistory = JSON.parse(localStorage.getItem('testStudioHistory') || '[]');
        
        // Add new entry at the beginning
        storedHistory.unshift(historyEntry);
        
        // Keep only last 50 entries to prevent storage bloat
        const maxHistoryEntries = 50;
        if (storedHistory.length > maxHistoryEntries) {
            storedHistory.splice(maxHistoryEntries);
        }

        // Save back to localStorage
        localStorage.setItem('testStudioHistory', JSON.stringify(storedHistory));
        
        this.logMessage('Test run saved to history', 'success');
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
        // Check Chromium status on startup
        this.checkChromiumStatus();
        
        // Periodically check Chromium status
        setInterval(() => {
            this.checkChromiumStatus();
        }, 10000); // Check every 10 seconds
        
        this.logMessage('🟦 Chromium integration initialized', 'info');
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
        // Find or create Chromium status indicator
        let chromiumIndicator = document.getElementById('chromium-status');
        if (!chromiumIndicator) {
            chromiumIndicator = this.createChromiumStatusIndicator();
        }

        if (isRunning) {
            chromiumIndicator.className = 'chromium-status connected';
            chromiumIndicator.innerHTML = `
                <div class="chromium-icon">🟦</div>
                <div class="chromium-details">
                    <div class="chromium-label">Chromium Connected</div>
                    <div class="chromium-version">${chromiumInfo?.Browser || 'Unknown Version'}</div>
                    <div class="chromium-tabs">${this.chromiumStatus.testTabsCount} tabs open</div>
                    <div class="chromium-profile">Profile 7 (Windsurf)</div>
                </div>
            `;
            chromiumIndicator.title = `Chromium running on port ${this.chromiumStatus.debugPort}`;
        } else {
            chromiumIndicator.className = 'chromium-status disconnected';
            chromiumIndicator.innerHTML = `
                <div class="chromium-icon">🟦</div>
                <div class="chromium-details">
                    <div class="chromium-label">Chromium Disconnected</div>
                    <div class="chromium-message">Launch via studio for integration</div>
                </div>
            `;
            chromiumIndicator.title = 'Chromium not detected or remote debugging disabled';
        }
    }

    /**
     * Create Chromium status indicator in the sidebar
     */
    createChromiumStatusIndicator() {
        const sidebar = document.querySelector('.studio-sidebar');
        const chromiumSection = document.createElement('section');
        chromiumSection.className = 'sidebar-section chromium-section';
        chromiumSection.innerHTML = `
            <h3>🟦 Chromium Integration</h3>
            <div id="chromium-status" class="chromium-status">
                <!-- Status will be populated by updateChromiumStatusUI -->
            </div>
            <div class="chromium-actions">
                <button class="btn btn-tertiary btn-small" onclick="testStudio.requestChromiumLaunch()">
                    Launch Chromium
                </button>
                <button class="btn btn-tertiary btn-small" onclick="testStudio.showChromiumDiagnostics()">
                    Diagnostics
                </button>
            </div>
        `;
        
        // Insert after performance metrics section
        const metricsSection = sidebar.querySelector('.metrics-section');
        if (metricsSection) {
            metricsSection.insertAdjacentElement('afterend', chromiumSection);
        } else {
            sidebar.appendChild(chromiumSection);
        }
        
        return document.getElementById('chromium-status');
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