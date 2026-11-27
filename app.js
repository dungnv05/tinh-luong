// --- Constants & Regulation Configuration ---
const { formatVND } = TaxRules;

// --- App State ---
let currentMode = 'gross-net'; // 'gross-net' or 'net-gross'
let salaryChart = null;
let calculationHistory = [];
let lastCalculatedData = null;
let handlersBound = false;

// --- Initialize App ---
function bindEventHandlers() {
    if (handlersBound) return;
    handlersBound = true;

    const tabGrossNet = document.getElementById("tab-gross-net");
    if (tabGrossNet) {
        tabGrossNet.addEventListener("click", () => switchMode("gross-net"));
    }

    const tabNetGross = document.getElementById("tab-net-gross");
    if (tabNetGross) {
        tabNetGross.addEventListener("click", () => switchMode("net-gross"));
    }

    const salaryForm = document.getElementById("salary-form");
    if (salaryForm) {
        salaryForm.addEventListener("submit", (event) => {
            event.preventDefault();
            calculate();
        });
    }

    const periodSelect = document.getElementById("period-select");
    if (periodSelect) {
        periodSelect.addEventListener("change", () => handlePeriodChange());
    }

    const regionSelect = document.getElementById("region-select");
    if (regionSelect) {
        regionSelect.addEventListener("change", () => handleRegionChange());
    }

    document.querySelectorAll(".btn-counter[data-delta]").forEach((btn) => {
        const delta = parseInt(btn.dataset.delta, 10);
        if (!isNaN(delta)) {
            btn.addEventListener("click", () => adjustDependents(delta));
        }
    });

    const actualInsuranceRadio = document.querySelector('input[name="insurance-type"][value="actual"]');
    if (actualInsuranceRadio) {
        actualInsuranceRadio.addEventListener("change", () => toggleCustomInsuranceInput(false));
    }

    const customInsuranceRadio = document.querySelector('input[name="insurance-type"][value="custom"]');
    if (customInsuranceRadio) {
        customInsuranceRadio.addEventListener("change", () => toggleCustomInsuranceInput(true));
    }

    const advancedHeader = document.querySelector(".advanced-settings-header");
    if (advancedHeader) {
        advancedHeader.addEventListener("click", () => toggleAdvancedSettings());
    }

    const exportPdfBtn = document.getElementById("btn-export-pdf");
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", () => exportPDF());
    }

    const clearHistoryBtn = document.querySelector(".btn-clear-history");
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", () => clearHistory());
    }
}

function initApp() {
    bindEventHandlers();

    // Lucide Icons
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

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

    // Sync chart colors when shared header switches theme
    document.addEventListener("yh-theme-change", () => {
        if (lastCalculatedData) {
            renderChart(lastCalculatedData);
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

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
    const periodSelect = document.getElementById("period-select");
    if (!periodSelect) return;
    const config = TaxRules.REGULATIONS[periodSelect.value];
    if (!config) return;

    const regionLabels = { 1: "Vùng I", 2: "Vùng II", 3: "Vùng III", 4: "Vùng IV" };
    const regionSelect = document.getElementById("region-select");

    // Update labels for region select (<span> inside <option> is stripped by HTML parsers)
    [1, 2, 3, 4].forEach((r) => {
        const span = document.getElementById(`region-${r}-val`);
        if (span) {
            span.textContent = formatVND(config.regions[r]);
        } else if (regionSelect) {
            const opt = regionSelect.querySelector(`option[value="${r}"]`);
            if (opt) {
                opt.textContent = `${regionLabels[r]} (${formatVND(config.regions[r])})`;
            }
        }
    });

    const deductionHint = document.getElementById("deduction-hint");
    if (deductionHint) {
        const brackets = TaxRules.PIT_SCHEDULES[config.pitSchedule];
        const bracketCount = brackets ? brackets.length : 0;
        deductionHint.textContent = `Giảm trừ gia cảnh: ${formatVND(config.selfDeduction)} bản thân + ${formatVND(config.dependentDeduction)}/người phụ thuộc · Biểu thuế ${bracketCount} bậc (${config.legalBasis}).`;
    }

    handleRegionChange();

    if (lastCalculatedData) {
        calculate();
    }
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

    const params = TaxRules.buildParams(period, {
        region,
        dependents,
        insuranceType,
        customInsuranceSalary,
        rates
    });

    let result = null;
    if (currentMode === 'gross-net') {
        result = TaxRules.calculateGrossToNet(salaryVal, params);
    } else {
        result = TaxRules.calculateNetToGross(salaryVal, params);
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
    pitStepsContainer.textContent = "";

    let hasTax = false;
    res.pitSteps.forEach(step => {
        if (step.taxable > 0) {
            hasTax = true;
            const item = document.createElement("div");
            item.className = `pit-step-item ${step.tax > 0 ? 'active' : ''}`;

            const titleSpan = document.createElement("span");
            titleSpan.className = "pit-step-title";
            titleSpan.textContent = `Bậc ${step.bracket} (${step.range})`;

            const detailDiv = document.createElement("div");

            const rateSpan = document.createElement("span");
            rateSpan.className = "pit-step-rate";
            rateSpan.textContent = step.rate;

            const amountSpan = document.createElement("span");
            amountSpan.className = "pit-step-amount";
            amountSpan.textContent = formatVND(step.taxable);

            const taxStrong = document.createElement("strong");
            taxStrong.textContent = formatVND(step.tax);

            detailDiv.appendChild(rateSpan);
            detailDiv.appendChild(document.createTextNode(" trên "));
            detailDiv.appendChild(amountSpan);
            detailDiv.appendChild(document.createTextNode(" \u2192 "));
            detailDiv.appendChild(taxStrong);

            item.appendChild(titleSpan);
            item.appendChild(detailDiv);
            pitStepsContainer.appendChild(item);
        }
    });

    if (!hasTax) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "history-empty";
        emptyEl.style.padding = "1rem 0";
        emptyEl.textContent = "Thu nhập chưa đến mức đóng thuế TNCN.";
        pitStepsContainer.appendChild(emptyEl);
    }

    // Render chart
    renderChart(res);
}

function isDarkTheme() {
    return document.documentElement.dataset.theme === "dark";
}

function renderChart(res) {
    const ctx = document.getElementById("salary-chart").getContext("2d");

    // Destroy previous instance
    if (salaryChart) {
        salaryChart.destroy();
    }

    const isDarkMode = isDarkTheme();
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

    // Keep PDF export in light theme
    const prevTheme = document.documentElement.dataset.theme;
    if (prevTheme === "dark") {
        document.documentElement.dataset.theme = "light";
    }

    const restore = () => {
        headerInfo.style.display = "none";
        if (prevTheme) {
            document.documentElement.dataset.theme = prevTheme;
        }
    };

    // Run PDF generation
    html2pdf().set(opt).from(element).save().then(restore, restore);
}

// --- History Storage Management ---

function loadHistory() {
    const stored = localStorage.getItem("salary_history");
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                calculationHistory = parsed
                    .filter((item) => item && typeof item === "object")
                    .map((item) => ({
                        mode: item.mode === "net-gross" ? "net-gross" : "gross-net",
                        inputVal: Number(item.inputVal) || 0,
                        netVal: Number(item.netVal) || 0,
                        grossVal: Number(item.grossVal) || 0,
                        timestamp: item.timestamp != null ? String(item.timestamp) : ""
                    }));
            } else {
                calculationHistory = [];
            }
        } catch (e) {
            calculationHistory = [];
        }
    }
    renderHistoryList();
}

