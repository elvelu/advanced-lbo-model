// LBO Model Data Structure
const LBOModel = {
    // Transaction inputs
    transaction: {
        ltmEBITDA: 100,  // $M
        evMultiple: 10,
        transactionFeesPct: 2,  // % of EV
        debtFeesPct: 3,        // % of debt
        managementEquityPct: 10,
    },
    
    // Sources and Uses 
    sourcesUses: {
        debtTranches: [
            { name: "Senior Debt", multiple: 2.0 },
            { name: "Subordinated Debt", multiple: 1.0 }
        ],
        
        // These will be calculated
        totalDebt: 0,
        equityContribution: 0,
        managementEquity: 0,     
        sponsorEquity: 0,   
        totalSources: 0,
        purchaseEV: 0,
        transactionFees: 0,
        debtIssuanceFees: 0,
        totalUses: 0
    },
    
    // Initialize the model 
    initialize: function() {
        // Load default values and create structures
        this.loadFromUI();
        
        // Get projection years from UI (default to 5 if not specified)
        const projectionYears = this.getProjectionYears();
        
        // Initialize arrays for cash flow with the correct length
        this.cashFlow.nwcPercentages = Array(projectionYears).fill(0); // Default 0% NWC change
        this.cashFlow.capexPercentages = Array(projectionYears).fill(3); // Default 3% of revenue for CapEx
        this.cashFlow.yearlyFlows = [];
    
        // Initialize projections for the specified years
        this.incomeStatement.projections = [];
        for (let year = 1; year <= projectionYears; year++) {
            this.incomeStatement.projections.push({
                year: year,
                revenueGrowthPct: 5,
                cogsPct: 60,
                sgaPct: 20,
                daPct: 3,
                taxRate: 25,
                // Calculated values
                revenue: 0,
                cogs: 0,
                sga: 0,
                ebitda: 0,
                da: 0,
                ebit: 0,
                interestExpense: 0,
                ebt: 0,
                taxes: 0,
                netIncome: 0
            });
        }
    },
    
    // Projection years functions
    getProjectionYears: function() {
        const projectionYearsInput = document.getElementById('projection-years');
        let years = 5; // Default to 5 years
        
        if (projectionYearsInput) {
            years = parseInt(projectionYearsInput.value) || 5;
            // Limit to between 5 and 10 years
            years = Math.max(5, Math.min(10, years));
        }
        
        return years;
    },
    
    updateProjectionYears: function(years) {
        // Cap years between 5 and 10
        years = Math.max(5, Math.min(10, years));
        
        // Update array lengths
        // For cashFlow
        this.cashFlow.nwcPercentages = this.cashFlow.nwcPercentages.slice(0, years);
        this.cashFlow.capexPercentages = this.cashFlow.capexPercentages.slice(0, years);
        
        // Add elements if needed
        while (this.cashFlow.nwcPercentages.length < years) {
            this.cashFlow.nwcPercentages.push(0);
        }
        while (this.cashFlow.capexPercentages.length < years) {
            this.cashFlow.capexPercentages.push(3);
        }
        
        // For income statement projections
        if (this.incomeStatement.projections.length > years) {
            // Truncate if we have too many years
            this.incomeStatement.projections = this.incomeStatement.projections.slice(0, years);
        } else {
            // Add more years if needed
            const currentYears = this.incomeStatement.projections.length;
            for (let year = currentYears + 1; year <= years; year++) {
                this.incomeStatement.projections.push({
                    year: year,
                    revenueGrowthPct: 5,
                    cogsPct: 60,
                    sgaPct: 20,
                    daPct: 3,
                    taxRate: 25,
                    // Calculated values
                    revenue: 0,
                    cogs: 0,
                    sga: 0,
                    ebitda: 0,
                    da: 0,
                    ebit: 0,
                    interestExpense: 0,
                    ebt: 0,
                    taxes: 0,
                    netIncome: 0
                });
            }
        }
        
        // Return the actual number of years set
        return years;
    },
    
    
    // Initialize debt assumptions based on tranches
    populateDebtAssumptions: function() {
        this.debtAssumptions = [];
        
        this.sourcesUses.debtTranches.forEach(tranche => {
            this.debtAssumptions.push({
                name: tranche.name,
                amount: tranche.amount,
                amortizationPct: 5, // Default values
                interestRate: 6,
                cashFlowSweepPct: 50
            });
        });
    },

    
    // Load cash flow inputs from UI
    loadCashFlowFromUI: function() {
        const projectionYears = this.incomeStatement.projections.length;
        
        // Load NWC and CapEx percentages
        for (let year = 1; year <= projectionYears; year++) {
            const nwcInput = document.getElementById(`cf-nwc-pct-${year}`);
            const capexInput = document.getElementById(`cf-capex-pct-${year}`);
            
            if (nwcInput) {
                this.cashFlow.nwcPercentages[year-1] = parseFloat(nwcInput.value) || 0;
            }
            
            if (capexInput) {
                this.cashFlow.capexPercentages[year-1] = parseFloat(capexInput.value) || 3;
            }
        }
    },   

 
    // Load values from UI inputs
    loadFromUI: function() {
        // Transaction inputs
        this.transaction.ltmEBITDA = parseFloat(document.getElementById('ltm-ebitda').value) || 100;
        this.transaction.evMultiple = parseFloat(document.getElementById('ev-ebitda-multiple').value) || 10;
        console.log("LOADED FROM UI - EBITDA:", this.transaction.ltmEBITDA, "Multiple:", this.transaction.evMultiple);
        this.transaction.transactionFeesPct = parseFloat(document.getElementById('transaction-fees-pct').value) || 2;
        this.transaction.debtFeesPct = parseFloat(document.getElementById('debt-fees-pct').value) || 3;
        this.transaction.managementEquityPct = parseFloat(document.getElementById('mgmt-equity-pct').value) || 10;
    },
    
    // Fix for Purchase Enterprise Value and Debt Limit
    calculateSourcesUses: function() {
        const ltmEBITDA = parseFloat(this.transaction.ltmEBITDA);
        const evMultiple = parseFloat(this.transaction.evMultiple);

        console.log("CALCULATING - EBITDA:", ltmEBITDA, "Multiple:", evMultiple);

        
        // Step 1: Calculate Enterprise Value
        this.sourcesUses.purchaseEV = ltmEBITDA * evMultiple;
        console.log("CALCULATED EV:", this.sourcesUses.purchaseEV);
        
        // Step 2: Calculate Transaction Fees
        this.sourcesUses.transactionFees = 
            this.sourcesUses.purchaseEV * (this.transaction.transactionFeesPct / 100);
        
        // Step 3: Calculate debt amounts based on EBITDA multiples
        let totalDebt = 0;
        this.sourcesUses.debtTranches.forEach(tranche => {
            tranche.amount = ltmEBITDA * tranche.multiple;
            totalDebt += tranche.amount;
        });
        this.sourcesUses.totalDebt = totalDebt;
        
        // Step 4: Calculate Debt Issuance Fees
        this.sourcesUses.debtIssuanceFees = 
            totalDebt * (this.transaction.debtFeesPct / 100);
        
        // Step 5: Calculate total uses (purchase price + fees)
        this.sourcesUses.totalUses = 
            this.sourcesUses.purchaseEV + 
            this.sourcesUses.transactionFees +
            this.sourcesUses.debtIssuanceFees;
        
        // Step 6: Calculate Equity Contribution (total uses minus debt)
        this.sourcesUses.equityContribution = 
            this.sourcesUses.totalUses - this.sourcesUses.totalDebt;
        
        // Step 7: Ensure equity isn't negative
        if (this.sourcesUses.equityContribution < 0) {
            this.sourcesUses.equityContribution = 0;
        }
        
        // Step 8: Calculate Management and Sponsor Equity split
        this.sourcesUses.managementEquity = 
            this.sourcesUses.equityContribution * (this.transaction.managementEquityPct / 100);
    
        this.sourcesUses.sponsorEquity = 
            this.sourcesUses.equityContribution - this.sourcesUses.managementEquity;
    
        // Step 9: Calculate Total Sources (should equal Total Uses)
        this.sourcesUses.totalSources = 
            this.sourcesUses.totalDebt + this.sourcesUses.equityContribution;
        
        // Step 10: Calculate percentages
        if (this.sourcesUses.totalSources > 0) {
            this.sourcesUses.debtPct = (this.sourcesUses.totalDebt / this.sourcesUses.totalSources) * 100;
            this.sourcesUses.equityPct = (this.sourcesUses.equityContribution / this.sourcesUses.totalSources) * 100;
        } else {
            this.sourcesUses.debtPct = 0;
            this.sourcesUses.equityPct = 0;
        }
                
        return this.sourcesUses;
    },

    // Debt assumptions
    debtAssumptions: [],

    // Income statement
    incomeStatement: {
        historical: {
            revenue: 500,
            cogsPct: 60,
            sgaPct: 20,
            daPct: 3,
            taxRate: 25,
            // Calculated values
            cogs: 0,
            sga: 0,
            ebitda: 0,
            da: 0,
            ebit: 0,
            interestExpense: 0,
            ebt: 0,
            taxes: 0,
            netIncome: 0
        },
        
        projections: [
            // Will be populated with 5 years of projections
        ]
    },


    // Load income statement values from UI
    loadIncomeStatementFromUI: function() {
        // Load historical values
        this.incomeStatement.historical.revenue = parseFloat(document.getElementById('historical-revenue').value) || 500;
        this.incomeStatement.historical.cogsPct = parseFloat(document.getElementById('historical-cogs-pct').value) || 60;
        this.incomeStatement.historical.sgaPct = parseFloat(document.getElementById('historical-sga-pct').value) || 20;
        this.incomeStatement.historical.daPct = parseFloat(document.getElementById('historical-da-pct').value) || 3;
        this.incomeStatement.historical.taxRate = parseFloat(document.getElementById('historical-tax-rate').value) || 25;
        
        // Get the number of years being projected
        const projectionYears = this.incomeStatement.projections.length;
        
        // Load projections for all available years (up to 10)
        for (let year = 1; year <= projectionYears; year++) {
            // Only try to get input values if the elements exist
            const revGrowthEl = document.getElementById(`rev-growth-${year}`);
            const cogsPctEl = document.getElementById(`cogs-pct-${year}`);
            const sgaPctEl = document.getElementById(`sga-pct-${year}`);
            const daPctEl = document.getElementById(`da-pct-${year}`);
            const taxRateEl = document.getElementById(`tax-rate-${year}`);
            
            // Default values if elements don't exist
            let revGrowth = 5;
            let cogsPct = 60;
            let sgaPct = 20;
            let daPct = 3;
            let taxRate = 25;
            
            // If these elements exist, get their values
            if (revGrowthEl) revGrowth = parseFloat(revGrowthEl.value) || 5;
            if (cogsPctEl) cogsPct = parseFloat(cogsPctEl.value) || 60;
            if (sgaPctEl) sgaPct = parseFloat(sgaPctEl.value) || 20;
            if (daPctEl) daPct = parseFloat(daPctEl.value) || 3;
            if (taxRateEl) taxRate = parseFloat(taxRateEl.value) || 25;
            
            // Update the projection year data
            this.incomeStatement.projections[year-1].revenueGrowthPct = revGrowth;
            this.incomeStatement.projections[year-1].cogsPct = cogsPct;
            this.incomeStatement.projections[year-1].sgaPct = sgaPct;
            this.incomeStatement.projections[year-1].daPct = daPct;
            this.incomeStatement.projections[year-1].taxRate = taxRate;
        }
    },
    
    // Load debt assumptions from UI
    loadDebtAssumptionsFromUI: function() {
        this.debtAssumptions.forEach((assumption, index) => {
            const amortInput = document.getElementById(`amort-rate-${index}`);
            const interestInput = document.getElementById(`interest-rate-${index}`);
            const sweepInput = document.getElementById(`cf-sweep-${index}`);
            
            if (amortInput && interestInput && sweepInput) {
                assumption.amortizationPct = parseFloat(amortInput.value) || 5;
                assumption.interestRate = parseFloat(interestInput.value) || 6;
                assumption.cashFlowSweepPct = parseFloat(sweepInput.value) || 50;
            }
        });
    },

    // Calculate income statement
    calculateIncomeStatement: function() {
        // Calculate historical figures
        const historical = this.incomeStatement.historical;
        historical.cogs = historical.revenue * (historical.cogsPct / 100);
        historical.sga = historical.revenue * (historical.sgaPct / 100);
        historical.ebitda = historical.revenue - historical.cogs - historical.sga;
        historical.da = historical.revenue * (historical.daPct / 100);
        historical.ebit = historical.ebitda - historical.da;
        historical.ebt = historical.ebit - historical.interestExpense;
        historical.taxes = Math.max(0, historical.ebt * (historical.taxRate / 100));
        historical.netIncome = historical.ebt - historical.taxes;
        
        // Calculate projections
        let prevYearRevenue = historical.revenue;
        
        this.incomeStatement.projections.forEach((year, index) => {
            // Revenue
            year.revenue = prevYearRevenue * (1 + year.revenueGrowthPct / 100);
            prevYearRevenue = year.revenue;
            
            // Expenses
            year.cogs = year.revenue * (year.cogsPct / 100);
            year.sga = year.revenue * (year.sgaPct / 100);
            
            // EBITDA
            year.ebitda = year.revenue - year.cogs - year.sga;
            
            // D&A
            year.da = year.revenue * (year.daPct / 100);
            
            // EBIT
            year.ebit = year.ebitda - year.da;
            
            // Note: Interest expense will be calculated in debt schedule
            // For now, set a placeholder
            year.interestExpense = 0;
            
            // EBT
            year.ebt = year.ebit - year.interestExpense;
            
            // Taxes
            year.taxes = Math.max(0, year.ebt * (year.taxRate / 100));
            
            // Net Income
            year.netIncome = year.ebt - year.taxes;
        });
        
        return this.incomeStatement;
    },

    // Debt schedule
    debtSchedule: {
        tranches: [], // Will contain each tranche's schedule by year
        totalsByYear: [] // Will contain totals for all tranches by year
    },

    // Credit ratios
    creditRatios: [],

    // Calculate debt schedule
    calculateDebtSchedule: function() {
        // Initialize debt schedule
        this.debtSchedule.tranches = [];
        this.debtSchedule.totalsByYear = [];
        
        // Get the number of projection years
        const projectionYears = this.incomeStatement.projections.length;
        
        // Initialize totals for year 0 plus all projection years
        for (let year = 0; year <= projectionYears; year++) {
            this.debtSchedule.totalsByYear.push({
                year: year,
                beginningBalance: 0,
                scheduledAmortization: 0,
                additionalAmortization: 0,
                totalAmortization: 0,
                endingBalance: 0,
                interestExpense: 0
            });
        }
        
        // Calculate schedule for each debt tranche
        this.debtAssumptions.forEach((tranche, trancheIndex) => {
            const trancheSchedule = [];
            
            // Initialize year 0 (starting point)
            trancheSchedule.push({
                year: 0,
                beginningBalance: tranche.amount,
                scheduledAmortization: 0,
                additionalAmortization: 0,
                totalAmortization: 0,
                endingBalance: tranche.amount,
                interestExpense: 0
            });
            
            // Calculate for all projection years
            for (let year = 1; year <= projectionYears; year++) {
                const prevYear = trancheSchedule[year - 1];
                const yearSchedule = {
                    year: year,
                    beginningBalance: prevYear.endingBalance,
                    scheduledAmortization: prevYear.endingBalance * (tranche.amortizationPct / 100),
                    additionalAmortization: 0, // Will be calculated based on cash flow sweep
                    totalAmortization: 0, // Will be updated after calculating additionalAmortization
                    endingBalance: 0, // Will be calculated
                    interestExpense: prevYear.endingBalance * (tranche.interestRate / 100)
                };
                
                yearSchedule.totalAmortization = yearSchedule.scheduledAmortization + yearSchedule.additionalAmortization;
                yearSchedule.endingBalance = yearSchedule.beginningBalance - yearSchedule.totalAmortization;
                
                // Ensure ending balance doesn't go below zero
                if (yearSchedule.endingBalance < 0) {
                    yearSchedule.endingBalance = 0;
                    yearSchedule.totalAmortization = yearSchedule.beginningBalance;
                    yearSchedule.scheduledAmortization = yearSchedule.totalAmortization;
                }
                
                trancheSchedule.push(yearSchedule);
                
                // Update income statement interest expense
                this.incomeStatement.projections[year - 1].interestExpense += yearSchedule.interestExpense;
                
                // Update total for this year
                this.debtSchedule.totalsByYear[year].beginningBalance += yearSchedule.beginningBalance;
                this.debtSchedule.totalsByYear[year].scheduledAmortization += yearSchedule.scheduledAmortization;
                this.debtSchedule.totalsByYear[year].additionalAmortization += yearSchedule.additionalAmortization;
                this.debtSchedule.totalsByYear[year].totalAmortization += yearSchedule.totalAmortization;
                this.debtSchedule.totalsByYear[year].endingBalance += yearSchedule.endingBalance;
                this.debtSchedule.totalsByYear[year].interestExpense += yearSchedule.interestExpense;
            }
            
            // Add this tranche's schedule to the debt schedule
            this.debtSchedule.tranches.push({
                name: tranche.name,
                schedule: trancheSchedule
            });
        });
        
        // Update year 0 totals
        this.debtSchedule.totalsByYear[0].beginningBalance = this.sourcesUses.totalDebt;
        this.debtSchedule.totalsByYear[0].endingBalance = this.sourcesUses.totalDebt;
        
        return this.debtSchedule;
    },
    

    // Calculate credit ratios
    calculateCreditRatios: function() {
        this.creditRatios = [];
        
        // Get the number of projection years
        const projectionYears = this.incomeStatement.projections.length;
        
        // Calculate for each projection year
        for (let year = 1; year <= projectionYears; year++) {
            const yearProjection = this.incomeStatement.projections[year - 1];
            const yearDebtSchedule = this.debtSchedule.totalsByYear[year];
            
            const debtService = yearDebtSchedule.interestExpense + yearDebtSchedule.totalAmortization;
            
            const ratio = {
                year: year,
                debtToEBITDA: yearDebtSchedule.beginningBalance / yearProjection.ebitda,
                interestCoverageRatio: yearProjection.ebit / yearDebtSchedule.interestExpense,
                debtServiceCoverageRatio: yearProjection.ebitda / debtService
            };
            
            this.creditRatios.push(ratio);
        }
        
        return this.creditRatios;
    },
    // Cash flow statement
    cashFlow: {
        nwcPercentages: [], // Percentage of revenue change for NWC
        capexPercentages: [], // Percentage of revenue for CapEx
        yearlyFlows: [] // Will contain calculated cash flows for each year
    },

    // Calculate cash flows
    calculateCashFlows: function() {
        // Reset yearly flows
        this.cashFlow.yearlyFlows = [];
        
        // Calculate for each projection year
        for (let year = 1; year <= this.incomeStatement.projections.length; year++) {
            const projection = this.incomeStatement.projections[year - 1];
            const debtYear = this.debtSchedule.totalsByYear[year];
            
            // Calculate revenue change
            const prevYearRevenue = year === 1 ? 
                this.incomeStatement.historical.revenue : 
                this.incomeStatement.projections[year - 2].revenue;
            const revenueChange = projection.revenue - prevYearRevenue;
            
            // Working capital calculation (based on revenue change)
            const nwcPct = this.cashFlow.nwcPercentages[year - 1] || 0;
            const nwcChange = revenueChange * (nwcPct / 100);
            
            // CapEx calculation (based on revenue)
            const capexPct = this.cashFlow.capexPercentages[year - 1] || 3;
            const capex = projection.revenue * (capexPct / 100);
            
            // Calculate FCF before debt service
            const fcfBeforeDebt = projection.netIncome + projection.da - nwcChange - capex;
            
            // Calculate FCF available for debt sweep
            const availableForSweep = fcfBeforeDebt - debtYear.interestExpense - debtYear.scheduledAmortization;
            
            // Calculate FCF to equity (after all debt service)
            const fcfToEquity = availableForSweep - debtYear.additionalAmortization;
            
            // Add to yearly flows
            this.cashFlow.yearlyFlows.push({
                year: year,
                netIncome: projection.netIncome,
                da: projection.da,
                nwcChange: nwcChange,
                capex: capex,
                fcfBeforeDebt: fcfBeforeDebt,
                interestExpense: debtYear.interestExpense,
                scheduledAmortization: debtYear.scheduledAmortization,
                availableForSweep: availableForSweep,
                additionalAmortization: debtYear.additionalAmortization,
                fcfToEquity: fcfToEquity
            });
        }
        
        return this.cashFlow;
    },

    // Calculate cash flow available for debt repayment
    calculateCashFlowSweep: function() {
        // First ensure cash flows are calculated
        if (!this.cashFlow.yearlyFlows || this.cashFlow.yearlyFlows.length === 0) {
            this.calculateCashFlows();
        }
        
        const projectionYears = this.incomeStatement.projections.length;

        // Allocate the additional amortization based on the cash flow sweep
        for (let yearIndex = 0; yearIndex < projectionYears; yearIndex++) {
            const yearCashFlow = this.cashFlow.yearlyFlows[yearIndex];
            let remainingSweepCash = yearCashFlow.availableForSweep;
            
            // Nothing to sweep if no cash available
            if (remainingSweepCash <= 0) continue;
            
            // Reset additional amortization for this year
            this.debtSchedule.totalsByYear[yearIndex + 1].additionalAmortization = 0;
            
            // Prioritize tranches based on seniority (first tranches get priority)
            for (let trancheIndex = 0; trancheIndex < this.debtAssumptions.length; trancheIndex++) {
                const tranche = this.debtAssumptions[trancheIndex];
                const sweepPct = tranche.cashFlowSweepPct / 100;
                
                // Calculate max additional payment for this tranche
                const trancheSchedule = this.debtSchedule.tranches[trancheIndex].schedule;
                const beginningBalance = trancheSchedule[yearIndex + 1].beginningBalance;
                const scheduledAmortization = trancheSchedule[yearIndex + 1].scheduledAmortization;
                const maxAdditional = beginningBalance - scheduledAmortization;
                
                // Calculate actual additional payment (limited by sweep percentage and remaining balance)
                const additionalPayment = Math.min(
                    remainingSweepCash * sweepPct, // Percentage of available cash
                    maxAdditional // Cannot exceed remaining balance
                );
                
                // Update tranche schedule
                trancheSchedule[yearIndex + 1].additionalAmortization = additionalPayment;
                trancheSchedule[yearIndex + 1].totalAmortization =
                    trancheSchedule[yearIndex + 1].scheduledAmortization + additionalPayment;
                trancheSchedule[yearIndex + 1].endingBalance =
                    trancheSchedule[yearIndex + 1].beginningBalance - trancheSchedule[yearIndex + 1].totalAmortization;

                // Propagate new balance to next year
                if (yearIndex + 2 <= projectionYears) {
                    const next = trancheSchedule[yearIndex + 2];
                    if (next) {
                        next.beginningBalance = trancheSchedule[yearIndex + 1].endingBalance;
                        next.scheduledAmortization = next.beginningBalance * (tranche.amortizationPct / 100);
                        next.interestExpense = next.beginningBalance * (tranche.interestRate / 100);
                    }
                }
                
                // Update total for this year
                this.debtSchedule.totalsByYear[yearIndex + 1].additionalAmortization += additionalPayment;
                this.debtSchedule.totalsByYear[yearIndex + 1].totalAmortization = 
                    this.debtSchedule.totalsByYear[yearIndex + 1].scheduledAmortization + 
                    this.debtSchedule.totalsByYear[yearIndex + 1].additionalAmortization;
                this.debtSchedule.totalsByYear[yearIndex + 1].endingBalance = 
                    this.debtSchedule.totalsByYear[yearIndex + 1].beginningBalance - 
                    this.debtSchedule.totalsByYear[yearIndex + 1].totalAmortization;
                
                // Reduce remaining sweep cash
                remainingSweepCash -= additionalPayment;
                
                // Nothing left to sweep
                if (remainingSweepCash <= 0) break;
            }
            
            // Update cashflow with final additional amortization amount
            yearCashFlow.additionalAmortization = this.debtSchedule.totalsByYear[yearIndex + 1].additionalAmortization;
            yearCashFlow.fcfToEquity = yearCashFlow.availableForSweep - yearCashFlow.additionalAmortization;
        }

        // Recalculate totals and interest after sweep adjustments
        this.debtSchedule.totalsByYear = [];
        for (let year = 0; year <= projectionYears; year++) {
            const totals = {
                year: year,
                beginningBalance: 0,
                scheduledAmortization: 0,
                additionalAmortization: 0,
                totalAmortization: 0,
                endingBalance: 0,
                interestExpense: 0
            };

            this.debtSchedule.tranches.forEach(tr => {
                const sched = tr.schedule[year];
                totals.beginningBalance += sched.beginningBalance;
                totals.scheduledAmortization += sched.scheduledAmortization;
                totals.additionalAmortization += sched.additionalAmortization;
                totals.totalAmortization += sched.totalAmortization;
                totals.endingBalance += sched.endingBalance;
                totals.interestExpense += sched.interestExpense;
            });

            this.debtSchedule.totalsByYear.push(totals);

            if (year > 0) {
                this.incomeStatement.projections[year - 1].interestExpense = totals.interestExpense;
            }
        }

        // Update cash flow equity amounts with final totals
        for (let i = 0; i < projectionYears; i++) {
            const flow = this.cashFlow.yearlyFlows[i];
            flow.additionalAmortization = this.debtSchedule.totalsByYear[i + 1].additionalAmortization;
            flow.fcfToEquity = flow.availableForSweep - flow.additionalAmortization;
        }

        return this.cashFlow.yearlyFlows;
    },

    returns: {
        exitYear: 5,
        exitMultiple: 8.0,
        initialEquity: 0,
        exitEquity: 0,
        moic: 0,
        irr: 0,
        cashFlows: [],
        cumulativeCashFlows: [],
        cashFlowAttribution: 0,    // Percentage of return from cash flows
        exitValueAttribution: 0,   // Percentage of return from exit value
        managementReturns: {
            initialEquity: 0,
            exitEquity: 0,
            moic: 0,
            irr: 0
        },
        sponsorReturns: {
            initialEquity: 0,
            exitEquity: 0,
            moic: 0,
            irr: 0
        }
    },

    // Calculate returns
    calculateReturns: function() {
        // Reset cashflows array
        this.returns.cashFlows = [];
        
        // Store initial equity investment (negative cash flow at time 0)
        this.returns.initialEquity = this.sourcesUses.equityContribution;
        this.returns.cashFlows.push(-this.returns.initialEquity);
        
        // Add all intermediate cash flows to equity
        for (let year = 0; year < this.cashFlow.yearlyFlows.length; year++) {
            // Skip if this is the exit year (we'll handle that separately)
            if (year + 1 === this.returns.exitYear) continue;
            
            // Add free cash flow to equity for this year
            this.returns.cashFlows.push(this.cashFlow.yearlyFlows[year].fcfToEquity);
        }
        
        // Calculate exit enterprise value
        const exitYear = this.returns.exitYear;
        const exitEBITDA = this.incomeStatement.projections[exitYear - 1].ebitda;
        const exitEnterpriseValue = exitEBITDA * this.returns.exitMultiple;
        
        // Calculate exit equity value (EV minus remaining debt)
        const exitDebt = this.debtSchedule.totalsByYear[exitYear].endingBalance;
        this.returns.exitEquity = exitEnterpriseValue - exitDebt;
        
        // Add terminal value (exit equity value) plus the final year's free cash flow
        // to represent full value received in the exit year
        const finalYearCF = exitYear <= this.cashFlow.yearlyFlows.length ? 
            this.cashFlow.yearlyFlows[exitYear - 1].fcfToEquity : 0;
        
        this.returns.cashFlows.push(this.returns.exitEquity + finalYearCF);
        
        // Calculate MOIC (Multiple of Invested Capital)
        // Sum up all positive cash flows (includes intermediate CF and exit value)
        const totalPositiveCF = this.returns.cashFlows.reduce((sum, cf, index) => {
            return index === 0 ? sum : sum + cf; // Skip the initial investment (negative CF)
        }, 0);
        
        this.returns.moic = totalPositiveCF / this.returns.initialEquity;
        
        // Calculate IRR using the proper cash flow stream
        this.returns.irr = this.calculateIRR(this.returns.cashFlows);

        this.returns.cumulativeCashFlows = [];
        let cumulative = 0;
        for (let i = 0; i < this.returns.cashFlows.length; i++) {
            if (i === 0) {
                // Skip initial investment
                this.returns.cumulativeCashFlows.push(0);
            } else {
                cumulative += this.returns.cashFlows[i];
                this.returns.cumulativeCashFlows.push(cumulative);
            }
        }
        
        // Calculate return attribution
        const totalReturn = this.returns.moic * this.returns.initialEquity;
        const exitValue = this.returns.exitEquity;
        const cashFlowsValue = totalReturn - exitValue;
        
        // Attribution percentages
        this.returns.cashFlowAttribution = (cashFlowsValue / totalReturn) * 100;
        this.returns.exitValueAttribution = (exitValue / totalReturn) * 100;
        
        // Calculate management returns
        const managementPct = this.transaction.managementEquityPct / 100;
        this.returns.managementReturns.initialEquity = this.returns.initialEquity * managementPct;
        this.returns.managementReturns.exitEquity = this.returns.exitEquity * managementPct;
        this.returns.managementReturns.moic = this.returns.moic; // Same MOIC
        this.returns.managementReturns.irr = this.returns.irr;   // Same IRR
        
        // Calculate sponsor returns
        const sponsorPct = 1 - managementPct;
        this.returns.sponsorReturns.initialEquity = this.returns.initialEquity * sponsorPct;
        this.returns.sponsorReturns.exitEquity = this.returns.exitEquity * sponsorPct;
        this.returns.sponsorReturns.moic = this.returns.moic; // Same MOIC
        this.returns.sponsorReturns.irr = this.returns.irr;   // Same IRR
        
        return this.returns;
    },

    // Fix for IRR calculation
    calculateIRR: function(cashFlows) {
        // Edge case: if there's no exit value or just one cash flow, return 0
        if (cashFlows.length <= 1 || (cashFlows[0] === 0 && cashFlows.length === 2)) {
            return 0;
        }
        
        // If the exit value is less than the initial investment, IRR is negative
        if (cashFlows.length === 2 && cashFlows[1] < Math.abs(cashFlows[0])) {
            // Start with a negative guess for negative IRR
            let guess = -0.5;
            
            // IRR calculation with Newton-Raphson, modified for negative IRRs
            const maxIterations = 1000;
            const tolerance = 0.000001;
            
            for (let i = 0; i < maxIterations; i++) {
                let npv = 0;
                let derivativeNpv = 0;
                
                // Calculate NPV and its derivative with current guess
                for (let j = 0; j < cashFlows.length; j++) {
                    // Skip zero cash flows
                    if (cashFlows[j] === 0) continue;
                    
                    const factor = Math.pow(1 + guess, j);
                    npv += cashFlows[j] / factor;
                    derivativeNpv -= j * cashFlows[j] / Math.pow(1 + guess, j + 1);
                }
                
                // If NPV is close enough to zero, we found our IRR
                if (Math.abs(npv) < tolerance) {
                    return guess * 100; // Convert to percentage
                }
                
                // If derivative is too small, avoid division by near-zero
                if (Math.abs(derivativeNpv) < 1e-10) {
                    return guess * 100;
                }
                
                // Update guess using Newton-Raphson formula
                const newGuess = guess - npv / derivativeNpv;
                
                // If the new guess is too extreme, limit the change
                if (newGuess < -0.99) {
                    guess = -0.99;
                } else if (newGuess > 100) {
                    guess = 1.0;
                } else {
                    guess = newGuess;
                }
            }
            
            // If we didn't converge, return a reasonable negative number
            return -100;
        }
        
        // Standard IRR calculation for positive returns
        const maxIterations = 1000;
        const tolerance = 0.000001;
        
        let guess = 0.1; // Initial guess
        
        for (let i = 0; i < maxIterations; i++) {
            let npv = 0;
            let derivativeNpv = 0;
            
            for (let j = 0; j < cashFlows.length; j++) {
                // Skip zero cash flows
                if (cashFlows[j] === 0) continue;
                
                const factor = Math.pow(1 + guess, j);
                npv += cashFlows[j] / factor;
                derivativeNpv -= j * cashFlows[j] / Math.pow(1 + guess, j + 1);
            }
            
            if (Math.abs(npv) < tolerance) {
                return guess * 100; // Convert to percentage
            }
            
            // Avoid division by very small numbers
            if (Math.abs(derivativeNpv) < 1e-10) {
                break;
            }
            
            guess = guess - npv / derivativeNpv;
            
            // Check for non-convergence
            if (guess <= -1) {
                return -100; // Return -100% if IRR calculation fails to converge for negative values
            }
        }
        
        return guess * 100; // Convert to percentage
    },

    // Load returns values from UI
    loadReturnsFromUI: function() {
        const exitMultipleInput = document.getElementById('exit-multiple');
        const exitYearInput = document.getElementById('exit-year');
        
        if (exitMultipleInput) {
            this.returns.exitMultiple = parseFloat(exitMultipleInput.value) || 8.0;
        }
        
        if (exitYearInput) {
            // Get the value from input, default to 5
            let exitYear = parseInt(exitYearInput.value) || 5;
            
            // Cap exit year to the number of projection years
            const maxYear = this.incomeStatement.projections.length;
            exitYear = Math.min(exitYear, maxYear);
            
            this.returns.exitYear = exitYear;
        }
    },

    sensitivityAnalysis: {
        // Entry multiple ranges
        entryMultiples: [8, 9, 10, 11, 12],
        
        // Exit multiple ranges
        exitMultiples: [6, 7, 8, 9, 10],
        
        // Revenue growth ranges
        revenueGrowthRates: [3, 4, 5, 6, 7],
        
        // Results matrices
        moicMatrix: [],
        irrMatrix: [],
        
        // Revenue growth sensitivity
        growthMoicValues: [],
        growthIrrValues: []
    },

    // Calculate sensitivity analysis
    calculateSensitivity: function() {
        // Initialize matrices
        this.sensitivityAnalysis.moicMatrix = [];
        this.sensitivityAnalysis.irrMatrix = [];
        
        // Store original values so we can restore them
        const originalEntryMultiple = this.transaction.evMultiple;
        const originalExitMultiple = this.returns.exitMultiple;
        const originalTotalDebt = this.sourcesUses.totalDebt;
        const originalEquityContribution = this.sourcesUses.equityContribution;
        const originalPurchaseEV = this.sourcesUses.purchaseEV;
        const originalTransactionFees = this.sourcesUses.transactionFees;
        const originalDebtIssuanceFees = this.sourcesUses.debtIssuanceFees;
        const originalTotalUses = this.sourcesUses.totalUses;
        
        const originalGrowthRates = [];
        this.incomeStatement.projections.forEach(year => {
            originalGrowthRates.push(year.revenueGrowthPct);
        });
        
        // Calculate entry vs exit multiple sensitivity
        for (let i = 0; i < this.sensitivityAnalysis.entryMultiples.length; i++) {
            const entryMultiple = this.sensitivityAnalysis.entryMultiples[i];
            
            const moicRow = [];
            const irrRow = [];
            
            for (let j = 0; j < this.sensitivityAnalysis.exitMultiples.length; j++) {
                const exitMultiple = this.sensitivityAnalysis.exitMultiples[j];
                
                // Temporarily set multiples
                this.transaction.evMultiple = entryMultiple;
                this.returns.exitMultiple = exitMultiple;
                
                // Recalculate
                this.calculateSourcesUses();
                this.populateDebtAssumptions();
                this.calculateIncomeStatement();
                this.calculateDebtSchedule();
                this.calculateCashFlowSweep();
                this.calculateReturns();
                
                // Store results
                moicRow.push(this.returns.moic);
                irrRow.push(this.returns.irr);
            }
            
            this.sensitivityAnalysis.moicMatrix.push(moicRow);
            this.sensitivityAnalysis.irrMatrix.push(irrRow);
        }
        
        // Reset entry and exit multiples
        this.transaction.evMultiple = originalEntryMultiple;
        this.returns.exitMultiple = originalExitMultiple;
        this.sourcesUses.purchaseEV = originalPurchaseEV; // Add this line

        // Calculate revenue growth sensitivity
        this.sensitivityAnalysis.growthMoicValues = [];
        this.sensitivityAnalysis.growthIrrValues = [];
        
        for (let i = 0; i < this.sensitivityAnalysis.revenueGrowthRates.length; i++) {
            const growthRate = this.sensitivityAnalysis.revenueGrowthRates[i];
            
            // Set all projections to this growth rate
            this.incomeStatement.projections.forEach(year => {
                year.revenueGrowthPct = growthRate;
            });
            
            // Recalculate
            this.calculateIncomeStatement();
            this.calculateDebtSchedule();
            this.calculateCashFlowSweep();
            
            // Recalculate income statement after debt schedule (to update with interest expense)
            this.incomeStatement.projections.forEach(year => {
                year.ebt = year.ebit - year.interestExpense;
                year.taxes = Math.max(0, year.ebt * (year.taxRate / 100));
                year.netIncome = year.ebt - year.taxes;
            });
            
            this.calculateReturns();
            
            // Store results
            this.sensitivityAnalysis.growthMoicValues.push(this.returns.moic);
            this.sensitivityAnalysis.growthIrrValues.push(this.returns.irr);
        }
        
        // Reset revenue growth rates
        this.incomeStatement.projections.forEach((year, index) => {
            year.revenueGrowthPct = originalGrowthRates[index];
        });
        
        // Restore ALL original values
        this.transaction.evMultiple = originalEntryMultiple;
        this.returns.exitMultiple = originalExitMultiple;
        this.sourcesUses.purchaseEV = originalPurchaseEV;
        this.sourcesUses.totalDebt = originalTotalDebt;
        this.sourcesUses.equityContribution = originalEquityContribution;
        this.sourcesUses.transactionFees = originalTransactionFees;
        this.sourcesUses.debtIssuanceFees = originalDebtIssuanceFees;
        this.sourcesUses.totalUses = originalTotalUses;
        
        // Completely recalculate with original values to ensure everything is consistent
        this.calculateSourcesUses();
        this.calculateIncomeStatement();
        this.calculateDebtSchedule();
        this.calculateCashFlows();
        this.calculateCashFlowSweep();
        this.calculateReturns();

        // Recalculate income statement after debt schedule
        this.incomeStatement.projections.forEach(year => {
            year.ebt = year.ebit - year.interestExpense;
            year.taxes = Math.max(0, year.ebt * (year.taxRate / 100));
            year.netIncome = year.ebt - year.taxes;
        });

        return this.sensitivityAnalysis;
    },

    // Update calculateModel to include sensitivity analysis
    calculateModel: function() {
        // Load all inputs from UI
        this.loadFromUI();
        this.loadIncomeStatementFromUI();
        this.loadReturnsFromUI();
        this.loadCashFlowFromUI();
        
        // Calculate all model components completely from scratch
        this.calculateSourcesUses();
        this.populateDebtAssumptions();
        this.loadDebtAssumptionsFromUI();
        
        // Reset interest expense for recalculation
        this.incomeStatement.projections.forEach(year => {
            year.interestExpense = 0;
        });
        
        this.calculateIncomeStatement();
        this.calculateDebtSchedule();
        this.calculateCashFlows();
        this.calculateCashFlowSweep();
        
        // Recalculate income statement after debt schedule
        this.incomeStatement.projections.forEach(year => {
            year.ebt = year.ebit - year.interestExpense;
            year.taxes = Math.max(0, year.ebt * (year.taxRate / 100));
            year.netIncome = year.ebt - year.taxes;
        });
        
        // Final recalculations
        this.calculateCreditRatios();
        this.calculateReturns();
        this.calculateSensitivity();
        
        return {
            transaction: this.transaction,
            sourcesUses: this.sourcesUses,
            debtAssumptions: this.debtAssumptions,
            incomeStatement: this.incomeStatement,
            debtSchedule: this.debtSchedule,
            creditRatios: this.creditRatios,
            cashFlow: this.cashFlow,
            returns: this.returns,
            sensitivityAnalysis: this.sensitivityAnalysis
        };
    }
};