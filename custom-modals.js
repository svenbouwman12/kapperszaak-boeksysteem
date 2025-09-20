/**
 * Custom Modal System - Replace browser alerts and confirms
 */

// Global modal state
let modalResolve = null;
let currentModal = null;

/**
 * Show a custom alert modal
 */
function customAlert(message, type = 'info', title = null) {
  return new Promise((resolve) => {
    // Remove existing modal if any
    removeModal();
    
    const modal = createModal({
      type,
      title: title || getDefaultTitle(type),
      message,
      buttons: [
        {
          text: 'OK',
          class: 'btn-primary',
          action: () => {
            hideModal();
            resolve();
          }
        }
      ]
    });
    
    showModal(modal);
  });
}

/**
 * Show a custom confirm modal
 */
function customConfirm(message, title = 'Bevestigen') {
  return new Promise((resolve) => {
    // Remove existing modal if any
    removeModal();
    
    const modal = createModal({
      type: 'warning',
      title,
      message,
      buttons: [
        {
          text: 'Annuleren',
          class: 'btn-secondary',
          action: () => {
            hideModal();
            resolve(false);
          }
        },
        {
          text: 'Bevestigen',
          class: 'btn-primary',
          action: () => {
            hideModal();
            resolve(true);
          }
        }
      ]
    });
    
    showModal(modal);
  });
}

/**
 * Show a custom prompt modal
 */
function customPrompt(message, defaultValue = '', title = 'Invoer') {
  return new Promise((resolve) => {
    // Remove existing modal if any
    removeModal();
    
    const modal = createModal({
      type: 'info',
      title,
      message,
      input: {
        type: 'text',
        placeholder: 'Voer tekst in...',
        value: defaultValue
      },
      buttons: [
        {
          text: 'Annuleren',
          class: 'btn-secondary',
          action: () => {
            hideModal();
            resolve(null);
          }
        },
        {
          text: 'OK',
          class: 'btn-primary',
          action: () => {
            const input = modal.querySelector('.custom-modal-input');
            const value = input ? input.value : defaultValue;
            hideModal();
            resolve(value);
          }
        }
      ]
    });
    
    showModal(modal);
  });
}

/**
 * Create modal HTML structure
 */
function createModal({ type, title, message, buttons, input }) {
  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay';
  overlay.id = 'custom-modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'custom-modal';
  
  // Header
  const header = document.createElement('div');
  header.className = 'custom-modal-header';
  
  const icon = document.createElement('div');
  icon.className = `custom-modal-icon ${type}`;
  icon.textContent = getIcon(type);
  
  const titleEl = document.createElement('h3');
  titleEl.className = 'custom-modal-title';
  titleEl.textContent = title;
  
  header.appendChild(icon);
  header.appendChild(titleEl);
  
  // Body
  const body = document.createElement('div');
  body.className = 'custom-modal-body';
  
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  body.appendChild(messageEl);
  
  // Add input if specified
  if (input) {
    const inputEl = document.createElement('input');
    inputEl.type = input.type || 'text';
    inputEl.className = 'custom-modal-input';
    inputEl.placeholder = input.placeholder || '';
    inputEl.value = input.value || '';
    inputEl.style.cssText = `
      width: 100%;
      margin-top: 12px;
      padding: 8px 12px;
      border: 2px solid var(--border);
      border-radius: 6px;
      font-size: 14px;
    `;
    
    // Focus the input
    setTimeout(() => inputEl.focus(), 100);
    
    // Handle Enter key
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const okButton = modal.querySelector('.btn-primary');
        if (okButton) okButton.click();
      }
    });
    
    body.appendChild(inputEl);
  }
  
  // Footer
  const footer = document.createElement('div');
  footer.className = 'custom-modal-footer';
  
  buttons.forEach((button, index) => {
    const btn = document.createElement('button');
    btn.className = `btn ${button.class}`;
    btn.textContent = button.text;
    btn.addEventListener('click', button.action);
    
    // Focus first button
    if (index === 0) {
      setTimeout(() => btn.focus(), 100);
    }
    
    footer.appendChild(btn);
  });
  
  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  
  // Handle overlay click (close modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideModal();
      if (modalResolve) modalResolve(false);
    }
  });
  
  // Handle Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      hideModal();
      if (modalResolve) modalResolve(false);
    }
  };
  
  document.addEventListener('keydown', handleEscape);
  overlay._handleEscape = handleEscape;
  
  return overlay;
}

/**
 * Show modal with animation
 */
function showModal(modal) {
  document.body.appendChild(modal);
  currentModal = modal;
  
  // Trigger animation
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

/**
 * Hide modal with animation
 */
function hideModal() {
  if (!currentModal) return;
  
  currentModal.classList.remove('show');
  
  setTimeout(() => {
    removeModal();
  }, 300);
}

/**
 * Remove modal from DOM
 */
function removeModal() {
  if (currentModal) {
    // Remove escape key listener
    if (currentModal._handleEscape) {
      document.removeEventListener('keydown', currentModal._handleEscape);
    }
    
    currentModal.remove();
    currentModal = null;
  }
}

/**
 * Get default title based on type
 */
function getDefaultTitle(type) {
  const titles = {
    success: 'Succesvol',
    warning: 'Waarschuwing',
    error: 'Fout',
    info: 'Informatie'
  };
  return titles[type] || 'Melding';
}

/**
 * Get icon based on type
 */
function getIcon(type) {
  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };
  return icons[type] || 'ℹ️';
}

// Replace global alert and confirm functions
window.originalAlert = window.alert;
window.originalConfirm = window.confirm;

window.alert = customAlert;
window.confirm = customConfirm;
