'use strict';

const STORAGE_KEY = 'actividad3-gestor-tareas-v1';
const taskForm = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const descriptionInput = document.querySelector('#task-description');
const categoryInput = document.querySelector('#task-category');
const priorityInput = document.querySelector('#task-priority');
const dateInput = document.querySelector('#task-date');
const formMessage = document.querySelector('#form-message');
const submitButton = document.querySelector('#submit-task');
const cancelEditButton = document.querySelector('#cancel-edit');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-tasks');
const statusFilter = document.querySelector('#status-filter');
const categoryFilter = document.querySelector('#category-filter');
const sortSelect = document.querySelector('#sort-tasks');
const listSummary = document.querySelector('#list-summary');
const pendingCount = document.querySelector('#pending-count');
const completedCount = document.querySelector('#completed-count');
const totalCount = document.querySelector('#total-count');
const clearCompletedButton = document.querySelector('#clear-completed');

let tasks = loadTasks();
let editingId = null;

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
  } catch (error) {
    console.warn('No fue posible recuperar las tareas guardadas:', error);
    return [];
  }
}

function isValidTask(task) {
  return task && typeof task.id === 'string' && typeof task.title === 'string'
    && typeof task.completed === 'boolean';
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    showMessage('No se pudieron guardar los cambios en este navegador.', false);
    console.error('Error al guardar en localStorage:', error);
    return false;
  }
}

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showMessage(message, success = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle('success', success);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function updateStats() {
  const completed = tasks.filter(task => task.completed).length;
  pendingCount.textContent = String(tasks.length - completed);
  completedCount.textContent = String(completed);
  totalCount.textContent = String(tasks.length);
}

function getVisibleTasks() {
  const query = searchInput.value.trim().toLocaleLowerCase('es-MX');
  let visible = tasks.filter(task => {
    const searchable = `${task.title} ${task.description || ''} ${task.category}`.toLocaleLowerCase('es-MX');
    const matchesQuery = !query || searchable.includes(query);
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'completed' ? task.completed : !task.completed);
    const matchesCategory = categoryFilter.value === 'all' || task.category === categoryFilter.value;
    return matchesQuery && matchesStatus && matchesCategory;
  });

  const priorityRank = { alta: 0, normal: 1, baja: 2 };
  visible.sort((a, b) => {
    switch (sortSelect.value) {
      case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
      case 'date': return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
      case 'priority': return priorityRank[a.priority] - priorityRank[b.priority];
      case 'newest':
      default: return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
  return visible;
}

function createPill(text, className = '') {
  const pill = document.createElement('span');
  pill.className = `pill ${className}`.trim();
  pill.textContent = text;
  return pill;
}

function createActionButton(label, action, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `small-button ${className}`.trim();
  button.dataset.action = action;
  button.textContent = label;
  return button;
}

function renderTasks() {
  const visible = getVisibleTasks();
  taskList.replaceChildren();
  updateStats();

  visible.forEach(task => {
    const item = document.createElement('li');
    item.className = `task-item${task.completed ? ' is-completed' : ''}`;
    item.dataset.id = task.id;

    const top = document.createElement('div');
    top.className = 'task-top';
    const title = document.createElement('h3');
    title.className = 'task-title';
    title.textContent = task.title;
    top.append(title);
    top.append(createPill(task.completed ? 'Completada' : 'Pendiente', task.completed ? 'priority-low' : ''));
    item.append(top);

    if (task.description) {
      const description = document.createElement('p');
      description.className = 'task-description';
      description.textContent = task.description;
      item.append(description);
    }

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.append(createPill(task.category));
    const priorityLabel = task.priority === 'alta' ? 'Prioridad alta' : task.priority === 'baja' ? 'Prioridad baja' : 'Prioridad normal';
    meta.append(createPill(priorityLabel, `priority-${task.priority}`));
    if (task.dueDate) meta.append(createPill(`Fecha: ${formatDate(task.dueDate)}`, 'due-date'));
    item.append(meta);

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.append(createActionButton(task.completed ? 'Reabrir' : 'Completar', 'toggle'));
    actions.append(createActionButton('Editar', 'edit'));
    actions.append(createActionButton('Eliminar', 'delete', 'delete'));
    item.append(actions);
    taskList.append(item);
  });

  emptyState.hidden = visible.length > 0;
  if (tasks.length === 0) {
    emptyState.querySelector('h3').textContent = 'Todo tranquilo por aquí';
    emptyState.querySelector('p').textContent = 'Agrega tu primera tarea para empezar a organizarte.';
    listSummary.textContent = 'Todavía no hay tareas.';
  } else if (visible.length === 0) {
    emptyState.querySelector('h3').textContent = 'No encontramos tareas';
    emptyState.querySelector('p').textContent = 'Prueba con otra búsqueda o cambia los filtros.';
    emptyState.hidden = false;
    listSummary.textContent = `No hay resultados. Tienes ${tasks.length} tareas guardadas.`;
  } else {
    emptyState.querySelector('h3').textContent = 'Todo tranquilo por aquí';
    emptyState.querySelector('p').textContent = 'Agrega tu primera tarea para empezar a organizarte.';
    listSummary.textContent = `Mostrando ${visible.length} de ${tasks.length} tarea${tasks.length === 1 ? '' : 's'}.`;
  }
  clearCompletedButton.disabled = !tasks.some(task => task.completed);
  clearCompletedButton.style.opacity = clearCompletedButton.disabled ? '.45' : '1';
}

function resetForm() {
  taskForm.reset();
  editingId = null;
  submitButton.textContent = 'Agregar tarea';
  cancelEditButton.hidden = true;
  document.querySelector('#form-title').textContent = 'Nueva tarea';
}

taskForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (title.length < 3) {
    showMessage('Escribe un título de al menos 3 caracteres.');
    titleInput.focus();
    return;
  }

  const data = {
    title,
    description: descriptionInput.value.trim(),
    category: categoryInput.value,
    priority: priorityInput.value,
    dueDate: dateInput.value
  };

  if (editingId) {
    const task = tasks.find(item => item.id === editingId);
    if (!task) {
      showMessage('No encontramos esa tarea. Vuelve a intentarlo.');
      resetForm();
      return;
    }
    Object.assign(task, data, { updatedAt: new Date().toISOString() });
    showMessage('Cambios guardados.', true);
  } else {
    tasks.unshift({ id: createId(), ...data, completed: false, createdAt: new Date().toISOString() });
    showMessage('Tarea agregada y guardada.', true);
  }

  saveTasks();
  resetForm();
  renderTasks();
});

cancelEditButton.addEventListener('click', () => {
  resetForm();
  showMessage('Edición cancelada.', true);
});

taskList.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = button.closest('.task-item');
  const task = tasks.find(entry => entry.id === item?.dataset.id);
  if (!task) return;

  switch (button.dataset.action) {
    case 'toggle':
      task.completed = !task.completed;
      task.updatedAt = new Date().toISOString();
      saveTasks();
      renderTasks();
      break;
    case 'edit':
      editingId = task.id;
      titleInput.value = task.title;
      descriptionInput.value = task.description || '';
      categoryInput.value = task.category;
      priorityInput.value = task.priority;
      dateInput.value = task.dueDate || '';
      submitButton.textContent = 'Guardar cambios';
      cancelEditButton.hidden = false;
      document.querySelector('#form-title').textContent = 'Editar tarea';
      showMessage('Modifica los datos y guarda los cambios.', true);
      titleInput.focus();
      break;
    case 'delete':
      if (window.confirm(`¿Eliminar la tarea “${task.title}”?`)) {
        tasks = tasks.filter(entry => entry.id !== task.id);
        if (editingId === task.id) resetForm();
        saveTasks();
        renderTasks();
      }
      break;
    default:
      break;
  }
});

[searchInput, statusFilter, categoryFilter, sortSelect].forEach(control => {
  control.addEventListener('input', renderTasks);
  control.addEventListener('change', renderTasks);
});

clearCompletedButton.addEventListener('click', () => {
  const completed = tasks.filter(task => task.completed).length;
  if (!completed) return;
  if (window.confirm(`¿Eliminar ${completed} tarea${completed === 1 ? '' : 's'} completada${completed === 1 ? '' : 's'}?`)) {
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    renderTasks();
    showMessage('Tareas completadas eliminadas.', true);
  }
});

renderTasks();
