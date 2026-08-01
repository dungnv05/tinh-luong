// --- Constants & Regulation Configuration ---
const REGULATIONS = {
    'july-2026': {
        name: "Từ 01/07/2026 (Mới nhất)",
        basicSalary: 2530000,
        regions: {
            1: 5310000,
            2: 4730000,
            3: 4140000,
            4: 3700000
        },
        selfDeduction: 11000000,
        dependentDeduction: 4400000
    },
    'jan-2026': {
        name: "Từ 01/01/2026 - 30/06/2026",
        basicSalary: 2340000,
        regions: {
            1: 5310000,
            2: 4730000,
            3: 4140000,
            4: 3700000
        },
        selfDeduction: 11000000,
        dependentDeduction: 4400000
    },
    'prev-2026': {
        name: "Trước năm 2026",
        basicSalary: 2340000,
        regions: {
            1: 4960000,
            2: 4410000,
            3: 3860000,
            4: 3450000
        },
        selfDeduction: 11000000,
        dependentDeduction: 4400000
    }
};

const PIT_BRACKETS = [
    { limit: 5000000, rate: 0.05, subtract: 0 },
    { limit: 10000000, rate: 0.10, subtract: 250000 },
    { limit: 18000000, rate: 0.15, subtract: 750000 },
    { limit: 32000000, rate: 0.20, subtract: 1650000 },
    { limit: 52000000, rate: 0.25, subtract: 3250000 },
    { limit: 80000000, rate: 0.30, subtract: 5850000 },
    { limit: Infinity, rate: 0.35, subtract: 9850000 }
];

// --- App State ---
let currentMode = 'gross-net'; // 'gross-net' or 'net-gross'
let salaryChart = null;
let calculationHistory = [];
let lastCalculatedData = null;

// --- Initialize App ---
document.addEventListener("DOMContentLoaded", () => {
    // Lucide Icons
    lucide.createIcons();

    // Setup input formatters
    setupInputFormatting("salary-input");
    setupInputFormatting("custom-insurance-input");

    // Load regulation and set regional limits labels
    handlePeriodChange();

    // Load History
    loadHistory();

    // Sanitize dependents input on manual entry
    const dependentsInput = document.getElementById("dependents-input");
    if (dependentsInput) {
        dependentsInput.addEventListener("input", (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 0) {
                e.target.value = 0;
            } else {
                e.target.value = val;
            }
        });
    }

    // Theme Toggle
    const themeBtn = document.getElementById("theme-toggle");
    themeBtn.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-mode");
        document.body.classList.toggle("light-mode", !isDark);
        localStorage.setItem("theme", isDark ? "dark" : "light");
        
        // Redraw chart if exists (to update text colors in dark mode)
        if (lastCalculatedData) {
            renderChart(lastCalculatedData);
        }
    });

    // Load stored theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
    }
});

// --- UI Actions & Event Handlers ---

function setupInputFormatting(id) {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", (e) => {
        let value = e.target.value.replace(/,/g, "").replace(/\D/g, "");
        if (value) {
            e.target.value = Number(value).toLocaleString("en-US");
        } else {
            e.target.value = "";
        }
    });
}

function parseFormattedNumber(val) {
    return parseFloat(val.replace(/,/g, "")) || 0;
}

function formatVND(amount) {
    return Math.round(amount).toLocaleString("vi-VN") + "đ";
}

function switchMode(mode) {
    currentMode = mode;
    
    const tabGrossNet = document.getElementById("tab-gross-net");
    const tabNetGross = document.getElementById("tab-net-gross");
    const salaryLabel = document.getElementById("salary-label");
    const mainLabel = document.getElementById("card-main-label");

    if (mode === 'gross-net') {
        tabGrossNet.classList.add("active");
        tabNetGross.classList.remove("active");
        salaryLabel.textContent = "Lương GROSS (VND)";
        mainLabel.textContent = "Thực nhận (NET)";
    } else {
        tabNetGross.classList.add("active");
        tabGrossNet.classList.remove("active");
        salaryLabel.textContent = "Lương NET thực nhận (VND)";
        mainLabel.textContent = "Lương quy đổi (GROSS)";
    }

    // Reset results view if not calculated yet
    if (lastCalculatedData) {
        calculate();
    }
}

