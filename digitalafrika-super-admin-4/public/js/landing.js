// ===== VARIABLES GLOBALES =====
let selectedPlan = null;

const PLANS = {
    starter: { id: 1, name: 'Starter' },
    pro: { id: 2, name: 'Pro' },
    enterprise: { id: 3, name: 'Enterprise' }
};

// ===== ANIMATIONS AU SCROLL =====
document.addEventListener('DOMContentLoaded', () => {
    const fadeElements = document.querySelectorAll('.fade-in');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    fadeElements.forEach(el => observer.observe(el));
});

// ===== SCROLL VERS LES PLANS =====
function scrollToPlans() {
    document.getElementById('plans').scrollIntoView({ behavior: 'smooth' });
}

// ===== OUVERTURE MODAL INSCRIPTION =====
function openRegister(planType) {
    selectedPlan = planType;
    
    // Mettre à jour le formulaire
    document.getElementById('planId').value = PLANS[planType].id;
    document.getElementById('selectedPlanName').textContent = PLANS[planType].name;
    
    // Afficher le modal
    document.getElementById('registerModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Bloquer le scroll
}

// ===== FERMETURE MODAL =====
function closeRegister() {
    document.getElementById('registerModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.getElementById('registerForm').reset();
    resetPasswordChecks();
}

// ===== OUVERTURE LOGIN =====
function openLogin() {
    window.location.href = '/login';
}

// ===== VALIDATION MOT DE PASSE EN TEMPS RÉEL =====
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            
            // Vérifications
            const hasLength = password.length >= 8;
            const hasUppercase = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            
            // Mise à jour des indicateurs
            updateCheck('lengthCheck', hasLength);
            updateCheck('uppercaseCheck', hasUppercase);
            updateCheck('numberCheck', hasNumber);
            updateCheck('symbolCheck', hasSymbol);
        });
    }
});

function updateCheck(elementId, isValid) {
    const element = document.getElementById(elementId);
    if (element) {
        if (isValid) {
            element.innerHTML = element.innerHTML.replace('❌', '✅');
            element.classList.remove('text-red-500');
            element.classList.add('text-green-500');
        } else {
            element.innerHTML = element.innerHTML.replace('✅', '❌');
            element.classList.remove('text-green-500');
            element.classList.add('text-red-500');
        }
    }
}

function resetPasswordChecks() {
    ['lengthCheck', 'uppercaseCheck', 'numberCheck', 'symbolCheck'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = element.innerHTML.replace('✅', '❌');
            element.classList.remove('text-green-500');
            element.classList.add('text-red-500');
        }
    });
}

// ===== VALIDATION EMAIL =====
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            const emailError = document.getElementById('emailError');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (emailInput.value && !emailRegex.test(emailInput.value)) {
                emailError.classList.remove('hidden');
            } else {
                emailError.classList.add('hidden');
            }
        });
    }
});

// ===== GESTION DU FORMULAIRE =====
async function handleRegister(event) {
    event.preventDefault();
    
    // Récupération des données
    const formData = {
        nom: document.getElementById('companyName').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        plan_id: parseInt(document.getElementById('planId').value)
    };
    
    // Validation finale
    if (!validateForm(formData)) {
        return;
    }
    
    // Désactiver le bouton pendant l'envoi
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Création en cours...';
    
    console.log('Données envoyées au backend :', formData);
    
    // ==========================================
    // APPEL API - POST /api/entreprises/register
    // ==========================================
    try {
        const response = await fetch('/api/entreprises/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nom: formData.nom,
                email: formData.email,
                password: formData.password,
                plan_id: formData.plan_id
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Entreprise créée avec succès !');
            closeRegister();
            // Rediriger vers la page de connexion
            window.location.href = '/login';
        } else {
            // Afficher l'erreur renvoyée par le backend
            alert('❌ ' + (result.message || 'Erreur lors de l\'inscription'));
        }
        
    } catch (error) {
        console.error('Erreur réseau :', error);
        alert('❌ Erreur de connexion au serveur. Veuillez réessayer.');
    } finally {
        // Réactiver le bouton dans tous les cas
        submitBtn.disabled = false;
        submitBtn.textContent = 'Créer mon compte';
    }
}

// ===== VALIDATION DU FORMULAIRE =====
function validateForm(data) {
    // Vérifier nom entreprise
    if (!data.nom || data.nom.length < 2) {
        alert('Veuillez entrer un nom d\'entreprise valide');
        return false;
    }
    
    // Vérifier email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        alert('Veuillez entrer un email valide');
        return false;
    }
    
    // Vérifier mot de passe
    const hasLength = data.password.length >= 8;
    const hasUppercase = /[A-Z]/.test(data.password);
    const hasNumber = /[0-9]/.test(data.password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(data.password);
    
    if (!hasLength || !hasUppercase || !hasNumber || !hasSymbol) {
        alert('Le mot de passe ne respecte pas les critères de sécurité');
        return false;
    }
    
    // Vérifier plan
    if (!data.plan_id) {
        alert('Veuillez sélectionner une offre');
        return false;
    }
    
    return true;
}

// ===== FERMETURE MODAL EN CLIQUANT À L'EXTÉRIEUR =====
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('registerModal');
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeRegister();
            }
        });
    }
});

// ===== FERMETURE MODAL AVEC ÉCHAP =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('registerModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeRegister();
        }
    }
});