const pb = new PocketBase('/');

const listId = new URLSearchParams(window.location.search).get('list');

const noListEl = document.getElementById('no-list');
const formEl = document.getElementById('add-form');
const nameInput = document.getElementById('name-input');
const quantityInput = document.getElementById('quantity-input');
const importanceInput = document.getElementById('importance-input');
const photoInput = document.getElementById('photo-input');
const photoLabel = document.getElementById('photo-label');
const listEl = document.getElementById('item-list');
const clearListBtn = document.getElementById('clear-list-btn');
const photoModal = document.getElementById('photo-modal');
const photoModalImg = document.getElementById('photo-modal-img');
const toastEl = document.getElementById('toast');
const toastMsgEl = document.getElementById('toast-msg');
const toastUndoBtn = document.getElementById('toast-undo');

const UNDO_DELAY_MS = 5000;
let lastItems = [];
let pendingDelete = null; // { id, name, timeoutId }

const MAX_PHOTO_DIMENSION = 1280;
const PHOTO_QUALITY = 0.7;

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY),
  );
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
}

function withErrorAlert(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      console.error(err);
      alert(`Algo ha fallado: ${err?.message || err}`);
    }
  };
}

const IMPORTANCE_RANK = { importante: 0, normal: 1, opcional: 2 };
const IMPORTANCE_ICON = { importante: '❗', normal: '', opcional: '·' };

