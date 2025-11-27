document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const goalsContainer = document.getElementById('goals-container');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const modal = document.getElementById('add-goal-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const newGoalForm = document.getElementById('new-goal-form');
    const goalCardTemplate = document.getElementById('goal-card-template');
    const editingIdInput = document.getElementById('editing-id');
    const infoModal = document.getElementById('info-modal');
    const infoCloseBtn = document.getElementById('info-close');
    const infoTitle = document.getElementById('info-title');
    const infoSubtitle = document.getElementById('info-subtitle');
    const graphCanvas = document.getElementById('goal-graph');
    const infoProgressEl = document.getElementById('info-progress');
    const infoDaysleftEl = document.getElementById('info-daysleft');
    const motivationalEl = document.getElementById('motivational');
    const projectionDaysEl = document.getElementById('projection-days');
    const projectionDateEl = document.getElementById('projection-date');
    const themeToggle = document.getElementById('theme-toggle');
    const summaryTotalGoalsEl = document.getElementById('summary-total-goals');
    const summaryCompletedGoalsEl = document.getElementById('summary-completed-goals');
    const summaryOverallProgressEl = document.getElementById('summary-overall-progress');

    // --- Theme Management ---
    const currentTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        if (themeToggle) themeToggle.checked = theme === 'dark';
        localStorage.setItem('theme', theme);
    };

    if (currentTheme) {
        applyTheme(currentTheme);
    } else {
        applyTheme(prefersDark ? 'dark' : 'light');
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            applyTheme(newTheme);
        });
    }

    // --- State Management ---
    let goals = [];

    // --- Functions ---

    /**
     * Loads goals from localStorage.
     */
    const loadGoals = () => {
        const goalsJSON = localStorage.getItem('compoundingHabits');
        if (!goalsJSON) {
            goals = [];
            return;
        }
        try {
            goals = JSON.parse(goalsJSON) || [];
        } catch (e) {
            console.warn('Failed to parse compoundingHabits from localStorage, resetting. Error:', e);
            // keep a backup of the corrupted value for debugging
            try { localStorage.setItem('compoundingHabits_corrupted_backup', goalsJSON); } catch (ee) { /* ignore */ }
            goals = [];
            // clear the bad value to avoid repeated errors
            try { localStorage.removeItem('compoundingHabits'); } catch (ee) { /* ignore */ }
        }
    };

    /**
     * Saves the current goals array to localStorage.
     */
    const saveGoals = () => {
        localStorage.setItem('compoundingHabits', JSON.stringify(goals));
    };

    /**
     * Renders the dashboard summary statistics.
     */
    const renderDashboardSummary = () => {
        const totalGoals = goals.length;
        const completedGoals = goals.filter(goal => {
            if (goal.type === 'increase') return goal.currentValue >= goal.targetValue;
            return goal.currentValue <= goal.targetValue;
        }).length;

        let overallProgress = 0;
        if (goals.length > 0) {
            const totalProgress = goals.reduce((acc, goal) => {
                let progressPct = 0;
                if (goal.type === 'increase') {
                    const denom = goal.targetValue - goal.startValue;
                    if (denom !== 0) progressPct = ((goal.currentValue - goal.startValue) / denom) * 100;
                } else {
                    const denom = goal.startValue - goal.targetValue;
                    if (denom !== 0) progressPct = ((goal.startValue - goal.currentValue) / denom) * 100;
                }
                return acc + Math.max(0, Math.min(100, progressPct));
            }, 0);
            overallProgress = totalProgress / totalGoals;
        }

        summaryTotalGoalsEl.textContent = totalGoals;
        summaryCompletedGoalsEl.textContent = completedGoals;
        summaryOverallProgressEl.textContent = `${Math.round(overallProgress)}%`;
    };

    /**
     * Renders all goals to the DOM.
     */
    const renderGoals = () => {
        goalsContainer.innerHTML = ''; // Clear existing goals
        renderDashboardSummary();
        if (goals.length === 0) {
            goalsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No Goals Yet!</h3>
                    <p>Click the "Add Goal" button to start your journey of compounding habits.</p>
                </div>
            `;
            return;
        }

        goals.forEach(goal => {
            const card = goalCardTemplate.content.cloneNode(true);
            const cardElement = card.querySelector('.goal-card');
            
            // Calculate today's target
            const rateDecimal = (goal.interestRate || 0) / 100;

            // Today's theoretical target if compounding were applied once
            let currentTarget;
            if (goal.type === 'increase') {
                currentTarget = goal.currentValue * (1 + rateDecimal);
            } else {
                currentTarget = computeNextForDecrease(goal.currentValue, goal.startValue, goal.targetValue, rateDecimal, goal.rampExponent || 2);
            }
            // Cap at final target
            if (goal.type === 'increase' && currentTarget > goal.targetValue) currentTarget = goal.targetValue;
            if (goal.type === 'decrease' && currentTarget < goal.targetValue) currentTarget = goal.targetValue;

            // Progress calculation (as percentage)
            let progressPct = 0;
            if (goal.type === 'increase') {
                const denom = goal.targetValue - goal.startValue;
                if (denom !== 0) progressPct = ((goal.currentValue - goal.startValue) / denom) * 100;
            } else {
                const denom = goal.startValue - goal.targetValue;
                if (denom !== 0) progressPct = ((goal.startValue - goal.currentValue) / denom) * 100;
            }
            if (!isFinite(progressPct)) progressPct = 0;
            progressPct = Math.max(0, Math.min(100, progressPct));

            // Estimate days remaining (use simulation for decrease to match new logic)
            let daysRemaining = estimateDaysToTargetSim(goal, 3650);

            card.querySelector('.goal-title').textContent = goal.name;
            card.querySelector('.goal-target').textContent = `Today's Target: ${parseFloat(currentTarget.toFixed(2))} ${goal.unit}`;
            card.querySelector('.goal-start').textContent = `${goal.startValue} ${goal.unit}`;
            card.querySelector('.goal-final').textContent = `${goal.targetValue} ${goal.unit}`;
            card.querySelector('.goal-rate').textContent = `${goal.interestRate}%`;
            card.querySelector('.goal-days').textContent = daysRemaining;
            card.querySelector('.goal-streak').textContent = `Current Value: ${goal.currentValue} ${goal.unit}`;
            card.querySelector('.goal-lastlogged').textContent = goal.lastLoggedDate ? `Last updated: ${new Date(goal.lastLoggedDate).toLocaleString()}` : '';

            // Progress bar
            const fill = card.querySelector('.progress-fill');
            const progressLabel = card.querySelector('.goal-progress');
            fill.style.width = `${progressPct}%`;
            progressLabel.textContent = `${Math.round(progressPct)}`;
            
            const logButton = card.querySelector('.log-button');
            const logInput = card.querySelector('.log-input');
            const applyButton = card.querySelector('.apply-button');
            const infoButton = card.querySelector('.info-button');
            const editButton = card.querySelector('.edit-button');
            const resetButton = card.querySelector('.reset-button');
            const deleteButton = card.querySelector('.delete-button');
            const moreButton = card.querySelector('.more-button');
            const dropdownContent = card.querySelector('.dropdown-content');

            moreButton.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });

            logButton.addEventListener('click', () => {
                const value = parseFloat(logInput.value);
                if (!isNaN(value)) {
                    // For this simple version, we'll just update the "currentValue" to be the new baseline for the next day.
                    goal.currentValue = value;
                    goal.lastLoggedDate = new Date().toISOString();
                    saveGoals();
                    renderGoals(); // Re-render to show updated state
                } else {
                    alert('Please enter a valid number.');
                }
            });

            // Apply compound immediately (simulate end-of-day compound)
            applyButton.addEventListener('click', () => {
                const rate = rateDecimal;
                    if (goal.type === 'increase') {
                        goal.currentValue = goal.currentValue * (1 + rate);
                        if (goal.currentValue > goal.targetValue) goal.currentValue = goal.targetValue;
                    } else {
                        // use the flipped/depth-aware decrease logic with per-goal exponent support
                        goal.currentValue = computeNextForDecrease(goal.currentValue, goal.startValue, goal.targetValue, rate, goal.rampExponent || 2);
                        if (goal.currentValue < goal.targetValue) goal.currentValue = goal.targetValue;
                    }
                const nowISO = new Date().toISOString();
                goal.lastLoggedDate = nowISO;
                // push to history
                goal.history = goal.history || [];
                goal.history.push({ date: nowISO, value: parseFloat(goal.currentValue) });
                saveGoals();
                renderGoals();
            });

            // Open info modal to show graph/history
            infoButton.addEventListener('click', () => {
                openInfoModal(goal);
            });

            // Edit goal: populate form and open modal
            editButton.addEventListener('click', () => {
                // populate fields
                document.getElementById('goal-name').value = goal.name || '';
                document.getElementById('goal-unit').value = goal.unit || '';
                document.querySelector(`input[name="goal-type"][value="${goal.type}"]`).checked = true;
                document.getElementById('start-value').value = goal.startValue;
                document.getElementById('target-value').value = goal.targetValue;
                document.getElementById('interest-rate').value = goal.interestRate;
                // set editing id
                if (editingIdInput) editingIdInput.value = goal.id;
                // show modal first so the projection chart can initialize with a visible canvas
                showModal();
                setTimeout(() => updateModalProjection(), 60);
            });

            // Reset goal: restore start value and clear history
            resetButton.addEventListener('click', () => {
                if (!confirm('Reset this goal to its starting value and clear history?')) return;
                const nowISO = new Date().toISOString();
                goal.currentValue = goal.startValue;
                goal.history = [{ date: nowISO, value: parseFloat(goal.startValue) }];
                goal.lastLoggedDate = nowISO;
                saveGoals();
                renderGoals();
            });

            // Delete goal
            deleteButton.addEventListener('click', () => {
                if (!confirm('Delete this goal? This cannot be undone.')) return;
                goals = goals.filter(g => g.id !== goal.id);
                saveGoals();
                renderGoals();
            });

            goalsContainer.appendChild(card);
        });

        // Initialize Feather Icons
        feather.replace();
    };

    // Close dropdowns when clicking outside
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.classList.remove('show');
            });
        }
        if (e.target === infoModal) { 
            infoModal.style.display = 'none'; 
            if (chartInstance) { 
                chartInstance.destroy(); 
                chartInstance = null; 
            } 
        }
    });

    // Chart.js integration
    let chartInstance = null;
    let projectionChart = null;

    // --- Compounding helpers ---
    /**
     * Compute next value for a decrease-type goal so that absolute step
     * is smallest at the beginning and grows as the target is approached.
     * It uses the total range (start - target) as a basis and scales the
     * step by a factor that increases with normalized progress.
     */
    function computeNextForDecrease(current, start, target, rateDecimal, exponent = 2) {
        const range = start - target;
        if (!isFinite(range) || range <= 0 || rateDecimal <= 0) return target;

        // normalized progress: 0 at start, 1 at target
        let normalized = (start - current) / range;
        normalized = Math.max(0, Math.min(1, normalized));

        // factor ramps from 0.05 (very small) to 1.0 (full) as progress increases
        // Use a power curve so acceleration is slow early and speeds up near the end.
        // 'exponent' controls how sharply the factor accelerates (2 = quadratic, 3 = cubic, etc.).
        const baseMin = 0.05;
        const baseRange = 1 - baseMin;
        const factor = baseMin + baseRange * Math.pow(normalized, exponent);

        // base step uses the overall range so absolute steps are relative to full journey
        const step = rateDecimal * range * factor;

        let next = current - step;
        if (next < target) next = target;
        return next;
    }

    function estimateDaysToTargetSim(goal, maxDays = 10000) {
        if (!goal || !isFinite(goal.startValue) || !isFinite(goal.currentValue) || !isFinite(goal.targetValue)) return 'N/A';
        const rateDecimal = (goal.interestRate || 0) / 100;
        let current = goal.currentValue;
        let days = 0;
        const max = Math.max(3650, maxDays);
        if (goal.type === 'increase') {
            // fallback to previous logarithmic estimate for increases
            try {
                if (current === goal.targetValue) return 0;
                if (rateDecimal <= 0) return 'N/A';
                if (goal.targetValue <= current) return 0;
                const num = Math.log(goal.targetValue / current);
                const den = Math.log(1 + rateDecimal);
                const estimate = Math.ceil(num / den);
                return estimate > 0 ? estimate : 0;
            } catch (e) { return 'N/A'; }
        } else {
            // simulate using the new decrease logic
            while (current > goal.targetValue && days < max) {
                current = computeNextForDecrease(current, goal.startValue, goal.targetValue, rateDecimal, goal.rampExponent || 2);
                days += 1;
                if (current === goal.targetValue) break;
            }
            return days >= max ? 'N/A' : days;
        }
    }

    function openInfoModal(goal) {
            infoTitle.textContent = `${goal.name} — Progress`;
            if (infoSubtitle) infoSubtitle.textContent = `Your progress chart and detailed stats.`;

            // --- DOM element references ---
            const infoStreakEl = document.getElementById('info-streak');
            const infoCompletionDateEl = document.getElementById('info-completion-date');
            const motivationalTextEl = document.getElementById('motivational-text');

            // --- Data calculation ---
            goal.history = (goal.history || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
            if (goal.history.length === 0) {
                goal.history.push({ date: new Date().toISOString(), value: parseFloat(goal.startValue) });
            }

            const expected = buildExpectedSeriesWithDates(goal, 3650);

            let progressPct = 0;
            try {
                if (goal.type === 'increase') {
                    progressPct = ((goal.currentValue - goal.startValue) / (goal.targetValue - goal.startValue)) * 100;
                } else {
                    progressPct = ((goal.startValue - goal.currentValue) / (goal.startValue - goal.targetValue)) * 100;
                }
            } catch (e) { progressPct = 0; }
            progressPct = Math.max(0, Math.min(100, isFinite(progressPct) ? progressPct : 0));

            const daysRemaining = expected.length > 0 ? expected.length : 0;
            const completionDate = new Date();
            completionDate.setDate(completionDate.getDate() + daysRemaining);

            // --- Streak calculation (simple version) ---
            let streak = 0;
            if (goal.history.length > 1) {
                streak = goal.history.length; // Placeholder: counts number of logs
            }

            // --- Update UI elements ---
            if (infoProgressEl) infoProgressEl.textContent = `${Math.round(progressPct)}%`;
            if (infoDaysleftEl) infoDaysleftEl.textContent = daysRemaining > 0 ? `${daysRemaining}` : '--';
            if (infoStreakEl) infoStreakEl.textContent = `${streak} days`;
            if (infoCompletionDateEl) infoCompletionDateEl.textContent = daysRemaining > 0 ? completionDate.toLocaleDateString() : 'Reached';

            if (motivationalEl) {
                motivationalEl.style.display = 'flex';
                if (progressPct >= 100) {
                    motivationalTextEl.textContent = `Amazing — you've reached your target! 🎉`;
                } else if (progressPct >= 75) {
                    motivationalTextEl.textContent = `You're almost there! Keep up the great work.`;
                } else if (progressPct >= 40) {
                    motivationalTextEl.textContent = `Great progress. Steady effort compounds quickly.`;
                } else {
                    motivationalTextEl.textContent = `Small steps daily lead to big results. Keep going!`;
                }
            }

            // --- Chart setup ---
            const labels = [];
            const pushLabel = (iso) => {
                const label = new Date(iso).toLocaleDateString();
                if (!labels.includes(label)) labels.push(label);
            };
            goal.history.forEach(h => pushLabel(h.date));
            expected.forEach(e => pushLabel(e.date));

            const actualData = labels.map(label => goal.history.find(h => new Date(h.date).toLocaleDateString() === label)?.value ?? null);
            const expectedData = labels.map(label => expected.find(e => new Date(e.date).toLocaleDateString() === label)?.value ?? null);

            const targetLabel = expected.length ? new Date(expected[expected.length - 1].date).toLocaleDateString() : null;
            const targetIndex = targetLabel ? labels.indexOf(targetLabel) : -1;

            // Destroy previous instance safely
            if (chartInstance) {
                try { chartInstance.destroy(); } catch (e) { /* ignore */ }
                chartInstance = null;
            }

            // Show modal before creating chart so Chart.js can measure canvas
            infoModal.style.display = 'flex';

            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not available; cannot render info chart.');
                return;
            }

            try {
                // Theme-aware colors
                const css = getComputedStyle(document.documentElement);
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const fg = (css.getPropertyValue('--font-color') || (isDark ? '#e9ecef' : '#212529')).trim();
                const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
                const actualColor = '#ff7f0e';
                const expectedColor = '#4dabf7';
                const targetColor = '#28a745';

                chartInstance = new Chart(graphCanvas.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Actual',
                                data: actualData,
                                borderColor: actualColor,
                                backgroundColor: 'rgba(255,127,14,0.12)',
                                spanGaps: true, tension: 0.25, pointRadius: 4,
                            },
                            {
                                label: 'Expected',
                                data: expectedData,
                                borderColor: expectedColor,
                                backgroundColor: 'rgba(77,171,247,0.12)',
                                fill: true, borderDash: [6, 4], spanGaps: true, tension: 0.25, pointRadius: 0,
                            },
                            {
                                label: 'Target',
                                data: labels.map((_, i) => (i === targetIndex ? goal.targetValue : null)),
                                showLine: false, pointStyle: 'rectRot', pointRadius: targetIndex >= 0 ? 7 : 0,
                                backgroundColor: targetColor,
                                borderColor: targetColor,
                            }
                        ]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: { labels: { color: fg, usePointStyle: true } },
                            tooltip: {
                                backgroundColor: isDark ? '#222' : '#fff',
                                titleColor: isDark ? '#fff' : '#000',
                                bodyColor: isDark ? '#fff' : '#000'
                            }
                        },
                        scales: {
                            x: { display: true, title: { display: false }, ticks: { color: fg }, grid: { color: gridColor } },
                            y: { display: true, title: { display: false, text: goal.unit || '' }, ticks: { color: fg }, grid: { color: gridColor } }
                        }
                    }
                });

                // allow layout to settle then force resize/update (run twice to cover transition timing on mobile)
                setTimeout(() => { try { chartInstance.resize(); chartInstance.update(); } catch (e) { /* ignore */ } }, 60);
                setTimeout(() => { try { chartInstance.resize(); chartInstance.update(); } catch (e) { /* ignore */ } }, 300);
            } catch (e) {
                console.warn('Failed to render info chart', e);
                try { if (chartInstance) { chartInstance.destroy(); chartInstance = null; } } catch (ee) { }
            }
    }

    // Wire info modal close to centralized cleanup
    if (typeof infoCloseBtn !== 'undefined' && infoCloseBtn) infoCloseBtn.addEventListener('click', hideInfoModal);
    window.addEventListener('click', (e) => { if (e.target === infoModal) hideInfoModal(); });

    function buildExpectedSeriesWithDates(goal, maxDays) {
        const series = [];
        const rate = (goal.interestRate || 0) / 100;
        let current = goal.currentValue;
        // start date = last logged date or today
        const startDate = goal.history && goal.history.length ? new Date(goal.history[goal.history.length - 1].date) : new Date();
        for (let d = 1; d <= maxDays; d++) {
            const nextDate = new Date(startDate);
            nextDate.setDate(nextDate.getDate() + d);
            if (goal.type === 'increase') {
                current = current * (1 + rate);
                if (current >= goal.targetValue) { series.push({ date: nextDate.toISOString(), value: goal.targetValue }); break; }
            } else {
                current = computeNextForDecrease(current, goal.startValue, goal.targetValue, rate, goal.rampExponent || 2);
                if (current <= goal.targetValue) { series.push({ date: nextDate.toISOString(), value: goal.targetValue }); break; }
            }
            series.push({ date: nextDate.toISOString(), value: parseFloat(current) });
        }
        return series;
    }

    // --- Modal Handling ---
    const showModal = () => modal.style.display = 'flex';
    const hideModal = () => {
        modal.style.display = 'none';
        try { if (projectionChart) { projectionChart.destroy(); projectionChart = null; } } catch (e) { }
    };

    // Hide info modal and cleanup
    function hideInfoModal() {
        if (infoModal) infoModal.style.display = 'none';
        try { if (chartInstance) { chartInstance.destroy(); chartInstance = null; } } catch (e) { }
        try { if (projectionChart) { projectionChart.destroy(); projectionChart = null; } } catch (e) { }
        if (graphStats) graphStats.textContent = '';
        if (infoProgressEl) infoProgressEl.textContent = '';
        if (infoDaysleftEl) infoDaysleftEl.textContent = '';
        if (motivationalEl) motivationalEl.style.display = 'none';
    }

    // Update live projection in the add/edit modal based on current form inputs
    function updateModalProjection() {
        const startInput = document.getElementById('start-value');
        const targetInput = document.getElementById('target-value');
        const rateInput = document.getElementById('interest-rate');
        const typeInput = document.querySelector('input[name="goal-type"]:checked');

        if (!startInput || !targetInput || !rateInput || !typeInput) return;

        const start = parseFloat(startInput.value);
        const target = parseFloat(targetInput.value);
        const rate = parseFloat(rateInput.value);
        const type = typeInput.value;

        if (!isFinite(start) || !isFinite(target) || !isFinite(rate) || rate <= 0) {
            if (projectionDaysEl) projectionDaysEl.textContent = 'Estimated days to target: —';
            if (projectionDateEl) projectionDateEl.textContent = 'Estimated reach date: —';
            return;
        }

        const tempGoal = {
            startValue: start,
            currentValue: start,
            targetValue: target,
            interestRate: rate,
            type: type,
            rampExponent: 2
        };

        const days = estimateDaysToTargetSim(tempGoal, 3650);
        if (projectionDaysEl) projectionDaysEl.textContent = `Estimated days to target: ${days}`;
        if (projectionDateEl) {
            if (typeof days === 'number' && isFinite(days)) {
                const d = new Date();
                d.setDate(d.getDate() + days);
                projectionDateEl.textContent = `Estimated reach date: ${d.toLocaleDateString()}`;
            } else {
                projectionDateEl.textContent = 'Estimated reach date: —';
            }
        }

        // Build small expected series and render a sparkline chart in the modal
        try {
            const expected = buildExpectedSeriesWithDates(tempGoal, 90);
            // include starting point as first label
            const labels = [];
            const data = [];
            const startLabel = new Date().toLocaleDateString();
            labels.push(startLabel);
            data.push(start);
            expected.forEach(p => { labels.push(new Date(p.date).toLocaleDateString()); data.push(p.value); });

            // Destroy old projection chart
            if (projectionChart) { projectionChart.destroy(); projectionChart = null; }
            const canvas = document.getElementById('modal-projection-chart');
            if (canvas) {
                const css = getComputedStyle(document.documentElement);
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const fg = (css.getPropertyValue('--font-color') || (isDark ? '#e9ecef' : '#212529')).trim();
                const gridColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
                const expectedColor = '#4dabf7';
                const ctx = canvas.getContext('2d');
                projectionChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Expected',
                            data: data,
                            borderColor: expectedColor,
                            backgroundColor: 'rgba(77,171,247,0.12)',
                            fill: true,
                            tension: 0.3,
                            pointRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { display: false, grid: { color: gridColor } }, y: { display: true, ticks: { color: fg }, grid: { color: gridColor } } }
                    }
                });
                try { projectionChart.resize(); projectionChart.update(); } catch (e) {}
                // extra delayed resize/update to handle mobile/modal transition timing
                setTimeout(() => { try { projectionChart.resize(); projectionChart.update(); } catch (e) { /* ignore */ } }, 300);
            }
        } catch (e) { /* ignore chart errors */ }
    }

    // --- Event Listeners ---
    addGoalBtn.addEventListener('click', () => {
        // ensure form is cleared and editing id removed when creating a new goal
        if (editingIdInput) editingIdInput.value = '';
        newGoalForm.reset();
        // show modal then update projection so Chart.js can measure canvas correctly
        showModal();
        setTimeout(() => updateModalProjection(), 60);
    });
    closeModalBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });

    // Info modal close handlers
    if (typeof infoCloseBtn !== 'undefined' && infoCloseBtn) {
        infoCloseBtn.addEventListener('click', hideInfoModal);
    }
    window.addEventListener('click', (e) => { if (e.target === infoModal) hideInfoModal(); });

    // Live projection listeners on modal inputs
    const startInputEl = document.getElementById('start-value');
    const targetInputEl = document.getElementById('target-value');
    const rateInputEl = document.getElementById('interest-rate');
    const typeRadios = Array.from(document.querySelectorAll('input[name="goal-type"]'));
    [startInputEl, targetInputEl, rateInputEl].forEach(el => { if (el) el.addEventListener('input', updateModalProjection); });
    typeRadios.forEach(r => r.addEventListener('change', updateModalProjection));

    newGoalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nowISO = new Date().toISOString();
        const editingId = editingIdInput ? editingIdInput.value : '';
        if (editingId) {
            // update existing goal
            const gIndex = goals.findIndex(g => String(g.id) === String(editingId));
            if (gIndex !== -1) {
                const g = goals[gIndex];
                g.name = document.getElementById('goal-name').value;
                g.unit = document.getElementById('goal-unit').value;
                g.type = document.querySelector('input[name="goal-type"]:checked').value;
                g.startValue = parseFloat(document.getElementById('start-value').value);
                g.targetValue = parseFloat(document.getElementById('target-value').value);
                g.interestRate = parseFloat(document.getElementById('interest-rate').value);
                // don't overwrite currentValue by default; update timestamp
                g.lastLoggedDate = nowISO;
                goals[gIndex] = g;
            }
        } else {
            const newGoal = {
                id: Date.now(), // Simple unique ID
                name: document.getElementById('goal-name').value,
                unit: document.getElementById('goal-unit').value,
                type: document.querySelector('input[name="goal-type"]:checked').value,
                startValue: parseFloat(document.getElementById('start-value').value),
                currentValue: parseFloat(document.getElementById('start-value').value), // Start current value at the beginning
                targetValue: parseFloat(document.getElementById('target-value').value),
                interestRate: parseFloat(document.getElementById('interest-rate').value),
                lastLoggedDate: nowISO,
            };
            goals.push(newGoal);
        }

        saveGoals();
        renderGoals();
        newGoalForm.reset();
        if (editingIdInput) editingIdInput.value = '';
        hideModal();
    });

    // --- Initial Load ---
    const init = () => {
        loadGoals();
        renderGoals();
        try { if (typeof feather !== 'undefined' && feather.replace) feather.replace(); } catch (e) { /* ignore if feather not available */ }
    };

    init();
});