function handlePeriodChange() {
    const period = document.getElementById("period-select").value;
    const config = REGULATIONS[period];

    // Update labels for region select
    document.getElementById("region-1-val").textContent = formatVND(config.regions[1]);
    document.getElementById("region-2-val").textContent = formatVND(config.regions[2]);
    document.getElementById("region-3-val").textContent = formatVND(config.regions[3]);
    document.getElementById("region-4-val").textContent = formatVND(config.regions[4]);

    handleRegionChange();
}

function handleRegionChange() {
    // Can add validation or update hints if needed
}

function adjustDependents(delta) {
    const input = document.getElementById("dependents-input");
    let val = parseInt(input.value) || 0;
    val = Math.max(0, val + delta);
    input.value = val;
}

function toggleCustomInsuranceInput(show) {
    const container = document.getElementById("custom-insurance-container");
    if (show) {
        container.classList.remove("hidden");
    } else {
        container.classList.add("hidden");
        document.getElementById("custom-insurance-input").value = "";
    }
}

function toggleAdvancedSettings() {
    const header = document.querySelector(".advanced-settings-header");
    const body = document.getElementById("advanced-settings-body");
    
    const isActive = header.classList.toggle("active");
    if (isActive) {
        body.classList.remove("hidden");
    } else {
        body.classList.add("hidden");
    }
}

// --- Calculation Algorithms ---

/**
 * Calculates Net from a given Gross salary and parameters.
 */
function calculateGrossToNet(gross, params) {
    const {
        basicSalary,
        regionMinWage,
        dependents,
        insuranceType,
        customInsuranceSalary,
        rates
    } = params;

    // 1. Determine base salary for insurances
    let baseInsuranceEE = gross;
    let baseInsuranceER = gross;

    if (insuranceType === 'custom') {
        baseInsuranceEE = customInsuranceSalary;
        baseInsuranceER = customInsuranceSalary;
    }

    // Cap for BHXH, BHYT: 20 times reference salary
    const capBHXH_BHYT = 20 * basicSalary;
    // Cap for BHTN: 20 times regional minimum wage
    const capBHTN = 20 * regionMinWage;

    // Employee insurances
    const eeBHXH = Math.min(baseInsuranceEE, capBHXH_BHYT) * (rates.eeBHXH / 100);
    const eeBHYT = Math.min(baseInsuranceEE, capBHXH_BHYT) * (rates.eeBHYT / 100);
    const eeBHTN = Math.min(baseInsuranceEE, capBHTN) * (rates.eeBHTN / 100);
    const totalInsuranceEE = eeBHXH + eeBHYT + eeBHTN;

    // Employer insurances
    const erBHXH = Math.min(baseInsuranceER, capBHXH_BHYT) * (rates.erBHXH / 100);
    const erBHYT = Math.min(baseInsuranceER, capBHXH_BHYT) * (rates.erBHYT / 100);
    const erBHTN = Math.min(baseInsuranceER, capBHTN) * (rates.erBHTN / 100);
    const totalInsuranceER = erBHXH + erBHYT + erBHTN;

    // 2. Taxable Income
    const incomeBeforeTax = gross - totalInsuranceEE;
    
    // Deductions
    const selfDeduct = REGULATIONS[document.getElementById("period-select").value].selfDeduction;
    const depDeduct = REGULATIONS[document.getElementById("period-select").value].dependentDeduction * dependents;
    const totalDeductions = selfDeduct + depDeduct;

    // Converted Taxable Income
    const taxableIncome = Math.max(0, incomeBeforeTax - totalDeductions);

    // 3. PIT calculation & steps breakdown
    let remainingTaxable = taxableIncome;
    let pit = 0;
    const pitSteps = [];

    const brackets = [
        { min: 0, max: 5000000, rate: 0.05 },
        { min: 5000000, max: 10000000, rate: 0.10 },
        { min: 10000000, max: 18000000, rate: 0.15 },
        { min: 18000000, max: 32000000, rate: 0.20 },
        { min: 32000000, max: 52000000, rate: 0.25 },
        { min: 52000000, max: 80000000, rate: 0.30 },
        { min: 80000000, max: Infinity, rate: 0.35 }
    ];

    brackets.forEach((b, index) => {
        let taxInThisBracket = 0;
        let taxableInBracket = 0;

        if (taxableIncome > b.min) {
            taxableInBracket = Math.min(taxableIncome, b.max) - b.min;
            taxInThisBracket = taxableInBracket * b.rate;
            pit += taxInThisBracket;
        }

        pitSteps.push({
            bracket: index + 1,
            range: `${formatVND(b.min)} - ${b.max === Infinity ? 'Trở lên' : formatVND(b.max)}`,
            rate: `${b.rate * 100}%`,
            taxable: taxableInBracket,
            tax: taxInThisBracket,
            active: taxableInBracket > 0
        });
    });

    const net = gross - totalInsuranceEE - pit;
    const totalEmployerCost = gross + totalInsuranceER;

    return {
        gross,
        net,
        eeBHXH,
        eeBHYT,
        eeBHTN,
        totalInsuranceEE,
        incomeBeforeTax,
        selfDeduct,
        depDeduct,
        totalDeductions,
        taxableIncome,
        pit,
        pitSteps,
        erBHXH,
        erBHYT,
        erBHTN,
        totalInsuranceER,
        totalEmployerCost
    };
}

