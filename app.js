// Main application script
document.addEventListener('DOMContentLoaded', function() {
    // Initialize LBO Model
    LBOModel.initialize();
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Set up UI components and store render functions
    const trancheFunctions = setupDebtTranchesUI();
    const renderDebtAssumptions = setupDebtAssumptionsUI();
    const updateDebtScheduleUI = setupDebtScheduleUI();
    const updateCreditRatiosUI = setupCreditRatiosUI();
    const updateReturnsUI = setupReturnsUI();
    const updateSensitivityUI = setupSensitivityUI();
    const updateCashFlowUI = setupCashFlowUI(); // Add this line here

    
    // Connect the tranche functions to debt assumptions
    trancheFunctions.setRenderDebtAssumptionsFunction(renderDebtAssumptions);
    
    setupIncomeStatementUI();
    
    setupProjectionYearsUI();

    // Set up calculate button - SINGLE EVENT LISTENER
    document.getElementById('calculate-btn').addEventListener('click', function() {
        console.log("Calculate button clicked");
        const results = LBOModel.calculateModel();
        console.log('Model calculated:', results);
        
        // Update all UI components
        updateSourcesUsesUI(results.sourcesUses);
        renderDebtAssumptions();
        updateIncomeStatementUI(results.incomeStatement);
        updateCashFlowUI(results.cashFlow); 
        updateDebtScheduleUI(results.debtSchedule);
        updateCreditRatiosUI(results.creditRatios);
        updateReturnsUI(results.returns);
        updateSensitivityUI(results.sensitivityAnalysis);
    });
    
    // Initial calculation to populate the UI
    const initialResults = LBOModel.calculateModel();
    updateSourcesUsesUI(initialResults.sourcesUses);
    updateIncomeStatementUI(initialResults.incomeStatement);
    updateCashFlowUI(initialResults.cashFlow);
    updateDebtScheduleUI(initialResults.debtSchedule);
    updateCreditRatiosUI(initialResults.creditRatios);
    updateReturnsUI(initialResults.returns);
    updateSensitivityUI(initialResults.sensitivityAnalysis);

    // Tab navigation functionality
    function setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // Hide all tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding tab content
                const tabId = this.getAttribute('data-tab');
                const tabContent = document.getElementById(tabId + '-tab');
                if (tabContent) {
                    tabContent.classList.add('active');
                }
            });
        });
    }
    // Function to handle projection years changes
    function setupProjectionYearsUI() {
        const projectionYearsInput = document.getElementById('projection-years');
        
        if (projectionYearsInput) {
            projectionYearsInput.addEventListener('change', function() {
                // Get the selected number of years (constrained between 5-10)
                let years = parseInt(this.value) || 5;
                years = Math.max(5, Math.min(10, years));
                
                // Update the input value to reflect constraints
                this.value = years;
                
                // Update the model with the new projection years
                LBOModel.updateProjectionYears(years);
                
                // Show/hide year columns based on selection
                updateVisibleYears(years);
                
                // If exit year is greater than projection years, update it
                const exitYearInput = document.getElementById('exit-year');
                if (exitYearInput && parseInt(exitYearInput.value) > years) {
                    exitYearInput.value = years;
                }
                
                // Update exit year max attribute
                if (exitYearInput) {
                    exitYearInput.setAttribute('max', years);
                }
                
                // Recalculate the model with the new projection years
                const results = LBOModel.calculateModel();
                
                // Update all UI components
                updateSourcesUsesUI(results.sourcesUses);
                updateIncomeStatementUI(results.incomeStatement);
                updateCashFlowUI(results.cashFlow);
                updateDebtScheduleUI(results.debtSchedule);
                updateCreditRatiosUI(results.creditRatios);
                updateReturnsUI(results.returns);
                updateSensitivityUI(results.sensitivityAnalysis);
            });
        }
        
        // Initial setup
        const initialYears = projectionYearsInput ? parseInt(projectionYearsInput.value) || 5 : 5;
        updateVisibleYears(initialYears);
    }

    // Function to show/hide year columns
    function updateVisibleYears(years) {
        // Show/hide columns for years 6-10 based on selection
        for (let year = 6; year <= 10; year++) {
            const yearElements = document.querySelectorAll(`.year-${year}`);
            
            yearElements.forEach(el => {
                if (year <= years) {
                    el.style.display = ''; // Show this year
                } else {
                    el.style.display = 'none'; // Hide this year
                }
            });
        }
    }
    // Setup debt tranche management
    function setupDebtTranchesUI() {
        const tranchesContainer = document.getElementById('debt-tranches-container');
        const addTrancheBtn = document.getElementById('add-debt-tranche');
        
        // Store the renderDebtAssumptions function to call it later
        let renderDebtAssumptionsFunction;
        
        // Function to create a tranche HTML element
        function createTrancheElement(tranche, index) {
            const trancheDiv = document.createElement('div');
            trancheDiv.className = 'debt-tranche mb-3 p-3 border rounded';
            trancheDiv.dataset.index = index;
            
            trancheDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <h4 class="font-medium">Debt Tranche ${index + 1}</h4>
                    <button class="remove-tranche-btn text-red-600 hover:text-red-800">Remove</button>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" class="tranche-name mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" value="${tranche.name}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Multiple of EBITDA</label>
                        <input type="number" class="tranche-multiple mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" value="${tranche.multiple}">
                    </div>
                </div>
            `;
            
            // Add event listener for remove button
            const removeBtn = trancheDiv.querySelector('.remove-tranche-btn');
            removeBtn.addEventListener('click', function() {
                LBOModel.sourcesUses.debtTranches.splice(index, 1);
                renderTranches();
                
                // Recalculate model and update UI
                const results = LBOModel.calculateModel();
                updateSourcesUsesUI(results.sourcesUses);
                
                // Also update debt assumptions when we remove a tranche
                if (renderDebtAssumptionsFunction) {
                    renderDebtAssumptionsFunction();
                }
            });
            
            // Add event listeners for inputs
            const nameInput = trancheDiv.querySelector('.tranche-name');
            const multipleInput = trancheDiv.querySelector('.tranche-multiple');
            
            nameInput.addEventListener('change', function() {
                LBOModel.sourcesUses.debtTranches[index].name = this.value;
                
                // Update debt assumptions with new name
                LBOModel.populateDebtAssumptions();
                if (renderDebtAssumptionsFunction) {
                    renderDebtAssumptionsFunction();
                }
            });
            
            multipleInput.addEventListener('change', function() {
                LBOModel.sourcesUses.debtTranches[index].multiple = parseFloat(this.value) || 0;
                
                // Recalculate model and update UI
                const results = LBOModel.calculateModel();
                updateSourcesUsesUI(results.sourcesUses);
                
                // Also update debt assumptions when multiples change
                if (renderDebtAssumptionsFunction) {
                    renderDebtAssumptionsFunction();
                }
            });
            
            return trancheDiv;
        }
        
        // Function to render all tranches
        function renderTranches() {
            tranchesContainer.innerHTML = '';
            
            LBOModel.sourcesUses.debtTranches.forEach((tranche, index) => {
                const trancheElement = createTrancheElement(tranche, index);
                tranchesContainer.appendChild(trancheElement);
            });
            
            // After rendering tranches, update debt assumptions
            LBOModel.populateDebtAssumptions();
            
            // Call renderDebtAssumptions if it's available
            if (renderDebtAssumptionsFunction) {
                renderDebtAssumptionsFunction();
            }
        }
        
        // Add new tranche button handler
        if (addTrancheBtn) {
            addTrancheBtn.addEventListener('click', function() {
                console.log("Add debt tranche button clicked");
                const newIndex = LBOModel.sourcesUses.debtTranches.length;
                LBOModel.sourcesUses.debtTranches.push({ 
                    name: `Debt Tranche ${newIndex + 1}`, 
                    multiple: 1.0 
                });
                
                renderTranches();
                
                // Recalculate model and update UI
                const results = LBOModel.calculateModel();
                updateSourcesUsesUI(results.sourcesUses);
            });
        } else {
            console.error("Add debt tranche button not found!");
        }
        
        // Initial render
        renderTranches();
        
        // Method to set the renderDebtAssumptions function
        function setRenderDebtAssumptionsFunction(func) {
            renderDebtAssumptionsFunction = func;
        }
        
        // Return both functions
        return {
            renderTranches,
            setRenderDebtAssumptionsFunction
        };
    }

    // Update Sources & Uses UI
    function updateSourcesUsesUI(sourcesUses) {
        // Format currency helper
        const formatCurrency = (value) => {
            return '$' + value.toFixed(1) + 'M';
        };
        
        // Format percentage helper
        const formatPercentage = (value) => {
            return value.toFixed(1) + '%';
        };
        
        // Update Sources side
        document.getElementById('management-equity').textContent = formatCurrency(sourcesUses.managementEquity);
        document.getElementById('sponsor-equity').textContent = formatCurrency(sourcesUses.sponsorEquity);
        document.getElementById('equity-amount').textContent = formatCurrency(sourcesUses.equityContribution);
        document.getElementById('total-sources').textContent = formatCurrency(sourcesUses.totalSources);
        
        // Update equity percentage
        const equityPctElement = document.getElementById('equity-pct');
        if (equityPctElement) {
            equityPctElement.textContent = formatPercentage(sourcesUses.equityPct);
        }
        
        // Update Uses side
        document.getElementById('purchase-ev').textContent = formatCurrency(sourcesUses.purchaseEV);
        document.getElementById('transaction-fees').textContent = formatCurrency(sourcesUses.transactionFees);
        document.getElementById('debt-issuance-fees').textContent = formatCurrency(sourcesUses.debtIssuanceFees);
        document.getElementById('total-uses').textContent = formatCurrency(sourcesUses.totalUses);
    }

    // Updated setupDebtAssumptionsUI function
    function setupDebtAssumptionsUI() {
        const debtAssumptionsRows = document.getElementById('debt-assumptions-rows');
        
        // Function to create a debt assumption row
        function createDebtAssumptionRow(assumption, index) {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-5 gap-4 p-3 border-b';
            
            // Make sure amount is defined before using toFixed
            const amount = assumption.amount || 0;
            const amortizationPct = assumption.amortizationPct || 5;
            const interestRate = assumption.interestRate || 6;
            const cashFlowSweepPct = assumption.cashFlowSweepPct || 50;
            
            row.innerHTML = `
                <div>${assumption.name || 'Unnamed Tranche'}</div>
                <div>$${amount.toFixed(1)}M</div>
                <div><input type="number" id="amort-rate-${index}" class="w-full p-1 border rounded" value="${amortizationPct}"></div>
                <div><input type="number" id="interest-rate-${index}" class="w-full p-1 border rounded" value="${interestRate}"></div>
                <div><input type="number" id="cf-sweep-${index}" class="w-full p-1 border rounded" value="${cashFlowSweepPct}"></div>
            `;
            
            // Add event listeners for inputs
            const amortInput = row.querySelector(`#amort-rate-${index}`);
            const interestInput = row.querySelector(`#interest-rate-${index}`);
            const sweepInput = row.querySelector(`#cf-sweep-${index}`);
            
            [amortInput, interestInput, sweepInput].forEach(input => {
                input.addEventListener('change', function() {
                    // Update the model
                    LBOModel.loadDebtAssumptionsFromUI();
                    
                    // Recalculate
                    const results = LBOModel.calculateModel();
                    
                    // Update UI - Update ALL tabs when debt assumptions change
                    updateIncomeStatementUI(results.incomeStatement);
                    updateDebtScheduleUI(results.debtSchedule);
                    updateCreditRatiosUI(results.creditRatios);
                    updateReturnsUI(results.returns);
                    updateSensitivityUI(results.sensitivityAnalysis);
                });
            });
            
            return row;
        }
        
        // Function to render all debt assumptions
        function renderDebtAssumptions() {
            if (!debtAssumptionsRows) {
                console.error("Debt assumptions rows container not found");
                return;
            }
            
            debtAssumptionsRows.innerHTML = '';
            
            // Check if debtAssumptions exists and is an array
            if (!LBOModel.debtAssumptions || !Array.isArray(LBOModel.debtAssumptions)) {
                console.error("LBOModel.debtAssumptions is not properly initialized");
                
                // Initialize if it doesn't exist
                if (!LBOModel.debtAssumptions) {
                    LBOModel.debtAssumptions = [];
                }
                
                // Make sure populateDebtAssumptions is called first
                LBOModel.populateDebtAssumptions();
            }
            
            console.log("Rendering debt assumptions:", LBOModel.debtAssumptions);
            
            LBOModel.debtAssumptions.forEach((assumption, index) => {
                try {
                    const row = createDebtAssumptionRow(assumption, index);
                    debtAssumptionsRows.appendChild(row);
                } catch (error) {
                    console.error(`Error creating row for assumption ${index}:`, error, assumption);
                }
            });
        }
        
        // Initial render
        renderDebtAssumptions();
        
        // Return the render function so we can call it when debt tranches change
        return renderDebtAssumptions;
    }
    
    // Fixed setupIncomeStatementUI function
    function setupIncomeStatementUI() {
        console.log("Setting up income statement UI listeners");
        
        // First, add listeners to the historical revenue input
        const historicalRevenueInput = document.getElementById('historical-revenue');
        if (historicalRevenueInput) {
            historicalRevenueInput.addEventListener('input', function() {
                console.log("Historical revenue changed:", this.value);
                
                // Update model with current values
                LBOModel.loadIncomeStatementFromUI();
                
                // Recalculate
                const results = LBOModel.calculateModel();
                
                // Update UI with all results
                updateIncomeStatementUI(results.incomeStatement);
                updateDebtScheduleUI(results.debtSchedule);
                updateCreditRatiosUI(results.creditRatios);
                updateReturnsUI(results.returns);
                updateSensitivityUI(results.sensitivityAnalysis);
            });
        } else {
            console.warn("Historical revenue input not found");
        }
        
        // Add event listeners to percentage inputs
        const incomeInputIds = [
            'historical-cogs-pct', 'historical-sga-pct', 'historical-da-pct', 'historical-tax-rate'
        ];
        
        // Add year-specific inputs
        for (let year = 1; year <= 5; year++) {
            incomeInputIds.push(`rev-growth-${year}`);
            incomeInputIds.push(`cogs-pct-${year}`);
            incomeInputIds.push(`sga-pct-${year}`);
            incomeInputIds.push(`da-pct-${year}`);
            incomeInputIds.push(`tax-rate-${year}`);
        }
        
        // Add event listeners to all income statement inputs
        incomeInputIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                // Using both 'input' and 'change' events for better responsiveness
                input.addEventListener('input', handleIncomeInput);
                input.addEventListener('change', handleIncomeInput);
            } else {
                console.warn(`Input element with ID ${id} not found`);
            }
        });
        
        // Handler function for income inputs
        function handleIncomeInput() {
            console.log("Income statement input changed:", this.id, "to", this.value);
            
            // Update model with current values
            LBOModel.loadIncomeStatementFromUI();
            
            // Recalculate
            const results = LBOModel.calculateModel();
            
            // Update UI with all results
            updateIncomeStatementUI(results.incomeStatement);
            updateDebtScheduleUI(results.debtSchedule);
            updateCreditRatiosUI(results.creditRatios);
            updateReturnsUI(results.returns);
            updateSensitivityUI(results.sensitivityAnalysis);
        }
    }

    // Improved updateIncomeStatementUI function
    function updateIncomeStatementUI(incomeStatement) {
        console.log("Updating income statement UI");
        
        // Format to fixed number
        const format = (value) => value.toFixed(1);
        
        // Update historical values
        try {
            document.getElementById('cogs-historical').textContent = format(incomeStatement.historical.cogs);
            document.getElementById('sga-historical').textContent = format(incomeStatement.historical.sga);
            document.getElementById('ebitda-historical').textContent = format(incomeStatement.historical.ebitda);
            document.getElementById('da-historical').textContent = format(incomeStatement.historical.da);
            document.getElementById('ebit-historical').textContent = format(incomeStatement.historical.ebit);
            document.getElementById('interest-historical').textContent = format(incomeStatement.historical.interestExpense);
            document.getElementById('ebt-historical').textContent = format(incomeStatement.historical.ebt);
            document.getElementById('taxes-historical').textContent = format(incomeStatement.historical.taxes);
            document.getElementById('netincome-historical').textContent = format(incomeStatement.historical.netIncome);
            
            // Update projections for all available years
            incomeStatement.projections.forEach((year, index) => {
                const yearNumber = index + 1;
                
                // Only update UI elements that exist
                const updateElement = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = format(value);
                    }
                };
                
                updateElement(`revenue-${yearNumber}`, year.revenue);
                updateElement(`cogs-${yearNumber}`, year.cogs);
                updateElement(`sga-${yearNumber}`, year.sga);
                updateElement(`ebitda-${yearNumber}`, year.ebitda);
                updateElement(`da-${yearNumber}`, year.da);
                updateElement(`ebit-${yearNumber}`, year.ebit);
                updateElement(`interest-${yearNumber}`, year.interestExpense);
                updateElement(`ebt-${yearNumber}`, year.ebt);
                updateElement(`taxes-${yearNumber}`, year.taxes);
                updateElement(`netincome-${yearNumber}`, year.netIncome);
            });
        } catch (error) {
            console.error("Error updating income statement UI:", error);
        }
    }
    
    // Function to setup and update the debt schedule UI
    function setupDebtScheduleUI() {
        const scheduleContainer = document.getElementById('debt-schedule-container');
        
        // Function to update debt schedule
        function updateDebtScheduleUI(debtSchedule) {
            if (!scheduleContainer) return;
            
            scheduleContainer.innerHTML = '';
            
            // Create the table structure
            const table = document.createElement('table');
            table.className = 'min-w-full';
            
            // Create header
            const thead = document.createElement('thead');
            thead.className = 'sticky-header';
            
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <th class="text-left p-2">Tranche / Year</th>
                <th class="text-right p-2">Beginning Balance</th>
                <th class="text-right p-2">Scheduled Amortization</th>
                <th class="text-right p-2">Additional Amortization</th>
                <th class="text-right p-2">Total Amortization</th>
                <th class="text-right p-2">Ending Balance</th>
                <th class="text-right p-2">Interest Expense</th>
            `;
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create table body
            const tbody = document.createElement('tbody');
            
            // Format function for currency
            const formatCurrency = (value) => `$${value.toFixed(1)}M`;
            
            // Add rows for each tranche
            debtSchedule.tranches.forEach((tranche, trancheIndex) => {
                // Add tranche name row
                const trancheRow = document.createElement('tr');
                trancheRow.className = 'bg-gray-100 font-medium';
                trancheRow.innerHTML = `<td colspan="7" class="p-2">${tranche.name}</td>`;
                tbody.appendChild(trancheRow);
                
                // Add years for this tranche
                tranche.schedule.forEach((year, yearIndex) => {
                    const yearRow = document.createElement('tr');
                    yearRow.className = yearIndex % 2 === 0 ? '' : 'bg-gray-50';
                    
                    yearRow.innerHTML = `
                        <td class="p-2">Year ${year.year}</td>
                        <td class="p-2 text-right">${formatCurrency(year.beginningBalance)}</td>
                        <td class="p-2 text-right">${formatCurrency(year.scheduledAmortization)}</td>
                        <td class="p-2 text-right">${formatCurrency(year.additionalAmortization)}</td>
                        <td class="p-2 text-right">${formatCurrency(year.totalAmortization)}</td>
                        <td class="p-2 text-right">${formatCurrency(year.endingBalance)}</td>
                        <td class="p-2 text-right">${formatCurrency(year.interestExpense)}</td>
                    `;
                    
                    tbody.appendChild(yearRow);
                });
            });
            
            // Add total rows
            const totalHeaderRow = document.createElement('tr');
            totalHeaderRow.className = 'bg-blue-100 font-bold';
            totalHeaderRow.innerHTML = `<td colspan="7" class="p-2">Total Debt</td>`;
            tbody.appendChild(totalHeaderRow);
            
            debtSchedule.totalsByYear.forEach((year, yearIndex) => {
                const yearRow = document.createElement('tr');
                yearRow.className = yearIndex % 2 === 0 ? 'bg-blue-50' : 'bg-blue-50';
                
                yearRow.innerHTML = `
                    <td class="p-2 font-medium">Year ${year.year}</td>
                    <td class="p-2 text-right">${formatCurrency(year.beginningBalance)}</td>
                    <td class="p-2 text-right">${formatCurrency(year.scheduledAmortization)}</td>
                    <td class="p-2 text-right">${formatCurrency(year.additionalAmortization)}</td>
                    <td class="p-2 text-right">${formatCurrency(year.totalAmortization)}</td>
                    <td class="p-2 text-right">${formatCurrency(year.endingBalance)}</td>
                    <td class="p-2 text-right">${formatCurrency(year.interestExpense)}</td>
                `;
                
                tbody.appendChild(yearRow);
            });
            
            table.appendChild(tbody);
            scheduleContainer.appendChild(table);
        }
        
        return updateDebtScheduleUI;
    }

    // Function to setup and update the credit ratios UI
    function setupCreditRatiosUI() {
        const ratiosContainer = document.getElementById('credit-ratios-container');
        
        // Function to update credit ratios
        function updateCreditRatiosUI(creditRatios) {
            if (!ratiosContainer) return;
            
            ratiosContainer.innerHTML = '';
            
            // Create the table structure
            const table = document.createElement('table');
            table.className = 'min-w-full';
            
            // Create header
            const thead = document.createElement('thead');
            thead.className = 'sticky-header';
            
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <th class="text-left p-2">Year</th>
                <th class="text-right p-2">Debt / EBITDA</th>
                <th class="text-right p-2">Interest Coverage (EBIT / Interest)</th>
                <th class="text-right p-2">Debt Service Coverage (EBITDA / Debt Service)</th>
            `;
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create table body
            const tbody = document.createElement('tbody');
            
            // Format function for ratios
            const formatRatio = (value) => value.toFixed(2) + 'x';
            
            // Add rows for each year
            creditRatios.forEach((ratio, index) => {
                const row = document.createElement('tr');
                row.className = index % 2 === 0 ? '' : 'bg-gray-50';
                
                row.innerHTML = `
                    <td class="p-2 font-medium">Year ${ratio.year}</td>
                    <td class="p-2 text-right">${formatRatio(ratio.debtToEBITDA)}</td>
                    <td class="p-2 text-right">${formatRatio(ratio.interestCoverageRatio)}</td>
                    <td class="p-2 text-right">${formatRatio(ratio.debtServiceCoverageRatio)}</td>
                `;
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            ratiosContainer.appendChild(table);
        }
        
        return updateCreditRatiosUI;
    }

    // Function to setup and update the Cash Flow UI
    function setupCashFlowUI() {
        // Add event listeners to NWC and CapEx inputs
        const projectionYears = LBOModel.getProjectionYears();
        
        for (let year = 1; year <= projectionYears; year++) {
            const nwcInput = document.getElementById(`cf-nwc-pct-${year}`);
            const capexInput = document.getElementById(`cf-capex-pct-${year}`);
            
            if (nwcInput) {
                nwcInput.addEventListener('change', function() {
                    LBOModel.loadCashFlowFromUI();
                    const results = LBOModel.calculateModel();
                    updateCashFlowUI(results.cashFlow);
                    updateReturnsUI(results.returns);
                });
            }
            
            if (capexInput) {
                capexInput.addEventListener('change', function() {
                    LBOModel.loadCashFlowFromUI();
                    const results = LBOModel.calculateModel();
                    updateCashFlowUI(results.cashFlow);
                    updateReturnsUI(results.returns);
                });
            }
        }
        
        // Function to update Cash Flow UI
        function updateCashFlowUI(cashFlow) {
            // Format helper
            const formatNumber = (value) => value.toFixed(1);
            
            // Update each year's values
            cashFlow.yearlyFlows.forEach(flow => {
                const year = flow.year;
                
                // Update Net Income
                const netIncomeElement = document.getElementById(`cf-netincome-${year}`);
                if (netIncomeElement) netIncomeElement.textContent = formatNumber(flow.netIncome);
                
                // Update D&A
                const daElement = document.getElementById(`cf-da-${year}`);
                if (daElement) daElement.textContent = formatNumber(flow.da);
                
                // Update NWC Change
                const nwcElement = document.getElementById(`cf-nwc-${year}`);
                if (nwcElement) nwcElement.textContent = formatNumber(flow.nwcChange);
                
                // Update CapEx
                const capexElement = document.getElementById(`cf-capex-${year}`);
                if (capexElement) capexElement.textContent = formatNumber(flow.capex);
                
                // Update FCF Before Debt
                const fcfBeforeDebtElement = document.getElementById(`cf-fcf-before-debt-${year}`);
                if (fcfBeforeDebtElement) fcfBeforeDebtElement.textContent = formatNumber(flow.fcfBeforeDebt);
                
                // Update Interest Expense
                const interestElement = document.getElementById(`cf-interest-${year}`);
                if (interestElement) interestElement.textContent = formatNumber(flow.interestExpense);
                
                // Update Scheduled Principal
                const scheduledPrincipalElement = document.getElementById(`cf-scheduled-principal-${year}`);
                if (scheduledPrincipalElement) scheduledPrincipalElement.textContent = formatNumber(flow.scheduledAmortization);
                
                // Update Available for Sweep
                const availableForSweepElement = document.getElementById(`cf-available-for-sweep-${year}`);
                if (availableForSweepElement) availableForSweepElement.textContent = formatNumber(flow.availableForSweep);
                
                // Update Additional Principal
                const additionalPrincipalElement = document.getElementById(`cf-additional-principal-${year}`);
                if (additionalPrincipalElement) additionalPrincipalElement.textContent = formatNumber(flow.additionalAmortization);
                
                // Update FCF to Equity
                const fcfToEquityElement = document.getElementById(`cf-fcf-to-equity-${year}`);
                if (fcfToEquityElement) fcfToEquityElement.textContent = formatNumber(flow.fcfToEquity);
            });
        }
        
        return updateCashFlowUI;
    }

    // Function to setup Returns UI
// Function to setup Returns UI
function setupReturnsUI() {
    const exitYearInput = document.getElementById('exit-year');
    const exitMultipleInput = document.getElementById('exit-multiple');
    
    // Add event listeners
    if (exitYearInput) {
        exitYearInput.addEventListener('input', handleReturnsInput);
    }
    
    if (exitMultipleInput) {
        exitMultipleInput.addEventListener('input', handleReturnsInput);
    }
    
    function handleReturnsInput() {
        // Update model with current values
        LBOModel.loadReturnsFromUI();
        
        // Recalculate
        const results = LBOModel.calculateModel();
        
        // Update UI
        updateReturnsUI(results.returns);
        updateSensitivityUI(results.sensitivityAnalysis);
    }
    
    // Return the update function for initial call
    return function updateReturnsUI(returns) {
        // Format helpers
        const formatCurrency = (value) => `$${value.toFixed(1)}M`;
        const formatMultiple = (value) => `${value.toFixed(1)}x`;
        const formatPercentage = (value) => `${value.toFixed(1)}%`;
        
        // Update main values
        document.getElementById('initial-equity').textContent = formatCurrency(returns.initialEquity);
        document.getElementById('exit-equity').textContent = formatCurrency(returns.exitEquity);
        document.getElementById('moic-value').textContent = formatMultiple(returns.moic);
        document.getElementById('irr-value').textContent = formatPercentage(returns.irr);
        
        // Update summary text
        document.getElementById('summary-exit-multiple').textContent = formatMultiple(returns.exitMultiple);
        document.getElementById('summary-exit-year').textContent = returns.exitYear;
        document.getElementById('summary-initial-equity').textContent = returns.initialEquity.toFixed(1);
        document.getElementById('summary-exit-equity').textContent = returns.exitEquity.toFixed(1);
        document.getElementById('summary-moic').textContent = formatMultiple(returns.moic);
        document.getElementById('summary-irr').textContent = formatPercentage(returns.irr);
        
        // Update cumulative cash flows table
        const cfBody = document.getElementById('cumulative-cf-body');
        if (cfBody) {
            cfBody.innerHTML = '';
            
            // Add initial investment row (year 0)
            const initialRow = document.createElement('tr');
            initialRow.className = 'bg-gray-50';
            initialRow.innerHTML = `
                <td class="p-2">Year 0</td>
                <td class="p-2 text-right">${formatCurrency(-returns.initialEquity)}</td>
                <td class="p-2 text-right">${formatCurrency(-returns.initialEquity)}</td>
            `;
            cfBody.appendChild(initialRow);
            
            // Add rows for each projection year up to exit year
            for (let year = 1; year <= returns.exitYear; year++) {
                const row = document.createElement('tr');
                row.className = year % 2 === 0 ? 'bg-gray-50' : '';
                
                // Get cash flow for this year (use 0 if year is beyond available data)
                const cashFlow = year < returns.cashFlows.length ? returns.cashFlows[year] : 0;
                const cumulative = year < returns.cumulativeCashFlows.length ? 
                    returns.cumulativeCashFlows[year] : 0;
                
                row.innerHTML = `
                    <td class="p-2">Year ${year}</td>
                    <td class="p-2 text-right">${formatCurrency(cashFlow)}</td>
                    <td class="p-2 text-right">${formatCurrency(cumulative)}</td>
                `;
                cfBody.appendChild(row);
            }
        }
        
        // Update attribution percentages
        const cfAttribution = document.getElementById('cf-attribution');
        const exitAttribution = document.getElementById('exit-attribution');
        
        if (cfAttribution) cfAttribution.textContent = formatPercentage(returns.cashFlowAttribution);
        if (exitAttribution) exitAttribution.textContent = formatPercentage(returns.exitValueAttribution);
        
        // Update management and sponsor titles with percentages
        const mgmtTitle = document.getElementById('mgmt-title');
        const sponsorTitle = document.getElementById('sponsor-title');
        
        const mgmtPct = LBOModel.transaction.managementEquityPct;
        const sponsorPct = 100 - mgmtPct;
        
        if (mgmtTitle) mgmtTitle.textContent = `Management (${mgmtPct.toFixed(1)}%)`;
        if (sponsorTitle) sponsorTitle.textContent = `Sponsor (${sponsorPct.toFixed(1)}%)`;
        
        // Update management returns
        document.getElementById('mgmt-initial-equity').textContent = formatCurrency(returns.managementReturns.initialEquity);
        document.getElementById('mgmt-exit-equity').textContent = formatCurrency(returns.managementReturns.exitEquity);
        document.getElementById('mgmt-moic').textContent = formatMultiple(returns.managementReturns.moic);
        document.getElementById('mgmt-irr').textContent = formatPercentage(returns.managementReturns.irr);
        
        // Update sponsor returns
        document.getElementById('sponsor-initial-equity').textContent = formatCurrency(returns.sponsorReturns.initialEquity);
        document.getElementById('sponsor-exit-equity').textContent = formatCurrency(returns.sponsorReturns.exitEquity);
        document.getElementById('sponsor-moic').textContent = formatMultiple(returns.sponsorReturns.moic);
        document.getElementById('sponsor-irr').textContent = formatPercentage(returns.sponsorReturns.irr);
    };
}
    
    // Function to setup Sensitivity UI
    function setupSensitivityUI() {
        return function updateSensitivityUI(sensitivityAnalysis) {
            // Format helpers
            const formatMultiple = (value) => `${value.toFixed(1)}x`;
            const formatPercentage = (value) => `${value.toFixed(1)}%`;
            
            // Update MOIC sensitivity table
            const moicBody = document.getElementById('moic-sensitivity-body');
            if (moicBody) {
                moicBody.innerHTML = '';
                
                sensitivityAnalysis.entryMultiples.forEach((entryMultiple, rowIndex) => {
                    const row = document.createElement('tr');
                    row.className = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    
                    // Add row header (entry multiple)
                    const headerCell = document.createElement('th');
                    headerCell.className = 'border border-gray-300 p-2 text-left';
                    headerCell.textContent = `Entry: ${entryMultiple.toFixed(1)}x`;
                    row.appendChild(headerCell);
                    
                    // Add cells for each exit multiple
                    sensitivityAnalysis.moicMatrix[rowIndex].forEach((moic, colIndex) => {
                        const cell = document.createElement('td');
                        cell.className = 'border border-gray-300 p-2 text-center';
                        
                        // Color-code MOIC values
                        if (moic >= 3.0) {
                            cell.className += ' bg-green-100';
                        } else if (moic >= 2.0) {
                            cell.className += ' bg-green-50';
                        } else if (moic < 1.0) {
                            cell.className += ' bg-red-50';
                        }
                        
                        cell.textContent = formatMultiple(moic);
                        row.appendChild(cell);
                    });
                    
                    moicBody.appendChild(row);
                });
            }
            
            // Update IRR sensitivity table
            const irrBody = document.getElementById('irr-sensitivity-body');
            if (irrBody) {
                irrBody.innerHTML = '';
                
                sensitivityAnalysis.entryMultiples.forEach((entryMultiple, rowIndex) => {
                    const row = document.createElement('tr');
                    row.className = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    
                    // Add row header (entry multiple)
                    const headerCell = document.createElement('th');
                    headerCell.className = 'border border-gray-300 p-2 text-left';
                    headerCell.textContent = `Entry: ${entryMultiple.toFixed(1)}x`;
                    row.appendChild(headerCell);
                    
                    // Add cells for each exit multiple
                    sensitivityAnalysis.irrMatrix[rowIndex].forEach((irr, colIndex) => {
                        const cell = document.createElement('td');
                        cell.className = 'border border-gray-300 p-2 text-center';
                        
                        // Color-code IRR values
                        if (irr >= 25) {
                            cell.className += ' bg-green-100';
                        } else if (irr >= 15) {
                            cell.className += ' bg-green-50';
                        } else if (irr < 0) {
                            cell.className += ' bg-red-50';
                        }
                        
                        cell.textContent = formatPercentage(irr);
                        row.appendChild(cell);
                    });
                    
                    irrBody.appendChild(row);
                });
            }
            
            // Update revenue growth sensitivity
            for (let i = 0; i < sensitivityAnalysis.revenueGrowthRates.length; i++) {
                // Update MOIC values
                const moicCell = document.getElementById(`growth-moic-${i}`);
                if (moicCell) {
                    moicCell.textContent = formatMultiple(sensitivityAnalysis.growthMoicValues[i]);
                    
                    // Color-code
                    if (sensitivityAnalysis.growthMoicValues[i] >= 3.0) {
                        moicCell.className = 'border border-gray-300 p-2 text-center bg-green-100';
                    } else if (sensitivityAnalysis.growthMoicValues[i] >= 2.0) {
                        moicCell.className = 'border border-gray-300 p-2 text-center bg-green-50';
                    } else if (sensitivityAnalysis.growthMoicValues[i] < 1.0) {
                        moicCell.className = 'border border-gray-300 p-2 text-center bg-red-50';
                    }
                }
                
                // Update IRR values
                const irrCell = document.getElementById(`growth-irr-${i}`);
                if (irrCell) {
                    irrCell.textContent = formatPercentage(sensitivityAnalysis.growthIrrValues[i]);
                    
                    // Color-code
                    if (sensitivityAnalysis.growthIrrValues[i] >= 25) {
                        irrCell.className = 'border border-gray-300 p-2 text-center bg-green-100';
                    } else if (sensitivityAnalysis.growthIrrValues[i] >= 15) {
                        irrCell.className = 'border border-gray-300 p-2 text-center bg-green-50';
                    } else if (sensitivityAnalysis.growthIrrValues[i] < 0) {
                        irrCell.className = 'border border-gray-300 p-2 text-center bg-red-50';
                    }
                }
            }
        };
    }
});