function renderItems(items) {
  listEl.innerHTML = '';

  const visible = items.filter((item) => item.id !== pendingDelete?.id);

  const sorted = [...visible].sort((a, b) => {
    const purchasedDiff = Number(a.purchased) - Number(b.purchased);
    if (purchasedDiff !== 0) return purchasedDiff;
    return IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
  });

  for (const item of sorted) {
    const li = document.createElement('li');
    li.className = `importance-${item.importance}${item.purchased ? ' purchased' : ''}`;
    li.dataset.id = item.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.purchased;
    checkbox.dataset.action = 'toggle';
    li.appendChild(checkbox);

    if (item.photo) {
      const thumb = document.createElement('img');
      thumb.className = 'item-thumb';
      thumb.src = pb.files.getURL(item, item.photo, { thumb: '100x100', list_id: listId });
      thumb.alt = '';
      thumb.dataset.action = 'view-photo';
      thumb.dataset.fullSrc = pb.files.getURL(item, item.photo, { list_id: listId });
      li.appendChild(thumb);
    }

    const nameWrap = document.createElement('div');
    nameWrap.className = 'item-name-wrap';

    const name = document.createElement('span');
    name.className = 'item-name';
    const icon = IMPORTANCE_ICON[item.importance];
    name.textContent = icon ? `${icon} ${item.name}` : item.name;
    if (item.quantity) {
      const quantity = document.createElement('span');
      quantity.className = 'item-quantity';
      quantity.textContent = ` (${item.quantity})`;
      name.appendChild(quantity);
    }
    nameWrap.appendChild(name);

    if (item.comment) {
      const comment = document.createElement('span');
      comment.className = 'item-comment';
      comment.textContent = item.comment;
      nameWrap.appendChild(comment);
    }
    li.appendChild(nameWrap);

    const commentBtn = document.createElement('button');
    commentBtn.type = 'button';
    commentBtn.className = 'comment-btn';
    commentBtn.dataset.action = 'comment';
    commentBtn.textContent = '💬';
    commentBtn.setAttribute('aria-label', `Comentar ${item.name}`);
    li.appendChild(commentBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Eliminar ${item.name}`);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  }

  clearListBtn.hidden = visible.length === 0;
}

async function handleListChange(event) {
  if (event.target.dataset.action !== 'toggle') return;
  const id = event.target.closest('li').dataset.id;
  await pb.collection('items').update(id, { purchased: event.target.checked }, { list_id: listId });
}

function showToast(message, onUndo) {
  toastMsgEl.textContent = message;
  toastEl.hidden = false;
  toastUndoBtn.onclick = onUndo;
}

function hideToast() {
  toastEl.hidden = true;
  toastUndoBtn.onclick = null;
}

function flushPendingDelete() {
  if (!pendingDelete) return;
  clearTimeout(pendingDelete.timeoutId);
  const { id } = pendingDelete;
  pendingDelete = null;
  // El producto ya podría no existir si otro dispositivo lo borró mientras tanto.
  pb.collection('items').delete(id, { list_id: listId }).catch(() => {});
}

function scheduleDelete(id, name) {
  flushPendingDelete(); // solo se puede deshacer el último borrado

  const timeoutId = setTimeout(() => {
    pendingDelete = null;
    pb.collection('items').delete(id, { list_id: listId }).catch(() => {});
    hideToast();
  }, UNDO_DELAY_MS);

  pendingDelete = { id, name, timeoutId };
  renderItems(lastItems);
  showToast(`"${name}" eliminado`, () => {
    clearTimeout(pendingDelete.timeoutId);
    pendingDelete = null;
    hideToast();
    renderItems(lastItems);
  });
}

async function handleListClick(event) {
  const action = event.target.dataset.action;
  const li = event.target.closest('li');
  if (!li) return;

  if (action === 'delete') {
    const name = li.querySelector('.item-name').textContent;
    scheduleDelete(li.dataset.id, name);
  } else if (action === 'comment') {
    const current = li.querySelector('.item-comment')?.textContent || '';
    const next = prompt('Comentario para este producto:', current);
    if (next === null) return; // cancelado
    await pb.collection('items').update(li.dataset.id, { comment: next.trim() }, { list_id: listId });
  } else if (action === 'view-photo') {
    openPhotoModal(event.target.dataset.fullSrc);
  }
}

function openPhotoModal(src) {
  photoModalImg.src = src;
  photoModal.hidden = false;
}

function closePhotoModal() {
  photoModal.hidden = true;
  photoModalImg.src = '';
}

async function handleClearList() {
  const count = listEl.children.length;
  if (!confirm(`¿Vaciar la lista? Se borrarán los ${count} productos (y sus fotos) para empezar de cero.`)) {
    return;
  }

  const items = await pb.collection('items').getFullList({ list_id: listId, requestKey: null });
  await Promise.all(items.map((item) => pb.collection('items').delete(item.id, { list_id: listId })));
}

async function loadItems() {
  // list_id viaja como parámetro de consulta: la propia regla de la API
  // en PocketBase lo usa para filtrar qué registros se pueden ver.
  const items = await pb.collection('items').getFullList({
    list_id: listId,
    sort: '-created',
    requestKey: null, // varias recargas seguidas (eventos realtime) no deben cancelarse entre sí
  });
  lastItems = items;
  renderItems(items);
}

async function handleSubmit(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  if (!name) return;

  const data = {
    name,
    quantity: quantityInput.value.trim(),
    importance: importanceInput.value,
    list_id: listId,
  };

  const file = photoInput.files[0];
  if (file) {
    data.photo = await compressImage(file);
  }

  await pb.collection('items').create(data);

  nameInput.value = '';
  quantityInput.value = '';
  photoInput.value = '';
  photoLabel.classList.remove('has-photo');
  await loadItems();
}

function init() {
  if (!listId) {
    noListEl.hidden = false;
    return;
  }

  formEl.hidden = false;
  formEl.addEventListener('submit', withErrorAlert(handleSubmit));
  photoInput.addEventListener('change', () => {
    photoLabel.classList.toggle('has-photo', photoInput.files.length > 0);
  });
  listEl.addEventListener('change', withErrorAlert(handleListChange));
  listEl.addEventListener('click', withErrorAlert(handleListClick));
  clearListBtn.addEventListener('click', withErrorAlert(handleClearList));
  photoModal.addEventListener('click', closePhotoModal);
  loadItems();

  // Cualquier cambio (de este dispositivo o de otro) recarga la lista.
  pb.collection('items').subscribe(
    '*',
    (e) => {
      if (e.action === 'create' && e.record.importance === 'importante') {
        navigator.vibrate?.(200); // no existe en iOS Safari; se ignora sin más
      }
      loadItems();
    },
    { query: { list_id: listId } },
  );
}

init();