/**
 * Binary search to convert Net to Gross salary.
 */
function calculateNetToGross(netTarget, params) {
    let lower = netTarget;
    // Set a safe upper bound: Net target plus high potential taxes and insurance
    let upper = Math.max(netTarget * 3, 10000000); 
    let grossSolution = netTarget;

    // Run binary search
    for (let i = 0; i < 40; i++) {
        const mid = (lower + upper) / 2;
        const res = calculateGrossToNet(mid, params);

        if (res.net > netTarget) {
            upper = mid;
        } else {
            lower = mid;
            grossSolution = mid;
        }
    }

    // Final precise calculation
    return calculateGrossToNet(grossSolution, params);
}

// --- Main Controller ---

function calculate() {
    const salaryVal = parseFormattedNumber(document.getElementById("salary-input").value);
    if (!salaryVal || salaryVal <= 0) return;

    const period = document.getElementById("period-select").value;
    const region = document.getElementById("region-select").value;
    const dependents = parseInt(document.getElementById("dependents-input").value) || 0;
    const insuranceType = document.querySelector('input[name="insurance-type"]:checked').value;
    
    let customInsuranceSalary = 0;
    if (insuranceType === 'custom') {
        customInsuranceSalary = parseFormattedNumber(document.getElementById("custom-insurance-input").value);
    }

    // Gather customized rates
    const rates = {
        eeBHXH: parseFloat(document.getElementById("rate-ee-bhxh").value) || 0,
        eeBHYT: parseFloat(document.getElementById("rate-ee-bhyt").value) || 0,
        eeBHTN: parseFloat(document.getElementById("rate-ee-bhtn").value) || 0,
        erBHXH: parseFloat(document.getElementById("rate-er-bhxh").value) || 0,
        erBHYT: parseFloat(document.getElementById("rate-er-bhyt").value) || 0,
        erBHTN: parseFloat(document.getElementById("rate-er-bhtn").value) || 0
    };

    const config = REGULATIONS[period];
    const regionMinWage = config.regions[region];

    const params = {
        basicSalary: config.basicSalary,
        regionMinWage,
        dependents,
        insuranceType,
        customInsuranceSalary,
        rates
    };

    let result = null;
    if (currentMode === 'gross-net') {
        result = calculateGrossToNet(salaryVal, params);
    } else {
        result = calculateNetToGross(salaryVal, params);
    }

    lastCalculatedData = result;

    // Display Results
    renderResults(result);

    // Add to history
    addToHistory({
        mode: currentMode,
        inputVal: salaryVal,
        netVal: result.net,
        grossVal: result.gross,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })
    });
}

