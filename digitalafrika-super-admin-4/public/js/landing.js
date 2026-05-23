// ===== CONFIG =====
const PLANS = {
    starter: { id: 1, name: 'Starter' },
    pro: { id: 2, name: 'Pro' },
    enterprise: { id: 3, name: 'Enterprise' }
};

let selectedPlan = null;

// ===== NAVBAR SCROLL EFFECT =====
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== REVEAL ANIMATIONS =====
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ===== SCROLL FUNCTIONS =====
function scrollToPlans() {
    document.getElementById('plans').scrollIntoView({ behavior: 'smooth' });
}

function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

// ===== MODAL =====
function openRegister(planType) {
    selectedPlan = planType;
    document.getElementById('planId').value = PLANS[planType].id;
    document.getElementById('selectedPlanName').textContent = PLANS[planType].name;
    document.getElementById('registerModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeRegister() {
    document.getElementById('registerModal').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('registerForm').reset();
    clearAllErrors();
}

function openLogin() {
    window.location.href = '/login';
}

// ===== ERROR MANAGEMENT =====
function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + 'Error');
    input.classList.add('error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function clearError(inputId) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + 'Error');
    input.classList.remove('error');
    errorEl.classList.add('hidden');
}

function clearAllErrors() {
    ['companyName', 'email', 'password'].forEach(clearError);
}

// ===== PASSWORD VALIDATION LIVE =====
const passwordInput = document.getElementById('password');
const passwordChecks = {
    length: false,
    uppercase: false,
    number: false,
    symbol: false
};

passwordInput.addEventListener('input', () => {
    const pwd = passwordInput.value;
    passwordChecks.length = pwd.length >= 8;
    passwordChecks.uppercase = /[A-Z]/.test(pwd);
    passwordChecks.number = /[0-9]/.test(pwd);
    passwordChecks.symbol = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);

    // Message intelligent
    const errorEl = document.getElementById('passwordError');
    if (pwd.length === 0) {
        clearError('password');
    } else if (!passwordChecks.length) {
        showError('password', 'Minimum 8 caractères requis');
    } else if (!passwordChecks.uppercase) {
        showError('password', '🔠 Ajoutez au moins une majuscule');
    } else if (!passwordChecks.number) {
        showError('password', '🔢 Ajoutez au moins un chiffre');
    } else if (!passwordChecks.symbol) {
        showError('password', '🔣 Ajoutez au moins un symbole (!@#$%^&*)');
    } else {
        clearError('password');
    }
});

// ===== FORM SUBMISSION =====
async function handleRegister(event) {
    event.preventDefault();

    const formData = {
        nom: document.getElementById('companyName').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        plan_id: parseInt(document.getElementById('planId').value)
    };

    // Validation
    clearAllErrors();
    let valid = true;

    if (!formData.nom || formData.nom.length < 2) {
        showError('companyName', 'Le nom doit contenir au moins 2 caractères');
        valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showError('email', 'Veuillez entrer un email valide');
        valid = false;
    }

    const { length, uppercase, number, symbol } = passwordChecks;
    if (!length || !uppercase || !number || !symbol) {
        showError('password', 'Le mot de passe ne respecte pas les critères');
        valid = false;
    }

    if (!formData.plan_id) {
        showToast('Veuillez sélectionner une offre', 'error');
        valid = false;
    }

    if (!valid) return false;

    // Submit
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitLoader = document.getElementById('submitLoader');

    submitBtn.disabled = true;
    submitText.classList.add('hidden');
    submitLoader.classList.remove('hidden');

    try {
        const apiBase = window.ONTIME_API_URL || '/api';
        const response = await fetch(`${apiBase}/entreprises/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('✅ Compte créé avec succès ! Redirection...', 'success');
            setTimeout(() => {
                closeRegister();
                window.location.href = '/login';
            }, 1500);
        } else if (response.status === 409 || result.code === 'EMAIL_EXISTS') {
            showError('email', result.message || 'Cet email est déjà utilisé');
        } else {
            showToast(result.message || 'Erreur lors de l\'inscription', 'error');
        }
    } catch (error) {
        console.error('Erreur réseau:', error);
        showToast('Erreur de connexion au serveur', 'error');
    } finally {
        submitBtn.disabled = false;
        submitText.classList.remove('hidden');
        submitLoader.classList.add('hidden');
    }

    return false;
}

// ===== TOAST =====
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');

    toast.classList.remove('hidden', 'success', 'error');
    toast.classList.add(type);
    toastIcon.textContent = type === 'success' ? '✅' : '❌';
    toastMessage.textContent = message;

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ===== CLOSE MODAL WITH ESC OR CLICK OUTSIDE =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('registerModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeRegister();
        }
    }
});