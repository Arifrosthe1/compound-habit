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
    const graphCanvas = document.getElementById('goal-graph');
    const graphStats = document.getElementById('graph-stats');
    const infoProgressEl = document.getElementById('info-progress');
    const infoDaysleftEl = document.getElementById('info-daysleft');
    const motivationalEl = document.getElementById('motivational');

    // --- State Management ---
    let goals = [];

    // --- Functions ---

    /**
     * Loads goals from localStorage.
     */
    const loadGoals = () => {
        const goalsJSON = localStorage.getItem('compoundingHabits');
        goals = goalsJSON ? JSON.parse(goalsJSON) : [];
    };

    /**
     * Saves the current goals array to localStorage.
     */
    const saveGoals = () => {
        localStorage.setItem('compoundingHabits', JSON.stringify(goals));
    };

    /**
     * Renders all goals to the DOM.
     */
    const renderGoals = () => {
        goalsContainer.innerHTML = ''; // Clear existing goals
        if (goals.length === 0) {
            goalsContainer.innerHTML = `<p>No goals yet. Click "Add New Goal" to start!</p>`;
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
                currentTarget = goal.currentValue * (1 - rateDecimal);
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

            // Estimate days remaining using compound math: target = current * (1+r)^days  => days = ln(target/current)/ln(1+r)
            let daysRemaining = 'N/A';
            try {
                if (goal.currentValue === goal.targetValue) {
                    daysRemaining = 0;
                } else if (rateDecimal > 0) {
                    if (goal.type === 'increase' && goal.targetValue > goal.currentValue) {
                        const num = Math.log(goal.targetValue / goal.currentValue);
                        const den = Math.log(1 + rateDecimal);
                        const days = Math.ceil(num / den);
                        daysRemaining = days > 0 ? days : 0;
                    } else if (goal.type === 'decrease' && goal.targetValue < goal.currentValue) {
                        const num = Math.log(goal.targetValue / goal.currentValue);
                        const den = Math.log(1 - rateDecimal);
                        const days = Math.ceil(num / den);
                        daysRemaining = days > 0 ? days : 0;
                    }
                }
            } catch (e) {
                daysRemaining = 'N/A';
            }

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
                    goal.currentValue = goal.currentValue * (1 - rate);
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
                showModal();
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
    };

    // Chart.js integration
    let chartInstance = null;

    function openInfoModal(goal) {
        infoTitle.textContent = `${goal.name} — Progress`;
        // ensure history exists
        goal.history = (goal.history || []).slice();
        // if no history, seed with start/current
        if (goal.history.length === 0) {
            goal.history.push({ date: new Date().toISOString(), value: parseFloat(goal.startValue) });
        }

        // sort history by date ascending
        goal.history.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Build expected series for next up to 180 days or until target (with dates)
        const expected = buildExpectedSeriesWithDates(goal, 180);

        // Build labels: history dates followed by expected dates, skipping duplicates
        const labels = [];
        const pushLabel = (iso) => {
            const d = new Date(iso);
            const label = d.toLocaleDateString();
            if (!labels.includes(label)) labels.push(label);
            return label;
        };

        goal.history.forEach(h => pushLabel(h.date));
        expected.forEach(e => pushLabel(e.date));

        // Build dataset arrays aligned with labels
        const actualData = labels.map(label => {
            const found = goal.history.find(h => new Date(h.date).toLocaleDateString() === label);
            return found ? { x: label, y: found.value } : { x: label, y: null };
        });
        const expectedData = labels.map(label => {
            const found = expected.find(h => new Date(h.date).toLocaleDateString() === label);
            return found ? { x: label, y: found.value } : { x: label, y: null };
        });

        // Compute overall progress percent and days remaining for display
        let progressPct = 0;
        try {
            if (goal.type === 'increase') {
                const denom = goal.targetValue - goal.startValue;
                if (denom !== 0) progressPct = ((goal.currentValue - goal.startValue) / denom) * 100;
            } else {
                const denom = goal.startValue - goal.targetValue;
                if (denom !== 0) progressPct = ((goal.startValue - goal.currentValue) / denom) * 100;
            }
        } catch (e) { progressPct = 0; }
        if (!isFinite(progressPct)) progressPct = 0; progressPct = Math.max(0, Math.min(100, progressPct));

        // Find target index in labels (last expected date label)
        const targetLabel = expected.length ? new Date(expected[expected.length - 1].date).toLocaleDateString() : null;
        const targetIndex = targetLabel ? labels.indexOf(targetLabel) : -1;

        // Destroy existing chart if present
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        // Show modal first so Chart.js can correctly compute sizes
        infoModal.style.display = 'flex';

        // Create new Chart.js chart
        const ctx = graphCanvas.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Actual',
                        data: actualData.map(p => p.y),
                        borderColor: '#ff7f0e',
                        backgroundColor: 'rgba(255,127,14,0.1)',
                        spanGaps: true,
                        tension: 0.25,
                        pointRadius: 4,
                    },
                    {
                        label: 'Expected',
                        data: expectedData.map(p => p.y),
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0,123,255,0.12)',
                        fill: true,
                        borderDash: [6,4],
                        spanGaps: true,
                        tension: 0.25,
                        pointRadius: 0,
                    },
                    {
                        label: 'Target',
                        data: labels.map((l, i) => (i === targetIndex ? (expected.length ? expected[expected.length - 1].value : null) : null)),
                        showLine: false,
                        pointStyle: 'rectRot',
                        pointRadius: targetIndex >= 0 ? 7 : 0,
                        backgroundColor: '#28a745',
                        borderColor: '#28a745',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    tooltip: { enabled: true, mode: 'index' }
                },
                scales: {
                    x: { display: true, title: { display: true, text: 'Date' } },
                    y: { display: true, title: { display: true, text: goal.unit || '' } }
                }
            }
        });

        // Force a resize/update in case the canvas was not measured correctly
        try { chartInstance.resize(); chartInstance.update(); } catch (e) { /* ignore */ }

        // Stats & motivating UI
        const last = goal.history[goal.history.length - 1];
        const expectedFinal = expected.length ? expected[expected.length - 1].value : 'N/A';
        graphStats.innerHTML = `Last logged: ${last ? new Date(last.date).toLocaleString() : 'N/A'} — Expected in ${expected.length} days: ${typeof expectedFinal === 'number' ? expectedFinal.toFixed(2) + ' ' + goal.unit : expectedFinal}`;
        infoProgressEl.textContent = `${Math.round(progressPct)}% complete`;
        infoDaysleftEl.textContent = expected.length ? `${expected.length} days to target` : '';
        motivationalEl.style.display = 'block';
        if (progressPct >= 100) {
            motivationalEl.textContent = `Amazing — you've reached your target! 🎉`;
        } else if (progressPct >= 75) {
            motivationalEl.textContent = `You're almost there — keep this up and you'll hit your target soon!`;
        } else if (progressPct >= 40) {
            motivationalEl.textContent = `Great progress — steady effort compounds quickly.`;
        } else {
            motivationalEl.textContent = `Small steps daily lead to big results — keep going!`;
        }
    }

    infoCloseBtn.addEventListener('click', () => { infoModal.style.display = 'none'; if (chartInstance) { chartInstance.destroy(); chartInstance = null; } });
    window.addEventListener('click', (e) => { if (e.target === infoModal) { infoModal.style.display = 'none'; if (chartInstance) { chartInstance.destroy(); chartInstance = null; } } });

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
                current = current * (1 - rate);
                if (current <= goal.targetValue) { series.push({ date: nextDate.toISOString(), value: goal.targetValue }); break; }
            }
            series.push({ date: nextDate.toISOString(), value: parseFloat(current) });
        }
        return series;
    }

    // --- Modal Handling ---
    const showModal = () => modal.style.display = 'flex';
    const hideModal = () => modal.style.display = 'none';

    // --- Event Listeners ---
    addGoalBtn.addEventListener('click', () => {
        // ensure form is cleared and editing id removed when creating a new goal
        if (editingIdInput) editingIdInput.value = '';
        newGoalForm.reset();
        showModal();
    });
    closeModalBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });

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
    };

    init();
});