function renderResults(res) {
    // Unhide panels
    document.getElementById("result-placeholder").classList.add("hidden");
    document.getElementById("result-content").classList.remove("hidden");
    document.getElementById("btn-export-pdf").disabled = false;

    // Highlight metrics
    if (currentMode === 'gross-net') {
        document.getElementById("card-main-label").textContent = "Thực nhận (NET)";
        document.getElementById("card-main-value").textContent = formatVND(res.net);
    } else {
        document.getElementById("card-main-label").textContent = "Lương quy đổi (GROSS)";
        document.getElementById("card-main-value").textContent = formatVND(res.gross);
    }
    document.getElementById("card-employer-value").textContent = formatVND(res.totalEmployerCost);

    // Update Employee Detail Table
    document.getElementById("tbl-gross-val").textContent = formatVND(res.gross);
    document.getElementById("tbl-ee-bhxh").textContent = formatVND(res.eeBHXH);
    document.getElementById("tbl-ee-bhyt").textContent = formatVND(res.eeBHYT);
    document.getElementById("tbl-ee-bhtn").textContent = formatVND(res.eeBHTN);
    document.getElementById("tbl-tntt").textContent = formatVND(res.incomeBeforeTax);
    document.getElementById("tbl-deduct-self").textContent = "-" + formatVND(res.selfDeduct);
    document.getElementById("tbl-deduct-deps").textContent = "-" + formatVND(res.depDeduct);
    document.getElementById("tbl-taxable-income").textContent = formatVND(res.taxableIncome);
    document.getElementById("tbl-pit").textContent = formatVND(res.pit);
    document.getElementById("tbl-net-val").textContent = formatVND(res.net);

    // Update Employer Detail Table
    document.getElementById("tbl-er-gross").textContent = formatVND(res.gross);
    document.getElementById("tbl-er-bhxh").textContent = formatVND(res.erBHXH);
    document.getElementById("tbl-er-bhyt").textContent = formatVND(res.erBHYT);
    document.getElementById("tbl-er-bhtn").textContent = formatVND(res.erBHTN);
    document.getElementById("tbl-er-total").textContent = formatVND(res.totalEmployerCost);

    // Label rates in employer sheet
    document.getElementById("rate-er-bhxh-label").textContent = document.getElementById("rate-er-bhxh").value;
    document.getElementById("rate-er-bhyt-label").textContent = document.getElementById("rate-er-bhyt").value;
    document.getElementById("rate-er-bhtn-label").textContent = document.getElementById("rate-er-bhtn").value;

    // Render PIT steps
    const pitStepsContainer = document.getElementById("pit-steps-container");
    pitStepsContainer.innerHTML = "";
    
    let hasTax = false;
    res.pitSteps.forEach(step => {
        if (step.taxable > 0) {
            hasTax = true;
            const item = document.createElement("div");
            item.className = `pit-step-item ${step.tax > 0 ? 'active' : ''}`;
            item.innerHTML = `
                <span class="pit-step-title">Bậc ${step.bracket} (${step.range})</span>
                <div>
                    <span class="pit-step-rate">${step.rate}</span> trên 
                    <span class="pit-step-amount">${formatVND(step.taxable)}</span> &rarr; 
                    <strong>${formatVND(step.tax)}</strong>
                </div>
            `;
            pitStepsContainer.appendChild(item);
        }
    });

    if (!hasTax) {
        pitStepsContainer.innerHTML = `<div class="history-empty" style="padding: 1rem 0;">Thu nhập chưa đến mức đóng thuế TNCN.</div>`;
    }

    // Render chart
    renderChart(res);
}

function renderChart(res) {
    const ctx = document.getElementById("salary-chart").getContext("2d");
    
    // Destroy previous instance
    if (salaryChart) {
        salaryChart.destroy();
    }

    const isDarkMode = document.body.classList.contains("dark-mode");
    const labelColor = isDarkMode ? "#94a3b8" : "#475569";
    const gridColor = isDarkMode ? "#312e81" : "#e2e8f0";

    const data = [res.net, res.totalInsuranceEE, res.pit];
    const labels = ["Thực nhận (Net)", "Bảo hiểm đóng", "Thuế TNCN"];
    const colors = ["#10b981", "#3b82f6", "#ef4444"];

    salaryChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: isDarkMode ? "#111827" : "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We render custom legend for premium UI
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const total = data.reduce((a, b) => a + b, 0);
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${context.label}: ${formatVND(val)} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: "70%"
        }
    });

    // Render Custom Legends
    const legendContainer = document.getElementById("chart-legend");
    legendContainer.innerHTML = "";
    
    const total = data.reduce((a, b) => a + b, 0);
    labels.forEach((lbl, i) => {
        const pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : 0;
        const item = document.createElement("div");
        item.className = "legend-item";
        item.innerHTML = `
            <div class="legend-label-group">
                <span class="legend-color" style="background-color: ${colors[i]};"></span>
                <span class="legend-label">${lbl}</span>
                <span class="legend-percentage">(${pct}%)</span>
            </div>
            <span class="legend-value">${formatVND(data[i])}</span>
        `;
        legendContainer.appendChild(item);
    });
}

// --- PDF Export ---