function saveHistory() {
    localStorage.setItem("salary_history", JSON.stringify(calculationHistory));
}

async function getSupabaseCredentials() {
    let url = window.SUPABASE_URL || "";
    let key = window.SUPABASE_ANON_KEY || "";

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

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project") || supabaseUrl.includes("abcdefghijklmnopqrst")) {
        console.info("ℹ️ Chưa điền cấu hình Supabase URL & Anon Key thực tế.");
        return;
    }

    // shared session is HttpOnly; data calls use the anon key + RLS

    // --- Input Validation & Sanitization (Bảo vệ tính toàn vẹn dữ liệu) ---
    // Kiểm tra định dạng cơ bản: Chắc chắn các giá trị là số và hợp lý, chống Injection hoặc Data Overflow.
    const inputVal = Number(item.inputVal);
    const grossVal = Number(item.grossVal);
    const netVal = Number(item.netVal);

    if (isNaN(inputVal) || isNaN(grossVal) || isNaN(netVal) || inputVal < 0 || inputVal > 1000000000000) {
        console.warn("⚠️ Dữ liệu tính toán không hợp lệ hoặc có dấu hiệu bất thường. Đã chặn lưu trữ.");
        return;
    }

    const mode = (item.mode === "gross-to-net" || item.mode === "net-to-gross") ? item.mode : "unknown";

    try {
        console.log("🚀 Đang gửi dữ liệu tính toán lên Supabase Database...");
        const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/salary_history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                mode: mode,
                input_salary: inputVal,
                gross_salary: grossVal,
                net_salary: netVal
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
        const emptyEl = document.createElement("div");
        emptyEl.className = "history-empty";
        emptyEl.textContent = "Chưa có lịch sử tính toán nào.";
        listEl.appendChild(emptyEl);
        return;
    }

    calculationHistory.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "history-item";
        itemEl.addEventListener("click", () => loadHistoryItem(index));

        const isGrossToNet = item.mode === 'gross-net';
        const titleText = isGrossToNet ? 'Gross ➔ Net' : 'Net ➔ Gross';
        const inputFormatted = formatVND(item.inputVal);
        const resultFormatted = formatVND(isGrossToNet ? item.netVal : item.grossVal);

        const leftEl = document.createElement("div");
        leftEl.className = "history-item-left";

        const titleEl = document.createElement("span");
        titleEl.className = "history-item-title";
        titleEl.textContent = `${titleText} (Nhập ${inputFormatted})`;

        const subtitleEl = document.createElement("span");
        subtitleEl.className = "history-item-subtitle";
        subtitleEl.textContent = `Vào lúc ${item.timestamp}`;

        leftEl.appendChild(titleEl);
        leftEl.appendChild(subtitleEl);

        const rightEl = document.createElement("div");
        rightEl.className = "history-item-right";

        const resultEl = document.createElement("span");
        resultEl.textContent = resultFormatted;

        const arrowEl = document.createElement("i");
        arrowEl.setAttribute("data-lucide", "chevron-right");
        arrowEl.className = "history-item-arrow";

        rightEl.appendChild(resultEl);
        rightEl.appendChild(arrowEl);

        itemEl.appendChild(leftEl);
        itemEl.appendChild(rightEl);
        listEl.appendChild(itemEl);
    });

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }
}
