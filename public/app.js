'use strict';
const $ = id => document.getElementById(id);
const state = { todos: [], filter: 'all', editing: null };
function alertMessage(message) { $('message').textContent = message; $('message').hidden = false; }
function clearMessage() { $('message').hidden = true; }
async function request(path, options={}) {
  const response = await fetch(path, {headers: {'Content-Type':'application/json'}, ...options});
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}
const el = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
function render() {
  const todos = state.todos;
  const done = todos.filter(todo => todo.completed).length;
  $('totalCount').textContent = todos.length;
  $('openCount').textContent = todos.length - done;
  $('doneCount').textContent = done;
  const filtered = todos.filter(todo => state.filter === 'all' || (state.filter === 'completed' ? todo.completed : !todo.completed));
  $('listCount').textContent = filtered.length;
  const list = $('taskList'); list.replaceChildren();
  if (!filtered.length) { list.append(el('div','empty',todos.length ? 'No tasks match this filter.' : 'No tasks yet. Create your first task above.')); return; }
  for (const todo of filtered) {
    const row = el('article','task' + (todo.completed ? ' completed' : ''));
    const checkbox = el('input','task-checkbox'); checkbox.type='checkbox'; checkbox.checked=todo.completed; checkbox.setAttribute('aria-label',`Mark ${todo.title} ${todo.completed?'incomplete':'complete'}`);
    checkbox.addEventListener('change', async () => {
      checkbox.disabled=true;
      try { await request(`/api/todos/${todo.id}`,{method:'PATCH',body:JSON.stringify({completed:checkbox.checked})}); await load(); }
      catch(e) { alertMessage(e.message); checkbox.checked=!checkbox.checked; checkbox.disabled=false; }
    });
    const body=el('div','task-content'); body.append(el('div','task-title',todo.title));
    if (todo.description) body.append(el('div','task-description',todo.description));
    body.append(el('div','task-time','Created ' + new Date(todo.created_at).toLocaleString()));
    const actions=el('div','task-actions');
    const edit=el('button','icon-button','Edit'); edit.type='button'; edit.addEventListener('click',()=>{
      state.editing=todo.id; $('editTitle').value=todo.title; $('editDescription').value=todo.description; $('editDialog').showModal();
    });
    const remove=el('button','icon-button delete','Delete'); remove.type='button'; remove.addEventListener('click',async()=>{
      if (!window.confirm(`Delete "${todo.title}"?`)) return;
      try { await request(`/api/todos/${todo.id}`,{method:'DELETE'}); await load(); }
      catch(e) { alertMessage(e.message); }
    });
    actions.append(edit,remove); row.append(checkbox,body,actions); list.append(row);
  }
}
async function load() { try {state.todos=await request('/api/todos'); clearMessage(); render();} catch(e){alertMessage(e.message);} }
$('createForm').addEventListener('submit',async event=>{
  event.preventDefault(); const button=$('submitButton'); button.disabled=true;
  try { await request('/api/todos',{method:'POST',body:JSON.stringify({title:$('titleInput').value,description:$('descriptionInput').value})}); $('createForm').reset(); await load(); }
  catch(e){alertMessage(e.message);} finally{button.disabled=false;}
});
$('editForm').addEventListener('submit',async event=>{
  event.preventDefault();
  try { await request(`/api/todos/${state.editing}`,{method:'PATCH',body:JSON.stringify({title:$('editTitle').value, description:$('editDescription').value})}); $('editDialog').close(); await load(); }
  catch(e){alertMessage(e.message);}
});
$('cancelEdit').addEventListener('click',()=>$('editDialog').close());
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  state.filter=button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item=>item.classList.toggle('active',item===button));
  render();
}));
load();