function exportPDF() {
    if (!lastCalculatedData) return;

    const element = document.getElementById("exportable-sheet");
    const exportTime = document.getElementById("export-timestamp");
    exportTime.textContent = "Ngày tính: " + new Date().toLocaleString("vi-VN");

    const opt = {
        margin:       10,
        filename:     `SalaryFlow_Bao_Cao_Luong_${currentMode === 'gross-net' ? 'Gross_Net' : 'Net_Gross'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Show temporary print style
    const headerInfo = document.querySelector(".export-header-info");
    headerInfo.style.display = "block";

    // Run PDF generation
    html2pdf().set(opt).from(element).save().then(() => {
        headerInfo.style.display = "none";
    });
}

// --- History Storage Management ---

function loadHistory() {
    const stored = localStorage.getItem("salary_history");
    if (stored) {
        calculationHistory = JSON.parse(stored);
    }
    renderHistoryList();
}

function saveHistory() {
    localStorage.setItem("salary_history", JSON.stringify(calculationHistory));
}

function getSharedCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
}

async function getSupabaseCredentials() {
    let url = window.SUPABASE_URL || getSharedCookie('yundev_supabase_url') || "";
    let key = window.SUPABASE_ANON_KEY || getSharedCookie('yundev_supabase_key') || "";

    // Dynamic fallback to Vercel Serverless Function (/api/config) on Production
    if (!url || !key || url.includes("your-project") || url.includes("abcdefghijklmnopqrst")) {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data.supabaseUrl && data.supabaseAnonKey) {
                    url = data.supabaseUrl;
                    key = data.supabaseAnonKey;
                    window.SUPABASE_URL = url;
                    window.SUPABASE_ANON_KEY = key;
                }
            }
        } catch (e) {
            // Ignore API fetch errors
        }
    }

    return { url, key };
}

async function saveSalaryToSupabase(item) {
    const { url: supabaseUrl, key: supabaseAnonKey } = await getSupabaseCredentials();
    const sessionToken = getSharedCookie('yundev_session') || supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project") || supabaseUrl.includes("abcdefghijklmnopqrst")) {
        console.info("ℹ️ Chưa điền cấu hình Supabase URL & Anon Key thực tế.");
        return;
    }

    try {
        console.log("🚀 Đang gửi dữ liệu tính toán lên Supabase Database...");
        const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/salary_history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${sessionToken}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                mode: item.mode,
                input_salary: item.inputVal,
                gross_salary: item.grossVal,
                net_salary: item.netVal
            })
        });

        if (res.ok || res.status === 201) {
            console.log("✅ Đã tự động lưu kết quả tính toán vào Supabase Database (bảng salary_history) thành công!");
        } else {
            const errText = await res.text();
            console.error(`❌ Supabase phản hồi lỗi [${res.status}]:`, errText);
        }
    } catch (err) {
        console.error("❌ Không thể kết nối tới Supabase Database:", err);
    }
}

function addToHistory(item) {
    // Avoid exact duplicates at the top
    if (calculationHistory.length > 0 && 
        calculationHistory[0].mode === item.mode && 
        calculationHistory[0].inputVal === item.inputVal) {
        return;
    }

    calculationHistory.unshift(item);
    // Keep max 10 items
    if (calculationHistory.length > 10) {
        calculationHistory.pop();
    }
    saveHistory();
    renderHistoryList();

    // Auto sync to Supabase
    saveSalaryToSupabase(item);
}

function clearHistory() {
    calculationHistory = [];
    saveHistory();
    renderHistoryList();
}

function loadHistoryItem(index) {
    const item = calculationHistory[index];
    if (!item) return;

    // Switch tab
    switchMode(item.mode);

    // Put values back
    document.getElementById("salary-input").value = item.inputVal.toLocaleString("en-US");
    
    // Recalculate
    calculate();
}

function renderHistoryList() {
    const listEl = document.getElementById("history-list");
    listEl.innerHTML = "";

    if (calculationHistory.length === 0) {
        listEl.innerHTML = `<div class="history-empty">Chưa có lịch sử tính toán nào.</div>`;
        return;
    }

    calculationHistory.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "history-item";
        itemEl.onclick = () => loadHistoryItem(index);

        const isGrossToNet = item.mode === 'gross-net';
        const titleText = isGrossToNet ? 'Gross ➔ Net' : 'Net ➔ Gross';
        const inputFormatted = formatVND(item.inputVal);
        const resultFormatted = formatVND(isGrossToNet ? item.netVal : item.grossVal);

        itemEl.innerHTML = `
            <div class="history-item-left">
                <span class="history-item-title">${titleText} (Nhập ${inputFormatted})</span>
                <span class="history-item-subtitle">Vào lúc ${item.timestamp}</span>
            </div>
            <div class="history-item-right">
                <span>${resultFormatted}</span>
                <i data-lucide="chevron-right" class="history-item-arrow"></i>
            </div>
        `;
        listEl.appendChild(itemEl);
    });

    lucide.createIcons();
}
