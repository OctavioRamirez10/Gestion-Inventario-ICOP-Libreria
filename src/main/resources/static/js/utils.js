function showConfirmationModal(message, onConfirm, onCancel) {
    const modal = document.getElementById('confirmation-modal');
    const messageElement = document.getElementById('confirmation-message');
    const btnYes = document.getElementById('btn-confirm-yes');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnClose = document.getElementById('btn-confirm-close');

    // 1. Establecer el texto dinámico
    messageElement.textContent = message;

    // 2. Mostrar el modal
    modal.style.display = 'flex';

    // Función para manejar la tecla Esc
    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            cancelAndClose();
        }
    };
    window.addEventListener('keydown', handleEsc);

    // 3. Función para cerrar sin confirmar (cancelar)
    const cancelAndClose = () => {
        if (typeof onCancel === 'function') onCancel();
        closeModal();
    };

    // 4. Función para cerrar el modal y limpiar eventos
    const closeModal = () => {
        modal.style.display = 'none';
        btnYes.onclick = null;
        btnCancel.onclick = null;
        if (btnClose) btnClose.onclick = null;
        window.onclick = null;
        window.removeEventListener('keydown', handleEsc);
    };

    // 5. Asignar la acción al botón "Confirmar"
    btnYes.onclick = () => {
        if (typeof onConfirm === 'function') onConfirm();
        closeModal();
    };

    // 6. Asignar acción de cancelar al botón "Cancelar" y a la "X"
    btnCancel.onclick = cancelAndClose;
    if (btnClose) btnClose.onclick = cancelAndClose;

    // Cancelar si se hace clic fuera del modal
    window.onclick = (event) => {
        if (event.target === modal) {
            cancelAndClose();
        }
    };
}

/**
 * Muestra una notificacion tipo Toast global con diseno UX/UI premium.
 * @param {string} type - 'success', 'error', o 'info'
 * @param {string} title - Titulo principal
 * @param {string} message - Mensaje secundario
 * @param {number} duration - Tiempo en ms antes de ocultarse (default 4000)
 */
window.showUIToast = function(type, title, message, duration = 4000) {
    const container = document.getElementById('ui-toast-container');
    if (!container) return;

    // Crear el elemento toast
    const toast = document.createElement('div');
    toast.className = `ui-toast ${type}`;

    // Icono segun tipo
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-times-circle';

    toast.innerHTML = `
        <div class="ui-toast-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="ui-toast-content">
            <h4 class="ui-toast-title">${title}</h4>
            <p class="ui-toast-message">${message}</p>
        </div>
        <button class="ui-toast-close"><i class="fas fa-times"></i></button>
        <div class="ui-toast-progress">
            <div class="ui-toast-progress-bar" style="animation-duration: ${duration}ms"></div>
        </div>
    `;

    container.appendChild(toast);

    // Boton de cerrar
    const closeBtn = toast.querySelector('.ui-toast-close');
    
    const removeToast = () => {
        toast.classList.add('toast-exiting');
        toast.addEventListener('animationend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    };

    closeBtn.addEventListener('click', removeToast);

    // Auto eliminar despues de duration
    setTimeout(removeToast, duration);
};

/**
 * Muestra un error inline debajo de un input
 */
window.mostrarErrorInline = function(inputId, mensaje) {
    const input = document.getElementById(inputId);
    const errorDiv = document.getElementById('error-' + inputId);
    if(input) {
        input.classList.add('input-error');
    }
    if(errorDiv) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + mensaje;
        errorDiv.style.display = 'flex';
    }
};

/**
 * Limpia un error inline de un input
 */
window.limpiarErroresInline = function(inputId) {
    const input = document.getElementById(inputId);
    const errorDiv = document.getElementById('error-' + inputId);
    if(input) {
        input.classList.remove('input-error');
    }
    if(errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.innerHTML = '';
    }
};

/**
 * Limpia todos los errores inline que contengan una subcadena en su ID (ej: 'oc-')
 */
window.limpiarTodosErroresInline = function(prefix) {
    const inputs = document.querySelectorAll('.input-error');
    inputs.forEach(input => {
        if (input.id.includes(prefix)) {
            input.classList.remove('input-error');
        }
    });
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(err => {
        if (err.id.includes('error-' + prefix)) {
            err.style.display = 'none';
            err.innerHTML = '';
        }
    });
};

/**
 * Valida el Limite de caracteres en tiempo real.
 * Se debe usar en el evento oninput del input.
 */
window.checkMaxLength = function(input, limit) {
    const errorId = input.id;
    if (input.value.length >= limit) {
        input.value = input.value.substring(0, limit);
        window.mostrarErrorInline(errorId, `Límite de ${limit} caracteres alcanzado.`);
    } else {
        window.limpiarErroresInline(errorId);
    }
};

/**
 * Muestra un tooltip para errores de stock dentro de la tabla de detalle
 */
window.mostrarTooltipStock = function(inputElement, mensaje) {
    let tooltip = inputElement.parentElement.querySelector('.stock-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'stock-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.bottom = '100%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.backgroundColor = '#ef4444';
        tooltip.style.color = 'white';
        tooltip.style.padding = '4px 8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '11px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.zIndex = '10';
        tooltip.style.marginBottom = '6px';
        tooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        tooltip.style.pointerEvents = 'none';
        
        const arrow = document.createElement('div');
        arrow.style.position = 'absolute';
        arrow.style.top = '100%';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderWidth = '4px';
        arrow.style.borderStyle = 'solid';
        arrow.style.borderColor = '#ef4444 transparent transparent transparent';
        tooltip.appendChild(arrow);
        
        const textSpan = document.createElement('span');
        tooltip.appendChild(textSpan);
        
        inputElement.parentElement.style.position = 'relative';
        inputElement.parentElement.appendChild(tooltip);
    }
    
    tooltip.querySelector('span').textContent = mensaje;
    tooltip.style.display = 'block';
    inputElement.classList.add('input-error');
    
    if(inputElement.tooltipTimeout) {
        clearTimeout(inputElement.tooltipTimeout);
    }
    inputElement.tooltipTimeout = setTimeout(() => {
        tooltip.style.display = 'none';
        inputElement.classList.remove('input-error');
    }, 3000);
};
