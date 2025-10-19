// --- JAVASCRIPT: DASHBOARD WIDGET DATA SIMULATION ---

// Simulated data retrieved from Firebase after login
const STUDENT_DATA = {
    name: 'Maria Rodriguez',
    level: 'B1 - Intermediate',
    currentUnit: 'Unit 2: Past Tenses',
    unitProgress: 85,
    streak: 7,
};

const ACTIVE_CLASS_MODULES = [
    { name: 'Mission 1: Ship Naming Protocol', due: 'Due: Today', status: 'In Progress', type: 'rpg' },
    { name: 'Unit 3 Quiz: Conditional Forms', due: 'Due: Mon, Oct 27', status: 'Pending', type: 'quiz' },
    { name: 'Writing Practice: Formal Email', due: 'Due: Fri, Oct 24', status: 'Completed', type: 'writing' },
];

const classListEl = document.getElementById('class-list');

function renderClassModules() {
    classListEl.innerHTML = '';
    
    ACTIVE_CLASS_MODULES.forEach(module => {
        const item = document.createElement('div');
        item.className = 'class-item';
        
        let statusColor = module.status === 'Completed' ? var(--color-success) : 
                          module.status === 'In Progress' ? var(--color-secondary) : 
                          var(--color-warning);
        
        item.style.borderLeftColor = statusColor;
        
        item.innerHTML = `
            <div>
                <strong>${module.name}</strong>
                <p class="due-date" style="color: ${statusColor};">${module.due}</p>
            </div>
            <span style="font-size:0.9em;">${module.status}</span>
        `;
        classListEl.appendChild(item);
    });
}

function renderStudentInfo() {
    document.getElementById('student-name').textContent = STUDENT_DATA.name;
    document.getElementById('student-level').textContent = STUDENT_DATA.level;
    document.getElementById('streak-count').textContent = `${STUDENT_DATA.streak} Days`;
    
    // Update Progress Bar
    document.querySelector('.progress-bar-wrap label').textContent = `Current Unit Mastery (${STUDENT_DATA.currentUnit}):`;
    document.querySelector('.progress-bar-wrap progress').value = STUDENT_DATA.unitProgress;
    document.querySelector('.progress-bar-wrap span').textContent = `${STUDENT_DATA.unitProgress}% Complete`;
    document.querySelector('.progress-fill').style.width = `${STUDENT_DATA.unitProgress}%`;
}


// --- INITIALIZATION ---
// Assumed to be called after the main dashboard container is made visible
renderClassModules();
renderStudentInfo();
